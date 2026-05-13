import {
	type ExecuteEphemeralNodeResponse,
	executeEphemeralNodeResponseSchema,
	type ExecuteEphemeralNodeRequestDto,
} from '@n8n/api-types';
import { UnexpectedError } from 'n8n-workflow';
import type {
	IDataObject,
	INodeCredentialsDetails,
	INodeExecutionData,
	INodeParameters,
	INodeTypeDescription,
} from 'n8n-workflow';

import type {
	InlineNodeExecutionRequest,
	NodeExecutionResult,
} from '@/node-execution/ephemeral-node-executor';

import { EPHEMERAL_NODE_ALLOWLIST, isAllowlisted } from './ephemeral-nodes.allowlist';

// ─────────────────────────────────────────────────────────────────────────────
// Execute mapping — DTO ↔ inline executor
// ─────────────────────────────────────────────────────────────────────────────

export function toInlineRequest(
	dto: ExecuteEphemeralNodeRequestDto,
	projectId: string,
): InlineNodeExecutionRequest {
	return {
		nodeType: dto.nodeType,
		nodeTypeVersion: dto.nodeTypeVersion,
		nodeParameters: dto.nodeParameters as INodeParameters,
		credentialDetails: toCredentialDetails(dto.credentials),
		inputData: toInputData(dto.inputData),
		projectId,
	};
}

export function toPublicResponse(result: NodeExecutionResult): ExecuteEphemeralNodeResponse {
	const parsed = executeEphemeralNodeResponseSchema.safeParse({
		status: result.status,
		data: result.data.map((item) => item.json),
		error: result.error,
	});

	if (!parsed.success) {
		throw new UnexpectedError('Failed to serialize ephemeral node execution response', {
			cause: parsed.error,
		});
	}

	return parsed.data;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toCredentialDetails(
	credentials: ExecuteEphemeralNodeRequestDto['credentials'],
): Record<string, INodeCredentialsDetails> | undefined {
	if (!credentials) return undefined;
	return Object.fromEntries(
		Object.entries(credentials).map(([type, { id, name }]) => [type, { id, name }]),
	);
}

function toInputData(items: ExecuteEphemeralNodeRequestDto['inputData']): INodeExecutionData[] {
	return (items ?? []).map((item) => ({ json: item as IDataObject }));
}

// ─────────────────────────────────────────────────────────────────────────────
// List mapping — node catalogue → public listing entries
// ─────────────────────────────────────────────────────────────────────────────

export type EphemeralNode = {
	nodeType: string;
	nodeTypeVersion: number;
	displayName: string;
	description: string;
	category?: string;
	supportedCredentialTypes: string[];
};

export function mapToEphemeralNodeList(
	nodes: INodeTypeDescription[],
	filter: { nodeType?: string } = {},
): EphemeralNode[] {
	const allowlisted = nodes.filter(isAllowlisted).filter(isExecutableNode);
	const canonical = collapseToOneEntryPerName(allowlisted);
	const matchesFilter = (n: INodeTypeDescription) => !filter.nodeType || n.name === filter.nodeType;

	return canonical
		.filter(matchesFilter)
		.sort((a, b) => a.name.localeCompare(b.name))
		.map(toEphemeralNode);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const isExecutableNode = (n: INodeTypeDescription): boolean =>
	!n.hidden && !n.group.includes('trigger') && !n.polling && !n.webhooks?.length;

const maxVersion = (n: INodeTypeDescription): number => {
	if (!Array.isArray(n.version)) return n.version;
	return n.version.length > 0 ? Math.max(...n.version) : 0;
};

// `types.nodes` carries one entry per *version* for `VersionedNodeType` nodes
// (see `directory-loader.ts` — `getVersionedNodeTypeAll(...).forEach(... push)`).
// Collapse those down to one entry per node name, preferring the description
// whose `version` equals its declared `defaultVersion`; fall back to the
// highest-numbered version when no default is set.
const collapseToOneEntryPerName = (nodes: INodeTypeDescription[]): INodeTypeDescription[] => {
	const variantsByName = new Map<string, INodeTypeDescription[]>();
	for (const node of nodes) {
		const variants = variantsByName.get(node.name) ?? [];
		variants.push(node);
		variantsByName.set(node.name, variants);
	}

	return Array.from(variantsByName.values()).map(pickCanonicalVersion);
};

const pickCanonicalVersion = (variants: INodeTypeDescription[]): INodeTypeDescription => {
	const defaultVariant = variants.find((n) => n.version === n.defaultVersion);
	if (defaultVariant) return defaultVariant;

	return variants.reduce((best, candidate) =>
		maxVersion(candidate) > maxVersion(best) ? candidate : best,
	);
};

const toEphemeralNode = (n: INodeTypeDescription): EphemeralNode => {
	const nodeTypeVersion = n.defaultVersion ?? maxVersion(n);
	const category = n.codex?.categories?.[0] ?? n.group[0];
	// `n` reached this point only via `isAllowlisted`, so the lookup is total
	// in practice. Default to `[]` to keep the type honest.
	const supportedCredentialTypes =
		EPHEMERAL_NODE_ALLOWLIST.get(n.name)?.supportedCredentialTypes ?? [];

	return {
		nodeType: n.name,
		nodeTypeVersion,
		displayName: n.displayName,
		description: n.description,
		...(category ? { category } : {}),
		supportedCredentialTypes,
	};
};
