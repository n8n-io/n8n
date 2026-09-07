import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { IDataObject, INodeProperties, INodeTypes } from 'n8n-workflow';

import {
	coerceWrongKindListModeParams,
	detectWrongKindLocatorValues,
} from '../detect-wrong-kind-locator';

// Modeled on the Google Sheets `sheetName` locator: list mode returns the
// numeric gid, id mode validates it with a regex, name mode takes the title.
const sheetLocator: INodeProperties = {
	displayName: 'Sheet',
	name: 'sheetName',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	modes: [
		{ displayName: 'From list', name: 'list', type: 'list' },
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			validation: [
				{
					type: 'regex',
					properties: { regex: '((gid=)?[0-9]{1,})', errorMessage: 'Not a valid Sheet ID' },
				},
			],
		},
		{ displayName: 'By Name', name: 'name', type: 'string' },
	],
};

function nodeTypesWith(properties: INodeProperties[]): INodeTypes {
	return {
		getByNameAndVersion: () => ({ description: { properties } }),
	} as unknown as INodeTypes;
}

const nodeTypes = nodeTypesWith([sheetLocator]);

function workflow(parameters: IDataObject, disabled = false): WorkflowJSON {
	return {
		id: 'wf-test',
		name: 'Test',
		nodes: [
			{
				id: '1',
				name: 'Read Sheet',
				type: 'n8n-nodes-base.googleSheets',
				typeVersion: 4.5,
				position: [0, 0],
				parameters,
				...(disabled ? { disabled: true } : {}),
			},
		],
		connections: {},
	};
}

const rl = (mode: string, value: string | number) => ({ __rl: true, mode, value });

describe('detectWrongKindLocatorValues', () => {
	it('flags a display name in list mode and steers to name mode', () => {
		const warnings = detectWrongKindLocatorValues(
			workflow({ sheetName: rl('list', 'Sheet1') }),
			nodeTypes,
		);
		expect(warnings).toHaveLength(1);
		expect(warnings[0].code).toBe('WRONG_KIND_LIST_MODE_VALUE');
		expect(warnings[0].nodeName).toBe('Read Sheet');
		expect(warnings[0].message).toContain("mode 'name'");
	});

	it('does not flag a list value that matches the id-mode regex', () => {
		expect(
			detectWrongKindLocatorValues(workflow({ sheetName: rl('list', '449372027') }), nodeTypes),
		).toEqual([]);
		expect(
			detectWrongKindLocatorValues(workflow({ sheetName: rl('list', 'gid=0') }), nodeTypes),
		).toEqual([]);
	});

	it('requires the value to fail all id-mode regexes', () => {
		const multiRegexLocator: INodeProperties = {
			...sheetLocator,
			modes: sheetLocator.modes?.map((mode) =>
				mode.name === 'id'
					? {
							...mode,
							validation: [
								{
									type: 'regex',
									properties: { regex: '[0-9]+', errorMessage: 'Not a numeric ID' },
								},
								{
									type: 'regex',
									properties: { regex: 'sheet_[a-z]+', errorMessage: 'Not a sheet ID' },
								},
							],
						}
					: mode,
			),
		};

		expect(
			detectWrongKindLocatorValues(
				workflow({ sheetName: rl('list', 'sheet_alpha') }),
				nodeTypesWith([multiRegexLocator]),
			),
		).toEqual([]);
	});

	it('anchors top-level regex alternatives as one expression', () => {
		const alternationLocator: INodeProperties = {
			...sheetLocator,
			modes: sheetLocator.modes?.map((mode) =>
				mode.name === 'id'
					? {
							...mode,
							validation: [
								{
									type: 'regex',
									properties: {
										regex: 'gid=[0-9]+|sheet_[a-z]+',
										errorMessage: 'Not a valid Sheet ID',
									},
								},
							],
						}
					: mode,
			),
		};

		expect(
			detectWrongKindLocatorValues(
				workflow({ sheetName: rl('list', 'prefix-sheet_alpha') }),
				nodeTypesWith([alternationLocator]),
			),
		).toHaveLength(1);
	});

	it('does not flag an empty list value (left for the user to pick at setup)', () => {
		expect(
			detectWrongKindLocatorValues(workflow({ sheetName: rl('list', '') }), nodeTypes),
		).toEqual([]);
	});

	it('does not flag expression values', () => {
		expect(
			detectWrongKindLocatorValues(
				workflow({ sheetName: rl('list', '={{ $json.sheet }}') }),
				nodeTypes,
			),
		).toEqual([]);
	});

	it('does not flag non-list modes', () => {
		expect(
			detectWrongKindLocatorValues(workflow({ sheetName: rl('name', 'Sheet1') }), nodeTypes),
		).toEqual([]);
	});

	it('does not flag when the locator has no name mode to steer to', () => {
		const withoutNameMode = nodeTypesWith([
			{ ...sheetLocator, modes: sheetLocator.modes?.filter((m) => m.name !== 'name') },
		]);
		expect(
			detectWrongKindLocatorValues(workflow({ sheetName: rl('list', 'Sheet1') }), withoutNameMode),
		).toEqual([]);
	});

	it('does not flag when the id mode declares no regex validation', () => {
		const withoutRegex = nodeTypesWith([
			{
				...sheetLocator,
				modes: sheetLocator.modes?.map((m) => (m.name === 'id' ? { ...m, validation: [] } : m)),
			},
		]);
		expect(
			detectWrongKindLocatorValues(workflow({ sheetName: rl('list', 'Sheet1') }), withoutRegex),
		).toEqual([]);
	});

	it('skips disabled nodes', () => {
		expect(
			detectWrongKindLocatorValues(workflow({ sheetName: rl('list', 'Sheet1') }, true), nodeTypes),
		).toEqual([]);
	});

	it('returns nothing without a node types provider', () => {
		expect(
			detectWrongKindLocatorValues(workflow({ sheetName: rl('list', 'Sheet1') }), undefined),
		).toEqual([]);
	});
});

