import { Service } from 'typedi';
import { type IDataObject, type Workflow, ErrorReporterProxy as ErrorReporter } from 'n8n-workflow';
import { Logger } from '@/Logger';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { isWorkflowIdValid } from '@/utils';
import { EntityManager } from '@n8n/typeorm';
import { WorkflowEntity } from '@/databases/entities/WorkflowEntity';

@Service()
export class WorkflowStaticDataService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	/** Returns the static data of workflow */
	async getStaticDataById(workflowId: string) {
		const workflowData = await this.workflowRepository.findOne({
			select: ['staticData'],
			where: { id: workflowId },
		});
		return workflowData?.staticData ?? {};
	}

	/** Saves the static data if it changed */
	async saveStaticData(workflow: Workflow, em?: EntityManager): Promise<void> {
		em = em ?? this.workflowRepository.manager;

		if (workflow.staticData.__dataChanged === true) {
			// Static data of workflow changed and so has to be saved
			if (isWorkflowIdValid(workflow.id)) {
				// Workflow is saved so update in database
				try {
					await this.saveStaticDataById(workflow.id, workflow.staticData, em);
					workflow.staticData.__dataChanged = false;
				} catch (error) {
					ErrorReporter.error(error);
					this.logger.error(
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						`There was a problem saving the workflow with id "${workflow.id}" to save changed Data: "${error.message}"`,
						{ workflowId: workflow.id },
					);
				}
			}
		}
	}

	/** Saves the given static data on workflow */
	async saveStaticDataById(
		workflowId: string,
		newStaticData: IDataObject,
		em?: EntityManager,
	): Promise<void> {
		em = em ?? this.workflowRepository.manager;

		await em.update(WorkflowEntity, workflowId, {
			staticData: newStaticData,
		});
	}
}
