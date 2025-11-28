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
		'Python code to execute.<br><br>Tip: You can use built-in methods and variables like <code>_today</code> for dates and <code>_jmespath</code> for querying JSON structures. <a href="https://docs.n8n.io/code/builtin/">Learn more</a>.',
	noDataExpression: true,
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
		displayName: PRINT_INSTRUCTION,
		name: 'notice',
		type: 'notice',
		displayOptions: {
			show: {
				language: ['python'],
			},
		},
		default: '',
	},
	{
		displayName: `${PRINT_INSTRUCTION}<br><br>The native Python option does not support <code>_</code> syntax and helpers, except for <code>_items</code> in all-items mode and <code>_item</code> in per-item mode.`,
		name: 'notice',
		type: 'notice',
		displayOptions: {
			show: {
				language: ['pythonNative'],
			},
		},
		default: '',
	},
];
