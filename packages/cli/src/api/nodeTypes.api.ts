import express from 'express';
import { readFile } from 'fs/promises';
import get from 'lodash.get';

import type { ICredentialType, INodeTypeDescription, INodeTypeNameVersion } from 'n8n-workflow';

import { CredentialTypes } from '@/CredentialTypes';
import config from '@/config';
import { NodeTypes } from '@/NodeTypes';
import * as ResponseHelper from '@/ResponseHelper';
import { getNodeTranslationPath } from '@/TranslationHelpers';

function isOAuth(credType: ICredentialType) {
	return (
		Array.isArray(credType.extends) &&
		credType.extends.some((parentType) =>
			['oAuth2Api', 'googleOAuth2Api', 'oAuth1Api'].includes(parentType),
		)
	);
}

/**
 * Whether any of the node's credential types may be used to
 * make a request from a node other than itself.
 */
function supportsProxyAuth(description: INodeTypeDescription) {
	if (!description.credentials) return false;

	const credentialTypes = CredentialTypes();

	return description.credentials.some(({ name }) => {
		const credType = credentialTypes.getByName(name);

		if (credType.authenticate !== undefined) return true;

		return isOAuth(credType);
	});
}

const CUSTOM_API_CALL_NAME = 'Custom API Call';
const CUSTOM_API_CALL_KEY = '__CUSTOM_API_CALL__';

/**
 * Inject a `Custom API Call` option into `resource` and `operation`
 * parameters in a node that supports proxy auth.
 */
function injectCustomApiCallOption(description: INodeTypeDescription) {
	if (!supportsProxyAuth(description)) return description;

	description.properties.forEach((p) => {
		if (
			['resource', 'operation'].includes(p.name) &&
			Array.isArray(p.options) &&
			p.options[p.options.length - 1].name !== CUSTOM_API_CALL_NAME
		) {
			p.options.push({
				name: CUSTOM_API_CALL_NAME,
				value: CUSTOM_API_CALL_KEY,
			});
		}

		return p;
	});

	return description;
}

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
				acc.push(injectCustomApiCallOption(description));
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

			nodeTypes.push(injectCustomApiCallOption(description));
		}

		const nodeTypes: INodeTypeDescription[] = [];

		const promises = nodeInfos.map(async ({ name, version }) =>
			populateTranslation(name, version, nodeTypes),
		);

		await Promise.all(promises);

		return nodeTypes;
	}),
);
