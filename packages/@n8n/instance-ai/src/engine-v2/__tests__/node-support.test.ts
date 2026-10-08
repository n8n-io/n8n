import { isNodeTypeSupportedOnEngineV2 } from '../node-support';

describe('isNodeTypeSupportedOnEngineV2', () => {
	it('accepts a node with main connections only', () => {
		expect(
			isNodeTypeSupportedOnEngineV2({
				name: 'n8n-nodes-base.httpRequest',
				inputs: ['main'],
				outputs: ['main'],
			}),
		).toBe(true);
	});

	it('accepts a node whose input count is an expression over main connections', () => {
		expect(
			isNodeTypeSupportedOnEngineV2({
				name: 'n8n-nodes-base.merge',
				inputs: '={{ Array.from({ length: 2 }, () => "main") }}',
				outputs: ['main'],
			}),
		).toBe(true);
	});

	it('rejects the Code node', () => {
		expect(
			isNodeTypeSupportedOnEngineV2({
				name: 'n8n-nodes-base.code',
				inputs: ['main'],
				outputs: ['main'],
			}),
		).toBe(false);
	});

	it('rejects a node with a non-main input', () => {
		expect(
			isNodeTypeSupportedOnEngineV2({
				name: '@n8n/n8n-nodes-langchain.agent',
				inputs: ['main', { type: 'ai_languageModel', required: true }],
				outputs: ['main'],
			}),
		).toBe(false);
	});

	it('rejects a node whose input expression names a non-main connection', () => {
		expect(
			isNodeTypeSupportedOnEngineV2({
				name: '@n8n/n8n-nodes-langchain.chainLlm',
				inputs: '={{ [{ type: "main" }, { type: "ai_languageModel" }] }}',
				outputs: ['main'],
			}),
		).toBe(false);
	});

	it('rejects a node with a non-main output', () => {
		expect(
			isNodeTypeSupportedOnEngineV2({
				name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				inputs: [],
				outputs: ['ai_languageModel'],
			}),
		).toBe(false);
	});

	it('rejects a sub-workflow, wait, form, chat and MCP trigger node by name', () => {
		for (const name of [
			'n8n-nodes-base.executeWorkflow',
			'n8n-nodes-base.executeWorkflowTrigger',
			'n8n-nodes-base.wait',
			'n8n-nodes-base.form',
			'n8n-nodes-base.formTrigger',
			'@n8n/n8n-nodes-langchain.chatTrigger',
			'@n8n/n8n-nodes-langchain.mcpTrigger',
		]) {
			expect(isNodeTypeSupportedOnEngineV2({ name, inputs: ['main'], outputs: ['main'] })).toBe(
				false,
			);
		}
	});

	it('treats a LangChain node known only by name as unsupported', () => {
		expect(isNodeTypeSupportedOnEngineV2({ name: '@n8n/n8n-nodes-langchain.agent' })).toBe(false);
	});

	it('treats a base node known only by name as supported', () => {
		expect(isNodeTypeSupportedOnEngineV2({ name: 'n8n-nodes-base.slack' })).toBe(true);
	});
});
