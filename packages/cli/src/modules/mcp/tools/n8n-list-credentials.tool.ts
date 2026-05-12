import type { User } from '@n8n/db';
import type { INodeTypeDescription } from 'n8n-workflow';
import z from 'zod';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { NodeCatalogService } from '@/node-catalog';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';

const MAX_RESULTS = 200;

const inputSchema = {
	nodeType: z
		.string()
		.optional()
		.describe(
			'Optional node-type filter (e.g. "slack"). Resolves to the credential type via the node catalog; if it cannot be resolved the filter is ignored and all credentials are returned.',
		),
} satisfies z.ZodRawShape;

const outputSchema = {
	credentials: z
		.array(
			z.object({
				id: z.string().describe('The unique identifier of the credential'),
				name: z.string().describe('The name of the credential'),
				type: z.string().describe('The credential type (e.g. "slackApi")'),
			}),
		)
		.describe(
			"List of the user's connected credentials. Names and types only — never secret data.",
		),
	error: z.string().optional().describe('Error message when the tool failed'),
} satisfies z.ZodRawShape;

export type N8nListCredentialsParams = {
	nodeType?: string;
};

export type N8nListCredentialsItem = {
	id: string;
	name: string;
	type: string;
};

export type N8nListCredentialsResult = {
	credentials: N8nListCredentialsItem[];
	error?: string;
};

/**
 * Project a credential entity down to a strictly-safe shape: only `id`, `name`, `type`.
 * Anything else (including `data`, secrets, scopes, project info) is intentionally dropped.
 */
function projectCredential(c: { id: string; name: string; type: string }): N8nListCredentialsItem {
	return { id: c.id, name: c.name, type: c.type };
}

/**
 * Resolve a user-facing `nodeType` string (e.g. "slack") to the list of credential type names
 * declared by the matching node's description (e.g. ["slackApi", "slackOAuth2Api"]).
 *
 * Strategy:
 * 1. Exact lookup against the node-type index (`getNodeType(nodeType)`).
 * 2. Fallback: search the catalog for the query and try the top hit.
 *
 * Returns an empty array if nothing resolves. Callers should treat an empty array
 * as "drop the filter" rather than "no matches".
 */
function resolveCredentialTypesForNode(
	nodeCatalogService: NodeCatalogService,
	nodeType: string,
): string[] {
	let parser: ReturnType<NodeCatalogService['getNodeTypeParser']>;
	try {
		parser = nodeCatalogService.getNodeTypeParser();
	} catch {
		return [];
	}

	const collect = (description: INodeTypeDescription | null | undefined): string[] => {
		if (!description?.credentials) return [];
		return description.credentials.map((c) => c.name).filter((n): n is string => Boolean(n));
	};

	// 1. Exact lookup
	const exact = parser.getNodeType(nodeType);
	const exactCreds = collect(exact);
	if (exactCreds.length) return exactCreds;

	// 2. Fallback: search by name and try the top hit
	const matches = parser.searchNodeTypes(nodeType, 1);
	if (matches.length === 0) return [];
	const top = parser.getNodeType(matches[0].id);
	return collect(top);
}

export const createN8nListCredentialsTool = (
	user: User,
	credentialsService: CredentialsService,
	nodeCatalogService: NodeCatalogService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'n8n_list_credentials',
	config: {
		description:
			"List the user's connected credentials (names and types only — never secret data). Optionally filter by node-type (e.g. `slack` returns Slack OAuth credentials).",
		inputSchema,
		outputSchema,
		annotations: {
			title: 'List n8n Credentials',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ nodeType }: N8nListCredentialsParams) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'n8n_list_credentials',
			parameters: { nodeType },
		};

		try {
			const payload = await listN8nCredentials(user, credentialsService, nodeCatalogService, {
				nodeType,
			});

			telemetryPayload.results = {
				success: true,
				data: { count: payload.credentials.length },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(payload) }],
				structuredContent: payload,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			telemetryPayload.results = {
				success: false,
				error: errorMessage,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output: N8nListCredentialsResult = {
				credentials: [],
				error: errorMessage,
			};
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});

export async function listN8nCredentials(
	user: User,
	credentialsService: CredentialsService,
	nodeCatalogService: NodeCatalogService,
	{ nodeType }: N8nListCredentialsParams,
): Promise<N8nListCredentialsResult> {
	const credentialTypes = nodeType
		? resolveCredentialTypesForNode(nodeCatalogService, nodeType)
		: [];

	// If the user asked for a filter but we couldn't resolve it, drop the filter
	// (return all credentials) rather than returning an empty list with no signal.
	// This matches the documented behaviour: "If resolution fails, ignore the filter".
	//
	// The list-by-type filter on getMany() is a partial-match (LIKE) on the credential
	// `type` column; a single substring like "slack" matches both "slackApi" and
	// "slackOAuth2Api" cleanly. When multiple credential types resolve we use the
	// node id as the prefix (e.g. "slack") so all matching types are returned.
	const typeFilter = pickTypeFilter(nodeType, credentialTypes);

	const credentials = await credentialsService.getMany(user, {
		listQueryOptions: {
			take: MAX_RESULTS,
			...(typeFilter ? { filter: { type: typeFilter } } : {}),
		},
		includeScopes: false,
		includeData: false,
		includeGlobal: true,
		onlySharedWithMe: false,
	});

	// Strict projection: never expose anything beyond {id, name, type}.
	const projected: N8nListCredentialsItem[] = credentials.map((c) =>
		projectCredential({ id: c.id, name: c.name, type: c.type }),
	);

	return { credentials: projected };
}

/**
 * Choose the substring to use as the `type` filter for credentialsService.getMany.
 *
 * - No nodeType → no filter.
 * - nodeType resolves to a single credential type → use that exact type.
 * - nodeType resolves to multiple types sharing a prefix (e.g. "slackApi",
 *   "slackOAuth2Api" → "slack") → use the longest common prefix.
 * - nodeType resolves to multiple types with no common prefix → use the raw
 *   user input as a coarse substring filter.
 * - nodeType provided but resolved nothing → no filter (drop).
 */
function pickTypeFilter(nodeType: string | undefined, resolvedTypes: string[]): string | undefined {
	if (!nodeType) return undefined;
	if (resolvedTypes.length === 0) return undefined;
	if (resolvedTypes.length === 1) return resolvedTypes[0];

	const commonPrefix = longestCommonPrefix(resolvedTypes);
	if (commonPrefix.length >= 2) return commonPrefix;
	return nodeType;
}

function longestCommonPrefix(strings: string[]): string {
	if (strings.length === 0) return '';
	let prefix = strings[0];
	for (let i = 1; i < strings.length; i++) {
		while (!strings[i].startsWith(prefix)) {
			prefix = prefix.slice(0, -1);
			if (prefix === '') return '';
		}
	}
	return prefix;
}
