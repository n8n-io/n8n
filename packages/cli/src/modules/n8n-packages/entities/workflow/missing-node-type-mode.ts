import type { PreparedWorkflow } from './workflow-import.types';
import type { MissingNodeTypeMode } from '../../n8n-packages.types';

/** A `(type, typeVersion)` pair the target instance cannot resolve. Field names align with the manifest requirements shape. */
export interface MissingNodeTypeRequirement {
	type: string;
	typeVersion: number;
	usedByWorkflows: string[];
}

/**
 * Folds every node of the packaged workflows into unique `(type, typeVersion)`
 * pairs and returns the ones the instance cannot resolve. Disabled nodes still
 * count — they render on canvas and are part of the content. Read-only.
 */
export function collectMissingNodeTypes(
	workflows: PreparedWorkflow[],
	getSupportedVersions: (nodeType: string) => number[] | undefined,
): MissingNodeTypeRequirement[] {
	const supportedByType = new Map<string, number[] | undefined>();
	const missing = new Map<string, MissingNodeTypeRequirement>();

	for (const { entity, sourceWorkflowId } of workflows) {
		for (const node of entity.nodes) {
			if (!supportedByType.has(node.type)) {
				supportedByType.set(node.type, getSupportedVersions(node.type));
			}
			if (supportedByType.get(node.type)?.includes(node.typeVersion)) continue;

			const key = `${node.type}@${node.typeVersion}`;
			const requirement = missing.get(key);
			if (requirement) {
				// Workflows fold sequentially, so a duplicate id can only be the last pushed.
				if (requirement.usedByWorkflows.at(-1) !== sourceWorkflowId) {
					requirement.usedByWorkflows.push(sourceWorkflowId);
				}
				continue;
			}

			missing.set(key, {
				type: node.type,
				typeVersion: node.typeVersion,
				usedByWorkflows: [sourceWorkflowId],
			});
		}
	}

	return [...missing.values()];
}

/**
 * Classifies which missing node types block the import, per missing-mode policy.
 */
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
