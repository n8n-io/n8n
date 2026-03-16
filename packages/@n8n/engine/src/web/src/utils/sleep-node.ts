/**
 * Shared helpers for rendering sleep/wait nodes in both
 * the workflow graph canvas and the execution graph.
 */

export function formatSleepDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60_000) return `${ms / 1000}s`;
	if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
	return `${Math.round(ms / 3_600_000)}h`;
}

export function getSleepLabel(config?: Record<string, unknown>): string {
	if (!config) return 'Sleep';
	if (typeof config.sleepMs === 'number') return `Sleep ${formatSleepDuration(config.sleepMs)}`;
	if (config.waitUntilExpr) return 'Wait Until';
	return 'Sleep';
}

export function getSleepDetail(config?: Record<string, unknown>): string | undefined {
	if (!config) return undefined;
	if (config.waitUntilExpr) return String(config.waitUntilExpr);
	return undefined;
}

/** The color used for sleep nodes across both canvases */
export const SLEEP_NODE_COLOR = '#4a9eff';
