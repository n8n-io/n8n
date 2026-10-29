import { collectNodeTypeUsage, type NodeTypeUsage, type NodeTypeSource } from './node-type-usage';
import type { PreparedWorkflow } from './workflow-import.types';
import type { MissingNodeTypeMode } from '../../n8n-packages.types';
import { getRequirementConsumerIds } from '../../spec/requirement-consumers';
import type { PackageRequirementConsumer } from '../../spec/requirements.schema';

/** A `(type, typeVersion)` pair the target instance cannot resolve. Field names align with the manifest requirements shape. */
export type MissingNodeTypeRequirement = NodeTypeUsage;

/**
 * Folds the packaged workflows' nodes into unique `(type, typeVersion)` pairs
 * and returns the ones the instance cannot resolve. Read-only.
 */
export function collectMissingNodeTypes(
	workflows: PreparedWorkflow[],
	getSupportedVersions: (nodeType: string) => number[] | undefined,
	agentSources: NodeTypeSource[] = [],
): MissingNodeTypeRequirement[] {
	const usage = collectNodeTypeUsage([
		...workflows.map(({ entity, sourceWorkflowId }) => ({
			workflowId: sourceWorkflowId,
			nodes: entity.nodes,
		})),
		...agentSources,
	]);

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

/** Package consumer IDs that use missing node types. */
export function consumersWithMissingNodeTypes(
	missing: MissingNodeTypeRequirement[],
	kind: PackageRequirementConsumer['kind'],
): Set<string> {
	return new Set(missing.flatMap((requirement) => getRequirementConsumerIds(requirement, kind)));
}
