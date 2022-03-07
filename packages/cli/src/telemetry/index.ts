/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import TelemetryClient = require('@rudderstack/rudder-sdk-node');
import { IDataObject, LoggerProxy } from 'n8n-workflow';
import config = require('../../config');
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

export class Telemetry {
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

	constructor(instanceId: string, versionCli: string) {
		this.instanceId = instanceId;
		this.versionCli = versionCli;

		const enabled = config.get('diagnostics.enabled') as boolean;
		const logLevel = config.get('logs.level') as boolean;
		if (enabled) {
			const conf = config.get('diagnostics.config.backend') as string;
			const [key, url] = conf.split(';');

			if (!key || !url) {
				const logger = getLogger();
				LoggerProxy.init(logger);
				logger.warn('Diagnostics backend config is invalid');
				return;
			}

			this.client = new TelemetryClient(key, url, { logLevel });

			this.pulseIntervalReference = setInterval(async () => {
				void this.pulse();
			}, 6 * 60 * 60 * 1000); // every 6 hours
		}
	}

	private async pulse(): Promise<unknown> {
		if (!this.client) {
			return Promise.resolve();
		}

		const allPromises = Object.keys(this.executionCountsBuffer.counts).map(async (workflowId) => {
			const promise = this.track('Workflow execution count', {
				version_cli: this.versionCli,
				workflow_id: workflowId,
				...this.executionCountsBuffer.counts[workflowId],
				...this.executionCountsBuffer.firstExecutions,
			});

			this.executionCountsBuffer.counts[workflowId].manual_error_count = 0;
			this.executionCountsBuffer.counts[workflowId].manual_success_count = 0;
			this.executionCountsBuffer.counts[workflowId].prod_error_count = 0;
			this.executionCountsBuffer.counts[workflowId].prod_success_count = 0;

			return promise;
		});

		allPromises.push(this.track('pulse', { version_cli: this.versionCli }));
		return Promise.all(allPromises);
	}

	async trackWorkflowExecution(properties: IDataObject): Promise<void> {
		if (this.client) {
			const workflowId = properties.workflow_id as string;
			this.executionCountsBuffer.counts[workflowId] = this.executionCountsBuffer.counts[
				workflowId
			] ?? {
				manual_error_count: 0,
				manual_success_count: 0,
				prod_error_count: 0,
				prod_success_count: 0,
			};

			let countKey: CountBufferItemKey;
			let firstExecKey: FirstExecutionItemKey;

			if (
				properties.success === false &&
				properties.error_node_type &&
				(properties.error_node_type as string).startsWith('n8n-nodes-base')
			) {
				// errored exec
				void this.track('Workflow execution errored', properties);

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
}
