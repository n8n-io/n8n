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

	/**
	 * Saves the static data if it changed. Write failures are reported but not
	 * propagated, as callers such as workflow activation treat this as best-effort.
	 */
	async saveStaticData(workflow: Workflow): Promise<void> {
		try {
			await this.saveStaticDataOrThrow(workflow);
		} catch (error) {
			this.errorReporter.error(error);
			this.logger.error(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				`There was a problem saving the workflow with id "${workflow.id}" to save changed Data: "${error.message}"`,
				{ workflowId: workflow.id },
			);
		}
	}

	/** Saves the static data if it changed, propagating write failures to the caller */
	async saveStaticDataOrThrow(workflow: Workflow): Promise<void> {
		if (workflow.staticData.__dataChanged !== true) return;

		// Workflow is not saved yet, so there is nothing to update
		if (!isWorkflowIdValid(workflow.id)) return;

		// Static data of workflow changed and so has to be saved
		await this.saveStaticDataById(workflow.id, workflow.staticData);
		workflow.staticData.__dataChanged = false;
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
