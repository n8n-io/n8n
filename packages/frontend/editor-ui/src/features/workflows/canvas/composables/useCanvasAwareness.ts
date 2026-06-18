import { shallowRef, watch, type Ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import {
	useWorkflowDocumentAwareness,
	type WorkflowAwarenessState,
} from '@/app/stores/crdt/useWorkflowDocumentAwareness';
import type { AwarenessClientId } from '@n8n/crdt';

// Distinct, theme-independent cursor colors. The chosen value is broadcast
// verbatim to peers, so it must render identically across themes/sessions.
const CURSOR_COLORS = [
	'#7B61FF',
	'#1FB6FF',
	'#13CE66',
	'#FF7849',
	'#FF4949',
	'#9C27B0',
	'#00B8A9',
	'#3D5AFE',
];

/** Deterministic per-user color so a user looks the same to every peer. */
export function getUserCursorColor(userId: string): string {
	let hash = 0;
	for (let index = 0; index < userId.length; index++) {
		hash = (hash * 31 + userId.charCodeAt(index)) | 0;
	}
	return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

const EMPTY_REMOTE_STATES = shallowRef(new Map<AwarenessClientId, WorkflowAwarenessState>());

/**
 * Connects the canvas to the workflow document's CRDT awareness layer:
 * broadcasts the local user's cursor (call `setCursor` with flow coordinates)
 * and selection, and exposes remote peers' presence for rendering.
 *
 * Inert when collaboration is disabled (experiment off) or no user is loaded —
 * `setCursor` is a no-op and `remoteStates` stays empty.
 */
export function useCanvasAwareness(selectedNodeIds: Ref<string[]>) {
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const usersStore = useUsersStore();
	const i18n = useI18n();

	const collaboration = workflowDocumentStore.value.collaboration;
	const currentUser = usersStore.currentUser;

	if (!collaboration || !currentUser) {
		return { hasAwareness: false, remoteStates: EMPTY_REMOTE_STATES, setCursor: () => {} };
	}

	const name =
		[currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ') ||
		(currentUser.email ?? i18n.baseText('collaboration.anonymousUser'));

	const awareness = useWorkflowDocumentAwareness({
		doc: collaboration.doc,
		localUser: { id: currentUser.id, name, color: getUserCursorColor(currentUser.id) },
	});

	watch(selectedNodeIds, (ids) => awareness.setSelectedNodeIds(ids), { immediate: true });

	return {
		hasAwareness: true,
		remoteStates: awareness.remoteStates,
		setCursor: awareness.setCursor,
	};
}
