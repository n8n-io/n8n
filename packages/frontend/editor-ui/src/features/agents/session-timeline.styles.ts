import type { CSSProperties } from 'vue';
import type { EventKind, TimelineItem, TimelineStatusFilterKey } from './session-timeline.types';
import { isErroredTimelineItem, isSubAgentTimelineItem } from './session-timeline.utils';

type TimelineColorKind = EventKind | 'idle' | 'subagent' | TimelineStatusFilterKey;
type TimelinePillColors = Pick<CSSProperties, 'backgroundColor' | 'color'>;

interface TimelineColors {
	chart: string;
	pill: TimelinePillColors;
}

type ColorFamily =
	| 'blue'
	| 'purple'
	| 'orange'
	| 'mint'
	| 'green'
	| 'pink'
	| 'neutral'
	| 'red'
	| 'yellow';

const COLOR_FAMILIES: Record<TimelineColorKind, ColorFamily> = {
	user: 'blue',
	agent: 'purple',
	skill: 'orange',
	memory: 'yellow',
	tool: 'green',
	node: 'neutral',
	workflow: 'pink',
	'execution-error': 'red',
	suspension: 'yellow',
	'hitl-response': 'blue',
	'background-task-signal': 'mint',
	'background-task': 'mint',
	idle: 'yellow',
	subagent: 'mint',
	approved: 'green',
	declined: 'neutral',
	error: 'red',
};

/** Event swatches use chart colors. Status swatches keep their status colors. */
export function timelineColors(kind: TimelineColorKind): TimelineColors {
	const family = COLOR_FAMILIES[kind];
	const isError = kind === 'execution-error' || kind === 'error';
	const chartFamily =
		kind === 'user' || kind === 'agent' || kind === 'subagent' || kind === 'approved' || isError
			? family
			: 'neutral';

	return {
		chart: `var(--color--${chartFamily}-600)`,
		pill: {
			backgroundColor: `var(--color--${family}-${isError ? '150' : '200'})`,
			color: isError ? 'var(--text-color--danger)' : `var(--color--${family}-950)`,
		},
	};
}

export function chartBlockStyleForItem(item: TimelineItem): CSSProperties {
	const kind = isErroredTimelineItem(item)
		? 'execution-error'
		: isSubAgentTimelineItem(item)
			? 'subagent'
			: item.kind;

	return { '--session-timeline-chart-block-color': timelineColors(kind).chart };
}
