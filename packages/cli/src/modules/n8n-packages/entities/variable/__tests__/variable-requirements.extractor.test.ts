import type { WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';

import { VariableRequirementsExtractor } from '../variable-requirements.extractor';

function makeWorkflow(overrides: Partial<WorkflowEntity> = {}): WorkflowEntity {
	return {
		id: 'wf-abc1234567',
		name: 'My Workflow',
		nodes: [],
		connections: {},
		versionId: 'v1',
		active: false,
		isArchived: false,
		settings: undefined,
		parentFolder: null,
		...overrides,
	} as unknown as WorkflowEntity;
}

function makeNode(parameters: Record<string, unknown>, extra: Partial<INode> = {}): INode {
	return {
		id: 'n1',
		name: 'Node',
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [0, 0],
		parameters,
		...extra,
	} as INode;
}

describe('VariableRequirementsExtractor', () => {
	const extractor = new VariableRequirementsExtractor();

	it('returns no requirements for a workflow without $vars references', () => {
		const workflow = makeWorkflow({
			nodes: [makeNode({ value: 'plain text', url: 'https://example.com' })],
		});

		expect(extractor.extract(workflow)).toEqual([]);
	});

	it('finds dot-notation references in node parameters', () => {
		const workflow = makeWorkflow({
			id: 'wf-dot',
			nodes: [makeNode({ url: '={{ $vars.API_URL }}/users' })],
		});

		expect(extractor.extract(workflow)).toEqual([
			{ workflowId: 'wf-dot', variableName: 'API_URL' },
		]);
	});

	it.each([
		{ notation: 'single-quote bracket', expression: "={{ $vars['API_KEY'] }}" },
		{ notation: 'double-quote bracket', expression: '={{ $vars["API_KEY"] }}' },
		{ notation: 'bracket with inner spaces', expression: "={{ $vars[ 'API_KEY' ] }}" },
		{ notation: 'template-literal bracket', expression: '={{ $vars[`API_KEY`] }}' },
		{ notation: 'optional-chaining dot', expression: '={{ $vars?.API_KEY }}' },
		{ notation: 'optional-chaining bracket', expression: "={{ $vars?.['API_KEY'] }}" },
		{ notation: 'optional-chaining template-literal', expression: '={{ $vars?.[`API_KEY`] }}' },
	])('finds $notation references', ({ expression }) => {
		const workflow = makeWorkflow({
			id: 'wf-bracket',
			nodes: [makeNode({ auth: expression })],
		});

		expect(extractor.extract(workflow)).toEqual([
			{ workflowId: 'wf-bracket', variableName: 'API_KEY' },
		]);
	});

	it('finds references in Code-node style multi-line source', () => {
		const code = [
			'const base = $vars.BASE_URL;',
			"const key = $vars['SECRET_KEY'];",
			'return [{ json: { base, key } }];',
		].join('\n');
		const workflow = makeWorkflow({
			id: 'wf-code',
			nodes: [makeNode({ jsCode: code }, { type: 'n8n-nodes-base.code' })],
		});

		expect(extractor.extract(workflow)).toEqual(
			expect.arrayContaining([
				{ workflowId: 'wf-code', variableName: 'BASE_URL' },
				{ workflowId: 'wf-code', variableName: 'SECRET_KEY' },
			]),
		);
		expect(extractor.extract(workflow)).toHaveLength(2);
	});

	it('ignores the other parameters of a code node', () => {
		const workflow = makeWorkflow({
			nodes: [
				makeNode(
					{ instructions: 'Copy $vars.PROSE into the output', jsCode: 'return items;' },
					{ type: 'n8n-nodes-base.aiTransform' },
				),
			],
		});

		expect(extractor.extract(workflow)).toEqual([]);
	});

	// Many nodes resolve `{{ }}` in a fixed value at runtime, without the `=` prefix.
	it.each([
		{
			name: 'a SQL query',
			type: 'n8n-nodes-base.postgres',
			parameters: { query: "SELECT '$vars.PROSE' FROM t WHERE env = '{{ $vars.TEMPLATE_VAR }}'" },
		},
		{
			name: 'Form HTML',
			type: 'n8n-nodes-base.form',
			parameters: {
				formFields: { values: [{ html: '<p>$vars.PROSE</p><b>{{ $vars.TEMPLATE_VAR }}</b>' }] },
			},
		},
		{
			name: 'an HTML template',
			type: 'n8n-nodes-base.html',
			parameters: { html: '<p>$vars.PROSE</p><a href="{{ $vars.TEMPLATE_VAR }}">link</a>' },
		},
	])('finds references in the `{{ }}` blocks of a fixed value: $name', ({ type, parameters }) => {
		const workflow = makeWorkflow({ id: 'wf-template', nodes: [makeNode(parameters, { type })] });

		expect(extractor.extract(workflow)).toEqual([
			{ workflowId: 'wf-template', variableName: 'TEMPLATE_VAR' },
		]);
	});

	it('scans nested parameter structures and arrays', () => {
		const workflow = makeWorkflow({
			id: 'wf-nested',
			nodes: [
				makeNode({
					options: {
						headers: [{ name: 'x-api-key', value: '={{ $vars.NESTED_KEY }}' }],
					},
				}),
			],
		});

		expect(extractor.extract(workflow)).toEqual([
			{ workflowId: 'wf-nested', variableName: 'NESTED_KEY' },
		]);
	});

	it('scans workflow settings', () => {
		const workflow = makeWorkflow({
			id: 'wf-settings',
			settings: { errorWorkflow: '={{ $vars.ERROR_WORKFLOW_ID }}' } as never,
		});

		expect(extractor.extract(workflow)).toEqual([
			{ workflowId: 'wf-settings', variableName: 'ERROR_WORKFLOW_ID' },
		]);
	});

	it('dedupes a name referenced by several nodes of one workflow', () => {
		const workflow = makeWorkflow({
			id: 'wf-dup',
			nodes: [
				makeNode({ a: '={{ $vars.SHARED }}' }),
				makeNode({ b: "={{ $vars['SHARED'] }}" }, { id: 'n2', name: 'Node 2' }),
			],
		});

		expect(extractor.extract(workflow)).toEqual([{ workflowId: 'wf-dup', variableName: 'SHARED' }]);
	});

	it('extracts several distinct names from one string', () => {
		const workflow = makeWorkflow({
			id: 'wf-multi',
			nodes: [makeNode({ url: '={{ $vars.HOST }}:{{ $vars.PORT }}' })],
		});

		expect(extractor.extract(workflow)).toEqual([
			{ workflowId: 'wf-multi', variableName: 'HOST' },
			{ workflowId: 'wf-multi', variableName: 'PORT' },
		]);
	});

	// Legacy keys predating the strict format are kept as-is by the variables
	// service, so bracket notation must accept any quoted key. The leading-digit
	// shape is the documented legacy contract (`UpdateVariableRequestDto`); the
	// others cover pre-validation-era keys of arbitrary shape.
	it.each([
		{
			name: 'a leading digit',
			expression: "={{ $vars['1_old_invalid_key'] }}",
			expected: '1_old_invalid_key',
		},
		{ name: 'dashes', expression: "={{ $vars['legacy-key'] }}", expected: 'legacy-key' },
		{ name: 'dots', expression: '={{ $vars["legacy.key"] }}', expected: 'legacy.key' },
		{ name: 'spaces', expression: "={{ $vars['legacy key'] }}", expected: 'legacy key' },
	])('finds bracket-notation references to legacy keys with $name', ({ expression, expected }) => {
		const workflow = makeWorkflow({
			id: 'wf-legacy',
			nodes: [makeNode({ auth: expression })],
		});

		expect(extractor.extract(workflow)).toEqual([
			{ workflowId: 'wf-legacy', variableName: expected },
		]);
	});

	it.each([
		{ name: 'plain prose mentioning vars', value: 'set your $vars up correctly' },
		{ name: 'a reference in a fixed value', value: 'Documentation example: $vars.LITERAL_ONLY' },
		{
			name: 'a reference in the text part of an expression',
			value: '=Use $vars.LITERAL_ONLY, today is {{ $today }}',
		},
		{
			name: 'a dynamic template-literal key',
			value: '={{ $vars[`PREFIX_$' + '{$json.env}`] }}',
		},
		{ name: 'different prefix', value: '={{ $varsomething.FOO }}' },
		{ name: 'invalid leading digit in dot notation', value: '={{ $vars.1BAD }}' },
		{ name: 'unquoted bracket access', value: '={{ $vars[key] }}' },
		{ name: 'empty bracket key', value: "={{ $vars[''] }}" },
	])('ignores $name', ({ value }) => {
		const workflow = makeWorkflow({ nodes: [makeNode({ value })] });

		expect(extractor.extract(workflow)).toEqual([]);
	});

	it('returns an empty list when the workflow has no nodes array at all', () => {
		const workflow = makeWorkflow({ id: 'wf-no-nodes', nodes: undefined as unknown as [] });

		expect(extractor.extract(workflow)).toEqual([]);
	});
});
