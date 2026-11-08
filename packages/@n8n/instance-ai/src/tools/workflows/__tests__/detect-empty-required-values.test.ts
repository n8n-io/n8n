import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { IDataObject, INodeTypes } from 'n8n-workflow';

import {
	detectEmptyRequiredValues,
	EMPTY_REQUIRED_VALUE_CODE,
} from '../detect-empty-required-values';

const nodeTypes = {
	getByNameAndVersion: () => ({
		description: {
			properties: [
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					default: 'create',
					options: [{ name: 'Create', value: 'create' }],
				},
				{
					displayName: 'Person Name or ID',
					name: 'person',
					type: 'options',
					required: true,
					default: '',
					displayOptions: { show: { operation: ['create'] } },
				},
				{
					displayName: 'Post ID',
					name: 'postId',
					type: 'string',
					required: true,
					default: '',
					displayOptions: { show: { operation: ['delete'] } },
				},
				{ displayName: 'Note', name: 'note', type: 'string', default: '' },
			],
		},
	}),
} as unknown as INodeTypes;

function workflow(parameters: IDataObject): WorkflowJSON {
	return {
		id: 'wf-test',
		name: 'Test',
		nodes: [
			{
				id: '1',
				name: 'Post',
				type: 'n8n-nodes-base.linkedIn',
				typeVersion: 1,
				position: [0, 0],
				parameters,
			},
		],
		connections: {},
	};
}

describe('detectEmptyRequiredValues', () => {
	it('flags an empty required parameter that the node shows', () => {
		const warnings = detectEmptyRequiredValues(workflow({ person: '' }), nodeTypes);
		expect(warnings).toEqual([
			expect.objectContaining({
				code: EMPTY_REQUIRED_VALUE_CODE,
				nodeName: 'Post',
				parameterPath: 'person',
				severity: 'error',
			}),
		]);
	});

	it('flags an empty resource locator value', () => {
		const warnings = detectEmptyRequiredValues(
			workflow({ person: { __rl: true, mode: 'list', value: '' } }),
			nodeTypes,
		);
		expect(warnings).toHaveLength(1);
	});

	it('ignores hidden, optional, missing and filled parameters', () => {
		expect(
			detectEmptyRequiredValues(
				workflow({ person: 'urn:li:person:1', postId: '', note: '' }),
				nodeTypes,
			),
		).toEqual([]);
		expect(detectEmptyRequiredValues(workflow({}), nodeTypes)).toEqual([]);
		expect(detectEmptyRequiredValues(workflow({ person: '={{ $json.p }}' }), nodeTypes)).toEqual(
			[],
		);
	});
});
