import { pascalCase } from 'change-case';
import path from 'node:path';

import { addCredentialToNode, updateCredentialAst, updateNodeAst } from './ast';
import { setNodesPackageJson, addCredentialPackageJson, getPackageJsonNodes } from './package';
import { baseUrlPrompt, credentialTypePrompt, oauthFlowPrompt } from './prompts';
import type { CustomTemplateConfig } from './types';
import {
	renameDirectory,
	renameFilesInDirectory,
	writeFileSafe,
} from '../../../../utils/filesystem';
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
		const config = data.config as CustomTemplateConfig;
		await renameNode(data, config, 'Example');
		await addCredential(data, config);
	},
});

async function renameNode(data: TemplateData, config: CustomTemplateConfig, oldNodeName: string) {
	const newClassName = pascalCase(data.nodeName.replace('n8n-nodes-', ''));
	const oldNodeDir = path.resolve(data.path, `nodes/${oldNodeName}`);

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
	await setNodesPackageJson(data.path, nodes);
}

async function addCredential(data: TemplateData, config: CustomTemplateConfig) {
	if (config.credentialType === 'none') return;

	const credentialTemplateName =
		config.credentialType === 'oauth2'
			? config.credentialType + pascalCase(config.flow)
			: config.credentialType;
	const credentialTemplatePath = path.resolve(
		__dirname,
		`../../credentials/${credentialTemplateName}.credentials.ts`,
	);

	const nodeName = data.nodeName.replace('n8n-nodes', '');
	const repoName = data.nodeName;
	const { baseUrl, credentialType } = config;
	const credentialClassName =
		config.credentialType === 'oauth2'
			? pascalCase(`${nodeName}-OAuth2-api`)
			: pascalCase(`${nodeName}-api`);

	const updatedCredentialAst = updateCredentialAst({
		repoName,
		baseUrl,
		nodeName,
		credentialType,
		credentialClassName,
		credentialPath: credentialTemplatePath,
	});

	await writeFileSafe(
		path.resolve(data.path, `credentials/${credentialClassName}.credentials.ts`),
		updatedCredentialAst.getFullText(),
	);

	await addCredentialPackageJson(
		data.path,
		`dist/credentials/${credentialClassName}.credentials.js`,
	);

	for (const nodePath of await getPackageJsonNodes(data.path)) {
		const srcNodePath = path.resolve(
			data.path,
			nodePath.replace(/.js$/, '.ts').replace(/^dist\//, ''),
		);

		const updatedNodeAst = addCredentialToNode({
			nodePath: srcNodePath,
			credentialName: credentialClassName,
		});

		await writeFileSafe(srcNodePath, updatedNodeAst.getFullText());
	}
}
