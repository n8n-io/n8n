import { json } from '@codemirror/lang-json';
import { diagnosticCount, forceLinting } from '@codemirror/lint';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import type { WorkflowJsonIssue } from './workflowJson.types';
import {
	computeWorkflowJsonDiagnostics,
	summarizeIssues,
	workflowJsonLinter,
} from './workflowJsonLint';

const stateOf = (doc: string) => EditorState.create({ doc, extensions: [json()] });

const DOC = JSON.stringify(
	{
		name: 'Demo',
		nodes: [
			{
				name: 'Get orders',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [0, 0],
				id: 'a',
				parameters: { method: 'PATCHH' },
			},
		],
		connections: {},
	},
	null,
	2,
);

const issue = (
	path: WorkflowJsonIssue['path'],
	severity: WorkflowJsonIssue['severity'] = 'error',
) => ({
	severity,
	path,
	message: 'Something is wrong.',
});

const underlined = (path: WorkflowJsonIssue['path']) => {
	const [diagnostic] = computeWorkflowJsonDiagnostics(stateOf(DOC), () => [issue(path)]);
	return DOC.slice(diagnostic.from, diagnostic.to);
};

describe('computeWorkflowJsonDiagnostics', () => {
	it('returns only the syntax error when the JSON does not parse', () => {
		const getIssues = vi.fn(() => [issue(['nodes'])]);

		const diagnostics = computeWorkflowJsonDiagnostics(stateOf('{"a": 1,}'), getIssues);

		expect(getIssues).not.toHaveBeenCalled();
		expect(diagnostics).toEqual([
			{
				from: 8,
				to: 8,
				severity: 'error',
				message: expect.stringContaining('The JSON is not valid: '),
			},
		]);
	});

	it('finds the syntax error in the parse tree when the message has no position', () => {
		// V8 reports "Unexpected token 'x'" without a position
		expect(computeWorkflowJsonDiagnostics(stateOf('{"a": x}'), () => [])).toEqual([
			expect.objectContaining({ from: 6, to: 6 }),
		]);
	});

	it('reports an empty document', () => {
		expect(computeWorkflowJsonDiagnostics(stateOf(''), () => [])).toEqual([
			expect.objectContaining({ from: 0, to: 0, severity: 'error' }),
		]);
	});

	it('passes the parsed JSON to getIssues and keeps the severity and message', () => {
		const getIssues = vi.fn(() => [issue(['name'], 'warning')]);

		const diagnostics = computeWorkflowJsonDiagnostics(stateOf(DOC), getIssues);

		expect(getIssues).toHaveBeenCalledWith(JSON.parse(DOC));
		expect(diagnostics).toEqual([
			expect.objectContaining({ severity: 'warning', message: 'Something is wrong.' }),
		]);
	});

	it('underlines a property from its key to the end of its value', () => {
		expect(underlined(['nodes', 0, 'parameters', 'method'])).toBe('"method": "PATCHH"');
	});

	it('underlines only the first line of a range over many lines', () => {
		expect(underlined(['nodes', 0, 'parameters'])).toBe('"parameters": {');
	});

	it('underlines the closest part of the path that exists', () => {
		expect(underlined(['nodes', 0, 'credentials', 'httpHeaderAuth'])).toBe('{');
		expect(underlined(['connections', 'Get orders'])).toBe('"connections": {}');
	});

	it('underlines the first line when the document is not an object', () => {
		const [diagnostic] = computeWorkflowJsonDiagnostics(stateOf('42'), () => [issue([])]);
		expect(diagnostic).toMatchObject({ from: 0, to: 2 });
	});
});

describe('workflowJsonLinter', () => {
	it('shows the issues in the editor', async () => {
		const view = new EditorView({
			state: EditorState.create({
				doc: DOC,
				extensions: [
					json(),
					workflowJsonLinter(() => [issue(['name']), issue(['nodes'], 'warning')]),
				],
			}),
			parent: document.body,
		});

		forceLinting(view);
		await vi.waitFor(() => expect(diagnosticCount(view.state)).toBe(2));

		view.destroy();
	});
});

describe('summarizeIssues', () => {
	it('counts errors and warnings', () => {
		expect(
			summarizeIssues([issue(['a']), issue(['b'], 'warning'), issue(['c'], 'warning')]),
		).toEqual({ errors: 1, warnings: 2 });
		expect(summarizeIssues([])).toEqual({ errors: 0, warnings: 0 });
	});
});
