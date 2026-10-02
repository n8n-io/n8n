import { t, validate, type JsonSchema } from '@n8n/node-sdk';
import { GoogleSheetsTrigger } from 'n8n-nodes-base/dist/nodes/Google/Sheet/GoogleSheetsTrigger.node';
import {
	arrayOfArraysToJson,
	compareRevisions,
} from 'n8n-nodes-base/dist/nodes/Google/Sheet/GoogleSheetsTrigger.utils';
import {
	cronNodeOptions,
	NodeHelpers,
	type INodeParameters,
	type INodeProperties,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { sheetRowsChanged } from '../../nodes/google-sheets-trigger/actions/trigger';

// n8n adds Poll Times to every polling node when it loads it (n8n-core `commonPollingParameters`).
const pollTimes: INodeProperties = {
	displayName: 'Poll Times',
	name: 'pollTimes',
	type: 'fixedCollection',
	typeOptions: { multipleValues: true },
	default: { item: [{ mode: 'everyMinute' }] },
	options: cronNodeOptions,
};
const legacy = new GoogleSheetsTrigger().description;
const description: INodeTypeDescription = {
	...legacy,
	properties: [...legacy.properties, pollTimes],
};

const keptBy = (parameters: INodeParameters) =>
	NodeHelpers.getNodeParameters(
		description.properties,
		parameters,
		true,
		false,
		{ typeVersion: 1 },
		description,
	);

function legacyOptions(name: string, properties = description.properties): unknown[] {
	return properties.flatMap((property) =>
		property.name === name
			? (property.options ?? []).flatMap((option) => ('value' in option ? [option.value] : []))
			: property.type === 'collection' || property.type === 'fixedCollection'
				? legacyOptions(
						name,
						(property.options ?? []).flatMap((option) =>
							'values' in option
								? option.values
								: 'name' in option && 'type' in option
									? [option]
									: [],
						),
					)
				: [],
	);
}

const input = t.obj(sheetRowsChanged.input).json;
const enumAt = (schema: JsonSchema | undefined) => schema?.enum ?? [];
const document = {
	__rl: true,
	mode: 'url',
	value: 'https://docs.google.com/spreadsheets/d/abc/edit',
};

describe('Google Sheets Trigger contract against the built-in node', () => {
	it('names the built-in node type and version', () => {
		expect(sheetRowsChanged.kind === 'native' && sheetRowsChanged.native).toEqual({
			type: 'n8n-nodes-base.googleSheetsTrigger',
			version: 1,
			on: 'poll',
		});
		expect([legacy.name, legacy.version, legacy.polling]).toEqual(['googleSheetsTrigger', 1, true]);
		expect(legacy.credentials?.map(({ name }) => name).sort()).toEqual(
			[...sheetRowsChanged.credentialTypes].sort(),
		);
	});

	it.each<[string, INodeParameters]>([
		[
			'rows added, every 5 minutes',
			{
				documentId: document,
				sheetName: { __rl: true, mode: 'id', value: '0' },
				event: 'rowAdded',
				options: { valueRender: 'FORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' },
				pollTimes: { item: [{ mode: 'everyX', value: 5, unit: 'minutes' }] },
			},
		],
		[
			'rows updated in watched columns',
			{
				documentId: { __rl: true, mode: 'id', value: 'abc' },
				sheetName: {
					__rl: true,
					mode: 'url',
					value: 'https://docs.google.com/spreadsheets/d/abc/edit#gid=7',
				},
				event: 'rowUpdate',
				includeInOutput: 'old',
				options: {
					columnsToWatch: ['Status'],
					dataLocationOnSheet: {
						values: { rangeDefinition: 'specifyRange', headerRow: 2, firstDataRow: 3 },
					},
				},
				pollTimes: { item: [{ mode: 'everyHour', minute: 15 }] },
			},
		],
		[
			'any change in a range, with a service account',
			{
				authentication: 'serviceAccount',
				documentId: document,
				sheetName: { __rl: true, mode: 'id', value: '0' },
				event: 'anyUpdate',
				options: {
					dataLocationOnSheet: { values: { rangeDefinition: 'specifyRangeA1', range: 'A1:F20' } },
				},
			},
		],
	])('keeps every parameter the contract emits: %s', (_name, parameters) => {
		expect(validate(parameters, input)).toEqual([]);
		expect(keptBy(parameters)).toMatchObject(parameters);
	});

	it('offers only option values the built-in node has', () => {
		const properties = input.properties ?? {};
		const optionsOf = properties.options?.properties ?? {};
		const pairs: Array<[readonly unknown[], unknown[]]> = [
			[enumAt(properties.authentication), legacyOptions('authentication')],
			[enumAt(properties.event), legacyOptions('event')],
			[enumAt(properties.includeInOutput), legacyOptions('includeInOutput')],
			[enumAt(optionsOf.valueRender), legacyOptions('valueRender')],
			[enumAt(optionsOf.dateTimeRenderOption), legacyOptions('dateTimeRenderOption')],
			[
				(properties.pollTimes?.properties?.item?.items?.oneOf ?? []).map(
					({ properties: branch }) => branch?.mode?.const,
				),
				legacyOptions('mode'),
			],
		];
		for (const [contract, built] of pairs) {
			expect(contract.length).toBeGreaterThan(0);
			expect(built).toEqual(expect.arrayContaining([...contract]));
		}
		// Both versions in one item is not in the contract: its keys are objects, not cells.
		expect(legacyOptions('includeInOutput')).toContain('both');
	});

	it('types the rows the built-in node emits for each event', () => {
		const header = ['Name', 'Seats', 'Active'];
		const added = arrayOfArraysToJson([['Ada', 3, 'yes']], header);
		const previous = [header, ['Ada', 3, 'yes'], ['Bob', 1, 'no']];
		const current = [header, ['Ada', 4, 'yes'], ['Bob', 1, 'no'], ['Cy', 2, 'yes']];
		const updated = compareRevisions(previous, current, 1, 'new', [], 1, 'rowUpdate');
		const anyUpdate = compareRevisions(previous, current, 1, 'new', [], 1, 'anyUpdate');
		const old = compareRevisions(previous, current, 1, 'old', ['Seats'], 1, 'rowUpdate');
		expect(added).toEqual([{ Name: 'Ada', Seats: 3, Active: 'yes' }]);
		expect(updated).toEqual([{ row_number: 2, Name: 'Ada', Seats: 4, Active: 'yes' }]);
		expect(anyUpdate).toEqual([
			{ row_number: 2, change_type: 'updated', Name: 'Ada', Seats: 4, Active: 'yes' },
			{ row_number: 4, change_type: 'added', Name: 'Cy', Seats: 2, Active: 'yes' },
		]);
		const rows = [...added, ...updated, ...anyUpdate, ...old];
		expect(rows.flatMap((row) => validate(row, sheetRowsChanged.output.json))).toEqual([]);
	});
});
