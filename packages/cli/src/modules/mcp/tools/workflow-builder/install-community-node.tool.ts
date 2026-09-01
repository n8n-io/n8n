import type { User } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
import z from 'zod';

import type { CommunityNodeTypesService } from '@/modules/community-packages/community-node-types.service';
import type { CommunityPackagesLifecycleService } from '@/modules/community-packages/community-packages.lifecycle.service';
import type { NodeTypes } from '@/node-types';
import type { Telemetry } from '@/telemetry';

import { INSTALL_COMMUNITY_NODE_TOOL, USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';

const inputSchema = {
	nodeType: z
		.string()
		.min(1)
		.describe(
			'Full node type of a verified community node reported by search_nodes as not installed, e.g. "@mendable/n8n-nodes-firecrawl.firecrawl". The package that ships it is installed.',
		),
} satisfies z.ZodRawShape;

const outputSchema = {
	installed: z.boolean().optional().describe('Whether the package was installed by this call'),
	alreadyInstalled: z
		.boolean()
		.optional()
		.describe(
			'True when the node was already available, so nothing was installed. Not an error: carry on and use the node.',
		),
	packageName: z.string().optional().describe('npm package that was installed'),
	version: z.string().optional().describe('Exact version installed'),
	nodeTypes: z
		.array(z.string())
		.optional()
		.describe(
			'Node types the package registered, now usable in workflow code. Call get_node_types on these before writing the workflow — the installed definition is authoritative.',
		),
	credentialTypes: z
		.array(z.string())
		.optional()
		.describe(
			'Credential types the installed nodes require. These only exist now that the package is installed, so the user must create one in n8n before the workflow can run. Tell them which.',
		),
	error: z.string().optional().describe('Why the install did not happen'),
	hint: z.string().optional().describe('What to do instead when the install did not happen'),
} satisfies z.ZodRawShape;

/** Package name from a node type: `@scope/pkg.nodeName` -> `@scope/pkg`. */
const toPackageName = (nodeType: string): string => nodeType.split('.')[0];

/**
 * Credential types the freshly installed nodes declare.
 *
 * Read from the loaded node descriptions rather than the registry entry: the
 * registry payload does not carry credential declarations for any vetted
 * package, so anything derived from it would silently always be empty.
 */
function credentialTypesOf(nodeTypeNames: string[], nodeTypes: NodeTypes): string[] {
	const types = new Set<string>();
	for (const name of nodeTypeNames) {
		try {
			for (const credential of nodeTypes.getByNameAndVersion(name).description.credentials ?? []) {
				types.add(credential.name);
			}
		} catch {
			// Freshly loaded types can be missing if the reload lagged; a missing
			// hint is better than failing an install that already succeeded.
		}
	}
	return [...types];
}

/**
 * MCP tool that installs a verified community package so its nodes become
 * usable on this instance.
 *
 * Only vetted packages are installable, and only at the exact version the
 * registry publishes, so the checksum the registry holds is always enforced
 * (`verify: true`). This tool cannot install an arbitrary npm package.
 *
 * Registration is gated on the caller holding `communityPackage:install`, so a
 * member-role user never sees the tool at all. That check is deliberately at
 * registration rather than only in the handler: an unregistered tool is neither
 * listed nor callable, so the agent is never told about a capability it cannot
 * use on this user's behalf.
 */
export const createInstallCommunityNodeTool = (
	user: User,
	communityNodeTypesService: CommunityNodeTypesService,
	communityPackagesLifecycleService: CommunityPackagesLifecycleService,
	nodeTypes: NodeTypes,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: INSTALL_COMMUNITY_NODE_TOOL.toolName,
	config: {
		description:
			'Install a verified community node package that search_nodes reported as not installed on this instance. Installs code onto the n8n instance, so confirm with the user before calling it. Only packages vetted by n8n can be installed, at the version the registry publishes. After installing, call get_node_types for the returned node types before writing workflow code.',
		inputSchema,
		outputSchema,
		annotations: {
			title: INSTALL_COMMUNITY_NODE_TOOL.displayTitle,
			readOnlyHint: false,
			// Additive: it registers new node types rather than changing or
			// removing anything the instance already had.
			destructiveHint: false,
			// Installing an already-installed package reports it as such instead
			// of installing again.
			idempotentHint: true,
			openWorldHint: true,
		},
	},
	handler: async ({ nodeType }: { nodeType: string }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: INSTALL_COMMUNITY_NODE_TOOL.toolName,
			parameters: { nodeType },
		};

		const fail = (error: string, hint?: string) => {
			telemetryPayload.results = { success: false, error };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			const structured = { error, ...(hint ? { hint } : {}) };
			return {
				content: [{ type: 'text' as const, text: JSON.stringify(structured) }],
				structuredContent: structured,
			};
		};

		try {
			// Re-checked in the handler as well as at registration: the tool is
			// built per request, but roles can change within a session.
			if (!hasGlobalScope(user, 'communityPackage:install')) {
				return fail(
					'You do not have permission to install community nodes on this instance.',
					'Ask an instance owner or admin to install it, or build the workflow with an HTTP Request node instead.',
				);
			}

			const packageName = toPackageName(nodeType);

			// Called for its refresh-if-stale side effect as much as its result: it
			// warms the registry catalog so the exact-entry lookup below can read a
			// populated map, and it distinguishes "unknown package" from "known
			// package, unknown node" in the error the agent sees.
			const vetted = await communityNodeTypesService.findVetted(packageName);
			if (!vetted) {
				return fail(
					`Package '${packageName}' is not a verified community package, so it cannot be installed.`,
					'Only packages vetted by n8n are installable. Use search_nodes to find a verified alternative, or use an HTTP Request node.',
				);
			}

			// Authorization to install is not authorization to install *anything*
			// vetted. Match the exact node type and require the same
			// `isOfficialNode` flag that search_nodes filters on, so the tool can
			// only install what discovery was willing to offer. Matching the
			// package alone would let a caller name any node in a vetted package,
			// including one search_nodes deliberately withheld.
			const catalogEntry = await communityNodeTypesService.getCommunityNodeType(nodeType);
			if (!catalogEntry) {
				return fail(
					`'${nodeType}' is not a node type in the verified community catalog, so it cannot be installed.`,
					'Pass a node type exactly as search_nodes reported it under "not installed on this instance".',
				);
			}

			if (!catalogEntry.isOfficialNode) {
				return fail(
					`'${nodeType}' is not an official verified node, so it cannot be installed.`,
					'Use search_nodes to find an official alternative, or use an HTTP Request node.',
				);
			}

			// Asked to install something already present. Reported as a normal
			// result rather than an error, so the agent carries on instead of
			// treating its own redundant call as a failure.
			//
			// Installed-ness comes from the same registry entry that search_nodes
			// used to place the node in its "not installed" section, so the two
			// surfaces cannot disagree about what needs installing.
			if (catalogEntry.isInstalled) {
				const credentialTypes = credentialTypesOf([nodeType], nodeTypes);
				const payload = {
					installed: false,
					alreadyInstalled: true,
					packageName,
					nodeTypes: [nodeType],
					...(credentialTypes.length > 0 ? { credentialTypes } : {}),
				};

				telemetryPayload.results = {
					success: true,
					data: { packageName, alreadyInstalled: true },
				};
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

				return {
					content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
					structuredContent: payload,
				};
			}

			const installedPackage = await communityPackagesLifecycleService.install(
				// Version comes from the matched entry, not the package-level lookup:
				// findVetted returns whichever node in the package it saw first.
				{ name: packageName, version: catalogEntry.npmVersion, verify: true },
				user,
				'mcp',
			);

			const installedNodeTypes = installedPackage.installedNodes.map((node) => node.type);
			// Credential types ship with the package and only exist once it is
			// installed, so this is the first moment the user can create one.
			const credentialTypes = credentialTypesOf(installedNodeTypes, nodeTypes);

			const payload: {
				installed: boolean;
				packageName: string;
				version: string;
				nodeTypes: string[];
				credentialTypes?: string[];
			} = {
				installed: true,
				packageName: installedPackage.packageName,
				version: installedPackage.installedVersion,
				nodeTypes: installedNodeTypes,
				...(credentialTypes.length > 0 ? { credentialTypes } : {}),
			};

			telemetryPayload.results = {
				success: true,
				data: { packageName: payload.packageName, nodeCount: installedNodeTypes.length },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(payload) }],
				structuredContent: payload,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return fail(
				message,
				'Report this to the user rather than retrying. If the instance manages community packages through environment variables, or the package is blocked, no retry will succeed.',
			);
		}
	},
});
