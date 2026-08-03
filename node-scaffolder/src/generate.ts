import type { WriteBoundary } from './boundary.js';
import { toPascalCase } from './parse-spec.js';
import type { NodeSpec, ResourceSpec } from './types.js';

function credentialTypeName(spec: NodeSpec): string {
	return `${spec.name}Api`;
}

function credentialClassName(spec: NodeSpec): string {
	return `${toPascalCase(spec.displayName)}Api`;
}

function formatOperationOption(resource: ResourceSpec, op: ResourceSpec['operations'][number]): string {
	const url =
		op.path.includes('{{') || op.path.includes('={{')
			? op.path.startsWith('=')
				? op.path
				: `=${op.path}`
			: op.path;

	return `			{
				name: '${op.name}',
				value: '${op.value}',
				description: '${(op.description ?? op.name).replace(/'/g, "\\'")}',
				action: '${(op.description ?? op.name).replace(/'/g, "\\'")}',
				routing: {
					request: {
						method: '${op.method}',
						url: '${url}',
					},
				},
			}`;
}

function generateResourceDescription(spec: NodeSpec, resource: ResourceSpec): string {
	const ops = resource.operations.map((op) => formatOperationOption(resource, op)).join(',\n');
	const idField =
		resource.operations.some((op) => op.value === 'get' || op.path.includes('Id'))
			? `
{
	displayName: '${resource.name} ID',
	name: '${resource.value}Id',
	type: 'string',
	required: true,
	default: '',
	displayOptions: {
		show: {
			resource: ['${resource.value}'],
			operation: ['get'],
		},
	},
	description: 'The ID of the ${resource.name.toLowerCase()}',
},`
			: '';

	return `import type { INodeProperties } from 'n8n-workflow';

export const ${resource.value}Operations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['${resource.value}'],
			},
		},
		options: [
${ops}
		],
		default: '${resource.operations[0]?.value ?? 'getAll'}',
	},
];

export const ${resource.value}Fields: INodeProperties[] = [
${idField}
];
`;
}

function generateNodeTs(spec: NodeSpec, folderName: string): string {
	const imports = spec.resources
		.map(
			(r) =>
				`import { ${r.value}Fields, ${r.value}Operations } from './${toPascalCase(r.name)}Description';`,
		)
		.join('\n');

	const resourceOptions = spec.resources
		.map(
			(r) => `				{
					name: '${r.name}',
					value: '${r.value}',
				}`,
		)
		.join(',\n');

	const spreadProps = spec.resources
		.map((r) => `\t\t\t...${r.value}Operations,\n\t\t\t...${r.value}Fields,`)
		.join('\n');

	const credentialsBlock =
		spec.auth === 'none'
			? 'credentials: [],'
			: `credentials: [
			{
				name: '${credentialTypeName(spec)}',
				required: true,
			},
		],`;

	const className = toPascalCase(spec.displayName);

	return `import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

${imports}

export class ${className} implements INodeType {
	description: INodeTypeDescription = {
		displayName: '${spec.displayName}',
		name: '${spec.name}',
		icon: 'file:${folderName}.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: '${spec.description.replace(/'/g, "\\'")}',
		defaults: {
			name: '${spec.displayName}',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		${credentialsBlock}
		requestDefaults: {
			baseURL: '${spec.baseUrl}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
${resourceOptions}
				],
				default: '${spec.resources[0]?.value ?? 'item'}',
			},
${spreadProps}
		],
	};
}
`;
}

function generateNodeJson(spec: NodeSpec): string {
	return `${JSON.stringify(
		{
			node: `n8n-nodes-base.${spec.name}`,
			nodeVersion: '1.0',
			codexVersion: '1.0',
			categories: ['Miscellaneous'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/creating-nodes/overview/',
					},
				],
			},
		},
		null,
		'\t',
	)}\n`;
}

function generateCredentialDraft(spec: NodeSpec): string {
	const className = credentialClassName(spec);
	const typeName = credentialTypeName(spec);

	if (spec.auth === 'oAuth2') {
		return `import type { ICredentialType, INodeProperties } from 'n8n-workflow';

/**
 * DRAFT — not registered.
 * Copy to packages/nodes-base/credentials/${className}.credentials.ts and
 * add the entry to packages/nodes-base/package.json "n8n"."credentials".
 * That path is outside the scaffolder write boundary by design.
 */
export class ${className} implements ICredentialType {
	name = '${typeName}';

	displayName = '${spec.displayName} OAuth2 API';

	extends = ['oAuth2Api'];

	documentationUrl = '${spec.name}';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: '${spec.baseUrl}/oauth/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '${spec.baseUrl}/oauth/token',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '',
		},
	];
}
`;
	}

	// apiKey (default) and none still emit an apiKey draft when auth is apiKey
	return `import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * DRAFT — not registered.
 * Copy to packages/nodes-base/credentials/${className}.credentials.ts and
 * add the entry to packages/nodes-base/package.json "n8n"."credentials".
 * That path is outside the scaffolder write boundary by design.
 */
export class ${className} implements ICredentialType {
	name = '${typeName}';

	displayName = '${spec.displayName} API';

	documentationUrl = '${spec.name}';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '${spec.baseUrl}',
			url: '/',
		},
	};
}
`;
}

/** Minimal placeholder SVG (nodes-base convention: file:Name.svg). */
function generateSvg(displayName: string): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
  <rect width="60" height="60" rx="8" fill="#FF5646"/>
  <text x="30" y="36" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="14">${displayName.slice(0, 4)}</text>
</svg>
`;
}

export function generateNodeFiles(
	boundary: WriteBoundary,
	spec: NodeSpec,
): { folderName: string } {
	const folderName = toPascalCase(spec.displayName);

	boundary.writeAllowed(`${folderName}.node.ts`, generateNodeTs(spec, folderName));
	boundary.writeAllowed(`${folderName}.node.json`, generateNodeJson(spec));
	boundary.writeAllowed(`${folderName}.svg`, generateSvg(spec.displayName));

	for (const resource of spec.resources) {
		const fileName = `${toPascalCase(resource.name)}Description.ts`;
		boundary.writeAllowed(fileName, generateResourceDescription(spec, resource));
	}

	if (spec.auth !== 'none') {
		boundary.writeAllowed(
			`credentials-draft/${credentialClassName(spec)}.credentials.ts`,
			generateCredentialDraft(spec),
		);
	}

	return { folderName };
}
