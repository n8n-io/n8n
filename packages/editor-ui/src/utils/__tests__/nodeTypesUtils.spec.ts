import { describe, it, expect } from 'vitest';
import { getReferencedNodes } from '../nodeTypesUtils';
import type { INode } from 'n8n-workflow';

const referencedNodesTestCases: Array<{ caseName: string; node: INode; expected: string[] }> = [
	{
		caseName: 'Should return an empty array if no referenced nodes',
		node: {
			parameters: {
				curlImport: '',
				method: 'GET',
				url: 'https://httpbin.org/get1',
				authentication: 'none',
				provideSslCertificates: false,
				sendQuery: false,
				sendHeaders: false,
				sendBody: false,
				options: {},
				infoMessage: '',
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [220, 220],
			id: 'edc36001-aee7-4052-b66e-cf127f4b6ea5',
			name: 'HTTP Request',
		},
		expected: [],
	},
	{
		caseName: 'Should return an array of references for regular node',
		node: {
			parameters: {
				authentication: 'oAuth2',
				resource: 'sheet',
				operation: 'read',
				documentId: {
					__rl: true,
					value: "={{ $('Edit Fields').item.json.document }}",
					mode: 'id',
				},
				sheetName: {
					__rl: true,
					value: "={{ $('Edit Fields 2').item.json.sheet }}",
					mode: 'id',
				},
				filtersUI: {},
				combineFilters: 'AND',
				options: {},
			},
			type: 'n8n-nodes-base.googleSheets',
			typeVersion: 4.5,
			position: [440, 0],
			id: '9a95ad27-06cf-4076-af6b-52846a109a8b',
			name: 'Google Sheets',
			credentials: {
				googleSheetsOAuth2Api: {
					id: '8QEpi028oHDLXntS',
					name: 'milorad@n8n.io',
				},
			},
		},
		expected: ['Edit Fields', 'Edit Fields 2'],
	},
	{
		caseName: 'Should return an array of references for set node',
		node: {
			parameters: {
				mode: 'manual',
				duplicateItem: false,
				assignments: {
					assignments: [
						{
							id: '135e0eb0-f412-430d-8990-731c57cf43ae',
							name: 'document',
							value: "={{ $('Edit Fields 2').item.json.document}}",
							type: 'string',
						},
					],
				},
				includeOtherFields: false,
				options: {},
			},
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [560, -140],
			id: '7306745f-ba8c-451d-ae1a-c627f60fbdd3',
			name: 'Edit Fields 2',
		},
		expected: ['Edit Fields 2'],
	},
	{
		caseName: 'Should handle expressions with single and double quotes',
		node: {
			parameters: {
				authentication: 'oAuth2',
				resource: 'sheet',
				operation: 'read',
				documentId: {
					__rl: true,
					value: "={{ $('Edit Fields').item.json.document }}",
					mode: 'id',
				},
				sheetName: {
					__rl: true,
					value: '={{ $("Edit Fields 2").item.json.sheet }}',
					mode: 'id',
				},
				filtersUI: {},
				combineFilters: 'AND',
				options: {},
			},
			type: 'n8n-nodes-base.googleSheets',
			typeVersion: 4.5,
			position: [440, 0],
			id: '9a95ad27-06cf-4076-af6b-52846a109a8b',
			name: 'Google Sheets',
			credentials: {
				googleSheetsOAuth2Api: {
					id: '8QEpi028oHDLXntS',
					name: 'milorad@n8n.io',
				},
			},
		},
		expected: ['Edit Fields', 'Edit Fields 2'],
	},
	{
		caseName: 'Should only add one reference for each referenced node',
		node: {
			parameters: {
				authentication: 'oAuth2',
				resource: 'sheet',
				operation: 'read',
				documentId: {
					__rl: true,
					value: "={{ $('Edit Fields').item.json.document }}",
					mode: 'id',
				},
				sheetName: {
					__rl: true,
					value: "={{ $('Edit Fields').item.json.sheet }}",
					mode: 'id',
				},
				filtersUI: {},
				combineFilters: 'AND',
				options: {},
			},
			type: 'n8n-nodes-base.googleSheets',
			typeVersion: 4.5,
			position: [440, 0],
			id: '9a95ad27-06cf-4076-af6b-52846a109a8b',
			name: 'Google Sheets',
			credentials: {
				googleSheetsOAuth2Api: {
					id: '8QEpi028oHDLXntS',
					name: 'milorad@n8n.io',
				},
			},
		},
		expected: ['Edit Fields'],
	},
];

describe.each(referencedNodesTestCases)('getReferencedNodes', (testCase) => {
	const caseName = testCase.caseName;
	it(`${caseName}`, () => {
		expect(getReferencedNodes(testCase.node)).toEqual(testCase.expected);
	});
});