describe('coerceWrongKindListModeParams', () => {
	const sheetNode = (parameters: Record<string, unknown> = {}) => ({
		type: 'n8n-nodes-base.googleSheets',
		typeVersion: 4.5,
		parameters,
	});

	it('rewrites a wrong-kind list-mode value to name mode in place', () => {
		const params: Record<string, unknown> = { sheetName: rl('list', 'Sheet1') };
		coerceWrongKindListModeParams(nodeTypes, sheetNode(), params);
		expect(params.sheetName).toEqual({ __rl: true, mode: 'name', value: 'Sheet1' });
	});

	it('rewrites a numeric wrong-kind list-mode value to name mode in place', () => {
		const idStringLocator: INodeProperties = {
			...sheetLocator,
			modes: sheetLocator.modes?.map((mode) =>
				mode.name === 'id'
					? {
							...mode,
							validation: [
								{
									type: 'regex',
									properties: { regex: 'id_[a-z]+', errorMessage: 'Not a string ID' },
								},
							],
						}
					: mode,
			),
		};
		const params: Record<string, unknown> = { sheetName: rl('list', 2024) };

		coerceWrongKindListModeParams(nodeTypesWith([idStringLocator]), sheetNode(), params);

		expect(params.sheetName).toEqual({ __rl: true, mode: 'name', value: 2024 });
	});

	it('keeps a valid list-mode id untouched', () => {
		const params: Record<string, unknown> = { sheetName: rl('list', '449372027') };
		coerceWrongKindListModeParams(nodeTypes, sheetNode(), params);
		expect(params.sheetName).toEqual({ __rl: true, mode: 'list', value: '449372027' });
	});

	it('wraps a bare string replacing a list-mode locator, in name mode when it reads like a title', () => {
		const params: Record<string, unknown> = { sheetName: 'Sheet1' };
		coerceWrongKindListModeParams(nodeTypes, sheetNode({ sheetName: rl('list', '') }), params);
		expect(params.sheetName).toEqual({ __rl: true, mode: 'name', value: 'Sheet1' });
	});

	it('wraps a bare string keeping list mode when it matches the id regex', () => {
		const params: Record<string, unknown> = { sheetName: '449372027' };
		coerceWrongKindListModeParams(nodeTypes, sheetNode({ sheetName: rl('list', '') }), params);
		expect(params.sheetName).toEqual({ __rl: true, mode: 'list', value: '449372027' });
	});

	it('wraps a bare string preserving an existing non-list mode', () => {
		const url = 'https://docs.google.com/spreadsheets/d/abc/edit#gid=0';
		const params: Record<string, unknown> = { sheetName: url };
		coerceWrongKindListModeParams(nodeTypes, sheetNode({ sheetName: rl('url', '') }), params);
		expect(params.sheetName).toEqual({ __rl: true, mode: 'url', value: url });
	});

	it('leaves a bare string alone when the node has no existing resource-locator param', () => {
		const params: Record<string, unknown> = { sheetName: 'Sheet1' };
		coerceWrongKindListModeParams(nodeTypes, sheetNode(), params);
		expect(params.sheetName).toBe('Sheet1');
	});
});
