import type { DatabaseConfig } from '@n8n/config';
import { type GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { sqlite } from '../transformers';

const globalConfig = mock<GlobalConfig>();

beforeEach(() => {
	jest.spyOn(Container, 'get').mockReturnValue(globalConfig);
});

afterEach(() => {
	jest.restoreAllMocks();
});

const TEST_CASES = [
	['Line separator (LSEP)', '\u2028'],
	['Paragraph peparator (PSEP)', '\u2029'],
	['Zero-width space', '\u200B'],
	['Zero-width non-joiner', '\u200C'],
	['Zero-width joiner', '\u200D'],
	['Byte order mark (BOM)', '\uFEFF'],
];

describe('to', () => {
	it('should return the original object if the database is not sqlite', () => {
		globalConfig.database = mock<DatabaseConfig>({ type: 'postgresdb' });
		const dirtyObj = {
			name: 'Workflow with bad chars',
			description: 'Here is a line separator \u2028 character.',
		};

		const result = sqlite.jsonColumn.to(dirtyObj);

		expect(result).toBe(dirtyObj);
		expect(typeof result).toBe('object');
	});

	test.each(TEST_CASES)('should remove %s when database is sqlite', (charName, specialChar) => {
		globalConfig.database = mock<DatabaseConfig>({ type: 'sqlite' });
		const dirtyObj = {
			pinData: `Some pinned data with a ${charName}${specialChar} inside.`,
		};
		const expectedCleanString = JSON.stringify({
			pinData: `Some pinned data with a ${charName} inside.`,
		});

		const result = sqlite.jsonColumn.to(dirtyObj);

		expect(result).toBe(expectedCleanString);
		expect(result).not.toContain(specialChar);
		expect(typeof result).toBe('string');
	});
});

describe('from', () => {
	it('if a valid JSON string, should parse it into an object', () => {
		const json = '{"name":"My Workflow","active":true}';
		const expectedObj = { name: 'My Workflow', active: true };
		const result = sqlite.jsonColumn.from(json);
		expect(result).toEqual(expectedObj);
	});

	it('if a JS object, should return the value directly', () => {
		const obj = { name: 'My Workflow', active: true };
		const result = sqlite.jsonColumn.from(obj);
		expect(result).toBe(obj);
	});
});
