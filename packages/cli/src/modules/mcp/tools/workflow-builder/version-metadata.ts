import type { IConnections, INode } from 'n8n-workflow';
import { compareConnections, compareWorkflowsNodes, NodeDiffStatus } from 'n8n-workflow';
import z from 'zod';

export const MAX_VERSION_NAME_LENGTH = 80;
export const MAX_VERSION_DESCRIPTION_LENGTH = 1000;

// Optional (not required) so MCP clients holding a cached tool schema from
// before these params existed keep working; omission falls back to the
// deterministic diff-based metadata.
export const versionNameInputSchema = z.string().min(1).max(MAX_VERSION_NAME_LENGTH).optional();
export const versionDescriptionInputSchema = z
	.string()
	.max(MAX_VERSION_DESCRIPTION_LENGTH)
	.optional();

const MAX_LISTED_NODES = 5;

export type VersionMetadata = { name: string; description: string };

function truncate(text: string, maxLength: number): string {
	return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

function listNames(names: string[]): string {
	if (names.length <= MAX_LISTED_NODES) return names.join(', ');
	const shown = names.slice(0, MAX_LISTED_NODES).join(', ');
	return `${shown} and ${names.length - MAX_LISTED_NODES} more`;
}

function countConnections(diff: Record<string, Record<string, unknown[]>>): number {
	let count = 0;
	for (const inputs of Object.values(diff)) {
		for (const entries of Object.values(inputs)) {
			count += entries.length;
		}
	}
	return count;
}

/**
 * Deterministic version metadata for the first version of a workflow created
 * via MCP. Used when the MCP client did not provide a version name itself.
 */
export function buildCreateVersionMetadata(nodes: INode[]): VersionMetadata {
	const nodeNames = nodes.map((node) => node.name);
	return {
		name: 'Initial version',
		description: truncate(
			`Created with ${nodes.length} node${nodes.length === 1 ? '' : 's'}: ${listNames(nodeNames)}`,
			MAX_VERSION_DESCRIPTION_LENGTH,
		),
	};
}

/**
 * Deterministic diff-based version metadata for a workflow update via MCP.
 * Summarizes node additions/removals/changes and connection rewiring between
 * the previous and the resulting workflow. Used when the MCP client did not
 * provide a version name itself.
 */
export function buildUpdateVersionMetadata(
	previous: { nodes: INode[]; connections: IConnections },
	next: { nodes: INode[]; connections: IConnections },
): VersionMetadata {
	const nodeDiff = compareWorkflowsNodes(previous.nodes, next.nodes);
	// The diff stores the pre-change node for modified entries; report the
	// post-change name so a renamed node is listed by a name that still exists.
	const nextNodesById = new Map(next.nodes.map((node) => [node.id, node]));

	const added: string[] = [];
	const removed: string[] = [];
	const modified: string[] = [];
	for (const { status, node } of nodeDiff.values()) {
		if (status === NodeDiffStatus.Added) added.push(node.name);
		else if (status === NodeDiffStatus.Deleted) removed.push(node.name);
		else if (status === NodeDiffStatus.Modified) {
			modified.push(nextNodesById.get(node.id)?.name ?? node.name);
		}
	}

	const connectionsDiff = compareConnections(previous.connections, next.connections);
	const connectionsAdded = countConnections(connectionsDiff.added);
	const connectionsRemoved = countConnections(connectionsDiff.removed);

	const nameParts: string[] = [];
	if (added.length) nameParts.push(`added ${listNames(added)}`);
	if (removed.length) nameParts.push(`removed ${listNames(removed)}`);
	if (modified.length) nameParts.push(`updated ${listNames(modified)}`);
	if (!nameParts.length && (connectionsAdded || connectionsRemoved)) {
		nameParts.push('rewired connections');
	}

	const descriptionParts: string[] = [];
	if (added.length) descriptionParts.push(`Added nodes: ${listNames(added)}`);
	if (removed.length) descriptionParts.push(`Removed nodes: ${listNames(removed)}`);
	if (modified.length) descriptionParts.push(`Updated nodes: ${listNames(modified)}`);
	if (connectionsAdded || connectionsRemoved) {
		descriptionParts.push(`Connections: ${connectionsAdded} added, ${connectionsRemoved} removed`);
	}

	// e.g. a node-groups-only change produces no node or connection diff
	if (!nameParts.length) nameParts.push('updated workflow');
	if (!descriptionParts.length) descriptionParts.push('Updated workflow');

	const name = nameParts.join('; ');
	return {
		name: truncate(name.charAt(0).toUpperCase() + name.slice(1), MAX_VERSION_NAME_LENGTH),
		description: truncate(descriptionParts.join('\n'), MAX_VERSION_DESCRIPTION_LENGTH),
	};
}

/**
 * Deterministic version metadata for a version created by restoring a previous
 * one. A restore is fully described by its source version, so there is no
 * client-provided variant.
 */
export function buildRestoreVersionMetadata(restoredFrom: {
	versionId: string;
	name: string | null;
	createdAt: Date;
}): VersionMetadata {
	const label = restoredFrom.name
		? `"${restoredFrom.name}"`
		: `version ${restoredFrom.versionId.slice(0, 8)}`;
	return {
		name: truncate(`Restored ${label}`, MAX_VERSION_NAME_LENGTH),
		description: truncate(
			`Restored to version ${restoredFrom.versionId} (created ${restoredFrom.createdAt.toISOString()})`,
			MAX_VERSION_DESCRIPTION_LENGTH,
		),
	};
}

/**
 * Resolves the version metadata to persist: the MCP client's own summary when
 * provided, otherwise the deterministic fallback.
 */
export function resolveVersionMetadata(
	provided: { versionName?: string; versionDescription?: string },
	fallback: VersionMetadata,
): VersionMetadata {
	// No re-truncation of provided values; the tool input schemas cap lengths.
	return {
		name: provided.versionName?.trim() || fallback.name,
		description: provided.versionDescription?.trim() || fallback.description,
	};
}
