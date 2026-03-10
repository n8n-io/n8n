import { readFileSync } from 'fs';
import { resolve } from 'path';

import { describe, it, expect } from '@jest/globals';

import { generateDataFlowWorkflowCode } from '../codegen/dataflow/index';
import type { WorkflowJSON } from '../types/base';

function loadTemplate(relativePath: string): WorkflowJSON {
	const fullPath = resolve(
		__dirname,
		'../../../../frontend/editor-ui/src/features/workflows/templates/utils/samples',
		relativePath,
	);
	return JSON.parse(readFileSync(fullPath, 'utf-8')) as WorkflowJSON;
}

describe('dataflow integration', () => {
	describe('generateDataFlowWorkflowCode', () => {
		it('generates valid code from simple inline workflow', () => {
			const json: WorkflowJSON = {
				name: 'Simple Test',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4,
						position: [200, 0],
						parameters: { url: 'https://example.com' },
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
					},
				},
			};

			const code = generateDataFlowWorkflowCode(json);

			expect(code).toContain("workflow({ name: 'Simple Test' }, () => {");
			expect(code).toContain('onTrigger(');
			expect(code).toContain('node(');
			expect(code).toContain("type: 'n8n-nodes-base.httpRequest'");
		});

		it('generates valid code from options object', () => {
			const json: WorkflowJSON = {
				name: 'Options Test',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			};

			const code = generateDataFlowWorkflowCode({ workflow: json });

			expect(code).toContain("workflow({ name: 'Options Test' }, () => {");
			expect(code).toContain('onTrigger(');
		});

		it('generates code from easy_ai_starter template', () => {
			const json = loadTemplate('easy_ai_starter.json');
			const code = generateDataFlowWorkflowCode(json);

			// Should have workflow wrapper
			expect(code).toContain('workflow(');
			// Should have trigger
			expect(code).toContain('onTrigger(');
			// Should have AI agent node
			expect(code).toContain('@n8n/n8n-nodes-langchain.agent');
			// Should have subnodes for the AI model
			expect(code).toContain('subnodes:');
			expect(code).toContain('ai_languageModel');
		});

		it('generates code from tutorial/api_fundamentals template', () => {
			const json = loadTemplate('tutorial/api_fundamentals.json');
			const code = generateDataFlowWorkflowCode(json);

			// Should have workflow wrapper
			expect(code).toContain('workflow(');
			// Should have multiple triggers (webhooks)
			expect(code).toContain('onTrigger(');
			expect(code).toContain('n8n-nodes-base.webhook');
			// Should have IF conditions (from webhook handler with query param check)
			expect(code).toContain('if (');
		});

		it('generates code from tutorial/workflow_logic template', () => {
			const json = loadTemplate('tutorial/workflow_logic.json');
			const code = generateDataFlowWorkflowCode(json);

			// Should have workflow wrapper
			expect(code).toContain('workflow(');
			// This template uses Merge nodes heavily, so most patterns become fanOut
			// which is unsupported in v1 — verify graceful degradation
			expect(code).toContain('// TODO: unsupported pattern');
		});
	});
});
