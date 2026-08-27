import type { PythonImportPolicy, WorkflowJSON } from '@n8n/workflow-sdk';

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

const NOTHING_ALLOWED: PythonImportPolicy = { stdlib: [], external: [], authoritative: true };

describe('detectPythonCodeConstraints', () => {
	it('flags an import when the instance allowlists nothing', () => {
		const warnings = detectPythonCodeConstraints(workflow('import re\nreturn []'), NOTHING_ALLOWED);

		expect(warnings.map((w) => w.code)).toEqual(['CODE_NODE_PYTHON_IMPORT']);
		expect(warnings[0].nodeName).toBe('Parse');
		expect(warnings[0].severity).toBe('informational');
	});

	it('stays silent when the instance allowlists the module', () => {
		const policy: PythonImportPolicy = { stdlib: ['re'], external: [], authoritative: true };

		expect(detectPythonCodeConstraints(workflow('import re\nreturn []'), policy)).toEqual([]);
	});

	it('assumes nothing is importable when the policy is unknown', () => {
		expect(
			detectPythonCodeConstraints(workflow('import re\nreturn []'), undefined).map((w) => w.code),
		).toEqual(['CODE_NODE_PYTHON_IMPORT']);
	});

	it('flags an undefined global regardless of the import policy', () => {
		const policy: PythonImportPolicy = { stdlib: ['*'], external: ['*'], authoritative: true };
		const warnings = detectPythonCodeConstraints(workflow('return _input.all()'), policy);

		expect(warnings.map((w) => w.code)).toEqual(['CODE_NODE_PYTHON_UNSUPPORTED_GLOBAL']);
	});

	it('reads the node mode so the wrong accessor is caught', () => {
		const warnings = detectPythonCodeConstraints(
			workflow('return _items[0]', { mode: 'runOnceForEachItem' }),
			NOTHING_ALLOWED,
		);

		expect(warnings.map((w) => w.code)).toEqual(['CODE_MODE_API_MISUSE']);
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

		expect(detectPythonCodeConstraints(js, NOTHING_ALLOWED)).toEqual([]);
	});

	it('ignores a node with no Python body', () => {
		expect(detectPythonCodeConstraints(workflow(''), NOTHING_ALLOWED)).toEqual([]);
	});

	// A node keeps its last `pythonCode` after switching to JavaScript, and the body is
	// then dead — linting it would report failures for code that never runs.
	it('ignores a stale Python body on a node switched to JavaScript', () => {
		expect(
			detectPythonCodeConstraints(
				workflow('import re\nreturn []', { language: 'javaScript' }),
				NOTHING_ALLOWED,
			),
		).toEqual([]);
	});

	// n8n's allowlist can be wrong in the permissive direction in external runner mode
	// — the official runners image forces both lists empty — so it must not silence a
	// warning there.
	it('still flags an import that a non-authoritative policy claims is allowed', () => {
		const policy: PythonImportPolicy = { stdlib: ['re'], external: [], authoritative: false };
		const warnings = detectPythonCodeConstraints(workflow('import re\nreturn []'), policy);

		expect(warnings.map((w) => w.code)).toEqual(['CODE_NODE_PYTHON_IMPORT']);
		expect(warnings[0].message).toMatch(/cannot see the allowlist in force/i);
		// The agent may repeat this to a user who cannot change the setting.
		expect(warnings[0].message).not.toMatch(/N8N_RUNNERS_/);
	});

	it('flags every import when the configured allowlist is one the runner rejects', () => {
		const policy: PythonImportPolicy = {
			stdlib: [],
			external: [],
			authoritative: true,
			misconfigured: true,
		};

		expect(
			detectPythonCodeConstraints(workflow('import re\nreturn []'), policy).map((w) => w.code),
		).toEqual(['CODE_NODE_PYTHON_IMPORT']);
	});
});
