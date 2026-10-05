import { INSTALL_COMMUNITY_NODE_TOOL } from '../../mcp.constants';

/**
 * Reports which of the given node types are verified community nodes that are
 * not installed on this instance. Supplied only on surfaces that offer
 * community-node discovery, which keeps the workflow tools independent of the
 * node catalog.
 */
export type FindUninstalledNodeTypes = (
	nodeTypes: string[],
) => Promise<Array<{ nodeType: string; packageName: string }>>;

export interface UninstalledNodeWarning {
	code: string;
	message: string;
	nodeName: string;
}

/**
 * Warn, per node, about verified community nodes the instance has not installed.
 *
 * Non-fatal on purpose: the workflow is already saved, and drafting ahead of an
 * install is legitimate. Without this a workflow that cannot run saves clean and
 * the agent gets no signal at the one moment it could still tell the user.
 *
 * The install tool is named only when this session can actually call it.
 * Otherwise the warning would steer the agent to a tool missing from its tool
 * list, or have it promise an install this user cannot perform.
 */
export async function buildUninstalledNodeWarnings(
	nodes: Array<{ name: string; type: string }>,
	findUninstalledNodeTypes?: FindUninstalledNodeTypes,
	installToolAvailable?: boolean,
): Promise<UninstalledNodeWarning[]> {
	if (!findUninstalledNodeTypes || nodes.length === 0) return [];

	const uninstalled = await findUninstalledNodeTypes(nodes.map((node) => node.type));
	if (uninstalled.length === 0) return [];

	const packagesByNodeType = new Map(
		uninstalled.map((entry) => [entry.nodeType, entry.packageName]),
	);

	const followUp = installToolAvailable
		? `Tell the user, and offer to install it with ${INSTALL_COMMUNITY_NODE_TOOL.toolName}.`
		: 'Tell the user; an administrator of this instance must install the package.';

	return nodes
		.filter((node) => packagesByNodeType.has(node.type))
		.map((node) => ({
			code: 'UNINSTALLED_COMMUNITY_NODE',
			message: `'${node.type}' ships in the verified community package '${packagesByNodeType.get(node.type)}', which is not installed on this instance. The workflow cannot run, and its credentials cannot be created, until it is installed. ${followUp}`,
			nodeName: node.name,
		}));
}
