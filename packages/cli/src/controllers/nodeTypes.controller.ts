import { readFile } from 'fs/promises';
import get from 'lodash.get';
import { Request } from 'express';
import type { INodeTypeDescription, INodeTypeNameVersion } from 'n8n-workflow';
import { Authorized, Post, RestController } from '@/decorators';
import { getNodeTranslationPath } from '@/TranslationHelpers';
import type { Config } from '@/config';
import type { NodeTypes } from '@/NodeTypes';

@Authorized()
@RestController('/node-types')
export class NodeTypesController {
	private readonly config: Config;

	private readonly nodeTypes: NodeTypes;

	constructor({ config, nodeTypes }: { config: Config; nodeTypes: NodeTypes }) {
		this.config = config;
		this.nodeTypes = nodeTypes;
	}

	@Post('/')
	async getNodeInfo(req: Request) {
		const nodeInfos = get(req, 'body.nodeInfos', []) as INodeTypeNameVersion[];

		const defaultLocale = this.config.getEnv('defaultLocale');

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
			const translationPath = await getNodeTranslationPath({
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

		const promises = nodeInfos.map(async ({ name, version }) =>
			populateTranslation(name, version, nodeTypes),
		);

		await Promise.all(promises);

		return nodeTypes;
	}
}
