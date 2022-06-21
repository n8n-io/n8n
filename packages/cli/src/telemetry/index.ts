/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import TelemetryClient from '@rudderstack/rudder-sdk-node';
import { IDataObject, LoggerProxy } from 'n8n-workflow';
import * as config from '../../config';
import { getLogger } from '../Logger';

type CountBufferItemKey =
	| 'manual_success_count'
	| 'manual_error_count'
	| 'prod_success_count'
	| 'prod_error_count';

type FirstExecutionItemKey =
	| 'first_manual_success'
	| 'first_manual_error'
	| 'first_prod_success'
	| 'first_prod_error';

type ExecutionTrackDataKey = 'manual_error' | 'manual_success' | 'prod_error' | 'prod_success';

type IExecutionCountsBufferItem = {
	[key in CountBufferItemKey]: number;
};

interface IExecutionCountsBuffer {
	[workflowId: string]: IExecutionCountsBufferItem;
}

type IFirstExecutions = {
	[key in FirstExecutionItemKey]: Date | undefined;
};

interface IExecutionsBuffer {
	counts: IExecutionCountsBuffer;
	firstExecutions: IFirstExecutions;
}

interface IExecutionTrackData {
	count: number;
	first: Date;
}

interface IExecutionsBufferNew {
	[workflowId: string]: {
		manual_error?: IExecutionTrackData;
		manual_success?: IExecutionTrackData;
		prod_error?: IExecutionTrackData;
		prod_success?: IExecutionTrackData;
	};
}

export interface IExecutionTrackProperties {
	workflow_id: string;
	success: boolean;
	error_node_type?: string;
	is_manual: boolean;
	[key: string]: unknown;
}

// eslint-disable-next-line import/no-default-export
export default class Telemetry {
	private client?: TelemetryClient;

	private instanceId: string;

	private versionCli: string;

	private pulseIntervalReference: NodeJS.Timeout;

	private executionCountsBuffer: IExecutionsBuffer = {
		counts: {},
		firstExecutions: {
			first_manual_error: undefined,
			first_manual_success: undefined,
			first_prod_error: undefined,
			first_prod_success: undefined,
		},
	};

	private executionCountsBufferNew: IExecutionsBufferNew = {};

	constructor(instanceId: string, versionCli: string) {
		this.instanceId = instanceId;
		this.versionCli = versionCli;

		const enabled = config.getEnv('diagnostics.enabled');
		const logLevel = config.getEnv('logs.level');
		if (enabled) {
			const conf = config.getEnv('diagnostics.config.backend');
			const [key, url] = conf.split(';');

			if (!key || !url) {
				const logger = getLogger();
				LoggerProxy.init(logger);
				logger.warn('Diagnostics backend config is invalid');
				return;
			}

			this.client = this.createTelemetryClient(key, url, logLevel);

			this.startPulse();
		}
	}

	private createTelemetryClient(
		key: string,
		url: string,
		logLevel: string,
	): TelemetryClient | undefined {
		return new TelemetryClient(key, url, { logLevel });
	}

	private startPulse() {
		this.pulseIntervalReference = setInterval(async () => {
			void this.pulse();
		}, 6 * 60 * 60 * 1000); // every 6 hours
	}

	private async pulse(): Promise<unknown> {
		if (!this.client) {
			return Promise.resolve();
		}

		const allP = Object.keys(this.executionCountsBufferNew).map(async (workflowId) => {
			const promise = this.track('Workflow execution count', {
				version_cli: this.versionCli,
				workflow_id: workflowId,
				...this.executionCountsBufferNew[workflowId],
			});

			return promise;
		});

		this.executionCountsBufferNew = {};
		allP.push(this.track('pulse', { version_cli: this.versionCli }));
		return Promise.all(allP);
	}

	async trackWorkflowExecution(properties: IExecutionTrackProperties): Promise<void> {
		if (this.client) {
			const execTime = new Date();
			const workflowId = properties.workflow_id;
			this.executionCountsBuffer.counts[workflowId] = this.executionCountsBuffer.counts[
				workflowId
			] ?? {
				manual_error_count: 0,
				manual_success_count: 0,
				prod_error_count: 0,
				prod_success_count: 0,
			};

			this.executionCountsBufferNew[workflowId] = this.executionCountsBufferNew[workflowId] ?? {};

			let countKey: CountBufferItemKey;
			let firstExecKey: FirstExecutionItemKey;

			const key: ExecutionTrackDataKey = `${properties.is_manual ? 'manual' : 'prod'}_${
				properties.success ? 'success' : 'error'
			}`;

			if (!this.executionCountsBufferNew[workflowId][key]) {
				this.executionCountsBufferNew[workflowId][key] = {
					count: 1,
					first: execTime,
				};
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				this.executionCountsBufferNew[workflowId][key]!.count++;
			}

			if (!properties.success && properties.error_node_type?.startsWith('n8n-nodes-base')) {
				void this.track('Workflow execution errored', properties);
			}

			if (!properties.success) {
				// if (properties.error_node_type?.startsWith('n8n-nodes-base')) {
				// 	void this.track('Workflow execution errored', properties);
				// }

				if (properties.is_manual) {
					firstExecKey = 'first_manual_error';
					countKey = 'manual_error_count';
				} else {
					firstExecKey = 'first_prod_error';
					countKey = 'prod_error_count';
				}
			} else if (properties.is_manual) {
				countKey = 'manual_success_count';
				firstExecKey = 'first_manual_success';
			} else {
				countKey = 'prod_success_count';
				firstExecKey = 'first_prod_success';
			}

			if (
				!this.executionCountsBuffer.firstExecutions[firstExecKey] &&
				this.executionCountsBuffer.counts[workflowId][countKey] === 0
			) {
				this.executionCountsBuffer.firstExecutions[firstExecKey] = new Date();
			}

			this.executionCountsBuffer.counts[workflowId][countKey]++;
		}
	}

	async trackN8nStop(): Promise<void> {
		clearInterval(this.pulseIntervalReference);
		void this.track('User instance stopped');
		return new Promise<void>((resolve) => {
			if (this.client) {
				this.client.flush(resolve);
			} else {
				resolve();
			}
		});
	}

	async identify(traits?: IDataObject): Promise<void> {
		return new Promise<void>((resolve) => {
			if (this.client) {
				this.client.identify(
					{
						userId: this.instanceId,
						anonymousId: '000000000000',
						traits: {
							...traits,
							instanceId: this.instanceId,
						},
					},
					resolve,
				);
			} else {
				resolve();
			}
		});
	}

	async track(
		eventName: string,
		properties: { [key: string]: unknown; user_id?: string } = {},
	): Promise<void> {
		return new Promise<void>((resolve) => {
			if (this.client) {
				const { user_id } = properties;
				Object.assign(properties, { instance_id: this.instanceId });
				this.client.track(
					{
						userId: `${this.instanceId}${user_id ? `#${user_id}` : ''}`,
						anonymousId: '000000000000',
						event: eventName,
						properties,
					},
					resolve,
				);
			} else {
				resolve();
			}
		});
	}

	// test helpers

	getCountsBuffer(): IExecutionsBuffer {
		return this.executionCountsBuffer;
	}

	getCountsBufferNew(): IExecutionsBufferNew {
		return this.executionCountsBufferNew;
	}
}
