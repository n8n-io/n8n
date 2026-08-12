import { computed, ref, unref, type ComputedRef, type MaybeRef, type Ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';

import type { INodeUi, IRunDataDisplayMode } from '@/Interface';
import { usePinnedData } from '@/app/composables/usePinnedData';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { generateSampleData } from '@/features/ai/instanceAi/instanceAi.api';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';

export type UseGenerateSampleDataOptions = {
	node: MaybeRef<INodeUi | null>;
	/** Read-only surface (read-only route, archived workflow, viewer role, ...). */
	isReadOnly?: MaybeRef<boolean>;
	/** Forwarded to `usePinnedData` so pinning telemetry keeps its context. */
	displayMode?: MaybeRef<IRunDataDisplayMode>;
	runIndex?: MaybeRef<number>;
};

export type UseGenerateSampleDataReturn = {
	isGenerating: Ref<boolean>;
	canGenerate: ComputedRef<boolean>;
	generate: () => Promise<void>;
};

/**
 * Asks the instance AI for realistic mock output items for a node and pins them
 * through the regular pin-data machinery.
 */
export function useGenerateSampleData(
	options: UseGenerateSampleDataOptions,
): UseGenerateSampleDataReturn {
	const i18n = useI18n();
	const toast = useToast();
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const sourceControlStore = useSourceControlStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();

	const pinnedData = usePinnedData(options.node, {
		displayMode: options.displayMode,
		runIndex: options.runIndex,
	});

	const isGenerating = ref(false);

	const isInstanceAiEnabled = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.enabled === true,
	);

	const canGenerate = computed(
		() =>
			isInstanceAiEnabled.value &&
			!unref(options.isReadOnly) &&
			!sourceControlStore.preferences.branchReadOnly &&
			pinnedData.canPinNode(false),
	);

	async function generate(): Promise<void> {
		const node = unref(options.node);

		if (!node || isGenerating.value || !canGenerate.value) return;

		isGenerating.value = true;

		try {
			const { name, nodes, connections } = workflowDocumentStore.value.getSnapshot();

			const response = await generateSampleData(rootStore.restApiContext, {
				workflow: {
					name,
					// The generator reads neither credentials nor pinned data, and pinned
					// data can be megabytes across already-pinned nodes.
					nodes: nodes.map(({ credentials: _credentials, ...rest }) => rest),
					connections,
				},
				nodeNames: [node.name],
			});

			const items = response.pinData[node.name];

			if (!items?.length) {
				toast.showError(
					new Error(i18n.baseText('ndv.output.generateSampleData.error.empty')),
					i18n.baseText('ndv.output.generateSampleData.error.title'),
				);
				return;
			}

			// Checked up front so the size error surfaces once, from `isValidSize`,
			// instead of also as the generic failure toast below.
			if (!pinnedData.isValidSize(items)) return;

			try {
				pinnedData.setData(items, 'ai-sample-data');
			} catch (error) {
				toast.showError(error, i18n.baseText('ndv.output.generateSampleData.error.title'));
				return;
			}

			const isDrift = response.warning === 'field-drift';

			toast.showMessage({
				title: i18n.baseText(
					isDrift
						? 'ndv.output.generateSampleData.drift.title'
						: 'ndv.output.generateSampleData.success.title',
				),
				message: i18n.baseText(
					isDrift
						? 'ndv.output.generateSampleData.drift.message'
						: 'ndv.output.generateSampleData.success.message',
				),
				type: isDrift ? 'warning' : 'success',
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('ndv.output.generateSampleData.error.title'));
		} finally {
			isGenerating.value = false;
		}
	}

	return { isGenerating, canGenerate, generate };
}
