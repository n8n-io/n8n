import { nanoid } from 'nanoid';

import type {
	DashboardSpec,
	DashboardView,
	NormalizedDashboardSpec,
} from '@/features/core/dashboards/dashboards.types';

/**
 * Normalize a dashboard spec to v2 (views[]) shape.
 *
 * Legacy specs that carry a flat `widgets[]` are wrapped into a single
 * "Overview" view. Already-migrated specs are returned unchanged.
 */
export function migrateSpec(spec: DashboardSpec): NormalizedDashboardSpec {
	if (spec.views && spec.views.length > 0) {
		return {
			version: 1,
			views: spec.views,
			globalFilters: spec.globalFilters,
			actions: spec.actions,
		};
	}

	const legacyWidgets = (spec as { widgets?: DashboardView['widgets'] }).widgets ?? [];
	const overview: DashboardView = {
		id: nanoid(8),
		name: 'Overview',
		widgets: legacyWidgets,
	};

	return {
		version: 1,
		views: [overview],
		globalFilters: spec.globalFilters,
		actions: spec.actions,
	};
}

/** Strip the normalized spec back to a v2 spec for persistence (drops legacy `widgets` if present). */
export function denormalizeSpec(spec: NormalizedDashboardSpec): DashboardSpec {
	return {
		version: 1,
		views: spec.views,
		globalFilters: spec.globalFilters,
		actions: spec.actions,
	};
}
