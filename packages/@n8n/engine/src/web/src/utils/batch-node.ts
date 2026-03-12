/**
 * Shared helpers for rendering batch nodes in both
 * the workflow graph canvas and the execution graph.
 */

export const BATCH_NODE_COLOR = '#f97316';

export function getBatchLabel(config?: Record<string, unknown>): string {
	if (!config) return 'Batch';
	return (config.name as string) ?? 'Batch';
}

export function getBatchDetail(config?: Record<string, unknown>): string | undefined {
	if (!config) return undefined;
	const strategy = config.onItemFailure as string | undefined;
	if (strategy) return `on failure: ${strategy}`;
	return undefined;
}
