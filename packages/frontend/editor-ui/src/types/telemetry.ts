import type { ComputedRef } from 'vue';

export type TelemetryNdvType = 'ndv' | 'focus_panel' | 'zoomed_view';

export type TelemetryNdvSource =
	| 'added_new_node'
	| 'canvas_default_view'
	| 'canvas_zoomed_view'
	| 'focus_panel'
	| 'logs_view'
	| 'command_bar'
	| 'other';

export type TelemetryContext = Partial<{
	view_shown: TelemetryNdvType;
	ndv_source: ComputedRef<TelemetryNdvSource | undefined>;
}>;
