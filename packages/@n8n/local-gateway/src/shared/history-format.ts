import type { DesktopAssistantHistoryEntry } from './types';

/** The execution status union, sourced from the shared DTO so this module
 * needs no direct `n8n-workflow` dependency. */
type ExecutionStatus = DesktopAssistantHistoryEntry['status'];

/**
 * How a history row presents an execution: which icon and accent it gets, and a
 * coarse `kind` the row uses to decide affordances (only `failed` rows show the
 * "Fix" link). Kept framework-free so it can be unit-tested under the
 * node-environment vitest config used by this package.
 */
export type HistoryStatusKind = 'done' | 'running' | 'failed' | 'unknown';

export interface StatusPresentation {
	kind: HistoryStatusKind;
	/** A `@n8n/design-system` icon name (from `updatedIconSet`). */
	icon: 'check' | 'spinner' | 'triangle-alert';
	/** A CSS custom-property reference from `assistant-theme.css`. */
	colorVar: string;
}

export function statusPresentation(status: ExecutionStatus): StatusPresentation {
	switch (status) {
		case 'success':
			return { kind: 'done', icon: 'check', colorVar: 'var(--da-green)' };
		case 'running':
		case 'new':
		case 'waiting':
			return { kind: 'running', icon: 'spinner', colorVar: 'var(--da-amber)' };
		case 'error':
		case 'crashed':
		case 'canceled':
			return { kind: 'failed', icon: 'triangle-alert', colorVar: 'var(--da-red)' };
		default:
			return { kind: 'unknown', icon: 'triangle-alert', colorVar: 'var(--da-subtlest)' };
	}
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Format an execution timestamp as a coarse relative string ("just now",
 * "2 hours ago", "1 day ago"). `now` is injected (epoch ms) so the result is
 * deterministic and testable. Returns an empty string for missing/invalid input.
 */
export function formatRelativeTime(iso: string | null, now: number): string {
	if (!iso) return '';
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return '';

	const seconds = Math.max(0, Math.floor((now - then) / 1000));
	if (seconds < MINUTE) return 'just now';

	const plural = (value: number, unit: string) => `${value} ${unit}${value === 1 ? '' : 's'} ago`;
	if (seconds < HOUR) return plural(Math.floor(seconds / MINUTE), 'minute');
	if (seconds < DAY) return plural(Math.floor(seconds / HOUR), 'hour');
	return plural(Math.floor(seconds / DAY), 'day');
}

/**
 * Format minutes-saved for the History "Time saved" panel. Zero (or less) renders
 * as a motivational dash rather than "0m" — a fresh user, or workflows without a
 * `timeSavedPerExecution` estimate, still see the panel as a nudge.
 */
export function formatMinutesSaved(minutes: number): string {
	if (!Number.isFinite(minutes) || minutes <= 0) return '--';
	const total = Math.round(minutes);
	const hours = Math.floor(total / 60);
	const mins = total % 60;
	if (hours === 0) return `${mins}m`;
	if (mins === 0) return `${hours}h`;
	return `${hours}h ${mins}m`;
}
