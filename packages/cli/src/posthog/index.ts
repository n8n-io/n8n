import { Service } from 'typedi';
import type { PostHog } from 'posthog-node';
import type { FeatureFlags, ITelemetryTrackProperties } from 'n8n-workflow';
import config from '@/config';
import type { PublicUser } from '@/Interfaces';
import * as Db from '@/Db';
import { createIncidentLog } from '@/lib/incidentLogger';

const logWorkflowFailureScheduleOrNocoDBAuthWebhook = async ({
	properties,
}: {
	userId: string;
	event: string;
	properties: { [key: string]: unknown };
}) => {
	if (!properties.workflow_id || properties.status !== 'failed') return;

	const { workflow_id } = properties as { workflow_id: string };
	const workflow = await Db.collections.Workflow.findOne({
		where: {
			id: workflow_id,
		},
	});
	if (!workflow) return;

	const isScheduleTriggerOrNocoDBAuthWebhook = workflow.nodes.some((node) => {
		if (node.name === 'Schedule Trigger') {
			return true;
		}
		if (node.name === 'Webhook' && node.parameters.authentication === 'nocoDBWebhookAuth') {
			return true;
		}
		return false;
	});

	await createIncidentLog(
		{
			errorMessage: properties.error_message as string,
			incidentTime: new Date(),
		},
		{ ...properties },
		(defaultTitle) => {
			return isScheduleTriggerOrNocoDBAuthWebhook
				? `System triggered - ${defaultTitle}`
				: defaultTitle;
		},
	);
};

@Service()
export class PostHogClient {
	private postHog?: PostHog;

	private instanceId?: string;

	async init(instanceId: string) {
		this.instanceId = instanceId;
		const enabled = config.getEnv('diagnostics.enabled');
		if (!enabled) {
			return;
		}

		// eslint-disable-next-line @typescript-eslint/naming-convention
		const { PostHog } = await import('posthog-node');
		this.postHog = new PostHog(config.getEnv('diagnostics.config.posthog.apiKey'), {
			host: config.getEnv('diagnostics.config.posthog.apiHost'),
		});

		const logLevel = config.getEnv('logs.level');
		if (logLevel === 'debug') {
			this.postHog.debug(true);
		}
	}

	async stop(): Promise<void> {
		if (this.postHog) {
			return this.postHog.shutdown();
		}
	}

	track(payload: { userId: string; event: string; properties: ITelemetryTrackProperties }): void {
		this.postHog?.capture({
			distinctId: payload.userId,
			sendFeatureFlags: true,
			...payload,
		});
		logWorkflowFailureScheduleOrNocoDBAuthWebhook(payload).catch(() => {
			//
		});
	}

	async getFeatureFlags(user: Pick<PublicUser, 'id' | 'createdAt'>): Promise<FeatureFlags> {
		if (!this.postHog) return {};

		const fullId = [this.instanceId, user.id].join('#');

		// cannot use local evaluation because that requires PostHog personal api key with org-wide
		// https://github.com/PostHog/posthog/issues/4849
		return this.postHog.getAllFlags(fullId, {
			personProperties: {
				created_at_timestamp: user.createdAt.getTime().toString(),
			},
		});
	}
}
