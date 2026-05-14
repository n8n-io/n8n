import type { INodeTypeDescription } from 'n8n-workflow';

import { computeMissingFields, formatMissingFieldsForChat } from '../missing-fields';

function describeWith(overrides: Partial<INodeTypeDescription>): INodeTypeDescription {
	return {
		properties: [],
		credentials: [],
		...overrides,
	} as unknown as INodeTypeDescription;
}

describe('computeMissingFields', () => {
	it('reports a required parameter that has no value', () => {
		const description = describeWith({
			properties: [
				{
					displayName: 'URL',
					name: 'url',
					type: 'string',
					required: true,
					default: '',
				},
			],
		});

		const result = computeMissingFields(description, {});

		expect(result.params).toEqual([{ path: 'url', displayName: 'URL', hint: undefined }]);
		expect(result.credentials).toEqual([]);
	});

	it('treats empty string and null as missing', () => {
		const description = describeWith({
			properties: [
				{
					displayName: 'URL',
					name: 'url',
					type: 'string',
					required: true,
					default: '',
				},
			],
		});

		const a = computeMissingFields(description, { url: '' });
		const b = computeMissingFields(description, { url: null });
		const c = computeMissingFields(description, { url: '   ' });

		expect(a.params).toHaveLength(1);
		expect(b.params).toHaveLength(1);
		expect(c.params).toHaveLength(1);
	});

	it('does not report a required parameter that has a value', () => {
		const description = describeWith({
			properties: [
				{
					displayName: 'URL',
					name: 'url',
					type: 'string',
					required: true,
					default: '',
				},
			],
		});

		const result = computeMissingFields(description, { url: 'https://example.com' });

		expect(result.params).toEqual([]);
	});

	it('does not report optional parameters', () => {
		const description = describeWith({
			properties: [
				{
					displayName: 'Note',
					name: 'note',
					type: 'string',
					required: false,
					default: '',
				},
			],
		});

		const result = computeMissingFields(description, {});

		expect(result.params).toEqual([]);
	});

	it('skips required params hidden by displayOptions that do not match', () => {
		const description = describeWith({
			properties: [
				{
					displayName: 'Sheet Name',
					name: 'sheetName',
					type: 'string',
					required: true,
					default: '',
					displayOptions: { show: { operation: ['append'] } },
				},
			],
		});

		const result = computeMissingFields(description, { operation: 'read' });

		expect(result.params).toEqual([]);
	});

	it('reports required params visible by displayOptions', () => {
		const description = describeWith({
			properties: [
				{
					displayName: 'Sheet Name',
					name: 'sheetName',
					type: 'string',
					required: true,
					default: '',
					displayOptions: { show: { operation: ['append'] } },
				},
			],
		});

		const result = computeMissingFields(description, { operation: 'append' });

		expect(result.params).toEqual([
			{ path: 'sheetName', displayName: 'Sheet Name', hint: undefined },
		]);
	});

	it('reports required credentials', () => {
		const description = describeWith({
			credentials: [{ name: 'googleApi', displayName: 'Google account', required: true }],
		});

		const result = computeMissingFields(description, {});

		expect(result.credentials).toEqual([{ name: 'googleApi', displayName: 'Google account' }]);
	});

	it('does not report optional credentials', () => {
		const description = describeWith({
			credentials: [{ name: 'googleApi', displayName: 'Google account', required: false }],
		});

		const result = computeMissingFields(description, {});

		expect(result.credentials).toEqual([]);
	});
});

describe('formatMissingFieldsForChat', () => {
	it('returns null when nothing is missing', () => {
		expect(formatMissingFieldsForChat('HTTP Request', { params: [], credentials: [] })).toBeNull();
	});

	it('renders missing params + credentials as one chat message', () => {
		const result = formatMissingFieldsForChat('Google Sheets', {
			params: [{ path: 'sheetName', displayName: 'Sheet Name' }],
			credentials: [{ name: 'googleApi', displayName: 'Google account' }],
		});

		expect(result).toContain('Added Google Sheets');
		expect(result).toContain('Sheet Name');
		expect(result).toContain('Credential: Google account');
	});
});
