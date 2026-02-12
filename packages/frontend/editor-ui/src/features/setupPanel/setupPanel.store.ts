import { usePostHog } from '@/app/stores/posthog.store';
import { STORES } from '@n8n/stores';
import { SETUP_PANEL } from '@/app/constants';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useSetupPanelStore = defineStore(STORES.SETUP_PANEL, () => {
	const posthogStore = usePostHog();

	const isFeatureEnabled = computed(() => {
		return posthogStore.getVariant(SETUP_PANEL.name) === SETUP_PANEL.variant;
	});

	const credentialsPendingTest = ref(new Set<string>());

	const highlightedNodeIds = ref(new Set<string>());

	const isHighlightActive = computed(() => highlightedNodeIds.value.size > 0);

	function setHighlightedNodes(nodeIds: string[]) {
		highlightedNodeIds.value = new Set(nodeIds);
	}

	function clearHighlightedNodes() {
		highlightedNodeIds.value = new Set();
	}

	function addPendingTest(credentialId: string) {
		if (!isFeatureEnabled.value) return;
		credentialsPendingTest.value = new Set([...credentialsPendingTest.value, credentialId]);
	}

	function removePendingTest(credentialId: string) {
		const next = new Set(credentialsPendingTest.value);
		next.delete(credentialId);
		credentialsPendingTest.value = next;
	}

	function isCredentialPendingTest(credentialId: string): boolean {
		return credentialsPendingTest.value.has(credentialId);
	}

	return {
		isFeatureEnabled,
		addPendingTest,
		removePendingTest,
		isCredentialPendingTest,
		highlightedNodeIds,
		isHighlightActive,
		setHighlightedNodes,
		clearHighlightedNodes,
	};
});
