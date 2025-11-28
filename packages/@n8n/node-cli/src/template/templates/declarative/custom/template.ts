import { camelCase, capitalCase, pascalCase } from 'change-case';
import path from 'node:path';

import { addCredentialToNode, updateCredentialAst, updateNodeAst } from './ast';
import { baseUrlPrompt, credentialTypePrompt, oauthFlowPrompt } from './prompts';
import type { CustomTemplateConfig } from './types';
import {
	renameDirectory,
	renameFilesInDirectory,
	writeFileSafe,
} from '../../../../utils/filesystem';
import {
	setNodesPackageJson,
	addCredentialPackageJson,
	getPackageJsonNodes,
} from '../../../../utils/package';
import { createTemplate, type TemplateData } from '../../../core';

export const customTemplate = createTemplate({
	name: 'Start from scratch',
	description: 'Blank template with guided setup',
	path: path.join(__dirname, 'template'),
	prompts: async (): Promise<CustomTemplateConfig> => {
		const baseUrl = await baseUrlPrompt();

		const credentialType = await credentialTypePrompt();

		if (credentialType === 'oauth2') {
			const flow = await oauthFlowPrompt();

			return { credentialType, baseUrl, flow };
		}

		return { credentialType, baseUrl };
	},
	run: async (data) => {
		await renameNode(data, 'Example');
		await addCredential(data);
	},
});

async function renameNode(data: TemplateData<CustomTemplateConfig>, oldNodeName: string) {
	const { config, nodePackageName: nodeName, destinationPath } = data;
	const newClassName = pascalCase(nodeName.replace('n8n-nodes-', ''));
	const oldNodeDir = path.resolve(destinationPath, `nodes/${oldNodeName}`);

	await renameFilesInDirectory(oldNodeDir, oldNodeName, newClassName);
	const newNodeDir = await renameDirectory(oldNodeDir, newClassName);

	const newNodePath = path.resolve(newNodeDir, `${newClassName}.node.ts`);
	const newNodeAst = updateNodeAst({
		nodePath: newNodePath,
		baseUrl: config.baseUrl,
		className: newClassName,
	});
	await writeFileSafe(newNodePath, newNodeAst.getFullText());

	const nodes = [`dist/nodes/${newClassName}/${newClassName}.node.js`];
	await setNodesPackageJson(destinationPath, nodes);
}

async function addCredential(data: TemplateData<CustomTemplateConfig>) {
	const { config, destinationPath, nodePackageName } = data;
	if (config.credentialType === 'none') return;

	const credentialTemplateName =
		config.credentialType === 'oauth2'
			? config.credentialType + pascalCase(config.flow)
			: config.credentialType;
	const credentialTemplatePath = path.resolve(
		__dirname,
		`../../shared/credentials/${credentialTemplateName}.credentials.ts`,
	);

	const nodeName = nodePackageName.replace('n8n-nodes', '');
	const repoName = nodeName;
	const { baseUrl, credentialType } = config;
	const credentialClassName =
		config.credentialType === 'oauth2'
			? pascalCase(`${nodeName}-OAuth2-api`)
			: pascalCase(`${nodeName}-api`);
	const credentialName = camelCase(
		`${nodeName}${credentialType === 'oauth2' ? 'OAuth2Api' : 'Api'}`,
	);
	const credentialDisplayName = `${capitalCase(nodeName)} ${
		credentialType === 'oauth2' ? 'OAuth2 API' : 'API'
	}`;

	const updatedCredentialAst = updateCredentialAst({
		repoName,
		baseUrl,
		credentialName,
		credentialDisplayName,
		credentialClassName,
		credentialPath: credentialTemplatePath,
	});

	await writeFileSafe(
		path.resolve(destinationPath, `credentials/${credentialClassName}.credentials.ts`),
		updatedCredentialAst.getFullText(),
	);

	await addCredentialPackageJson(
		destinationPath,
		`dist/credentials/${credentialClassName}.credentials.js`,
	);

	for (const nodePath of await getPackageJsonNodes(destinationPath)) {
		const srcNodePath = path.resolve(
			destinationPath,
			nodePath.replace(/.js$/, '.ts').replace(/^dist\//, ''),
		);

		const updatedNodeAst = addCredentialToNode({
			nodePath: srcNodePath,
			credentialName,
		});

		await writeFileSafe(srcNodePath, updatedNodeAst.getFullText());
	}
}
