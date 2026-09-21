import { validateWorkflowCodeSyntax } from './validate-code-syntax';
import type { WorkflowJSON } from '../types/base';

function workflow(
	jsCode: string,
	extra: Partial<WorkflowJSON['nodes'][number]> = {},
): WorkflowJSON {
	return {
		name: 'Code syntax',
		nodes: [
			{
				id: 'transform',
				name: 'Transform',
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				position: [0, 0],
				parameters: { jsCode },
				...extra,
			},
		],
		connections: {},
	};
}

describe('validateWorkflowCodeSyntax', () => {
	it.each([
		'return [{ json: { subject: "Demo" } }];}',
		'const value = ; return [];',
		'return [{ json: { status: "open } }];',
		'}\nfunction replacement() {',
		'import fs from "fs"; return [];',
		'export const x = 1;',
	])('reports a blocking error for invalid function-body syntax: %s', async (jsCode) => {
		expect(await validateWorkflowCodeSyntax(workflow(jsCode))).toEqual([
			expect.objectContaining({
				code: 'INVALID_PARAMETER',
				nodeName: 'Transform',
				parameterName: 'jsCode',
				severity: 'error',
			}),
		]);
	});

	it.each([
		'return $input.all();',
		'const result = await Promise.resolve(1); return [{ json: { result } }];',
		'return { json: { value: $json?.value ?? "unknown" } };',
		'return [{ json: { text: "}", quote: "\\"" } }]; // trailing comment',
		'const matcher = /[{}]/u; return [];',
		'if (new.target) return []; return [];',
		'',
	])('accepts valid async function bodies: %s', async (jsCode) => {
		expect(await validateWorkflowCodeSyntax(workflow(jsCode))).toEqual([]);
	});

	it('does not execute code while checking it', async () => {
		expect(
			await validateWorkflowCodeSyntax(workflow('throw new Error("Do not execute");')),
		).toEqual([]);
	});

	it.each([
		{ disabled: true },
		{ type: 'n8n-nodes-base.set' },
		{ parameters: { language: 'pythonNative', jsCode: '}', pythonCode: 'return []' } },
		{ parameters: { language: 'python', jsCode: '}', pythonCode: 'return []' } },
		{ parameters: {} },
	])('ignores inactive JavaScript: %j', async (extra) => {
		expect(await validateWorkflowCodeSyntax(workflow('}', extra))).toEqual([]);
	});

	it('reports all invalid Code nodes and leaves the graph unchanged', async () => {
		const input = workflow('return [];}', {
			parameters: { language: 'javaScript', jsCode: 'return [];}' },
		});
		input.nodes.push({ ...input.nodes[0], id: 'next', name: 'Next' });
		const before = structuredClone(input);
		expect((await validateWorkflowCodeSyntax(input)).map((issue) => issue.nodeName)).toEqual([
			'Transform',
			'Next',
		]);
		expect(input).toEqual(before);
	});
});
