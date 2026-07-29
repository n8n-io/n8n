import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import type { IDataObject, Workflow } from 'n8n-workflow';

import { isWorkflowIdValid } from '@/utils';

@Service()
export class WorkflowStaticDataService {
	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
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
	async saveStaticData(workflow: Workflow): Promise<void> {
		if (workflow.staticData.__dataChanged === true) {
			// Static data of workflow changed and so has to be saved
			if (isWorkflowIdValid(workflow.id)) {
				// Workflow is saved so update in database
				try {
					await this.saveStaticDataById(workflow.id, workflow.staticData);
					workflow.staticData.__dataChanged = false;
				} catch (error) {
					this.errorReporter.error(error);
					this.logger.error(
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						`There was a problem saving the workflow with id "${workflow.id}" to save changed Data: "${error.message}"`,
						{ workflowId: workflow.id },
					);
				}
			}
		}
	}

	/**
	 * Replace one node's entry in a workflow's static data, leaving every other node's
	 * entry as it is on the row.
	 *
	 * Reads the stored value rather than writing a whole column held in memory, so a node
	 * that has not been touched here keeps whatever another process wrote to it. The read
	 * and the write are still two statements: a whole-column write landing between them
	 * wins, so this narrows the window rather than closing it.
	 */
	async mergeNodeStaticData(
		workflowId: string,
		nodeName: string,
		nodeStaticData: IDataObject,
	): Promise<void> {
		const staticData = await this.getStaticDataById(workflowId);

		await this.saveStaticDataById(workflowId, {
			...staticData,
			[`node:${nodeName}`]: nodeStaticData,
		});
	}

	/** Saves the given static data on workflow */
	async saveStaticDataById(workflowId: string, newStaticData: IDataObject): Promise<void> {
		const qb = this.workflowRepository.createQueryBuilder('workflow');
		await qb
			.update()
			.set({
				staticData: newStaticData,
				updatedAt: () => {
					return '"updatedAt"';
				},
			})
			.where('id = :id', { id: workflowId })
			.execute();
	}
}
