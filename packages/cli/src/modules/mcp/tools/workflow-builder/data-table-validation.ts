import type { ListDataTableQueryDto } from '@n8n/api-types';
import type { INode } from 'n8n-workflow';
import { isExpression, isResourceLocatorValue } from 'n8n-workflow';

import {
	isAllowedNode,
	type DataTableUserOperations,
} from '@/modules/data-table/data-table-proxy.service';

export interface DataTableValidationFailure {
	ok: false;
	error: string;
	opIndex?: number;
}

export interface DataTableValidationSuccess {
	ok: true;
}

export type DataTableValidationResult = DataTableValidationSuccess | DataTableValidationFailure;

type ResourceLocatorMode = 'list' | 'id' | 'name';

interface DataTableReference {
	mode: ResourceLocatorMode;
	value: string;
}

const isResourceLocatorMode = (v: unknown): v is ResourceLocatorMode =>
	v === 'list' || v === 'id' || v === 'name';

function extractDataTableReference(node: INode): DataTableReference | null {
	if (!isAllowedNode(node.type)) return null;

	const rl = node.parameters?.dataTableId;
	if (!isResourceLocatorValue(rl)) return null;
	if (typeof rl.value !== 'string' || rl.value === '') return null;
	if (isExpression(rl.value)) return null;

	const mode: ResourceLocatorMode = isResourceLocatorMode(rl.mode) ? rl.mode : 'id';
	return { mode, value: rl.value };
}

// `getManyAndCount` already filters by the caller's accessible projects, so a
// table in a project the user can't see correctly resolves as "not found".
async function checkDataTableReference(
	ref: DataTableReference,
	projectId: string,
	dataTableOps: DataTableUserOperations,
	cache: Map<string, boolean>,
): Promise<string | null> {
	const cacheKey = `${ref.mode}:${ref.value}:${projectId}`;
	const cached = cache.get(cacheKey);
	if (cached === true) return null;
	if (cached === false) return buildNotFoundError(ref);

	const filter =
		ref.mode === 'name' ? { name: ref.value, projectId } : { id: ref.value, projectId };

	try {
		const result = await dataTableOps.getManyAndCount({
			filter,
			take: 1,
		} as ListDataTableQueryDto);

		if (result.data.length === 0) {
			cache.set(cacheKey, false);
			return buildNotFoundError(ref);
		}

		cache.set(cacheKey, true);
		return null;
	} catch (error) {
		cache.set(cacheKey, false);
		const message = error instanceof Error ? error.message : String(error);
		return `${buildNotFoundError(ref)} (lookup failed: ${message})`;
	}
}

function buildNotFoundError(ref: DataTableReference): string {
	const lookupBy = ref.mode === 'name' ? 'name' : 'id';
	return (
		`data table with ${lookupBy} '${ref.value}' not found or not accessible in this project. ` +
		'Use `create_data_table` to create it first, or `search_data_tables` to find an existing one.'
	);
}

export async function validateDataTableReferencesForWorkflow(
	nodes: INode[],
	projectId: string,
	dataTableOps: DataTableUserOperations,
): Promise<DataTableValidationResult> {
	const cache = new Map<string, boolean>();

	for (const node of nodes) {
		const ref = extractDataTableReference(node);
		if (!ref) continue;

		const error = await checkDataTableReference(ref, projectId, dataTableOps, cache);
		if (error) {
			return { ok: false, error: `node '${node.name}': ${error}` };
		}
	}

	return { ok: true };
}

// Mirrors `validateCredentialReferences`: only nodes touched by this batch are
// checked, so a pre-existing dangling reference can't block an unrelated edit.
// `getProjectId` is lazy so callers skip the DB lookup when nothing matches.
export async function validateDataTableReferencesForUpdate(
	nodesAfterApply: INode[],
	touchedNodes: Map<string, number>,
	getProjectId: () => Promise<string>,
	dataTableOps: DataTableUserOperations,
): Promise<DataTableValidationResult> {
	if (touchedNodes.size === 0) return { ok: true };

	const cache = new Map<string, boolean>();
	let projectId: string | undefined;

	for (const node of nodesAfterApply) {
		const opIndex = touchedNodes.get(node.name);
		if (opIndex === undefined) continue;

		const ref = extractDataTableReference(node);
		if (!ref) continue;

		projectId ??= await getProjectId();

		const error = await checkDataTableReference(ref, projectId, dataTableOps, cache);
		if (error) {
			return {
				ok: false,
				opIndex,
				error: `Operation ${opIndex} failed: node '${node.name}': ${error}`,
			};
		}
	}

	return { ok: true };
}
