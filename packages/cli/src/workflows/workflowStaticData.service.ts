import { Service } from 'typedi';
import { type IDataObject, type Workflow, ErrorReporterProxy as ErrorReporter } from 'n8n-workflow';
import { Logger } from '@/Logger';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { isWorkflowIdValid } from '@/utils';
import config from '@/config';

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
	async saveStaticData(workflow: Workflow): Promise<void> {
		if (workflow.staticData.__dataChanged === true) {
			// Static data of workflow changed and so has to be saved
			if (isWorkflowIdValid(workflow.id)) {
				// Workflow is saved so update in database
				try {
					await this.saveStaticDataById(workflow.id, workflow.staticData);
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
	async saveStaticDataById(workflowId: string, newStaticData: IDataObject): Promise<void> {
		const qb = this.workflowRepository.createQueryBuilder('workflow');
		await qb
			.update()
			.set({
				staticData: newStaticData,
				updatedAt: () => {
					if (['mysqldb', 'mariadb'].includes(config.getEnv('database.type'))) {
						return 'updatedAt';
					}
					return '"updatedAt"';
				},
			})
			.where('id = :id', { id: workflowId })
			.execute();
	}
}
