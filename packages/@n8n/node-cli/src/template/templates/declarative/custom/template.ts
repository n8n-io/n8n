import { select, text } from '@clack/prompts';
import { camelCase, capitalCase, pascalCase } from 'change-case';
import { jsonParse } from 'n8n-workflow';
import fs from 'node:fs/promises';
import path from 'node:path';
import prettier from 'prettier';
import { Project, SyntaxKind, type ObjectLiteralExpression } from 'ts-morph';

import { writeFileSafe } from '../../../../utils/filesystem';
import { withCancelHandler } from '../../../../utils/prompts';
import { createTemplate, type TemplateData } from '../../../core';

type MinimalTemplateConfig =
	| {
			credentialType: 'apiKey' | 'bearer' | 'basicAuth' | 'custom' | 'none';
			baseUrl: string;
	  }
	| { credentialType: 'oauth2'; baseUrl: string; flow: string };

type CredentialType = MinimalTemplateConfig['credentialType'];

const credentialTypePrompt = async () =>
	await withCancelHandler(
		select<CredentialType>({
			message: 'What type of authentication does your API use?',
			options: [
				{
					label: 'API Key',
					value: 'apiKey',
					hint: 'Send a secret key via headers, query, or body',
				},
				{
					label: 'Bearer Token',
					value: 'bearer',
					hint: 'Send a token via Authorization header (Authorization: Bearer <token>)',
				},
				{
					label: 'OAuth2',
					value: 'oauth2',
					hint: 'Use an OAuth 2.0 flow to obtain access tokens on behalf of a user or app',
				},
				{
					label: 'Basic Auth',
					value: 'basicAuth',
					hint: 'Send username and password encoded in base64 via the Authorization header',
				},
				{
					label: 'Custom',
					value: 'custom',
					hint: 'Create your own credential logic; an empty credential class will be scaffolded for you',
				},
				{
					label: 'None',
					value: 'none',
					hint: 'No authentication; no credential class will be generated',
				},
			],
			initialValue: 'apiKey',
		}),
	);

const baseUrlPrompt = async () =>
	await withCancelHandler(
		text({
			message: "What's the base URL of the API?",
			placeholder: 'https://api.example.com/v2',
			defaultValue: 'https://api.example.com/v2',
			validate: (value) => {
				if (!value) return;

				if (!value.startsWith('https://') && !value.startsWith('http://')) {
					return 'Base URL must start with http(s)://';
				}

				try {
					new URL(value);
				} catch (error) {
					return 'Must be a valid URL';
				}
				return;
			},
		}),
	);

const oauthFlowPrompt = async () =>
	await withCancelHandler(
		select<'clientCredentials' | 'authorizationCode'>({
			message: 'What OAuth2 flow does your API use?',
			options: [
				{
					label: 'Authorization code',
					value: 'authorizationCode',
					hint: 'Users log in and approve access (use this if unsure)',
				},
				{
					label: 'Client credentials',
					value: 'clientCredentials',
					hint: 'Server-to-server auth without user interaction',
				},
			],
			initialValue: 'authorizationCode',
		}),
	);

export const customTemplate = createTemplate({
	name: 'Start from scratch',
	description: 'Blank template with guided setup',
	path: path.join(__dirname, 'template'),
	prompts: async (): Promise<MinimalTemplateConfig> => {
		const baseUrl = await baseUrlPrompt();

		const credentialType = await credentialTypePrompt();

		if (credentialType === 'oauth2') {
			const flow = await oauthFlowPrompt();

			return { credentialType, baseUrl, flow };
		}

		return { credentialType, baseUrl };
	},
	run: async (data) => {
		const config = data.config as MinimalTemplateConfig;
		await renameNode(data, config, 'Example');
		await addCredential(data, config);
	},
});

