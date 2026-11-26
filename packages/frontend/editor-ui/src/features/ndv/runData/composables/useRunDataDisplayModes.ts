import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { INode, INodeExecutionData } from 'n8n-workflow';
import { runDataDisplayModeRegistry } from '@n8n/frontend-module-sdk';
import type {
	DisplayMode,
	RunDataDisplayModeContext,
	RunDataDisplayModeContribution,
	RunDataDisplayModePane,
} from '@n8n/frontend-module-sdk';

// Module scope, so a failing mode warns once per page load, not once per render
const warnedContributions = new WeakSet<RunDataDisplayModeContribution>();

/** A module's `canRender` must not break the panel, so a throw hides that mode. */
function safeCanRender(
	mode: RunDataDisplayModeContribution,
	context: RunDataDisplayModeContext,
): boolean {
	try {
		return mode.canRender(context);
	} catch (error) {
		if (!warnedContributions.has(mode)) {
			warnedContributions.add(mode);
			console.warn(`Display mode "${mode.id}" threw in canRender. Hiding it.`, error);
		}
		return false;
	}
}

/** The registered display modes that apply to the run data of one pane. */
export function useRunDataDisplayModes(options: {
	node: MaybeRefOrGetter<INode | null | undefined>;
	pane: MaybeRefOrGetter<RunDataDisplayModePane>;
	data: MaybeRefOrGetter<INodeExecutionData[]>;
}) {
	const availableDisplayModes = computed(() => {
		const node = toValue(options.node);
		if (!node) return [];

		const context = { node, pane: toValue(options.pane), data: toValue(options.data) };
		return runDataDisplayModeRegistry.getAll().filter((mode) => safeCanRender(mode, context));
	});

	// The SDK contract: `autoSelect` applies to the output pane only
	const displayModeToAutoSelect = computed(() =>
		toValue(options.pane) === 'output'
			? availableDisplayModes.value.find((mode) => mode.autoSelect)
			: undefined,
	);

	function getAvailableDisplayMode(id: DisplayMode) {
		return availableDisplayModes.value.find((mode) => mode.id === id);
	}

	return { availableDisplayModes, displayModeToAutoSelect, getAvailableDisplayMode };
}
