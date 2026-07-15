import { Service } from '@n8n/di';
import type { NeededNodeType } from '@n8n/task-runner';
import type { Dirent } from 'fs';
import { readdir, readFile } from 'fs/promises';
import { RoutingNode } from 'n8n-core';
import type { ExecuteContext } from 'n8n-core';
import type { INodeType, INodeTypeDescription, INodeTypes, IVersionedNodeType } from 'n8n-workflow';
import { deepCopy, NodeHelpers, UnexpectedError, UserError } from 'n8n-workflow';
import { join, dirname } from 'path';

import { LoadNodesAndCredentials } from './load-nodes-and-credentials';
import { convertNodeToAiTool, convertNodeToHitlTool } from './tool-generation';
import { shouldAssignExecuteMethod, stripToolSuffix } from './utils';

@Service()
export class NodeTypes implements INodeTypes {
	constructor(private readonly loadNodesAndCredentials: LoadNodesAndCredentials) {}

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

		const toolRequested = nodeType.endsWith('Tool');

		// If an existing node name ends in `Tool`, then return that node, instead of creating a fake Tool node
		if (toolRequested && this.loadNodesAndCredentials.recognizesNode(nodeType)) {
			const node = this.loadNodesAndCredentials.getNode(nodeType);
			return NodeHelpers.getVersionedNodeType(node.type, version);
		}

		// Make sure the nodeType to actually get from disk is the un-wrapped type
		if (toolRequested) {
			nodeType = stripToolSuffix(nodeType);
		}

		const node = this.loadNodesAndCredentials.getNode(nodeType);
		const versionedNodeType = NodeHelpers.getVersionedNodeType(node.type, version);
		if (toolRequested && typeof versionedNodeType.supplyData === 'function') {
			throw new UnexpectedError('Node already has a `supplyData` method', { extra: { nodeType } });
		}

		if (shouldAssignExecuteMethod(versionedNodeType)) {
			versionedNodeType.execute = async function (this: ExecuteContext) {
				const routingNode = new RoutingNode(this, versionedNodeType);
				const data = await routingNode.runNode();
				return data ?? [];
			};
		}

		if (!toolRequested) return versionedNodeType;

		const { loadedNodes } = this.loadNodesAndCredentials;
		if (origType in loadedNodes) {
			return loadedNodes[origType].type as INodeType;
		}

		// Check if this is an HITL tool (ends with 'HitlTool')
		const isHitlTool = origType.endsWith('HitlTool');

		if (!isHitlTool && !versionedNodeType.description.usableAsTool) {
			throw new UserError('Node cannot be used as a tool', { extra: { nodeType } });
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
			const isSyntheticTool =
				nodeTypeName.endsWith('Tool') && !this.loadNodesAndCredentials.recognizesNode(nodeTypeName);
			const baseName = isSyntheticTool ? stripToolSuffix(nodeTypeName) : nodeTypeName;

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
		if (nodeTypeName.endsWith('HitlTool')) {
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
