import type { CSSProperties } from 'vue';
import type { EventKind } from './session-timeline.types';
import { chartBlockColor } from './session-timeline.utils';
type TimelinePillKind = EventKind | 'idle';

export function pillColors(
	kind: TimelinePillKind,
): Pick<CSSProperties, 'backgroundColor' | 'color'> {
	switch (kind) {
		case 'user':
			return { backgroundColor: 'var(--color--blue-200)', color: 'var(--color--blue-950)' };
		case 'agent':
			return { backgroundColor: 'var(--color--purple-200)', color: 'var(--color--purple-950)' };
		case 'tool':
			return { backgroundColor: 'var(--color--green-200)', color: 'var(--color--green-950)' };
		case 'workflow':
			return { backgroundColor: 'var(--color--orange-200)', color: 'var(--color--orange-950)' };
		case 'node':
			return { backgroundColor: 'var(--color--neutral-200)', color: 'var(--color--neutral-950)' };
		case 'working-memory':
			return { backgroundColor: 'var(--color--mint-200)', color: 'var(--color--mint-950)' };
		case 'suspension':
		case 'idle':
			return { backgroundColor: 'var(--color--yellow-200)', color: 'var(--color--yellow-950)' };
		default:
			return { backgroundColor: 'var(--color--neutral-200)', color: 'var(--color--neutral-950)' };
	}
}

export function chartBlockStyle(kind: EventKind): CSSProperties {
	return {
		'--session-timeline-chart-block-color': chartBlockColor(kind),
	};
}

/**
 * Background colour for the small filter-dropdown swatch (uses the chart-block
 * alpha so the swatch matches the chart's bar treatment).
 */
export function swatchBackground(color: string): string {
	return `color-mix(in srgb, ${color} var(--color--session-timeline-block-bg-alpha), transparent)`;
}
