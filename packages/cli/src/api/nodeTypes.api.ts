/* eslint-disable import/no-extraneous-dependencies */
import express from 'express';
import { readFile } from 'fs/promises';
import _ from 'lodash';
import { NodeTypeActions } from '@/NodeTypeActions';
// import { CUSTOM_API_CALL_NAME, CUSTOM_API_CALL_KEY } from '@/constants';

import {
	// ICredentialType,
	INodeType,
	INodeTypeDescription,
	INodeTypeNameVersion,
	NodeHelpers,
} from 'n8n-workflow';

import config from '@/config';
import { NodeTypes } from '@/NodeTypes';
import * as ResponseHelper from '@/ResponseHelper';
import { getNodeTranslationPath } from '@/TranslationHelpers';

export const nodeTypesController = express.Router();

// Returns all the node-types
nodeTypesController.get(
	'/',
	ResponseHelper.send(async (req: express.Request): Promise<INodeTypeDescription[]> => {
		const returnData: INodeTypeDescription[] = [];
		const onlyLatest = req.query.onlyLatest === 'true';
		const withActions = req.query.withActions === 'true';

		const nodeTypes = NodeTypes();
		const nodeTypeActions = NodeTypeActions();
		const allNodes = nodeTypes.getAll();

		const getNodeDescription = (nodeType: INodeType): INodeTypeDescription => {
			const nodeInfo = withActions
				? nodeTypeActions.extendWithActions({ ...nodeType.description })
				: { ...nodeType.description };

			if (req.query.includeProperties !== 'true') {
				// @ts-ignore
				delete nodeInfo.properties;
			}
			return nodeInfo;
		};

		if (onlyLatest) {
			allNodes.forEach((nodeData) => {
				const nodeType = NodeHelpers.getVersionedNodeType(nodeData);
				const nodeInfo: INodeTypeDescription = getNodeDescription(nodeType);
				returnData.push(nodeInfo);
			});
		} else {
			allNodes.forEach((nodeData) => {
				const allNodeTypes = NodeHelpers.getVersionedNodeTypeAll(nodeData);
				allNodeTypes.forEach((element) => {
					const nodeInfo: INodeTypeDescription = getNodeDescription(element);
					returnData.push(nodeInfo);
				});
			});
		}

		return returnData;
	}),
);

// Returns node information based on node names and versions
nodeTypesController.post(
	'/',
	ResponseHelper.send(async (req: express.Request): Promise<INodeTypeDescription[]> => {
		const nodeInfos = _.get(req, 'body.nodeInfos', []) as INodeTypeNameVersion[];
		const defaultLocale = config.getEnv('defaultLocale');

		if (defaultLocale === 'en') {
			return nodeInfos.reduce<INodeTypeDescription[]>((acc, { name, version }) => {
				const { description } = NodeTypes().getByNameAndVersion(name, version);
				acc.push(NodeTypes().injectCustomApiCallOption(description));
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

			nodeTypes.push(NodeTypes().injectCustomApiCallOption(description));
		}

		const nodeTypes: INodeTypeDescription[] = [];

		const promises = nodeInfos.map(async ({ name, version }) =>
			populateTranslation(name, version, nodeTypes),
		);

		await Promise.all(promises);

		return nodeTypes;
	}),
);
