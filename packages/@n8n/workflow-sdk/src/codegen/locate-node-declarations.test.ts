import { buildImports } from './emit-instance-ai';
import { generateWorkflowCode } from './index';
import { locateNodeDeclarations } from './locate-node-declarations';
import type { WorkflowJSON } from '../types/base';

function lineOf(code: string, text: string): number {
	const index = code.split('\n').findIndex((line) => line.includes(text));
	if (index < 0) throw new Error(`"${text}" not in code`);
	return index + 1;
}

describe('locateNodeDeclarations', () => {
	it('locates every node in generated source, including nodes without an emitted id', () => {
		const workflow: WorkflowJSON = {
			name: 'W',
			nodes: [
				{
					id: 'shared',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'shared',
					name: 'Second',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [200, 0],
					parameters: {},
				},
				{
					id: 'note',
					name: 'Notes',
					type: 'n8n-nodes-base.stickyNote',
					typeVersion: 1,
					position: [0, 200],
					parameters: { content: '# Notes\nname: Notes' },
				},
			],
			connections: { Start: { main: [[{ node: 'Second', type: 'main', index: 0 }]] } },
		};
		const body = generateWorkflowCode({ workflow, includeNodeIds: true });
		const code = `${buildImports(body)}\n\n${body}`;

		expect(locateNodeDeclarations(code)).toEqual([
			{ name: 'Start', id: 'shared', line: lineOf(code, 'trigger({') },
			{ name: 'Second', line: lineOf(code, 'const second = node({') },
			{ name: 'Notes', id: 'note', line: lineOf(code, 'sticky(`') },
		]);
	});

	it('ignores node-head text inside strings, templates, and parameters', () => {
		const code = [
			"import { node, sticky, workflow } from '@n8n/workflow-sdk';",
			'',
			'const carrier = node({',
			"  type: 'n8n-nodes-base.set',",
			'  version: 3.4,',
			'  config: {',
			"    name: 'config: {',",
			'    parameters: {',
			"      config: { name: 'Second' },",
			"      assignments: [{ name: 'Second', value: 'x' }],",
			'      body: `line one',
			"], { name: 'Second'",
			'line three`',
			'    }',
			'  }',
			'});',
			'const second = node({',
			"  type: 'n8n-nodes-base.noOp',",
			'  version: 1,',
			"  config: { name: 'Second' }",
			'});',
			"export default workflow('w', 'W').add(carrier).to(second).add(sticky(`# Notes",
			"], { name: 'Third'",
			"name: 'Fourth'`, [], { name: 'Notes', color: 4 }));",
		].join('\n');

		expect(locateNodeDeclarations(code)).toEqual([
			{ name: 'config: {', line: 3 },
			{ name: 'Second', line: 17 },
			{ name: 'Notes', line: 22 },
		]);
	});

	it('reads names from template literals and quoted keys, and tolerates TypeScript annotations', () => {
		const code = [
			"import type { NodeInstance } from '@n8n/workflow-sdk';",
			"const first: NodeInstance = node({ type: 't', version: 1, config: { \"name\": `First`, id: 'n1' } });",
			"const second = node({ type: 't', version: 1, config: { name: `${prefix} Second` } });",
		].join('\n');

		expect(locateNodeDeclarations(code)).toEqual([
			{ name: 'First', id: 'n1', line: 2 },
			{ line: 3 },
		]);
	});

	it('returns nothing for source that does not parse', () => {
		expect(locateNodeDeclarations("const a = node({ config: { name: 'A' }")).toEqual([]);
	});
});