async function renameNode(data: TemplateData, config: MinimalTemplateConfig, oldNodeName: string) {
	const newClassName = pascalCase(data.nodeName.replace('n8n-nodes-', ''));
	const parentDir = path.resolve(data.path, `nodes/${oldNodeName}`);
	const files = await fs.readdir(parentDir);

	for (const file of files) {
		const oldPath = path.resolve(parentDir, file);
		const oldFileName = path.basename(oldPath);
		const newFileName = oldFileName
			.replace(oldNodeName, newClassName)
			.replace(camelCase(oldNodeName), camelCase(newClassName));
		const newPath = path.resolve(parentDir, newFileName);
		await fs.rename(oldPath, newPath);
	}

	const newParentDir = path.resolve(data.path, `nodes/${newClassName}`);
	await fs.rename(parentDir, path.resolve(data.path, newParentDir));

	const project = new Project({
		skipFileDependencyResolution: true,
	});

	const nodePath = path.resolve(newParentDir, `${newClassName}.node.ts`);
	const sourceFile = project.addSourceFileAtPath(nodePath);
	const classDecl = sourceFile.getClasses()[0];

	if (classDecl) {
		classDecl.rename(newClassName);
		const descriptionProp = classDecl.getPropertyOrThrow('description');

		const descriptionInit = descriptionProp.getInitializerIfKindOrThrow(
			SyntaxKind.ObjectLiteralExpression,
		);

		const updateLiteral = (obj: ObjectLiteralExpression, key: string, value: string) => {
			obj
				.getProperty(key)
				?.asKind(SyntaxKind.PropertyAssignment)
				?.getInitializerIfKind(SyntaxKind.StringLiteral)
				?.setLiteralValue(value);
		};

		// Replace top-level string values
		updateLiteral(descriptionInit, 'displayName', capitalCase(newClassName));
		updateLiteral(descriptionInit, 'name', camelCase(newClassName));
		updateLiteral(
			descriptionInit,
			'description',
			`Interact with the ${capitalCase(newClassName)} API`,
		);

		// Replace icon paths
		const iconProp = descriptionInit.getProperty('icon')?.asKind(SyntaxKind.PropertyAssignment);
		const iconObj = iconProp?.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
		if (iconObj) {
			updateLiteral(iconObj, 'light', `file:${camelCase(newClassName)}.svg`);
			updateLiteral(iconObj, 'dark', `file:${camelCase(newClassName)}.dark.svg`);
		}

		// Replace baseURL
		const reqDefaultsProp = descriptionInit
			.getProperty('requestDefaults')
			?.asKind(SyntaxKind.PropertyAssignment);
		const reqDefaultsObj = reqDefaultsProp?.getInitializerIfKind(
			SyntaxKind.ObjectLiteralExpression,
		);
		const baseURLProp = reqDefaultsObj
			?.getProperty('baseURL')
			?.asKind(SyntaxKind.PropertyAssignment);
		baseURLProp?.getInitializerIfKind(SyntaxKind.StringLiteral)?.setLiteralValue(config.baseUrl);

		// Replace defaults.name
		const defaultsProp = descriptionInit
			.getPropertyOrThrow('defaults')
			.asKindOrThrow(SyntaxKind.PropertyAssignment);
		const defaultsObj = defaultsProp.getInitializerIfKindOrThrow(
			SyntaxKind.ObjectLiteralExpression,
		);
		updateLiteral(defaultsObj, 'name', capitalCase(newClassName));
	}

	await writeFileSafe(nodePath, sourceFile.getFullText());

	const packageJsonPath = path.resolve(data.path, 'package.json');
	const packageJson = jsonParse<{ n8n?: { nodes?: string[] } }>(
		await fs.readFile(packageJsonPath, 'utf-8'),
	);

	const nodes = [`dist/nodes/${newClassName}/${newClassName}.node.js`];
	packageJson['n8n'] ??= {};
	packageJson['n8n'].nodes = nodes;

	await writeFileSafe(
		packageJsonPath,
		await prettier.format(JSON.stringify(packageJson), { parser: 'json' }),
	);
}

