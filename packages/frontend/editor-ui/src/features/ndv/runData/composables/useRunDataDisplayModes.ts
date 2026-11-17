import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { INode, INodeExecutionData } from 'n8n-workflow';
import { BUILT_IN_DISPLAY_MODES, runDataDisplayModeRegistry } from '@n8n/frontend-module-sdk';
import type {
	BuiltInDisplayMode,
	DisplayMode,
	RunDataDisplayModeContext,
	RunDataDisplayModeContribution,
	RunDataDisplayModePane,
} from '@n8n/frontend-module-sdk';

import { resolveContributedComponent } from '@/app/utils/resolveContributedComponent';

export const PANE_DEFAULT_DISPLAY_MODE = {
	input: 'schema',
	output: 'table',
} as const satisfies Record<RunDataDisplayModePane, BuiltInDisplayMode>;

/**
 * Returns the stored mode if the shell can still render it. A stored id can be
 * unknown after a rollback, an uninstall or a rename, so it falls back to the
 * pane default. Storage keeps the id, so the choice returns with the module.
 */
export function resolveDisplayMode(stored: DisplayMode, pane: RunDataDisplayModePane): DisplayMode {
	const isBuiltIn = BUILT_IN_DISPLAY_MODES.some((mode) => mode === stored);
	return isBuiltIn || runDataDisplayModeRegistry.has(stored)
		? stored
		: PANE_DEFAULT_DISPLAY_MODE[pane];
}

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
	const available = computed(() => {
		const node = toValue(options.node);
		if (!node) return [];

		const context = { node, pane: toValue(options.pane), data: toValue(options.data) };
		return runDataDisplayModeRegistry.getAll().filter((mode) => safeCanRender(mode, context));
	});

	const autoSelectCandidate = computed(() => available.value.find((mode) => mode.autoSelect));

	function getRenderer(id: DisplayMode) {
		return available.value.find((mode) => mode.id === id);
	}

	function componentFor(mode: RunDataDisplayModeContribution) {
		return resolveContributedComponent(mode.component);
	}

	return { available, autoSelectCandidate, getRenderer, componentFor };
}
