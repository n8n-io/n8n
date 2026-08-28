import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { detectPythonCodeConstraints } from '../detect-python-code-constraints';

function workflow(
	pythonCode: string,
	{ mode = 'runOnceForAllItems', language = 'pythonNative' } = {},
): WorkflowJSON {
	return {
		id: 'wf-test',
		name: 'Test',
		nodes: [
			{
				id: '1',
				name: 'Parse',
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				position: [0, 0],
				parameters: { mode, language, pythonCode },
			},
		],
		connections: {},
	};
}

describe('detectPythonCodeConstraints', () => {
	it('flags an import when the instance allowlists nothing', () => {
		const warnings = detectPythonCodeConstraints(workflow('import re\nreturn []'));

		expect(warnings.map((w) => w.code)).toEqual(['CODE_NODE_PYTHON_IMPORT']);
		expect(warnings[0].nodeName).toBe('Parse');
		expect(warnings[0].severity).toBe('informational');
	});

	it('flags an undefined global regardless of the import policy', () => {
		const warnings = detectPythonCodeConstraints(workflow('return _input.all()'));

		expect(warnings.map((w) => w.code)).toEqual(['CODE_NODE_PYTHON_UNSUPPORTED_GLOBAL']);
	});

	it('reads the node mode so the wrong accessor is caught', () => {
		const warnings = detectPythonCodeConstraints(
			workflow('return _items[0]', { mode: 'runOnceForEachItem' }),
		);

		expect(warnings.map((w) => w.code)).toEqual(['CODE_MODE_API_MISUSE']);
	});

	// The agent may repeat this to a user with no way to change the allowlist, which
	// on a managed deployment is everyone.
	it('never names an environment variable', () => {
		const warnings = detectPythonCodeConstraints(workflow('import re\nreturn []'));

		expect(warnings[0].message).not.toMatch(/N8N_RUNNERS_/);
	});

	it('ignores a JavaScript Code node', () => {
		const js: WorkflowJSON = {
			id: 'wf',
			name: 'Test',
			nodes: [
				{
					id: '1',
					name: 'Transform',
					type: 'n8n-nodes-base.code',
					typeVersion: 2,
					position: [0, 0],
					parameters: { mode: 'runOnceForAllItems', jsCode: 'return $input.all();' },
				},
			],
			connections: {},
		};

		expect(detectPythonCodeConstraints(js)).toEqual([]);
	});

	it('ignores a node with no Python body', () => {
		expect(detectPythonCodeConstraints(workflow(''))).toEqual([]);
	});

	// A node keeps its last `pythonCode` after switching to JavaScript, and the body is
	// then dead — linting it would report failures for code that never runs.
	it('ignores a stale Python body on a node switched to JavaScript', () => {
		expect(
			detectPythonCodeConstraints(workflow('import re\nreturn []', { language: 'javaScript' })),
		).toEqual([]);
	});
});
