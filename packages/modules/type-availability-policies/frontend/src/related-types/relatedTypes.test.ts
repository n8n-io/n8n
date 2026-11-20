import type { INodeCredentialDescription, INodeTypeDescription } from 'n8n-workflow';

import {
	buildCredentialTypeIndex,
	getCredentialRelatedTypes,
	getGeneratedToolVariantBase,
} from './relatedTypes';

function nodeType(
	name: string,
	credentials: string[] = [],
	extra: Partial<INodeTypeDescription> = {},
): INodeTypeDescription {
	return {
		displayName: name,
		name,
		group: ['transform'],
		version: 1,
		description: '',
		defaults: {},
		inputs: [],
		outputs: [],
		properties: [],
		credentials: credentials.map(
			(credential): INodeCredentialDescription => ({ name: credential }),
		),
		...extra,
	};
}

describe('getGeneratedToolVariantBase', () => {
	const types = new Map<string, Partial<INodeTypeDescription>>([
		['n8n-nodes-base.gmail', { usableAsTool: true }],
		['n8n-nodes-base.slack', {}],
		['@n8n/n8n-nodes-langchain.agent', {}],
	]);
	const getNodeType = (name: string) => types.get(name);

	it('detects a Tool variant of a node type usable as a tool', () => {
		expect(getGeneratedToolVariantBase('n8n-nodes-base.gmailTool', getNodeType)).toBe(
			'n8n-nodes-base.gmail',
		);
	});

	it('detects a HitlTool variant, whose base does not need to be usable as a tool', () => {
		expect(getGeneratedToolVariantBase('n8n-nodes-base.slackHitlTool', getNodeType)).toBe(
			'n8n-nodes-base.slack',
		);
	});

	it('keeps real node types whose name ends in Tool', () => {
		expect(
			getGeneratedToolVariantBase('@n8n/n8n-nodes-langchain.agentTool', getNodeType),
		).toBeUndefined();
		expect(
			getGeneratedToolVariantBase('@n8n/n8n-nodes-langchain.mcpClientTool', getNodeType),
		).toBeUndefined();
	});

	it('keeps node types that do not end in Tool', () => {
		expect(getGeneratedToolVariantBase('n8n-nodes-base.gmail', getNodeType)).toBeUndefined();
	});
});

describe('buildCredentialTypeIndex', () => {
	it('links every node type that lists a credential type, in every version, with no filter', () => {
		const index = buildCredentialTypeIndex([
			nodeType('n8n-nodes-base.gmail', ['googleApi', 'httpHeaderAuth']),
			nodeType('n8n-nodes-base.googleDrive', ['googleApi'], { version: 1 }),
			nodeType('n8n-nodes-base.googleDrive', [], { version: 2 }),
			nodeType('n8n-nodes-base.evaluation', ['googleApi']),
		]);

		expect(index.nodeTypesByCredentialType.get('googleApi')).toEqual(
			new Set(['n8n-nodes-base.gmail', 'n8n-nodes-base.googleDrive', 'n8n-nodes-base.evaluation']),
		);
		expect(index.nodeTypesByCredentialType.get('httpHeaderAuth')).toEqual(
			new Set(['n8n-nodes-base.gmail']),
		);
		expect(index.latestNodeTypes.get('n8n-nodes-base.googleDrive')?.version).toBe(2);
	});

	it('lists the node types that are usable as a tool in any version', () => {
		const index = buildCredentialTypeIndex([
			nodeType('n8n-nodes-base.gmail', [], { usableAsTool: true }),
			nodeType('n8n-nodes-base.googleDrive', [], { version: 1, usableAsTool: true }),
			nodeType('n8n-nodes-base.googleDrive', [], { version: 2 }),
			nodeType('n8n-nodes-base.set'),
		]);

		expect(index.toolCapableNodeTypes).toEqual(
			new Set(['n8n-nodes-base.gmail', 'n8n-nodes-base.googleDrive']),
		);
	});
});

