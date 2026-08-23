import os from 'node:os';
import path from 'node:path';

import { McpBrowserError } from '../errors';
import {
	expandHome,
	formatCallToolResult,
	formatErrorResponse,
	formatImageResponse,
	generateId,
	toError,
} from '../utils';

describe('expandHome', () => {
	it('should replace leading ~ with home directory', () => {
		const result = expandHome('~/Documents/file.txt');
		expect(result).toBe(path.join(os.homedir(), 'Documents/file.txt'));
	});

	it('should leave absolute paths unchanged', () => {
		expect(expandHome('/usr/local/bin')).toBe('/usr/local/bin');
	});

	it('should leave relative paths without ~ unchanged', () => {
		expect(expandHome('some/relative/path')).toBe('some/relative/path');
	});
});

describe('generateId', () => {
	it('should return prefix followed by underscore and 12-char nanoid', () => {
		const id = generateId('sess');
		expect(id).toMatch(/^sess_[a-zA-Z0-9_-]{12}$/);
	});

	it('should generate unique IDs', () => {
		const ids = new Set(Array.from({ length: 100 }, () => generateId('test')));
		expect(ids.size).toBe(100);
	});
});

describe('formatCallToolResult', () => {
	it('should wrap data as MCP text content with structuredContent', () => {
		const data = { url: 'https://example.com', title: 'Example' };
		const result = formatCallToolResult(data);

		expect(result.content).toHaveLength(1);
		expect(result.content[0]).toEqual({
			type: 'text',
			text: JSON.stringify(data, null, 2),
		});
		expect(result.structuredContent).toEqual(data);
	});
});

describe('formatImageResponse', () => {
	it('should wrap base64 data as image content', () => {
		const result = formatImageResponse('iVBOR...');

		expect(result.content).toHaveLength(1);
		expect(result.content[0]).toEqual({
			type: 'image',
			data: 'iVBOR...',
			mimeType: 'image/png',
		});
	});

	it('should append metadata as text content when provided', () => {
		const result = formatImageResponse('iVBOR...', { width: 1280, height: 720 });

		expect(result.content).toHaveLength(2);
		expect(result.content[0]).toMatchObject({ type: 'image' });
		expect(result.content[1]).toEqual({
			type: 'text',
			text: JSON.stringify({ width: 1280, height: 720 }, null, 2),
		});
	});

	it('should not append text when metadata is undefined', () => {
		const result = formatImageResponse('iVBOR...');
		expect(result.content).toHaveLength(1);
	});
});

describe('toError', () => {
	it('should return Error instances unchanged', () => {
		const original = new Error('test');
		expect(toError(original)).toBe(original);
	});

	it('should wrap string values in Error', () => {
		const result = toError('something failed');
		expect(result).toBeInstanceOf(Error);
		expect(result.message).toBe('something failed');
	});

	it('should wrap numbers in Error', () => {
		const result = toError(404);
		expect(result).toBeInstanceOf(Error);
		expect(result.message).toBe('404');
	});

	it('should wrap null in Error', () => {
		const result = toError(null);
		expect(result).toBeInstanceOf(Error);
		expect(result.message).toBe('null');
	});
});

describe('formatErrorResponse', () => {
	it('should format error with message and isError flag', () => {
		const error = new McpBrowserError('Something broke');
		const result = formatErrorResponse(error);

		expect(result.isError).toBe(true);
		expect(result.content).toHaveLength(1);
		expect(result.structuredContent).toMatchObject({ error: 'Something broke' });
	});

	it('should include hint when present', () => {
		const error = new McpBrowserError('Session expired', 'Create a new session');
		const result = formatErrorResponse(error);

		expect(result.structuredContent).toMatchObject({
			error: 'Session expired',
			hint: 'Create a new session',
		});
	});

	it('should set structuredContent matching the text content', () => {
		const error = new McpBrowserError('Oops', 'Try again');
		const result = formatErrorResponse(error);

		expect(result.structuredContent).toEqual({ error: 'Oops', hint: 'Try again' });
	});
});
