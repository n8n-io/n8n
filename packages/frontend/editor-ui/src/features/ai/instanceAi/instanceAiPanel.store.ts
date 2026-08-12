import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useRouter } from 'vue-router';
import { STORES } from '@n8n/stores';
import { useToast } from '@n8n/composables/useToast';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';

import { INSTANCE_AI_THREAD_VIEW } from './constants';
import { useInstanceAiAvailable } from './composables/useInstanceAiAvailability';
import { ensurePersonalProjectId } from './composables/useInstanceAiHandoff';
import { useInstanceAiStore } from './instanceAi.store';
import type { InstanceAiContextNode, ProactiveOffer } from './instanceAiPanel.types';
import { resolveQuickHelpThreadId } from './resolveQuickHelpThread';

export type { InstanceAiContextNode, ProactiveOffer } from './instanceAiPanel.types';

export const nodeContextChipKey = (nodeId: string) => `node:${nodeId}`;

export const useInstanceAiPanelStore = defineStore(STORES.INSTANCE_AI_PANEL, () => {
	const router = useRouter();
	const toast = useToast();
	const instanceAiStore = useInstanceAiStore();
	const instanceAiAvailable = useInstanceAiAvailable();
	const workflowsStore = useWorkflowsStore();

	const isOpen = ref(false);
	const activeThreadId = ref<string | null>(null);
	/** Offer the composer is drafting — context chip + prefill; send is the user's. */
	const pendingOffer = ref<ProactiveOffer | null>(null);
	/** When true, canvas selection adds nodes as composer context chips. */
	const isNodePickerActive = ref(false);
	const contextNodes = ref<InstanceAiContextNode[]>([]);

	const isAvailable = computed(() => instanceAiAvailable.value);
	const hasContextNodes = computed(() => contextNodes.value.length > 0);

	let seedInFlight = false;
	let openInFlight = false;

	async function ensureActiveThread(): Promise<string | null> {
		if (activeThreadId.value) return activeThreadId.value;

		const projectId = await ensurePersonalProjectId();
		if (!projectId) {
			toast.showError(new Error('Failed to start a new thread. Try again.'), 'Open failed');
			return null;
		}

		const threadId = await resolveQuickHelpThreadId(projectId);
		try {
			await instanceAiStore.syncThread(threadId, projectId, {
				source: 'assistant_page',
				origin: 'internal',
			});
		} catch {
			toast.showError(new Error('Failed to start a new thread. Try again.'), 'Open failed');
			return null;
		}

		activeThreadId.value = threadId;
		instanceAiStore.getOrCreateRuntime(threadId, projectId);
		return threadId;
	}

	function open() {
		if (!isAvailable.value) return;
		isOpen.value = true;
	}

	async function openOrCreate(): Promise<boolean> {
		if (!isAvailable.value || openInFlight) return false;
		openInFlight = true;
		try {
			const threadId = await ensureActiveThread();
			if (!threadId) return false;
			isOpen.value = true;
			return true;
		} finally {
			openInFlight = false;
		}
	}

	function close() {
		isOpen.value = false;
		pendingOffer.value = null;
		exitNodePicker();
	}

	function exitNodePicker() {
		isNodePickerActive.value = false;
	}

	function toggleNodePicker() {
		if (!isOpen.value) return;
		isNodePickerActive.value = !isNodePickerActive.value;
	}

	function addContextNodesFromSelection(nodeIds: string[]) {
		if (!isNodePickerActive.value || nodeIds.length === 0) return;

		const workflowDocumentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(workflowsStore.workflowId),
		);
		const known = new Map(contextNodes.value.map((node) => [node.nodeId, node]));
		let changed = false;

		for (const nodeId of nodeIds) {
			if (known.has(nodeId)) continue;
			const node = workflowDocumentStore.allNodes.find((candidate) => candidate.id === nodeId);
			if (!node) continue;
			known.set(nodeId, {
				nodeId,
				nodeName: node.name,
				nodeType: node.type,
			});
			changed = true;
		}

		if (changed) {
			contextNodes.value = [...known.values()];
		}
	}

	function removeContextNode(nodeId: string) {
		contextNodes.value = contextNodes.value.filter((node) => node.nodeId !== nodeId);
	}

	function clearContextNodes() {
		contextNodes.value = [];
	}

	watch(
		() => workflowsStore.workflowId,
		() => {
			clearContextNodes();
			exitNodePicker();
		},
	);

	async function toggle(): Promise<void> {
		if (isOpen.value) {
			close();
			return;
		}
		await openOrCreate();
	}

	/**
	 * Open the floating panel on the project's quick-help thread with the offer
	 * prefilled in the composer. The user reviews / edits and sends — nothing
	 * is posted until they do.
	 */
	async function openWithSeed(offer: ProactiveOffer): Promise<boolean> {
		if (!isAvailable.value || seedInFlight) return false;
		seedInFlight = true;
		try {
			const projectId = offer.projectId ?? (await ensurePersonalProjectId());
			if (!projectId) {
				toast.showError(new Error('Failed to start a new thread. Try again.'), 'Open failed');
				return false;
			}

			const threadId = await resolveQuickHelpThreadId(projectId);
			try {
				await instanceAiStore.syncThread(threadId, projectId, {
					source: offer.source,
					origin: 'internal',
					sourceContext: { offerKey: offer.key },
				});
			} catch {
				toast.showError(new Error('Failed to start a new thread. Try again.'), 'Open failed');
				return false;
			}

			pendingOffer.value = offer;
			activeThreadId.value = threadId;
			instanceAiStore.getOrCreateRuntime(threadId, projectId);
			isOpen.value = true;
			return true;
		} finally {
			seedInFlight = false;
		}
	}

	/** Drops the context pill; the prefilled draft stays so the user can still send. */
	function dismissPendingOffer() {
		pendingOffer.value = null;
	}

	async function expandToFullView(): Promise<void> {
		const threadId = activeThreadId.value;
		if (!threadId) return;
		await router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
		close();
	}

	return {
		isOpen,
		activeThreadId,
		pendingOffer,
		isAvailable,
		isNodePickerActive,
		contextNodes,
		hasContextNodes,
		open,
		openOrCreate,
		toggle,
		close,
		openWithSeed,
		dismissPendingOffer,
		expandToFullView,
		toggleNodePicker,
		exitNodePicker,
		addContextNodesFromSelection,
		removeContextNode,
		clearContextNodes,
	};
});
