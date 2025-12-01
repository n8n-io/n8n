import { convertMcpContentToLangChain } from '../utils';

describe('convertMcpContentToLangChain', () => {
	describe('text content', () => {
		it('returns plain string for single text item', () => {
			const result = convertMcpContentToLangChain([{ type: 'text', text: 'Hello world' }]);

			expect(result).toBe('Hello world');
		});

		it('returns array for multiple text items', () => {
			const result = convertMcpContentToLangChain([
				{ type: 'text', text: 'First' },
				{ type: 'text', text: 'Second' },
			]);

			expect(result).toEqual([
				{ type: 'text', source_type: 'text', text: 'First' },
				{ type: 'text', source_type: 'text', text: 'Second' },
			]);
		});
	});

	describe('image content', () => {
		it('converts MCP image to LangChain standard format', () => {
			const result = convertMcpContentToLangChain([
				{ type: 'image', data: 'base64data', mimeType: 'image/png' },
			]);

			expect(result).toEqual([
				{ type: 'image', source_type: 'base64', data: 'base64data', mime_type: 'image/png' },
			]);
		});

		it('handles mixed text and image content', () => {
			const result = convertMcpContentToLangChain([
				{ type: 'text', text: 'Here is an image:' },
				{ type: 'image', data: 'imgdata', mimeType: 'image/jpeg' },
			]);

			expect(result).toEqual([
				{ type: 'text', source_type: 'text', text: 'Here is an image:' },
				{ type: 'image', source_type: 'base64', data: 'imgdata', mime_type: 'image/jpeg' },
			]);
		});
	});

	describe('audio content', () => {
		it('converts MCP audio to LangChain standard format', () => {
			const result = convertMcpContentToLangChain([
				{ type: 'audio', data: 'audiodata', mimeType: 'audio/mp3' },
			]);

			expect(result).toEqual([
				{ type: 'audio', source_type: 'base64', data: 'audiodata', mime_type: 'audio/mp3' },
			]);
		});
	});

	describe('resource content', () => {
		it('extracts text from text resources', () => {
			const result = convertMcpContentToLangChain([
				{
					type: 'resource',
					resource: { uri: 'file://doc.txt', text: 'Document content' },
				},
			]);

			expect(result).toBe('Document content');
		});

		it('converts image resources to standard format', () => {
			const result = convertMcpContentToLangChain([
				{
					type: 'resource',
					resource: { uri: 'file://img.png', mimeType: 'image/png', blob: 'blobdata' },
				},
			]);

			expect(result).toEqual([
				{ type: 'image', source_type: 'base64', data: 'blobdata', mime_type: 'image/png' },
			]);
		});

		it('converts audio resources to standard format', () => {
			const result = convertMcpContentToLangChain([
				{
					type: 'resource',
					resource: { uri: 'file://sound.mp3', mimeType: 'audio/mp3', blob: 'audioblob' },
				},
			]);

			expect(result).toEqual([
				{ type: 'audio', source_type: 'base64', data: 'audioblob', mime_type: 'audio/mp3' },
			]);
		});

		it('ignores unsupported binary resources', () => {
			const result = convertMcpContentToLangChain([
				{
					type: 'resource',
					resource: { uri: 'file://doc.pdf', mimeType: 'application/pdf', blob: 'pdfdata' },
				},
			]);

			expect(result).toEqual([]);
		});

		it('ignores resources without text or blob', () => {
			const result = convertMcpContentToLangChain([
				{
					type: 'resource',
					resource: { uri: 'file://empty' },
				},
			]);

			expect(result).toEqual([]);
		});
	});

	describe('empty content', () => {
		it('returns empty array for empty input', () => {
			const result = convertMcpContentToLangChain([]);

			expect(result).toEqual([]);
		});
	});
});
