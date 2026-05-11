import type { CallToolResult } from '../../types';
import { redactCallToolResult } from '../redact';

// Comprehensive pattern/string/value-walk coverage lives in
// @n8n/secret-patterns; this file only exercises the mcp-browser-specific
// `redactCallToolResult` wrapper that walks `CallToolResult` content blocks.

const ALPHANUM_36 = 'd'.repeat(36);

describe('redactCallToolResult', () => {
	it('redacts text content blocks', () => {
		const ghp = `ghp_${ALPHANUM_36}`;
		const result: CallToolResult = {
			content: [
				{ type: 'text', text: `here is ${ghp}` },
				{ type: 'text', text: 'no secret here' },
			],
		};
		redactCallToolResult(result);
		expect(result.content[0]).toEqual({
			type: 'text',
			text: 'here is [REDACTED:github_pat]',
		});
		expect(result.content[1]).toEqual({ type: 'text', text: 'no secret here' });
	});

	it('redacts structuredContent', () => {
		const ghp = `ghp_${ALPHANUM_36}`;
		const result: CallToolResult = {
			content: [{ type: 'text', text: 'wrapper' }],
			structuredContent: { snapshot: `tree contains ${ghp}` },
		};
		redactCallToolResult(result);
		expect(result.structuredContent).toEqual({
			snapshot: 'tree contains [REDACTED:github_pat]',
		});
	});

	it('leaves image content blocks untouched', () => {
		const result: CallToolResult = {
			content: [
				{ type: 'image', data: 'iVBORw0KGgoAAAA', mimeType: 'image/png' },
				{ type: 'text', text: `metadata: ghp_${ALPHANUM_36}` },
			],
		};
		redactCallToolResult(result);
		expect(result.content[0]).toEqual({
			type: 'image',
			data: 'iVBORw0KGgoAAAA',
			mimeType: 'image/png',
		});
		expect(result.content[1]).toEqual({
			type: 'text',
			text: 'metadata: [REDACTED:github_pat]',
		});
	});

	it('preserves the isError flag', () => {
		const result: CallToolResult = {
			content: [{ type: 'text', text: 'oops' }],
			isError: true,
		};
		redactCallToolResult(result);
		expect(result.isError).toBe(true);
	});
});
