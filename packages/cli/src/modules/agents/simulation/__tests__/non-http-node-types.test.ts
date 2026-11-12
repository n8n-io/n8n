import { nodeSimulationGap } from '../non-http-node-types';

describe('nodeSimulationGap', () => {
	it.each([
		'n8n-nodes-base.slack',
		'n8n-nodes-base.gmail',
		'n8n-nodes-base.httpRequest',
		'n8n-nodes-base.set',
		'n8n-nodes-base.if',
	])('lets the first-party HTTP or data node %s run', (nodeType) => {
		expect(nodeSimulationGap(nodeType)).toBeUndefined();
	});

	it.each([
		'n8n-nodes-base.emailSend',
		'n8n-nodes-base.postgres',
		'n8n-nodes-base.ssh',
		'n8n-nodes-base.code',
		'n8n-nodes-base.function',
		'n8n-nodes-base.aiTransform',
		'n8n-nodes-base.executeCommand',
		'n8n-nodes-base.readWriteFile',
		'n8n-nodes-base.executeWorkflow',
		'n8n-nodes-base.emailReadImap',
		'n8n-nodes-base.oracleDatabase',
		'@n8n/n8n-nodes-langchain.lmChatOpenAi',
		'n8n-nodes-community.anything',
		'@acme/n8n-nodes-acme.acme',
	])('blocks %s', (nodeType) => {
		expect(nodeSimulationGap(nodeType)).toEqual(expect.any(String));
	});

	it('blocks send-and-wait on an otherwise allowed node', () => {
		expect(nodeSimulationGap('n8n-nodes-base.slack', { operation: 'sendAndWait' })).toEqual(
			expect.any(String),
		);
	});
});
