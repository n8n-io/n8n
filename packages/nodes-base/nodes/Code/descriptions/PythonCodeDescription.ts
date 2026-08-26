import type { INodeProperties } from 'n8n-workflow';

const commonDescription: INodeProperties = {
	displayName: 'Python',
	name: 'pythonCode',
	type: 'string',
	typeOptions: {
		editor: 'codeNodeEditor',
		editorLanguage: 'python',
	},
	default: '',
	description:
		'Python code to execute. Runs in a sandbox with no imports and no network access: read the input items from <code>_items</code> (all-items mode) or <code>_item</code> (per-item mode). <a href="https://docs.n8n.io/code/builtin/">Learn more</a>.',
	noDataExpression: true,
	builderHint: {
		propertyHint:
			'Runs in a locked-down native Python sandbox. NO imports: both allowlists (N8N_RUNNERS_STDLIB_ALLOW for standard-library modules, N8N_RUNNERS_EXTERNAL_ALLOW for packages) are empty by default, so `import re`, `import json`, `import math`, `import datetime`, `import pandas` and relative imports all FAIL at runtime with "Import of ... is disallowed". Write import-free Python using builtins and str/list/dict methods, or set language to javaScript when the task genuinely needs a library. NO network access either: requests, urllib, httpx and other HTTP libraries are unavailable — use the HTTP Request node and process its output in this node instead. The ONLY globals are _items (runOnceForAllItems mode ONLY), _item (runOnceForEachItem mode ONLY) and print(); reading the accessor belonging to the other mode raises NameError. There are no cross-node helpers either — _("Node Name"), _input, _json, _today and _jmespath are all undefined, so read data from the connected upstream node only.',
	},
};

const PRINT_INSTRUCTION =
	'Debug by using <code>print()</code> statements and viewing their output in the browser console.';

export const pythonCodeDescription: INodeProperties[] = [
	{
		...commonDescription,
		displayOptions: {
			show: {
				language: ['python', 'pythonNative'],
				mode: ['runOnceForAllItems'],
			},
		},
	},
	{
		...commonDescription,
		displayOptions: {
			show: {
				language: ['python', 'pythonNative'],
				mode: ['runOnceForEachItem'],
			},
		},
	},
	{
		displayName: `${PRINT_INSTRUCTION}<br><br>The Python option does not support <code>_</code> syntax and helpers, except for <code>_items</code> in all-items mode and <code>_item</code> in per-item mode.<br><br>Imports are disabled unless your instance sets <code>N8N_RUNNERS_STDLIB_ALLOW</code>.`,
		name: 'notice',
		type: 'notice',
		displayOptions: {
			show: {
				language: ['python', 'pythonNative'],
			},
		},
		default: '',
	},
];
