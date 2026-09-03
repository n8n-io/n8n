import { useStorage } from '@vueuse/core';
import { computed, type Ref } from 'vue';

/** Where a preview reply is delivered. Stub: nothing is sent, the receipt is simulated. */
export type WireframeDestination = 'preview' | 'slack-dm' | 'email-draft' | 'test-channel';

export const WIREFRAME_DESTINATIONS: WireframeDestination[] = [
	'preview',
	'slack-dm',
	'email-draft',
	'test-channel',
];

/**
 * Wireframe stub: the destination is remembered per session in localStorage.
 * A real implementation would route the agent's reply through the channel.
 */
export function useWireframeDestination(sessionId: Ref<string | undefined>) {
	const destination = useStorage<WireframeDestination>(
		computed(() => `N8N_WIREFRAME_DESTINATION:${sessionId.value ?? 'none'}`),
		'preview',
	);
	return { destination };
}
