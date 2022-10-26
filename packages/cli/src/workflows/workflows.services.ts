import { LoggerProxy } from 'n8n-workflow';
import { FindManyOptions, FindOneOptions, ObjectLiteral } from 'typeorm';
import {
	ActiveWorkflowRunner,
	Db,
	InternalHooksManager,
	ResponseHelper,
	whereClause,
	WorkflowHelpers,
} from '..';
import config from '../../config';
import { SharedWorkflow } from '../databases/entities/SharedWorkflow';
import { User } from '../databases/entities/User';
import { WorkflowEntity } from '../databases/entities/WorkflowEntity';
import { validateEntity } from '../GenericHelpers';
import { externalHooks } from '../Server';
import * as TagHelpers from '../TagHelpers';

export class WorkflowsService {
	static async getSharing(
		user: User,
		workflowId: number | string,
		relations: string[] = ['workflow'],
		{ allowGlobalOwner } = { allowGlobalOwner: true },
	): Promise<SharedWorkflow | undefined> {
		const options: FindOneOptions<SharedWorkflow> & { where: ObjectLiteral } = {
			where: {
				workflow: { id: workflowId },
			},
		};

		// Omit user from where if the requesting user is the global
		// owner. This allows the global owner to view and delete
		// workflows they don't own.
		if (!allowGlobalOwner || user.globalRole.name !== 'owner') {
			options.where.user = { id: user.id };
		}

		if (relations?.length) {
			options.relations = relations;
		}

		return Db.collections.SharedWorkflow.findOne(options);
	}

	static async get(workflow: Partial<WorkflowEntity>, options?: { relations: string[] }) {
		return Db.collections.Workflow.findOne(workflow, options);
	}

	static async updateWorkflow(
		user: User,
		workflow: WorkflowEntity,
		workflowId: string,
		tags?: string[],
	): Promise<WorkflowEntity> {
		const shared = await Db.collections.SharedWorkflow.findOne({
			relations: ['workflow'],
			where: whereClause({
				user,
				entityType: 'workflow',
				entityId: workflowId,
			}),
		});

		if (!shared) {
			LoggerProxy.info('User attempted to update a workflow without permissions', {
				workflowId,
				userId: user.id,
			});
			throw new ResponseHelper.ResponseError(
				`Workflow with ID "${workflowId}" could not be found to be updated.`,
				undefined,
				404,
			);
		}

		// check credentials for old format
		await WorkflowHelpers.replaceInvalidCredentials(workflow);

		WorkflowHelpers.addNodeIds(workflow);

		await externalHooks.run('workflow.update', [workflow]);

		if (shared.workflow.active) {
			// When workflow gets saved always remove it as the triggers could have been
			// changed and so the changes would not take effect
			await ActiveWorkflowRunner.getInstance().remove(workflowId);
		}

		if (workflow.settings) {
			if (workflow.settings.timezone === 'DEFAULT') {
				// Do not save the default timezone
				delete workflow.settings.timezone;
			}
			if (workflow.settings.saveDataErrorExecution === 'DEFAULT') {
				// Do not save when default got set
				delete workflow.settings.saveDataErrorExecution;
			}
			if (workflow.settings.saveDataSuccessExecution === 'DEFAULT') {
				// Do not save when default got set
				delete workflow.settings.saveDataSuccessExecution;
			}
			if (workflow.settings.saveManualExecutions === 'DEFAULT') {
				// Do not save when default got set
				delete workflow.settings.saveManualExecutions;
			}
			if (
				parseInt(workflow.settings.executionTimeout as string, 10) ===
				config.get('executions.timeout')
			) {
				// Do not save when default got set
				delete workflow.settings.executionTimeout;
			}
		}

		if (workflow.name) {
			workflow.updatedAt = new Date(); // required due to atomic update
			await validateEntity(workflow);
		}

		await Db.collections.Workflow.update(workflowId, workflow);

		if (tags && !config.getEnv('workflowTagsDisabled')) {
			const tablePrefix = config.getEnv('database.tablePrefix');
			await TagHelpers.removeRelations(workflowId, tablePrefix);

			if (tags.length) {
				await TagHelpers.createRelations(workflowId, tags, tablePrefix);
			}
		}

		const options: FindManyOptions<WorkflowEntity> = {
			relations: ['tags'],
		};

		if (config.getEnv('workflowTagsDisabled')) {
			delete options.relations;
		}

		// We sadly get nothing back from "update". Neither if it updated a record
		// nor the new value. So query now the hopefully updated entry.
		const updatedWorkflow = await Db.collections.Workflow.findOne(workflowId, options);

		if (updatedWorkflow === undefined) {
			throw new ResponseHelper.ResponseError(
				`Workflow with ID "${workflowId}" could not be found to be updated.`,
				undefined,
				400,
			);
		}

		if (updatedWorkflow.tags?.length && tags?.length) {
			updatedWorkflow.tags = TagHelpers.sortByRequestOrder(updatedWorkflow.tags, {
				requestOrder: tags,
			});
		}

		await externalHooks.run('workflow.afterUpdate', [updatedWorkflow]);
		void InternalHooksManager.getInstance().onWorkflowSaved(user.id, updatedWorkflow, false);

		if (updatedWorkflow.active) {
			// When the workflow is supposed to be active add it again
			try {
				await externalHooks.run('workflow.activate', [updatedWorkflow]);
				await ActiveWorkflowRunner.getInstance().add(
					workflowId,
					shared.workflow.active ? 'update' : 'activate',
				);
			} catch (error) {
				// If workflow could not be activated set it again to inactive
				workflow.active = false;
				await Db.collections.Workflow.update(workflowId, workflow);

				// Also set it in the returned data
				updatedWorkflow.active = false;

				// Now return the original error for UI to display
				throw error;
			}
		}

		return updatedWorkflow;
	}
}
