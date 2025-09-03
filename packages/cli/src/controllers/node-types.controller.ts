import { GlobalConfig } from '@n8n/config';
import { Post, RestController } from '@n8n/decorators';
import { Request } from 'express';
import { readFile } from 'fs/promises';
import get from 'lodash/get';
import type { INodeTypeDescription, INodeTypeNameVersion, INodeParameters } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';

@RestController('/node-types')
export class NodeTypesController {
	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly globalConfig: GlobalConfig,
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

	@Post('/migrate')
	migrateNodeParameters(req: Request) {
		const {
			nodeType,
			typeVersion,
			targetVersion,
			parameters,
		}: {
			nodeType: string;
			typeVersion: number;
			targetVersion: number;
			parameters: INodeParameters;
		} = req.body as {
			nodeType: string;
			typeVersion: number;
			targetVersion: number;
			parameters: INodeParameters;
		};

		const { description } = this.nodeTypes.getByNameAndVersion(nodeType, targetVersion);
		let migratedParameters = parameters;
		for (const migration of description.migrations ?? []) {
			if (migration.from >= typeVersion && migration.to <= targetVersion) {
				migratedParameters = {
					...migratedParameters,
					...migration.transform(migratedParameters),
				};
			}
		}

		return {
			migratedParameters,
		};
	}
}
