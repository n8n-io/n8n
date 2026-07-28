import type { INodeType, INodeTypeBaseDescription } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { GmailV2 } from '../../../../../../nodes-base/nodes/Google/Gmail/v2/GmailV2.node';
import { GoogleSheetsV2 } from '../../../../../../nodes-base/nodes/Google/Sheet/v2/GoogleSheetsV2.node';
import { SlackV2 } from '../../../../../../nodes-base/nodes/Slack/V2/SlackV2.node';
import type { NodeTypes } from '@/node-types';

import type { JsonSchemaNodeMcpPocEndpoint } from '../../node-mcp-poc.types';
import { NodeToolsetCompiler } from '../node-toolset-compiler';

function baseDescription(
	displayName: string,
	name: string,
	defaultVersion: number,
): INodeTypeBaseDescription {
	return {
		displayName,
		name,
		group: ['output'],
		description: `${displayName} node`,
		defaultVersion,
	};
}

const nodes: Record<string, INodeType> = {
	'n8n-nodes-base.gmail': new GmailV2(baseDescription('Gmail', 'n8n-nodes-base.gmail', 2.2)),
	'n8n-nodes-base.googleSheets': new GoogleSheetsV2(
		baseDescription('Google Sheets', 'n8n-nodes-base.googleSheets', 4.7),
	),
	'n8n-nodes-base.slack': new SlackV2(baseDescription('Slack', 'n8n-nodes-base.slack', 2.5)),
};

function endpoint(nodeType: string, nodeVersion: number): JsonSchemaNodeMcpPocEndpoint {
	return {
		endpoint: 'test',
		type: 'json-schema',
		binding: {
			nodeType,
			nodeVersion,
			projectId: 'project',
			userId: 'user',
			credentials: {},
		},
		flavor: { resolver: 'per-parameter', hideOptions: false },
	};
}

describe('NodeToolsetCompiler real node descriptions', () => {
	const nodeTypes = mock<NodeTypes>();
	const compiler = new NodeToolsetCompiler(nodeTypes);

	beforeEach(() => {
		nodeTypes.getByNameAndVersion.mockImplementation((nodeType) => nodes[nodeType]);
	});

	it('compiles Gmail send without the send-and-wait operation', () => {
		const toolset = compiler.compile(endpoint('n8n-nodes-base.gmail', 2.2));
		const send = toolset.tools.find(({ name }) => name === 'message_send');

		expect(send?.jsonSchema.required).toEqual(
			expect.arrayContaining(['sendTo', 'subject', 'message']),
		);
		expect(toolset.tools.map(({ name }) => name)).not.toContain('message_sendAndWait');
	});

	it('preserves Slack selector-driven required fields', () => {
		const toolset = compiler.compile(endpoint('n8n-nodes-base.slack', 2.5));
		const post = toolset.tools.find(({ name }) => name === 'message_post');

		expect(post?.jsonSchema.allOf).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ then: { required: ['text'] } }),
				expect.objectContaining({ then: { required: ['channelId'] } }),
			]),
		);
		expect(post?.dynamicParameters.map(({ path }) => path)).toEqual(
			expect.arrayContaining(['channelId', 'user']),
		);
	});

	it('compiles the Sheets resolver chain for the pinned version', () => {
		const toolset = compiler.compile(endpoint('n8n-nodes-base.googleSheets', 4.7));
		const append = toolset.tools.find(({ name }) => name === 'sheet_append');

		expect(append?.dynamicParameters.map(({ path }) => path)).toEqual([
			'documentId',
			'sheetName',
			'columns',
		]);
		expect(append?.jsonSchema.properties).not.toHaveProperty('fieldsUi');
	});
});
