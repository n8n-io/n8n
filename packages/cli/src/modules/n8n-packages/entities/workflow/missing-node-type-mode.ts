import { collectNodeTypeUsage, type NodeTypeUsage } from './node-type-usage';
import type { PreparedWorkflow } from './workflow-import.types';
import type { MissingNodeTypeMode } from '../../n8n-packages.types';

/** A `(type, typeVersion)` pair the target instance cannot resolve. Field names align with the manifest requirements shape. */
export type MissingNodeTypeRequirement = NodeTypeUsage;

/**
 * Folds the packaged workflows' nodes into unique `(type, typeVersion)` pairs
 * and returns the ones the instance cannot resolve. Read-only.
 */
export function collectMissingNodeTypes(
	workflows: PreparedWorkflow[],
	getSupportedVersions: (nodeType: string) => number[] | undefined,
): MissingNodeTypeRequirement[] {
	const usage = collectNodeTypeUsage(
		workflows.map(({ entity, sourceWorkflowId }) => ({
			workflowId: sourceWorkflowId,
			nodes: entity.nodes,
		})),
	);

	const supportedByType = new Map<string, number[] | undefined>();
	return usage.filter(({ type, typeVersion }) => {
		if (!supportedByType.has(type)) {
			supportedByType.set(type, getSupportedVersions(type));
		}
		return !supportedByType.get(type)?.includes(typeVersion);
	});
}

/* eslint-disable @typescript-eslint/naming-convention -- API missing node type mode keys */
const BLOCKING_FAILURES: Record<
	MissingNodeTypeMode,
	(missing: MissingNodeTypeRequirement[]) => MissingNodeTypeRequirement[]
> = {
	fail: (missing) => missing,
	'import-anyway': () => [],
};
/* eslint-enable @typescript-eslint/naming-convention */

export function missingNodeTypeBlockingFailures(
	mode: MissingNodeTypeMode,
	missing: MissingNodeTypeRequirement[],
): MissingNodeTypeRequirement[] {
	return BLOCKING_FAILURES[mode](missing);
}

/** Package workflow ids that should not be published because they use missing node types. */
export function workflowsWithMissingNodeTypes(missing: MissingNodeTypeRequirement[]): Set<string> {
	return new Set(missing.flatMap(({ usedByWorkflows }) => usedByWorkflows));
}
