import type { CSSProperties } from 'vue';
import type { EventKind } from './session-timeline.types';
import { kindColorToken } from './session-timeline.utils';

/**
 * Shared kind-based colour treatments for the session timeline. Centralises
 * the `color-mix` recipes that previously lived inline in the row, chart
 * block, chart popover, and filter swatch — so adjusting the look (e.g.
 * stronger colours in light mode) only needs to happen in one place.
 *
 * The alpha percentages are exposed as CSS variables (`--color--session-timeline-pill-bg-alpha`,
 * `--color--session-timeline-block-bg-alpha`, `--color--session-timeline-row-border-alpha`, `--color--session-timeline-pill-text`)
 * defined globally on `body` by `AgentSessionTimelineView.vue` and switched
 * per theme there. Components just consume these helpers and don't think
 * about per-mode tuning.
 */

export function pillStyle(kind: EventKind): CSSProperties {
	return {
		backgroundColor: `color-mix(in srgb, ${kindColorToken(kind)} var(--color--session-timeline-pill-bg-alpha), transparent)`,
		color: 'var(--color--session-timeline-pill-text)',
	};
}

export function chartBlockStyle(kind: EventKind): CSSProperties {
	return {
		'--session-timeline-chart-block-color': `color-mix(in srgb, ${kindColorToken(kind)} var(--color--session-timeline-block-bg-alpha), transparent)`,
	};
}

export function rowBorderColor(kind: EventKind): string {
	return `color-mix(in srgb, ${kindColorToken(kind)} var(--color--session-timeline-row-border-alpha), transparent)`;
}

/**
 * Background colour for the small filter-dropdown swatch (uses the chart-block
 * alpha so the swatch matches the chart's bar treatment).
 */
export function swatchBackground(color: string): string {
	return `color-mix(in srgb, ${color} var(--color--session-timeline-block-bg-alpha), transparent)`;
}
