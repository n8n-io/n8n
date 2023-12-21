import { EventEmitter } from 'events';
import { Container, Service } from 'typedi';
import type { INode, IRun, IWorkflowBase } from 'n8n-workflow';
import { StatisticsNames } from '@db/entities/WorkflowStatistics';
import { WorkflowStatisticsRepository } from '@db/repositories/workflowStatistics.repository';
import { UserService } from '@/services/user.service';
import { Logger } from '@/Logger';
import type { User } from '@/databases/entities/User';

@Service()
export class EventsService extends EventEmitter {
	constructor(
		private readonly logger: Logger,
		private readonly repository: WorkflowStatisticsRepository,
	) {
		super({ captureRejections: true });
		if ('SKIP_STATISTICS_EVENTS' in process.env) return;

		this.on('nodeFetchedData', async (workflowId, node, workflowOwner) =>
			this.nodeFetchedData(workflowId, node, workflowOwner),
		);
		this.on('workflowExecutionCompleted', async (workflowData, runData, workflowOwner) =>
			this.workflowExecutionCompleted(workflowData, runData, workflowOwner),
		);
	}

	async workflowExecutionCompleted(
		workflowData: IWorkflowBase,
		runData: IRun,
		workflowOwner: User,
	): Promise<void> {
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
				const metrics = {
					user_id: workflowOwner.id,
					workflow_id: workflowId,
				};

				if (!workflowOwner.settings?.userActivated) {
					await Container.get(UserService).updateSettings(workflowOwner.id, {
						firstSuccessfulWorkflowId: workflowId,
						userActivated: true,
					});
				}

				// Send the metrics
				this.emit('telemetry.onFirstProductionWorkflowSuccess', metrics);
			}
		} catch (error) {
			this.logger.verbose('Unable to fire first workflow success telemetry event');
		}
	}

	async nodeFetchedData(
		workflowId: string | undefined | null,
		node: INode,
		workflowOwner: User,
	): Promise<void> {
		if (!workflowId) return;

		const insertResult = await this.repository.insertWorkflowStatistics(
			StatisticsNames.dataLoaded,
			workflowId,
		);
		if (insertResult === 'failed' || insertResult === 'alreadyExists') return;

		// Compile the metrics since this was a new data loaded event

		let metrics = {
			user_id: workflowOwner.id,
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

		// Send metrics to posthog
		this.emit('telemetry.onFirstWorkflowDataLoad', metrics);
	}
}

export declare interface EventsService {
	on(
		event: 'nodeFetchedData',
		listener: (workflowId: string | undefined | null, node: INode, workflowOwner: User) => void,
	): this;
	on(
		event: 'workflowExecutionCompleted',
		listener: (workflowData: IWorkflowBase, runData: IRun, workflowOwner: User) => void,
	): this;
	on(
		event: 'telemetry.onFirstProductionWorkflowSuccess',
		listener: (metrics: { user_id: string; workflow_id: string }) => void,
	): this;
	on(
		event: 'telemetry.onFirstWorkflowDataLoad',
		listener: (metrics: {
			user_id: string;
			workflow_id: string;
			node_type: string;
			node_id: string;
			credential_type?: string;
			credential_id?: string;
		}) => void,
	): this;
}