describe('getCredentialRelatedTypes', () => {
	const relatedToCredential = (name: string, descriptions: INodeTypeDescription[]) =>
		getCredentialRelatedTypes(name, buildCredentialTypeIndex(descriptions));

	// The credential lists of the Airtable node versions, as in n8n-nodes-base.
	const AIRTABLE = [
		nodeType('n8n-nodes-base.airtable', ['airtableApi'], { version: 1 }),
		nodeType('n8n-nodes-base.airtable', ['airtableTokenApi', 'airtableOAuth2Api'], {
			version: 2,
		}),
		nodeType('n8n-nodes-base.airtableTrigger', [
			'airtableApi',
			'airtableTokenApi',
			'airtableOAuth2Api',
		]),
	];

	it('lists the node types that use the credential type and their other credential types', () => {
		expect(relatedToCredential('airtableApi', AIRTABLE)).toEqual({
			nodeTypes: ['n8n-nodes-base.airtable', 'n8n-nodes-base.airtableTrigger'],
			credentialTypes: ['airtableTokenApi', 'airtableOAuth2Api'],
		});
	});

	it('lists only node types when they use no other credential type', () => {
		const descriptions = [
			nodeType('n8n-nodes-base.activeCampaign', ['activeCampaignApi']),
			nodeType('n8n-nodes-base.activeCampaignTrigger', ['activeCampaignApi']),
		];

		expect(relatedToCredential('activeCampaignApi', descriptions)).toEqual({
			nodeTypes: ['n8n-nodes-base.activeCampaign', 'n8n-nodes-base.activeCampaignTrigger'],
			credentialTypes: [],
		});
	});

	it('leaves out the generic credential types of the related node types', () => {
		const descriptions = [nodeType('n8n-nodes-base.notion', ['notionApi', 'httpHeaderAuth'])];

		expect(relatedToCredential('notionApi', descriptions).credentialTypes).toEqual([]);
	});

	it('relates nothing to a generic credential type', () => {
		const descriptions = [
			nodeType('n8n-nodes-base.httpRequest', ['httpHeaderAuth']),
			nodeType('n8n-nodes-base.notion', ['notionApi', 'httpHeaderAuth']),
		];

		expect(relatedToCredential('httpHeaderAuth', descriptions)).toEqual({
			nodeTypes: [],
			credentialTypes: [],
		});
	});

	it('relates every node type that lists a shared credential type', () => {
		const descriptions = [
			nodeType('n8n-nodes-base.gmail', ['googleApi', 'gmailOAuth2']),
			nodeType('n8n-nodes-base.googleDrive', ['googleApi', 'googleDriveOAuth2Api']),
		];

		expect(relatedToCredential('googleApi', descriptions)).toEqual({
			nodeTypes: ['n8n-nodes-base.gmail', 'n8n-nodes-base.googleDrive'],
			credentialTypes: ['gmailOAuth2', 'googleDriveOAuth2Api'],
		});
	});

	it('leaves out the excluded, hidden and generated tool node types and their credential types', () => {
		const descriptions = [
			nodeType('n8n-nodes-base.gmail', ['gmailOAuth2'], { usableAsTool: true }),
			nodeType('n8n-nodes-base.gmailTool', ['gmailOAuth2', 'toolOnlyApi']),
			nodeType('n8n-nodes-base.gmailLegacy', ['gmailOAuth2', 'legacyApi'], { hidden: true }),
			nodeType('n8n-nodes-base.evaluation', ['gmailOAuth2', 'googleApi']),
		];

		expect(relatedToCredential('gmailOAuth2', descriptions)).toEqual({
			nodeTypes: ['n8n-nodes-base.gmail'],
			credentialTypes: [],
		});
	});

	it('leaves out the Tool variant of a node type that is usable as a tool only in an older version', () => {
		const descriptions = [
			nodeType('n8n-nodes-base.gmail', ['gmailOAuth2'], { version: 1, usableAsTool: true }),
			nodeType('n8n-nodes-base.gmail', ['gmailOAuth2'], { version: 2 }),
			nodeType('n8n-nodes-base.gmailTool', ['gmailOAuth2']),
		];

		expect(relatedToCredential('gmailOAuth2', descriptions).nodeTypes).toEqual([
			'n8n-nodes-base.gmail',
		]);
	});

	it('relates nothing to a credential type that no node type lists', () => {
		expect(relatedToCredential('virusTotalApi', AIRTABLE)).toEqual({
			nodeTypes: [],
			credentialTypes: [],
		});
	});
});
