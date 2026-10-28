import type { SlackAdapter, SlackAdapterConfig } from '@chat-adapter/slack';
import type { WebhookOptions } from 'chat';

import { loadSlackAdapter } from '../../esm-loader';

export async function createSlackSourceAdapter(config: SlackAdapterConfig): Promise<SlackAdapter> {
	const { SlackAdapter } = await loadSlackAdapter();

	class SlackSourceAdapter extends SlackAdapter {
		protected override processEventPayload(
			payload: Parameters<InstanceType<typeof SlackAdapter>['processEventPayload']>[0],
			options?: WebhookOptions,
		): void {
			const event = payload.event
				? { ...payload.event, n8nWorkspaceId: payload.team_id }
				: undefined;
			super.processEventPayload({ ...payload, event }, options);
		}
	}

	return new SlackSourceAdapter(config);
}
