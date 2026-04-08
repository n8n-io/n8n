import { h, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useToast } from '@/app/composables/useToast';
import { DEBOUNCE_TIME, NODE_NAME_SUGGESTIONS_MODAL_KEY } from '@/app/constants';
import { suggestNodeNames } from '@/features/ai/assistant/assistant.api';
import type { AiNodeNameSuggestion } from '@n8n/api-types';

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_PARAM_VALUE_LENGTH = 500;
const MAX_PARAMS_PER_NODE = 20;

/** Per-workflow cache of node fingerprints that have already been evaluated. */
const workflowCache = new Map<string, { fingerprints: Set<string>; timestamp: number }>();

const isChecking = ref(false);

function computeFingerprint(nodeId: string, nodeName: string, parameters: unknown): string {
	const raw = `${nodeId}|${nodeName}|${JSON.stringify(parameters)}`;
	// Simple string hash — good enough for dedup purposes
	let hash = 0;
	for (let i = 0; i < raw.length; i++) {
		hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
	}
	return String(hash);
}

function extractParameters(parameters: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	let count = 0;
	for (const [key, value] of Object.entries(parameters)) {
		if (count >= MAX_PARAMS_PER_NODE) break;
		const serialized = typeof value === 'string' ? value : JSON.stringify(value);
		if (serialized.length <= MAX_PARAM_VALUE_LENGTH) {
			result[key] = value;
			count++;
		}
	}
	return result;
}

export function useNodeNameSuggestions() {
	const i18n = useI18n();
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const uiStore = useUIStore();
	const toast = useToast();

	async function checkNodeNamesAfterSave() {
		console.log('[AI Node Names] checkNodeNamesAfterSave called');

		if (!settingsStore.isAiAssistantEnabled) {
			console.log('[AI Node Names] Skipped: AI assistant not enabled');
			return;
		}

		const workflowId = workflowsStore.workflowId;
		const allNodes = workflowsStore.allNodes;
		console.log('[AI Node Names] Total nodes in workflow:', allNodes.length);
		if (allNodes.length === 0) return;

		// Evict stale cache entries
		const now = Date.now();
		for (const [id, entry] of workflowCache) {
			if (now - entry.timestamp > CACHE_TTL) {
				workflowCache.delete(id);
			}
		}

		// Get or create cache for this workflow
		let cache = workflowCache.get(workflowId);
		if (!cache) {
			cache = { fingerprints: new Set(), timestamp: now };
			workflowCache.set(workflowId, cache);
		}

		// Compute fingerprints and filter to only changed nodes
		const candidates: Array<{
			currentName: string;
			nodeType: string;
			displayName: string;
			parameters?: Record<string, unknown>;
			fingerprint: string;
		}> = [];

		for (const node of allNodes) {
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			if (!nodeType) continue;

			const fingerprint = computeFingerprint(node.id, node.name, node.parameters);
			if (cache.fingerprints.has(fingerprint)) continue;

			const params = extractParameters(node.parameters);
			candidates.push({
				currentName: node.name,
				nodeType: node.type,
				displayName: nodeType.displayName,
				parameters: Object.keys(params).length > 0 ? params : undefined,
				fingerprint,
			});
		}

		console.log(
			'[AI Node Names] Candidates (changed since last check):',
			candidates.length,
			candidates.map((c) => c.currentName),
		);

		if (candidates.length === 0) {
			console.log('[AI Node Names] Skipped: no changed nodes (all cached)');
			return;
		}

		// Throttle API calls
		const timeSinceLastCheck = now - (cache.timestamp === now ? 0 : cache.timestamp);
		if (cache.timestamp !== now && timeSinceLastCheck < DEBOUNCE_TIME.AI.NODE_NAME_CHECK) {
			console.log(
				'[AI Node Names] Skipped: throttled, last check was',
				timeSinceLastCheck,
				'ms ago',
			);
			return;
		}

		cache.timestamp = now;
		isChecking.value = true;

		try {
			const nodesToSend = candidates.slice(0, 50).map(({ fingerprint: _, ...rest }) => rest);
			console.log('[AI Node Names] Calling API with', nodesToSend.length, 'nodes...');
			console.log('[AI Node Names] Nodes payload:', JSON.stringify(nodesToSend, null, 2));

			const response = await suggestNodeNames(rootStore.restApiContext, {
				nodes: nodesToSend,
				workflowName: workflowsStore.workflow.name,
			});

			// Cache all sent fingerprints (whether we got suggestions or not)
			for (const c of candidates.slice(0, 50)) {
				cache.fingerprints.add(c.fingerprint);
			}

			console.log('[AI Node Names] API response:', JSON.stringify(response, null, 2));

			const suggestions = response.suggestions;
			if (!suggestions || suggestions.length === 0) {
				console.log('[AI Node Names] No suggestions returned');
				return;
			}

			console.log(
				'[AI Node Names] Got',
				suggestions.length,
				'suggestions:',
				suggestions.map((s) => `${s.currentName} -> ${s.suggestedName}`),
			);

			if (suggestions.length === 1) {
				showSingleSuggestionToast(suggestions[0]);
			} else {
				showMultipleSuggestionsToast(suggestions);
			}
		} catch (error) {
			console.error('[AI Node Names] API error:', error);
		} finally {
			isChecking.value = false;
		}
	}

	function showSingleSuggestionToast(suggestion: AiNodeNameSuggestion) {
		toast.showToast({
			title: i18n.baseText('aiNodeNames.toast.title'),
			message: h('span', [
				i18n.baseText('aiNodeNames.toast.singleSuggestion', {
					interpolate: {
						currentName: suggestion.currentName,
						suggestedName: suggestion.suggestedName,
					},
				}),
				' ',
				h(
					'a',
					{
						style: 'cursor: pointer; text-decoration: underline;',
						onClick: () => {
							uiStore.openModalWithData({
								name: NODE_NAME_SUGGESTIONS_MODAL_KEY,
								data: { suggestions: [suggestion] },
							});
						},
					},
					i18n.baseText('aiNodeNames.toast.apply'),
				),
			]),
			type: 'info',
			duration: 10_000,
		});
	}

	function showMultipleSuggestionsToast(suggestions: AiNodeNameSuggestion[]) {
		toast.showToast({
			title: i18n.baseText('aiNodeNames.toast.title'),
			message: h('span', [
				i18n.baseText('aiNodeNames.toast.multipleSuggestions', {
					interpolate: { count: String(suggestions.length) },
				}),
				' ',
				h(
					'a',
					{
						style: 'cursor: pointer; text-decoration: underline;',
						onClick: () => {
							uiStore.openModalWithData({
								name: NODE_NAME_SUGGESTIONS_MODAL_KEY,
								data: { suggestions },
							});
						},
					},
					i18n.baseText('aiNodeNames.toast.review'),
				),
			]),
			type: 'info',
			duration: 15_000,
		});
	}

	/** Cache a renamed node so the next save doesn't re-evaluate it. */
	function cacheRenamedNode(newName: string) {
		const workflowId = workflowsStore.workflowId;
		const cache = workflowCache.get(workflowId);
		if (!cache) return;

		const node = workflowsStore.allNodes.find((n) => n.name === newName);
		if (!node) return;

		const fingerprint = computeFingerprint(node.id, node.name, node.parameters);
		cache.fingerprints.add(fingerprint);
		console.log('[AI Node Names] Cached renamed node:', newName, 'fingerprint:', fingerprint);
	}

	return {
		checkNodeNamesAfterSave,
		cacheRenamedNode,
		isChecking,
	};
}
