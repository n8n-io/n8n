import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { NeededNodeType } from '@n8n/task-runner';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { Dirent } from 'fs';
import { readdir, readFile } from 'fs/promises';
import { RoutingNode, UnrecognizedNodeTypeError } from 'n8n-core';
import type { ExecuteContext } from 'n8n-core';
import type { INodeType, INodeTypeDescription, INodeTypes, IVersionedNodeType } from 'n8n-workflow';
import { deepCopy, isHitlToolType, NodeHelpers, UnexpectedError, UserError } from 'n8n-workflow';
import { join, dirname } from 'path';

import { LoadNodesAndCredentials } from './load-nodes-and-credentials';
import { convertNodeToAiTool, convertNodeToHitlTool } from './tool-generation';
import { satisfiesToolCapability, shouldAssignExecuteMethod, stripToolSuffix } from './utils';

@Service()
export class NodeTypes implements INodeTypes {
	constructor(
		private readonly logger: Logger,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
	) {}

	/**
	 * Resolves a tool-variant name (`…Tool`/`…HitlTool`) to the base node type it
	 * is synthesized from, unless a real node with that name exists on disk.
	 *
	 * A "synthetic tool" has no implementation of its own: workflows persist
	 * names like `gmailTool`, and the registry fabricates that node on demand by
	 * converting the `gmail` base node into an agent tool.
	 */
	private resolveBaseName(nodeTypeName: string): { baseName: string; isSyntheticTool: boolean } {
		const isSyntheticTool =
			nodeTypeName.endsWith('Tool') && !this.loadNodesAndCredentials.recognizesNode(nodeTypeName);
		return {
			baseName: isSyntheticTool ? stripToolSuffix(nodeTypeName) : nodeTypeName,
			isSyntheticTool,
		};
	}

	/**
	 * Variant of `getByNameAndVersion` that includes the node's source path, used to locate a node's translations.
	 */
	getWithSourcePath(
		nodeTypeName: string,
		version: number,
	): { description: INodeTypeDescription } & { sourcePath: string } {
		const nodeType = this.loadNodesAndCredentials.getNode(nodeTypeName);
		const { description } = NodeHelpers.getVersionedNodeType(nodeType.type, version);

		return { description: { ...description }, sourcePath: nodeType.sourcePath };
	}

	/**
	 * Get a node type description with its translation loaded (if available for the locale).
	 */
	async getDescriptionWithTranslation(
		nodeTypeName: string,
		version: number,
		locale: string,
	): Promise<INodeTypeDescription> {
		const { description, sourcePath } = this.getWithSourcePath(nodeTypeName, version);

		if (locale !== 'en') {
			const translationPath = await this.getNodeTranslationPath({
				nodeSourcePath: sourcePath,
				longNodeType: description.name,
				locale,
			});

			try {
				const translation = await readFile(translationPath, 'utf8');
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				description.translation = JSON.parse(translation);
			} catch {
				// ignore - no translation exists at path
			}
		}

		return description;
	}

	getByName(nodeType: string): INodeType | IVersionedNodeType {
		return this.loadNodesAndCredentials.getNode(nodeType).type;
	}

	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		const origType = nodeType;

		const { baseName, isSyntheticTool } = this.resolveBaseName(nodeType);

		// If an existing node name ends in `Tool`, then return that node, instead of creating a fake Tool node
		if (nodeType.endsWith('Tool') && !isSyntheticTool) {
			const node = this.loadNodesAndCredentials.getNode(nodeType);
			return NodeHelpers.getVersionedNodeType(node.type, version);
		}

		const node = this.loadNodesAndCredentials.getNode(baseName);
		const versionedNodeType = NodeHelpers.getVersionedNodeType(node.type, version);
		if (isSyntheticTool && typeof versionedNodeType.supplyData === 'function') {
			throw new UnexpectedError('Node already has a `supplyData` method', {
				extra: { nodeType: baseName },
			});
		}

		if (shouldAssignExecuteMethod(versionedNodeType)) {
			versionedNodeType.execute = async function (this: ExecuteContext) {
				const routingNode = new RoutingNode(this, versionedNodeType);
				const data = await routingNode.runNode();
				return data ?? [];
			};
		}

		if (!isSyntheticTool) return versionedNodeType;

		const { loadedNodes } = this.loadNodesAndCredentials;
		if (origType in loadedNodes) {
			return loadedNodes[origType].type as INodeType;
		}

		const isHitlTool = isHitlToolType(origType);

		if (!satisfiesToolCapability(origType, versionedNodeType)) {
			throw new UserError('Node cannot be used as a tool', { extra: { nodeType: baseName } });
		}

		// Instead of modifying the existing type, we extend it into a new type object
		const clonedProperties = Object.create(
			versionedNodeType.description.properties,
		) as INodeTypeDescription['properties'];
		const clonedDescription = Object.create(versionedNodeType.description, {
			properties: { value: clonedProperties, writable: isHitlTool },
		}) as INodeTypeDescription;
		const clonedNode = Object.create(versionedNodeType, {
			description: { value: clonedDescription },
		}) as INodeType;

		// For HITL tools, use convertNodeToHitlTool; for regular AI tools, use convertNodeToAiTool
		const tool = isHitlTool ? convertNodeToHitlTool(clonedNode) : convertNodeToAiTool(clonedNode);

