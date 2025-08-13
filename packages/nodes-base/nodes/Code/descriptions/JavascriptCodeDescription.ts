import type { INodeProperties } from 'n8n-workflow';

const commonDescription: INodeProperties = {
	displayName: 'JavaScript',
	name: 'jsCode',
	type: 'string',
	typeOptions: {
		editor: 'codeNodeEditor',
		editorLanguage: 'javaScript',
	},
	default: '',
	description:
		'JavaScript code to execute.<br><br>Tip: You can use luxon vars like <code>$today</code> for dates and <code>$jmespath</code> for querying JSON structures. <a href="https://docs.n8n.io/nodes/n8n-nodes-base.function">Learn more</a>.',
	noDataExpression: true,
};

const v1Properties: INodeProperties[] = [
	{
		...commonDescription,
		displayOptions: {
			show: {
				'@version': [1],
				mode: ['runOnceForAllItems'],
			},
		},
	},
	{
		...commonDescription,
		displayOptions: {
			show: {
				'@version': [1],
				mode: ['runOnceForEachItem'],
			},
		},
	},
];

const v2Properties: INodeProperties[] = [
	{
		...commonDescription,
		displayOptions: {
			show: {
				'@version': [2],
				language: ['javaScript'],
				mode: ['runOnceForAllItems'],
			},
		},
	},
	{
		...commonDescription,
		displayOptions: {
			show: {
				'@version': [2],
				language: ['javaScript'],
				mode: ['runOnceForEachItem'],
			},
		},
	},
];

export const javascriptCodeDescription: INodeProperties[] = [
	...v1Properties,
	...v2Properties,
	{
		displayName:
			'Type <code>$</code> for a list of <a target="_blank" href="https://docs.n8n.io/code-examples/methods-variables-reference/">special vars/methods</a>. Debug by using <code>console.log()</code> statements and viewing their output in the browser console.',
		name: 'notice',
		type: 'notice',
		displayOptions: {
			show: {
				language: ['javaScript'],
			},
		},
		default: '',
	},
	{
		displayName: 'Dependencies',
		name: 'dependencies',
		placeholder: 'Add Dependency',
		description: 'Add npm dependencies to the code execution environment',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		options: [
			{
				name: 'dependency',
				displayName: 'Dependency',
				values: [
					{
						displayName: 'Package Name',
						name: 'package',
						type: 'resourceLocator',
						default: { mode: 'list', value: '' },
						required: true,
						modes: [
							{
								displayName: 'Package Name',
								name: 'list',
								type: 'list',
								placeholder: 'Start typing to search for a package, e.g. lodash',
								typeOptions: {
									searchListMethod: 'getNpmPackages',
									searchable: true,
									searchFilterRequired: true,
								},
							},
							{
								displayName: 'Link',
								name: 'url',
								type: 'string',
								placeholder: 'e.g. https://www.npmjs.com/package/lodash',
								extractValue: {
									type: 'regex',
									regex: 'https:\\/\\/npmjs.com\\/package\\/([-_0-9a-zA-Z@\\/]+)',
								},
								validation: [
									{
										type: 'regex',
										properties: {
											regex: 'https:\\/\\/npmjs.com\\/package\\/([-_0-9a-zA-Z@\\/]+)(?:.*)',
											errorMessage: 'Not a valid NPM package URL',
										},
									},
								],
							},
							{
								displayName: 'By Name',
								name: 'name',
								type: 'string',
								placeholder: 'e.g. lodash',
								validation: [
									{
										type: 'regex',
										properties: {
											regex: '[-_a-zA-Z0-9@\\/]+',
											errorMessage: 'Not a valid package name',
										},
									},
								],
								url: '=https://npmjs.com/package/{{$value}}',
							},
						],
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
						displayName: 'Version',
						name: 'version',
						type: 'options',
						default: '',
						// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
						description:
							'Version of the package to use. Choose from the list, or specify a version using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
						typeOptions: {
							loadOptionsMethod: 'getNpmPackageVersions',
							loadOptionsDependsOn: ['&package'],
						},
					},
				],
			},
		],
	},
];
