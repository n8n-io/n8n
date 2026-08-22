import type { PushHandlerOptions } from './types';

export async function agentCollaboration(
	event: { type: 'agent-collaboration' | 'agent-presence'; data: unknown },
	{ documentId }: PushHandlerOptions,
) {
	// Extract the collaboration message from the push event structure
	const collabMessage = event.data as {
		type: 'agent-collaboration' | 'agent-presence';
		agentId: string;
		payload: unknown;
	};

	// For agent-presence messages, these are handled by the useAgentCollaboration composable
	// which registers its own listener via the push store
	if (collabMessage.type === 'agent-presence') {
		return;
	}

	// For agent-collaboration messages with config updates, emit a custom event
	// that the agent builder can listen to and apply to its local config
	if (collabMessage.type === 'agent-collaboration' && collabMessage.payload) {
		const payload = collabMessage.payload as {
			type: string;
			data: unknown;
			userId: string;
		};

		if (payload.type === 'config-update' && payload.data) {
			// Emit a custom event that the agent builder can subscribe to
			// This allows the builder to update its local config when another user makes changes
			window.dispatchEvent(
				new CustomEvent('agent-config-changed', {
					detail: {
						agentId: collabMessage.agentId,
						config: payload.data,
						userId: payload.userId,
					},
				}),
			);
		}
	}
}