		loadedNodes[origType] = { sourcePath: '', type: tool };
		return tool;
	}

	getKnownTypes() {
		return this.loadNodesAndCredentials.knownNodes;
	}

	/**
	 * The `typeVersion`s this instance can resolve for a node type. Returns
	 * `undefined` when the type is unknown or fails to load (a warning is logged
	 * for anything but a plain unrecognized type), and `[]` when the type exists
	 * but no version satisfies the request — e.g. a synthetic tool name (`…Tool`)
	 * whose base node cannot be used as a tool (`…HitlTool` has no such
	 * requirement). Unlike `getByNameAndVersion`, never registers synthetic tools
	 * or mutates the registry, though resolving a known type may trigger its lazy
	 * module load.
	 */
	getSupportedVersions(nodeTypeName: string): number[] | undefined {
		// The whole resolution runs fail-closed: name lookups use `in`, so a
		// hostile name (e.g. `n8n-nodes-base.constructor`) can surface
		// prototype-chain values that throw at any of the reads below. Fold any
		// such failure into "unknown type" instead of failing the caller.
		try {
			const { baseName, isSyntheticTool } = this.resolveBaseName(nodeTypeName);

			const { type } = this.loadNodesAndCredentials.getNode(baseName);

			if ('nodeVersions' in type) {
				return Object.entries(type.nodeVersions)
					.filter(
						([, versioned]) => !isSyntheticTool || satisfiesToolCapability(nodeTypeName, versioned),
					)
					.map(([version]) => Number(version));
			}

			if (isSyntheticTool && !satisfiesToolCapability(nodeTypeName, type)) return [];

			const { version } = type.description;
			return Array.isArray(version) ? [...version] : [version];
		} catch (error) {
			if (!(error instanceof UnrecognizedNodeTypeError)) {
				this.logger.warn('Failed to resolve node type while listing supported versions', {
					nodeType: nodeTypeName,
					error: ensureError(error).message,
				});
			}
			return undefined;
		}
	}

	async getNodeTranslationPath({
		nodeSourcePath,
		longNodeType,
		locale,
	}: {
		nodeSourcePath: string;
		longNodeType: string;
		locale: string;
	}) {
		const nodeDir = dirname(nodeSourcePath);
		const maxVersion = await this.getMaxVersion(nodeDir);
		const nodeType = longNodeType.replace('n8n-nodes-base.', '');

		return maxVersion
			? join(nodeDir, `v${maxVersion}`, 'translations', locale, `${nodeType}.json`)
			: join(nodeDir, 'translations', locale, `${nodeType}.json`);
	}

	private async getMaxVersion(dir: string) {
		const entries = await readdir(dir, { withFileTypes: true });

		const dirnames = entries.reduce<string[]>((acc, cur) => {
			if (this.isVersionedDirname(cur)) acc.push(cur.name);
			return acc;
		}, []);

		if (!dirnames.length) return null;

		return Math.max(...dirnames.map((d) => parseInt(d.charAt(1), 10)));
	}

	private isVersionedDirname(dirent: Dirent) {
		if (!dirent.isDirectory()) return false;

		const ALLOWED_VERSIONED_DIRNAME_LENGTH = [2, 3]; // e.g. v1, v10

		return (
			ALLOWED_VERSIONED_DIRNAME_LENGTH.includes(dirent.name.length) &&
			dirent.name.toLowerCase().startsWith('v')
		);
	}

	getNodeTypeDescriptions(nodeTypes: NeededNodeType[]): INodeTypeDescription[] {
		return nodeTypes.map(({ name: nodeTypeName, version: nodeTypeVersion }) => {
			const { baseName, isSyntheticTool } = this.resolveBaseName(nodeTypeName);

			const nodeType = this.loadNodesAndCredentials.getNode(baseName);
			const { description } = NodeHelpers.getVersionedNodeType(nodeType.type, nodeTypeVersion);

			const descriptionCopy = isSyntheticTool
				? this.buildSyntheticToolDescription(nodeTypeName, description)
				: { ...description };

			// TODO: do we still need this?
			descriptionCopy.name = descriptionCopy.name.startsWith('n8n-nodes')
				? descriptionCopy.name
				: `n8n-nodes-base.${descriptionCopy.name}`; // nodes-base nodes are unprefixed

			return descriptionCopy;
		});
	}

	/**
	 * Rebuilds a synthetic tool's description from a plain copy of its base node.
	 * `getByNameAndVersion` returns a prototype-backed tool type whose fields are
	 * lost when the description is serialized to the task runner, so we can't reuse it.
	 */
	private buildSyntheticToolDescription(
		nodeTypeName: string,
		description: INodeTypeDescription,
	): INodeTypeDescription {
		if (isHitlToolType(nodeTypeName)) {
			return convertNodeToHitlTool({ description: deepCopy(description) }).description;
		}

		// Object-form `usableAsTool` carries replacements to apply before conversion
		const base =
			typeof description.usableAsTool === 'object'
				? { ...deepCopy(description), ...description.usableAsTool?.replacements }
				: deepCopy(description);
		return convertNodeToAiTool({ description: base }).description;
	}
}
