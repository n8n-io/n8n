import { hooksPosthogLog } from '@/hooks/posthog/log';

export interface HooksPosthogIdentifyMetadata {
	userId: string;
	instanceId: string;
}

export function hooksPosthogIdentify(meta: HooksPosthogIdentifyMetadata) {
	if (!window.posthog) {
		return;
	}

	hooksPosthogLog('identify', { isMethod: true });

	const { userId, instanceId } = meta;

	const traits = { instance_id: instanceId };

	if (userId) {
		window.posthog.identify([instanceId, userId].join('#'), traits);
	} else {
		window.posthog.reset();

		/**
		 * For PostHog, main ID _cannot_ be `undefined` as done for RudderStack.
		 *
		 * https://github.com/n8n-io/n8n/blob/02549e3ba9233a6d9f75fc1f9ff138e2aff7f4b9/packages/editor-ui/src/plugins/telemetry/index.ts#L87
		 */
		window.posthog.identify(instanceId, traits);
	}
}
