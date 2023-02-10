import express from 'express';
import { readFile } from 'fs/promises';
import get from 'lodash.get';

import type { INodeTypeDescription, INodeTypeNameVersion } from 'n8n-workflow';

import config from '@/config';
import { NodeTypes } from '@/NodeTypes';
import * as ResponseHelper from '@/ResponseHelper';
import { getNodeTranslationPath } from '@/TranslationHelpers';

export const nodeTypesController = express.Router();

// Returns node information based on node names and versions
nodeTypesController.post(
	'/',
	ResponseHelper.send(async (req: express.Request): Promise<INodeTypeDescription[]> => {
		const nodeInfos = get(req, 'body.nodeInfos', []) as INodeTypeNameVersion[];

		const defaultLocale = config.getEnv('defaultLocale');

		if (defaultLocale === 'en') {
			return nodeInfos.reduce<INodeTypeDescription[]>((acc, { name, version }) => {
				const { description } = NodeTypes().getByNameAndVersion(name, version);
				acc.push(description);
				return acc;
			}, []);
		}

		async function populateTranslation(
			name: string,
			version: number,
			nodeTypes: INodeTypeDescription[],
		) {
			const { description, sourcePath } = NodeTypes().getWithSourcePath(name, version);
			const translationPath = await getNodeTranslationPath({
				nodeSourcePath: sourcePath,
				longNodeType: description.name,
				locale: defaultLocale,
			});

			try {
				const translation = await readFile(translationPath, 'utf8');
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				description.translation = JSON.parse(translation);
			} catch (error) {
				// ignore - no translation exists at path
			}

			nodeTypes.push(description);
		}

		const nodeTypes: INodeTypeDescription[] = [];

		const promises = nodeInfos.map(async ({ name, version }) =>
			populateTranslation(name, version, nodeTypes),
		);

		await Promise.all(promises);

		return nodeTypes;
	}),
);
