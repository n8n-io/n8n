import { extractTextContent } from '../desktop-assistant.helpers';

describe('extractTextContent', () => {
	test('passes string content through', () => {
		expect(extractTextContent('rename the file')).toBe('rename the file');
	});

	test('joins text parts from multi-part content', () => {
		expect(
			extractTextContent([
				{ type: 'text', text: 'rename the file' },
				{ type: 'text', text: 'and write a joke in it' },
			]),
		).toBe('rename the file\nand write a joke in it');
	});

	test('drops attachment parts so base64 payloads never reach a prompt', () => {
		const base64 = 'A'.repeat(800_000); // a ~600KB screenshot, as it bit us in the wild
		const result = extractTextContent([
			{ type: 'text', text: 'rename the file' },
			{ type: 'image', image: base64, mimeType: 'image/jpeg' },
			{ type: 'file', data: base64, mimeType: 'application/pdf' },
		]);
		expect(result).toBe('rename the file');
		expect(result).not.toContain('AAAA');
	});

	test('returns empty string for content with no text', () => {
		expect(extractTextContent([{ type: 'image', image: 'abc' }])).toBe('');
		expect(extractTextContent(undefined)).toBe('');
		expect(extractTextContent({ not: 'an array' })).toBe('');
	});
});
