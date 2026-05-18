import { applyRedactions } from './redaction-applier';
import type { SensitivityOk } from '../sensitivity/analyze-html';
import type { CallToolResult } from '../types';

describe('applyRedactions', () => {
	it('redacts structured snapshot and text content using sensitivity hits', () => {
		const result: CallToolResult = {
			content: [{ type: 'text', text: '{\n  "snapshot": "secret-value"\n}' }],
			structuredContent: { snapshot: 'secret-value' },
		};
		const sensitivity: SensitivityOk = {
			ok: true,
			sensitive: true,
			hits: [{ type: 'secret', value: 'secret-value' }],
		};

		applyRedactions(result, sensitivity);

		expect(result.structuredContent).toEqual({ snapshot: '[REDACTED:secret]' });
		expect(result.content[0]).toEqual({
			type: 'text',
			text: '{\n  "snapshot": "[REDACTED:secret]"\n}',
		});
	});

	it('redacts nested structuredContent fields beyond snapshot/content keys', () => {
		const result: CallToolResult = {
			content: [{ type: 'text', text: '{}' }],
			structuredContent: {
				text: 'secret-value',
				entries: [{ message: 'prefix secret-value suffix' }],
				metadata: { echoed: 'secret-value' },
			},
		};
		const sensitivity: SensitivityOk = {
			ok: true,
			sensitive: true,
			hits: [{ type: 'secret', value: 'secret-value' }],
		};

		applyRedactions(result, sensitivity);

		expect(result.structuredContent).toEqual({
			text: '[REDACTED:secret]',
			entries: [{ message: 'prefix [REDACTED:secret] suffix' }],
			metadata: { echoed: '[REDACTED:secret]' },
		});
	});

	it('does not recurse into class instances in structuredContent', () => {
		const error = new Error('secret-value');
		const result: CallToolResult = {
			content: [{ type: 'text', text: '{}' }],
			structuredContent: { error },
		};
		const sensitivity: SensitivityOk = {
			ok: true,
			sensitive: true,
			hits: [{ type: 'secret', value: 'secret-value' }],
		};

		applyRedactions(result, sensitivity);

		expect((result.structuredContent as { error: Error }).error).toBe(error);
		expect(error.message).toBe('secret-value');
	});
});
