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
		'Python code to execute.<br><br>Tip: You can use luxon vars like <code>_today</code> for dates and <code>$_mespath</code> for querying JSON structures. <a href="https://docs.n8n.io/nodes/n8n-nodes-base.function">Learn more</a>.',
	noDataExpression: true,
};

export const pythonCodeDescription: INodeProperties[] = [
	{
		...commonDescription,
		displayOptions: {
			show: {
				language: ['python'],
				mode: ['runOnceForAllItems'],
			},
		},
	},
	{
		...commonDescription,
		displayOptions: {
			show: {
				language: ['python'],
				mode: ['runOnceForEachItem'],
			},
		},
	},
	{
		displayName:
			'Debug by using <code>print()</code> statements and viewing their output in the browser console.',
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
		displayName: 'Python Modules',
		name: 'modules',
		displayOptions: {
			show: {
				language: ['python'],
			},
		},
		type: 'string',
		default: '',
		placeholder: 'opencv-python',
		description:
			'Comma-separated list of Python modules to load. They have to be installed to be able to be loaded and imported.',
		noDataExpression: true,
	},
];
