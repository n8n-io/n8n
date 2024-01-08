import { EventEmitter } from 'events';
import { Container, Service } from 'typedi';
import type { INode, IRun, IWorkflowBase } from 'n8n-workflow';
import { StatisticsNames } from '@db/entities/WorkflowStatistics';
import { WorkflowStatisticsRepository } from '@db/repositories/workflowStatistics.repository';
import { UserService } from './user.service';
import { Logger } from '@/Logger';
import { OwnershipService } from './ownership.service';
import { InternalHooks } from '@/InternalHooks';

@Service()
export class EventsService extends EventEmitter {
	constructor(
		private readonly logger: Logger,
		private readonly repository: WorkflowStatisticsRepository,
		private readonly ownershipService: OwnershipService,
		private readonly userService: UserService,
		private readonly internalHooks: InternalHooks,
	) {
		super({ captureRejections: true });
		if ('SKIP_STATISTICS_EVENTS' in process.env) return;

		this.on('nodeFetchedData', async (workflowId, node) => this.nodeFetchedData(workflowId, node));
		this.on('workflowExecutionCompleted', async (workflowData, runData) =>
			this.workflowExecutionCompleted(workflowData, runData),
		);
	}

	async workflowExecutionCompleted(workflowData: IWorkflowBase, runData: IRun): Promise<void> {
		// Determine the name of the statistic
		const finished = runData.finished ? runData.finished : false;
		const manual = runData.mode === 'manual';
		let name: StatisticsNames;

		if (finished) {
			if (manual) name = StatisticsNames.manualSuccess;
			else name = StatisticsNames.productionSuccess;
		} else {
			if (manual) name = StatisticsNames.manualError;
			else name = StatisticsNames.productionError;
		}

		// Get the workflow id
		const workflowId = workflowData.id;
		if (!workflowId) return;

		try {
			const upsertResult = await this.repository.upsertWorkflowStatistics(name, workflowId);

			if (name === StatisticsNames.productionSuccess && upsertResult === 'insert') {
				const owner = await Container.get(OwnershipService).getWorkflowOwnerCached(workflowId);
				const metrics = {
					user_id: owner.id,
					workflow_id: workflowId,
				};

				if (!owner.settings?.userActivated) {
					await this.userService.updateSettings(owner.id, {
						firstSuccessfulWorkflowId: workflowId,
						userActivated: true,
					});
				}

				await this.internalHooks.onFirstProductionWorkflowSuccess(metrics);
			}
		} catch (error) {
			this.logger.verbose('Unable to fire first workflow success telemetry event');
		}
	}

	async nodeFetchedData(workflowId: string | undefined | null, node: INode): Promise<void> {
		if (!workflowId) return;

		const insertResult = await this.repository.insertWorkflowStatistics(
			StatisticsNames.dataLoaded,
			workflowId,
		);
		if (insertResult === 'failed' || insertResult === 'alreadyExists') return;

		// Compile the metrics since this was a new data loaded event
		const owner = await this.ownershipService.getWorkflowOwnerCached(workflowId);

		let metrics = {
			user_id: owner.id,
			workflow_id: workflowId,
			node_type: node.type,
			node_id: node.id,
		};

		// This is probably naive but I can't see a way for a node to have multiple credentials attached so..
		if (node.credentials) {
			Object.entries(node.credentials).forEach(([credName, credDetails]) => {
				metrics = Object.assign(metrics, {
					credential_type: credName,
					credential_id: credDetails.id,
				});
			});
		}

		await this.internalHooks.onFirstWorkflowDataLoad(metrics);
	}
}

export declare interface EventsService {
	on(
		event: 'nodeFetchedData',
		listener: (workflowId: string | undefined | null, node: INode) => void,
	): this;
	on(
		event: 'workflowExecutionCompleted',
		listener: (workflowData: IWorkflowBase, runData: IRun) => void,
	): this;
}
