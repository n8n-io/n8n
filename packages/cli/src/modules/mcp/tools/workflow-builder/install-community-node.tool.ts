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

/**
 * Describes a successful result only. Failures are returned with
 * `isError: true`, which the SDK checks before it validates `structuredContent`
 * against this schema, so the error fields do not belong here and the success
 * fields can be required.
 */
const outputSchema = {
	installed: z.boolean().describe('Whether the package was installed by this call'),
	alreadyInstalled: z
		.boolean()
		.optional()
		.describe(
			'True when the node was already available, so nothing was installed. Not an error: carry on and use the node.',
		),
	packageName: z.string().describe('npm package that was installed'),
	nodeTypes: z
		.array(z.string())
		.describe(
			'Node types the package registered, now usable in workflow code. Call get_node_types on these before writing the workflow — the installed definition is authoritative.',
		),
	version: z.string().optional().describe('Exact version installed'),
	credentialTypes: z
		.array(z.string())
		.optional()
		.describe(
			'Credential types the installed nodes require. These only exist now that the package is installed, so the user must create one in n8n before the workflow can run. Tell them which.',
		),
} satisfies z.ZodRawShape;

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

		/**
		 * Execution errors belong in the result with `isError: true`, not in a
		 * success payload. `structuredContent` is deliberately omitted: the SDK
		 * skips output-schema validation once `isError` is set, and the schema
		 * describes successes only.
		 */
		const fail = (error: string, hint?: string) => {
			telemetryPayload.results = { success: false, error };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			return {
				isError: true,
				content: [
					{ type: 'text' as const, text: JSON.stringify({ error, ...(hint ? { hint } : {}) }) },
				],
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

			// Authorization to install is not authorization to install *anything*
			// vetted. Match the exact node type and require the same
			// `isOfficialNode` flag that search_nodes filters on, so the tool can
			// only install what discovery was willing to offer. Matching the
			// package alone would let a caller name any node in a vetted package,
			// including one search_nodes deliberately withheld.
			const catalogEntry = await communityNodeTypesService.findVettedNodeType(nodeType);
			if (!catalogEntry) {
				return fail(
					`'${nodeType}' is not a node type in the verified community catalog, so it cannot be installed.`,
					'Pass a node type exactly as search_nodes reported it under "not installed on this instance".',
				);
			}

			// Read off the entry rather than derived from the node type: npm allows
			// dots in package names, so splitting on the first dot mis-parses a
			// package like `n8n-nodes-chatwoot.io` and refuses a vetted node.
			const packageName = catalogEntry.packageName;

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

			let installedPackage: Awaited<ReturnType<CommunityPackagesLifecycleService['install']>>;
			try {
				// No version: install() pins the latest vetted version and its
				// checksum from a single catalog lookup, so the pair can never
				// straddle a catalog refresh.
				installedPackage = await communityPackagesLifecycleService.install(
					{ name: packageName, verify: true },
					user,
					'mcp',
				);
			} catch (error) {
				// Class name only. The message is built around the `execFile`
				// rejection from npm, so it can carry a private registry URL or an
				// absolute path on the host, neither of which belongs in product
				// analytics or in a third-party MCP client.
				const errorType = error instanceof Error ? error.constructor.name : typeof error;
				return fail(
					`Installing '${packageName}' failed (${errorType}).`,
					'Report this to the user rather than retrying. If the instance manages community packages through environment variables, or the package is blocked, no retry will succeed.',
				);
			}

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
			// Reached only by the registry lookups above, which are network calls
			// against the verified catalog. A transient failure here is worth
			// retrying, so this must not repeat the install advice.
			const errorType = error instanceof Error ? error.constructor.name : typeof error;
			return fail(
				`Could not reach the verified community node catalog (${errorType}).`,
				'This may be transient. Retry once, and if it fails again tell the user and build with an HTTP Request node instead.',
			);
		}
	},
});
