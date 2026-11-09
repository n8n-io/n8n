import type { IconName } from '@n8n/design-system';
import type { INode, INodeExecutionData } from 'n8n-workflow';
import type { Component } from 'vue';

import type { BUILT_IN_DISPLAY_MODES } from '../runDataDisplayModes';

/** A display mode the shell renders itself. */
export type BuiltInDisplayMode = (typeof BUILT_IN_DISPLAY_MODES)[number];

/** A built-in display mode, or the id of a display mode that a module registered. */
export type DisplayMode = BuiltInDisplayMode | (string & {});

/** The NDV pane that shows the run data. The Logs panel uses the same panes. */
export type RunDataDisplayModePane = 'input' | 'output';

/**
 * What the shell passes to `canRender`. `data` is not filtered by search, so
 * the option does not appear and disappear while the user types.
 */
export type RunDataDisplayModeContext = {
	/** All items of the selected run and output. Pinned data when the node has pinned data. */
	data: INodeExecutionData[];
	node: INode;
	pane: RunDataDisplayModePane;
};

/** Props the shell passes to every contributed display mode component. */
export type RunDataDisplayModeProps = {
	/** Filtered by search only when the mode sets `supports.search`. Never paginated. */
	data: INodeExecutionData[];
	node: INode;
	pane: RunDataDisplayModePane;
	runIndex: number;
	outputIndex: number;
	/** The search text. Always `''` unless the mode sets `supports.search`. */
	search: string;
	/** `true` in compact hosts such as the Logs panel. */
	compact: boolean;
};

/**
 * A component the shell can drive with `RunDataDisplayModeProps`. A component
 * that declares an incompatible prop is rejected at the registry boundary.
 */
export type RunDataDisplayModeComponent = Component<RunDataDisplayModeProps>;

/** Shell features that a display mode opts into. */
export type RunDataDisplayModeSupports = {
	/** The shell shows its search field and passes the search text and filtered items. */
	search?: boolean;
};

export type RunDataDisplayModeContribution = {
	/**
	 * The registry key. Also the stored display mode value and the telemetry
	 * `view` value, so do not change it after release.
	 */
	id: string;
	/** A getter, so the label follows a locale change. */
	label: () => string;
	/** Shown instead of the label in compact hosts such as the Logs panel. */
	icon: IconName;
	/**
	 * Lazy on purpose: a `() => import()` keeps the component out of the shell chunk.
	 *
	 * A bare function here is read as the loader. So a functional component must
	 * be wrapped (`defineComponent(fn)`) or it is called as a loader and never renders.
	 */
	component: RunDataDisplayModeComponent | (() => Promise<RunDataDisplayModeComponent>);
	/**
	 * Decides if the shell offers this mode for the current data.
	 *
	 * Must be synchronous and cheap. The shell calls it in a computed property,
	 * so it runs again on every change of the run data.
	 */
	canRender: (context: RunDataDisplayModeContext) => boolean;
	/**
	 * In the output pane, the shell selects this mode when the node opens or
	 * finishes a run, if `canRender` is true. Default false.
	 */
	autoSelect?: boolean;
	/** Shell features this mode opts into. Default: none. */
	supports?: RunDataDisplayModeSupports;
};