async function addCredential(data: TemplateData, config: MinimalTemplateConfig) {
	if (config.credentialType !== 'none') {
		const credentialTemplateName =
			config.credentialType === 'oauth2'
				? config.credentialType + pascalCase(config.flow)
				: config.credentialType;
		const credentialTemplatePath = path.resolve(
			__dirname,
			`../../partials/credentials/${credentialTemplateName}.credentials.ts`,
		);
		const project = new Project({
			skipFileDependencyResolution: true,
		});

		const sourceFile = project.addSourceFileAtPath(credentialTemplatePath);
		const nodeName = data.nodeName.replace('n8n-nodes', '');
		const repoName = data.nodeName;
		const baseUrl = config.baseUrl;

		const classDecl = sourceFile.getClasses()[0];
		const className =
			config.credentialType === 'oauth2'
				? pascalCase(`${nodeName}-OAuth2-api`)
				: pascalCase(`${nodeName}-api`);
		const credentialName = camelCase(
			`${nodeName}${config.credentialType === 'oauth2' ? 'OAuth2Api' : 'Api'}`,
		);
		const credentialDisplayName = `${capitalCase(nodeName)} ${config.credentialType === 'oauth2' ? 'OAuth2 API' : 'API'}`;

		if (classDecl) {
			classDecl.rename(className);

			const displayNameProp = classDecl.getProperty('displayName');
			if (displayNameProp) {
				const initializer = displayNameProp.getInitializerIfKindOrThrow(SyntaxKind.StringLiteral);
				initializer.setLiteralValue(credentialDisplayName);
			}

			const nameProp = classDecl.getProperty('name');
			if (nameProp) {
				const initializer = nameProp.getInitializerIfKindOrThrow(SyntaxKind.StringLiteral);
				initializer.setLiteralValue(credentialName);
			}

			const docUrlProp = classDecl.getProperty('documentationUrl');
			if (docUrlProp) {
				const initializer = docUrlProp.getInitializerIfKindOrThrow(SyntaxKind.StringLiteral);
				const newUrl = initializer.getLiteralText().replace('/repo', `/${repoName}`);
				initializer.setLiteralValue(newUrl);
			}

			const testProp = classDecl.getProperty('test');
			const requestInit = testProp
				?.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression)
				?.getProperty('request')
				?.asKind(SyntaxKind.PropertyAssignment)
				?.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);

			const baseURLProp = requestInit
				?.getProperty('baseURL')
				?.asKind(SyntaxKind.PropertyAssignment);
			baseURLProp?.getInitializerIfKind(SyntaxKind.StringLiteral)?.setLiteralValue(baseUrl);
		}

		await writeFileSafe(
			path.resolve(data.path, `credentials/${className}.credentials.ts`),
			sourceFile.getFullText(),
		);

		const packageJsonPath = path.resolve(data.path, 'package.json');
		const packageJson = jsonParse<{ n8n?: { credentials?: string[]; nodes?: string[] } }>(
			await fs.readFile(packageJsonPath, 'utf-8'),
		);

		const credentials = packageJson?.['n8n']?.credentials ?? [];
		credentials.push(`dist/credentials/${className}.credentials.js`);
		packageJson['n8n'] ??= {};
		packageJson['n8n'].credentials = credentials;

		await writeFileSafe(
			packageJsonPath,
			await prettier.format(JSON.stringify(packageJson), { parser: 'json' }),
		);

		for (const nodePath of packageJson.n8n.nodes ?? []) {
			const srcNodePath = path.resolve(
				data.path,
				nodePath.replace(/.js$/, '.ts').replace(/^dist\//, ''),
			);
			const project = new Project({
				skipFileDependencyResolution: true,
			});
			const sourceFile = project.addSourceFileAtPath(srcNodePath);

			const classDecl = sourceFile.getClasses()[0];

			const descriptionProp = classDecl
				.getPropertyOrThrow('description')
				.getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);

			const credentialsProp = descriptionProp.getPropertyOrThrow('credentials');

			if (credentialsProp.getKind() === SyntaxKind.PropertyAssignment) {
				const initializer = credentialsProp.getFirstDescendantByKindOrThrow(
					SyntaxKind.ArrayLiteralExpression,
				);
				initializer.addElement(`{ name: '${credentialName}', required: true }`);
			}

			await writeFileSafe(srcNodePath, sourceFile.getFullText());
		}
	}
}
