/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import RudderStack from '@rudderstack/rudder-sdk-node';
import PostHog from 'posthog-node';
import { ITelemetryTrackProperties, LoggerProxy } from 'n8n-workflow';
import config from '@/config';
import { IExecutionTrackProperties } from '@/Interfaces';
import { getLogger } from '@/Logger';

type ExecutionTrackDataKey = 'manual_error' | 'manual_success' | 'prod_error' | 'prod_success';

interface IExecutionTrackData {
	count: number;
	first: Date;
}

interface IExecutionsBuffer {
	[workflowId: string]: {
		manual_error?: IExecutionTrackData;
		manual_success?: IExecutionTrackData;
		prod_error?: IExecutionTrackData;
		prod_success?: IExecutionTrackData;
	};
}

export class Telemetry {
	private rudderStack?: RudderStack;

	private postHog?: PostHog;

	private instanceId: string;

	private versionCli: string;

	private pulseIntervalReference: NodeJS.Timeout;

	private executionCountsBuffer: IExecutionsBuffer = {};

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

			this.rudderStack = this.initRudderStack(key, url, logLevel);
			this.postHog = this.initPostHog();

			this.startPulse();
		}
	}

	private initRudderStack(key: string, url: string, logLevel: string): RudderStack {
		return new RudderStack(key, url, { logLevel });
	}

	private initPostHog(): PostHog {
		return new PostHog(config.getEnv('diagnostics.config.posthog.apiKey'));
	}

	private startPulse() {
		this.pulseIntervalReference = setInterval(async () => {
			void this.pulse();
		}, 6 * 60 * 60 * 1000); // every 6 hours
	}

	private async pulse(): Promise<unknown> {
		if (!this.rudderStack) {
			return Promise.resolve();
		}

		const allPromises = Object.keys(this.executionCountsBuffer).map(async (workflowId) => {
			const promise = this.track('Workflow execution count', {
				event_version: '2',
				workflow_id: workflowId,
				...this.executionCountsBuffer[workflowId],
			});

			return promise;
		});

		this.executionCountsBuffer = {};
		allPromises.push(this.track('pulse'));
		return Promise.all(allPromises);
	}

	async trackWorkflowExecution(properties: IExecutionTrackProperties): Promise<void> {
		if (this.rudderStack) {
			const execTime = new Date();
			const workflowId = properties.workflow_id;

			this.executionCountsBuffer[workflowId] = this.executionCountsBuffer[workflowId] ?? {};

			const key: ExecutionTrackDataKey = `${properties.is_manual ? 'manual' : 'prod'}_${
				properties.success ? 'success' : 'error'
			}`;

			if (!this.executionCountsBuffer[workflowId][key]) {
				this.executionCountsBuffer[workflowId][key] = {
					count: 1,
					first: execTime,
				};
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				this.executionCountsBuffer[workflowId][key]!.count++;
			}

			if (!properties.success && properties.error_node_type?.startsWith('n8n-nodes-base')) {
				void this.track('Workflow execution errored', properties);
			}
		}
	}

	async trackN8nStop(): Promise<void> {
		clearInterval(this.pulseIntervalReference);
		void this.track('User instance stopped');
		return new Promise<void>((resolve) => {
			if (this.postHog) {
				this.postHog.shutdown();
			}

			if (this.rudderStack) {
				this.rudderStack.flush(resolve);
			} else {
				resolve();
			}
		});
	}

	async identify(traits?: {
		[key: string]: string | number | boolean | object | undefined | null;
	}): Promise<void> {
		return new Promise<void>((resolve) => {
			if (this.rudderStack) {
				this.rudderStack.identify(
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
		properties: ITelemetryTrackProperties = {},
		{ withPostHog } = { withPostHog: false }, // whether to additionally track with PostHog
	): Promise<void> {
		return new Promise<void>((resolve) => {
			if (this.rudderStack) {
				const { user_id } = properties;
				const updatedProperties: ITelemetryTrackProperties = {
					...properties,
					instance_id: this.instanceId,
					version_cli: this.versionCli,
				};

				const payload = {
					userId: `${this.instanceId}${user_id ? `#${user_id}` : ''}`,
					anonymousId: '000000000000',
					event: eventName,
					properties: updatedProperties,
				};

				if (withPostHog && this.postHog) {
					return Promise.all([
						this.postHog.capture({
							distinctId: payload.userId,
							...payload,
						}),
						this.rudderStack.track(payload),
					]).then(() => resolve());
				}

				return this.rudderStack.track(payload, resolve);
			}

			return resolve();
		});
	}

	async isFeatureFlagEnabled(
		featureFlagName: string,
		{ user_id: userId }: ITelemetryTrackProperties = {},
	): Promise<boolean> {
		if (!this.postHog) return Promise.resolve(false);

		const fullId = [this.instanceId, userId].join('#');

		return this.postHog.isFeatureEnabled(featureFlagName, fullId);
	}

	// test helpers

	getCountsBuffer(): IExecutionsBuffer {
		return this.executionCountsBuffer;
	}
}
