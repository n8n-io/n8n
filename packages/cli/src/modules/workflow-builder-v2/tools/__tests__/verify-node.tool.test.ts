import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import type { LookupNodeDescription } from '../../utils/node-filter';
import type { ResolveNodeVersion } from '../propose-nodes.tool';
import { createVerifyNodeTool } from '../verify-node.tool';

type ToolHandler = (input: unknown, ctx: unknown) => Promise<unknown>;

function makeDescription(overrides: Partial<INodeTypeDescription> = {}): INodeTypeDescription {
	return {
		name: 'n8n-nodes-base.gmail',
		displayName: 'Gmail',
		group: ['transform'],
		version: 2.2,
		description: 'Consume the Gmail API',
		defaults: { name: 'Gmail' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
		...overrides,
	} satisfies INodeTypeDescription;
}

describe('verify_node tool', () => {
	it('returns metadata and warns when a recognized standalone node version is stale', async () => {
		const lookup: LookupNodeDescription = jest.fn(() => makeDescription());
		const resolveNodeVersion: ResolveNodeVersion = jest.fn(() => 2.2);
		const tool = createVerifyNodeTool(lookup, resolveNodeVersion) as unknown as {
			handler: ToolHandler;
		};

		const result = (await tool.handler({ nodeType: 'n8n-nodes-base.gmail', version: 2 }, {})) as {
			ok: boolean;
			version: number;
			currentVersion: number;
			isCurrentVersion: boolean;
			isStandalone: boolean;
			hint: string;
		};

		expect(result).toMatchObject({
			ok: true,
			version: 2,
			currentVersion: 2.2,
			isCurrentVersion: false,
			isStandalone: true,
		});
		expect(result.hint).toContain('Use n8n-nodes-base.gmail@2.2');
	});

	it('rejects unknown node types', async () => {
		const tool = createVerifyNodeTool(
			() => null,
			() => null,
		) as unknown as { handler: ToolHandler };

		const result = (await tool.handler({ nodeType: 'n8n-nodes-base.notARealNode' }, {})) as {
			ok: boolean;
			error: string;
		};

		expect(result).toMatchObject({
			ok: false,
			error: 'unknown-node-type',
		});
	});

	it('marks AI sub-nodes as non-standalone and explains their role', async () => {
		const tool = createVerifyNodeTool(
			() =>
				makeDescription({
					name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					displayName: 'OpenAI Chat Model',
					outputs: [NodeConnectionTypes.AiLanguageModel],
				}),
			() => 1.3,
		) as unknown as { handler: ToolHandler };

		const result = (await tool.handler(
			{ nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi' },
			{},
		)) as {
			ok: boolean;
			isStandalone: boolean;
			aiRole?: { kind: string; purpose: string };
		};

		expect(result.ok).toBe(true);
		expect(result.isStandalone).toBe(false);
		expect(result.aiRole?.kind).toBe('language-model-sub-node');
		expect(result.aiRole?.purpose).toContain('model connection');
	});
});
