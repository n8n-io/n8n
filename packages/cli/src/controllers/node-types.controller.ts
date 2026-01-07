import { GlobalConfig } from '@n8n/config';
import { Get, Post, RestController } from '@n8n/decorators';
import { Request } from 'express';
import { readFile } from 'fs/promises';
import get from 'lodash/get';
import type { INodeTypeDescription, INodeTypeNameVersion } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';

@RestController('/node-types')
export class NodeTypesController {
	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly globalConfig: GlobalConfig,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
	) {}

	@Post('/')
	async getNodeInfo(req: Request) {
		const nodeInfos = get(req, 'body.nodeInfos', []) as INodeTypeNameVersion[];

		const defaultLocale = this.globalConfig.defaultLocale;

		if (defaultLocale === 'en') {
			return nodeInfos.reduce<INodeTypeDescription[]>((acc, { name, version }) => {
				const { description } = this.nodeTypes.getByNameAndVersion(name, version);
				acc.push(description);
				return acc;
			}, []);
		}

		const populateTranslation = async (
			name: string,
			version: number,
			nodeTypes: INodeTypeDescription[],
		) => {
			const { description, sourcePath } = this.nodeTypes.getWithSourcePath(name, version);
			const translationPath = await this.nodeTypes.getNodeTranslationPath({
				nodeSourcePath: sourcePath,
				longNodeType: description.name,
				locale: defaultLocale,
			});

			try {
				const translation = await readFile(translationPath, 'utf8');
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				description.translation = JSON.parse(translation);
			} catch {
				// ignore - no translation exists at path
			}

			nodeTypes.push(description);
		};

		const nodeTypes: INodeTypeDescription[] = [];

		const promises = nodeInfos.map(
			async ({ name, version }) => await populateTranslation(name, version, nodeTypes),
		);

		await Promise.all(promises);

		return nodeTypes;
	}

	@Get('/init')
	getInitialNodeData() {
		return {
			manifests: this.loadNodesAndCredentials.manifests,
			preloadedDefinitions: this.loadNodesAndCredentials.definitionsForPreloadedNodeTypes,
		};
	}

	@Get('/:nodeType/definition')
	async getNodeDefinition(req: Request) {
		const { nodeType } = req.params;
		const definition = await this.loadNodesAndCredentials.getFullDefinition(nodeType);
		if (!definition) {
			return { error: 'Node type not found', nodeType };
		}
		return definition;
	}

	@Post('/definitions')
	async getNodeDefinitions(req: Request) {
		const nodeTypes = get(req, 'body.nodeTypes', []) as string[];
		const definitions: Record<string, INodeTypeDescription> = {};

		await Promise.all(
			nodeTypes.map(async (nodeType) => {
				const definition = await this.loadNodesAndCredentials.getFullDefinition(nodeType);
				if (definition) {
					definitions[nodeType] = definition;
				}
			}),
		);

		return definitions;
	}
}
