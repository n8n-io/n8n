import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { codeToJson } from './code-to-json';
import { jsonToCode } from './json-to-code';
import type { WorkflowJSON } from '../types/base';

describe('CLI workflow round trip', () => {
	let tmpRoot: string;

	beforeEach(() => {
		tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-cli-roundtrip-'));
		vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		fs.rmSync(tmpRoot, { recursive: true, force: true });
	});

	it.each([3, 3.1])('preserves tool availability source IDs for Agent V%s', (version) => {
		const original: WorkflowJSON = {
			id: 'workflow-id',
			name: 'Tool Availability',
			nodes: [
				{
					id: 'trigger-id',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'agent-id',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: version,
					position: [200, 0],
					parameters: {
						promptType: 'define',
						text: 'Use the available tools',
						toolAvailability: {
							rules: [{ sourceNodeId: 'calculator-id', available: '={{ $json.allowTool }}' }],
						},
					},
				},
				{
					id: 'model-id',
					name: 'Chat Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					typeVersion: 1.2,
					position: [200, 200],
					parameters: { model: 'gpt-4o-mini' },
				},
				{
					id: 'calculator-id',
					name: 'Calculator',
					type: '@n8n/n8n-nodes-langchain.toolCalculator',
					typeVersion: 1,
					position: [400, 200],
					parameters: {},
				},
			],
			connections: {
				Start: { main: [[{ node: 'AI Agent', type: 'main', index: 0 }]] },
				'Chat Model': {
					ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
				},
				Calculator: { ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]] },
			},
		};
		const inputPath = path.join(tmpRoot, 'workflow.json');
		fs.writeFileSync(inputPath, JSON.stringify(original));

		jsonToCode(inputPath);
		const codeFile = fs.readdirSync(tmpRoot).find((name) => name.endsWith('.ts'))!;
		codeToJson(path.join(tmpRoot, codeFile));
		const jsonFile = fs
			.readdirSync(tmpRoot)
			.find((name) => name.endsWith('.json') && name !== 'workflow.json')!;
		const rebuilt = JSON.parse(
			fs.readFileSync(path.join(tmpRoot, jsonFile), 'utf-8'),
		) as WorkflowJSON;

		const agent = rebuilt.nodes.find(({ name }) => name === 'AI Agent')!;
		const calculator = rebuilt.nodes.find(({ name }) => name === 'Calculator')!;
		expect(agent.typeVersion).toBe(version);
		expect(agent.parameters?.toolAvailability).toEqual({
			rules: [{ sourceNodeId: calculator.id, available: '={{ $json.allowTool }}' }],
		});
		for (const node of original.nodes) {
			expect(rebuilt.nodes.find(({ name }) => name === node.name)?.id).toBe(node.id);
		}
		expect(rebuilt.connections).toEqual(original.connections);
	});
});
