import { computed, ref, unref } from 'vue';
import type { MaybeRef } from 'vue';
import { z } from 'zod';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { INodeUi } from '@/Interface';
import { useToast } from '@/app/composables/useToast';
import { usePinnedData } from '@/app/composables/usePinnedData';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { generateCodeForPrompt } from '@/features/ai/assistant/assistant.api';
import type { AskAiRequest } from '@/features/ai/assistant/assistant.types';

const MAX_ITEMS = 3;

const sampleItemsSchema = z.array(z.record(z.string(), z.unknown())).min(1, 'empty').max(50);

function buildPrompt(node: INodeUi): string {
	const params = JSON.stringify(node.parameters ?? {}, null, 2);
	return [
		'You are generating realistic mock OUTPUT data for an n8n node so that downstream nodes can be tested without executing the upstream trigger.',
		`Node type: ${node.type} (version ${node.typeVersion}).`,
		`Node parameters:\n${params}`,
		'',
		'Return ONLY a raw JSON array (no prose, no Markdown fences, no explanation) of 2 to 3 items.',
		'Each item MUST be a JSON object representing one realistic record this node would output.',
		`Use field names a real ${node.type} response would use. Use realistic-looking IDs, timestamps in ISO 8601, and plausible string values. Do NOT include comments.`,
	].join('\n');
}

function stripCodeFences(raw: string): string {
	const trimmed = raw.trim();
	const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
	return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

export function useGenerateSampleData(node: MaybeRef<INodeUi | null>) {
	const i18n = useI18n();
	const toast = useToast();
	const rootStore = useRootStore();
	const ndvStore = useNDVStore();
	const pinnedData = usePinnedData(node);

	const isGenerating = ref(false);

	const canGenerate = computed(() => {
		const target = unref(node);
		return !!target && pinnedData.isValidNodeType.value && pinnedData.canPinNode(false);
	});

	async function generate(): Promise<void> {
		const target = unref(node);
		if (!target || isGenerating.value) return;

		isGenerating.value = true;
		try {
			const payload: AskAiRequest.RequestPayload = {
				question: buildPrompt(target),
				context: {
					schema: [],
					inputSchema: {
						nodeName: target.name,
						schema: { type: 'object', value: [], path: '' },
					},
					pushRef: rootStore.pushRef,
					ndvPushRef: ndvStore.pushRef,
				},
				forNode: 'transform',
			};

			const { code } = await generateCodeForPrompt(rootStore.restApiContext, payload);

			let parsed: unknown;
			try {
				parsed = JSON.parse(stripCodeFences(code));
			} catch {
				toast.showError(
					new Error(i18n.baseText('ndv.pinData.generate.error.invalidResponse')),
					i18n.baseText('ndv.pinData.generate.title'),
				);
				return;
			}

			const result = sampleItemsSchema.safeParse(parsed);
			if (!result.success) {
				const key =
					result.error.issues[0]?.message === 'empty'
						? 'ndv.pinData.generate.error.emptyResponse'
						: 'ndv.pinData.generate.error.invalidResponse';
				toast.showError(new Error(i18n.baseText(key)), i18n.baseText('ndv.pinData.generate.title'));
				return;
			}

			const items: INodeExecutionData[] = result.data
				.slice(0, MAX_ITEMS)
				.map((json) => ({ json: json as IDataObject }));

			pinnedData.setData(items, 'pin-icon-click');

			toast.showMessage({
				title: i18n.baseText('ndv.pinData.generate.title'),
				message: i18n.baseText('ndv.pinData.generate.success'),
				type: 'success',
			});
		} catch (error) {
			toast.showError(
				error instanceof Error ? error : new Error(String(error)),
				i18n.baseText('ndv.pinData.generate.error.generic'),
			);
		} finally {
			isGenerating.value = false;
		}
	}

	return { generate, isGenerating, canGenerate };
}
