import { parseViewerInputsJson, sanitizeViewerInputs } from '@/app/utils/viewerMode';

describe('viewerMode utils', () => {
	it('sanitizes valid viewer input fields', () => {
		expect(
			sanitizeViewerInputs([
				{
					key: 'document',
					label: 'Document',
					type: 'file',
					required: true,
					accept: 'application/pdf',
				},
				{
					key: 'note',
					label: 'Note',
					type: 'textarea',
					placeholder: 'Add context',
				},
			]),
		).toEqual([
			{
				key: 'document',
				label: 'Document',
				type: 'file',
				required: true,
				accept: 'application/pdf',
			},
			{
				key: 'note',
				label: 'Note',
				type: 'textarea',
				placeholder: 'Add context',
			},
		]);
	});

	it('drops invalid fields and duplicated keys', () => {
		expect(
			sanitizeViewerInputs([
				{ key: 'input', label: 'Input', type: 'text' },
				{ key: 'input', label: 'Duplicate', type: 'text' },
				{ key: '', label: 'Missing key', type: 'text' },
				{ key: 'x', label: 'Invalid type', type: 'json' },
			]),
		).toEqual([{ key: 'input', label: 'Input', type: 'text' }]);
	});

	it('parses valid JSON schema', () => {
		expect(
			parseViewerInputsJson(
				JSON.stringify([
					{ key: 'amount', label: 'Amount', type: 'number', required: true },
					{ key: 'approved', label: 'Approved', type: 'boolean' },
				]),
			),
		).toEqual({
			inputs: [
				{ key: 'amount', label: 'Amount', type: 'number', required: true },
				{ key: 'approved', label: 'Approved', type: 'boolean' },
			],
		});
	});

	it('returns errors for invalid JSON and schema', () => {
		expect(parseViewerInputsJson('{invalid json')).toEqual({
			error: 'invalid-json',
			inputs: [],
		});

		expect(parseViewerInputsJson('{"key":"x"}')).toEqual({
			error: 'invalid-schema',
			inputs: [],
		});
	});
});
