import type { IncomingMessage } from 'http';
import { mock } from 'jest-mock-extended';

import {
	parseContentDisposition,
	parseContentType,
	parseIncomingMessage,
} from '../parse-incoming-message';

describe('parseContentType', () => {
	const testCases = [
		{
			input: 'text/plain',
			expected: {
				type: 'text/plain',
				parameters: {
					charset: 'utf-8',
				},
			},
			description: 'should parse basic content type',
		},
		{
			input: 'TEXT/PLAIN',
			expected: {
				type: 'text/plain',
				parameters: {
					charset: 'utf-8',
				},
			},
			description: 'should convert type to lowercase',
		},
		{
			input: 'text/html; charset=iso-8859-1',
			expected: {
				type: 'text/html',
				parameters: {
					charset: 'iso-8859-1',
				},
			},
			description: 'should parse content type with charset',
		},
		{
			input: 'application/json; charset=utf-8; boundary=---123',
			expected: {
				type: 'application/json',
				parameters: {
					charset: 'utf-8',
					boundary: '---123',
				},
			},
			description: 'should parse content type with multiple parameters',
		},
		{
			input: 'text/plain; charset="utf-8"; filename="test.txt"',
			expected: {
				type: 'text/plain',
				parameters: {
					charset: 'utf-8',
					filename: 'test.txt',
				},
			},
			description: 'should handle quoted parameter values',
		},
		{
			input: 'text/plain; filename=%22test%20file.txt%22',
			expected: {
				type: 'text/plain',
				parameters: {
					charset: 'utf-8',
					filename: 'test file.txt',
				},
			},
			description: 'should handle encoded parameter values',
		},
		{
			input: undefined,
			expected: null,
			description: 'should return null for undefined input',
		},
		{
			input: '',
			expected: null,
			description: 'should return null for empty string',
		},
	];

	test.each(testCases)('$description', ({ input, expected }) => {
		expect(parseContentType(input)).toEqual(expected);
	});
});

describe('parseContentDisposition', () => {
	const testCases = [
		{
			input: 'attachment; filename="file.txt"',
			expected: { type: 'attachment', filename: 'file.txt' },
			description: 'should parse basic content disposition',
		},
		{
			input: 'attachment; filename=file.txt',
			expected: { type: 'attachment', filename: 'file.txt' },
			description: 'should parse filename without quotes',
		},
		{
			input: 'inline; filename="image.jpg"',
			expected: { type: 'inline', filename: 'image.jpg' },
			description: 'should parse inline disposition',
		},
		{
			input: 'attachment; filename="my file.pdf"',
			expected: { type: 'attachment', filename: 'my file.pdf' },
			description: 'should parse filename with spaces',
		},
		{
			input: "attachment; filename*=UTF-8''my%20file.txt",
			expected: { type: 'attachment', filename: 'my file.txt' },
			description: 'should parse filename* parameter (RFC 5987)',
		},
		{
			input: 'filename="test.txt"',
			expected: { type: 'attachment', filename: 'test.txt' },
			description: 'should handle invalid syntax but with filename',
		},
		{
			input: 'filename=test.txt',
			expected: { type: 'attachment', filename: 'test.txt' },
			description: 'should handle invalid syntax with only filename parameter',
		},
		{
			input: undefined,
			expected: null,
			description: 'should return null for undefined input',
		},
		{
			input: '',
			expected: null,
			description: 'should return null for empty string',
		},
		{
			input: 'attachment; filename="%F0%9F%98%80.txt"',
			expected: { type: 'attachment', filename: '😀.txt' },
			description: 'should handle encoded filenames',
		},
		{
			input: 'attachment; size=123; filename="test.txt"; creation-date="Thu, 1 Jan 2020"',
			expected: { type: 'attachment', filename: 'test.txt' },
			description: 'should handle multiple parameters',
		},
	];

	test.each(testCases)('$description', ({ input, expected }) => {
		expect(parseContentDisposition(input)).toEqual(expected);
	});
});

describe('parseIncomingMessage', () => {
	it('parses valid content-type header', () => {
		const message = mock<IncomingMessage>({
			headers: { 'content-type': 'application/json', 'content-disposition': undefined },
		});
		parseIncomingMessage(message);

		expect(message.contentType).toEqual('application/json');
	});

	it('parses valid content-type header with parameters', () => {
		const message = mock<IncomingMessage>({
			headers: {
				'content-type': 'application/json; charset=utf-8',
				'content-disposition': undefined,
			},
		});
		parseIncomingMessage(message);

		expect(message.contentType).toEqual('application/json');
		expect(message.encoding).toEqual('utf-8');
	});

	it('parses valid content-type header with encoding wrapped in quotes', () => {
		const message = mock<IncomingMessage>({
			headers: {
				'content-type': 'application/json; charset="utf-8"',
				'content-disposition': undefined,
			},
		});
		parseIncomingMessage(message);

		expect(message.contentType).toEqual('application/json');
		expect(message.encoding).toEqual('utf-8');
	});

	it('parses valid content-disposition header with filename*', () => {
		const message = mock<IncomingMessage>({
			headers: {
				'content-type': undefined,
				'content-disposition':
					'attachment; filename="screenshot%20(1).png"; filename*=UTF-8\'\'screenshot%20(1).png',
			},
		});
		parseIncomingMessage(message);

		expect(message.contentDisposition).toEqual({
			filename: 'screenshot (1).png',
			type: 'attachment',
		});
	});

	it('parses valid content-disposition header with filename* (quoted)', () => {
		const message = mock<IncomingMessage>({
			headers: {
				'content-type': undefined,
				'content-disposition': ' attachment;filename*="utf-8\' \'test-unsplash.jpg"',
			},
		});
		parseIncomingMessage(message);

		expect(message.contentDisposition).toEqual({
			filename: 'test-unsplash.jpg',
			type: 'attachment',
		});
	});

	it('parses valid content-disposition header with filename and trailing ";"', () => {
		const message = mock<IncomingMessage>({
			headers: {
				'content-type': undefined,
				'content-disposition': 'inline; filename="screenshot%20(1).png";',
			},
		});
		parseIncomingMessage(message);

		expect(message.contentDisposition).toEqual({
			filename: 'screenshot (1).png',
			type: 'inline',
		});
	});

	it('parses non standard content-disposition with missing type', () => {
		const message = mock<IncomingMessage>({
			headers: {
				'content-type': undefined,
				'content-disposition': 'filename="screenshot%20(1).png";',
			},
		});
		parseIncomingMessage(message);

		expect(message.contentDisposition).toEqual({
			filename: 'screenshot (1).png',
			type: 'attachment',
		});
	});
});
