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
		'Python code to execute. Runs in a sandbox with no network access, and imports only work if your instance allowlists them: read the input items from <code>_items</code> (all-items mode) or <code>_item</code> (per-item mode). <a href="https://docs.n8n.io/code/builtin/">Learn more</a>.',
	noDataExpression: true,
	builderHint: {
		propertyHint:
			'Locked-down sandbox. Imports are off unless the deployment allowlists them, so assume none are available — even `import re` fails on a stock instance. Write import-free Python with builtins, or use javaScript when the task needs a library; never tell the user to change the allowlist. NO network — use an HTTP Request node and process its output here. The only globals are _items (runOnceForAllItems), _item (runOnceForEachItem) and print(); the other mode\'s accessor, _("Node Name"), _input, _json and $-prefixed helpers are all undefined.',
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
		displayName: `${PRINT_INSTRUCTION}<br><br>The Python option does not support <code>_</code> syntax and helpers, except for <code>_items</code> in all-items mode and <code>_item</code> in per-item mode.<br><br>Imports are disabled unless your instance allows them.`,
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
