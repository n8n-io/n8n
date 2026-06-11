import { DesktopAssistantTaskRequestDto } from '../desktop-assistant-task-request.dto';

describe('DesktopAssistantTaskRequestDto', () => {
	describe('Valid requests', () => {
		test('prompt only (no context) validates', () => {
			const result = DesktopAssistantTaskRequestDto.safeParse({ prompt: 'do a thing' });
			expect(result.success).toBe(true);
		});

		test('full structured context validates', () => {
			const result = DesktopAssistantTaskRequestDto.safeParse({
				prompt: 'clean up the current folder',
				context: {
					kind: 'finder',
					app: 'Finder',
					windowTitle: 'Downloads',
					url: 'https://example.com',
					path: '/Users/me/Downloads',
					selectedText: 'some text',
					appHint: 'Finder: Downloads',
					attachments: [{ data: 'abc', mimeType: 'image/jpeg', fileName: 'screen.jpg' }],
				},
			});
			expect(result.success).toBe(true);
		});

		test('partial context validates', () => {
			const result = DesktopAssistantTaskRequestDto.safeParse({
				prompt: 'summarise this page',
				context: { kind: 'browser', url: 'https://example.com' },
			});
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test('empty prompt fails', () => {
			const result = DesktopAssistantTaskRequestDto.safeParse({ prompt: '' });
			expect(result.success).toBe(false);
		});

		test('unknown kind fails', () => {
			const result = DesktopAssistantTaskRequestDto.safeParse({
				prompt: 'x',
				context: { kind: 'spreadsheet' },
			});
			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path).toEqual(['context', 'kind']);
		});

		test('attachment over the 10 MB cap fails', () => {
			const result = DesktopAssistantTaskRequestDto.safeParse({
				prompt: 'x',
				context: {
					attachments: [
						{ data: 'a'.repeat(14_000_001), mimeType: 'image/jpeg', fileName: 'big.jpg' },
					],
				},
			});
			expect(result.success).toBe(false);
		});

		test('more than 10 attachments fails', () => {
			const result = DesktopAssistantTaskRequestDto.safeParse({
				prompt: 'x',
				context: {
					attachments: Array.from({ length: 11 }, () => ({
						data: 'a',
						mimeType: 'image/jpeg',
						fileName: 'f.jpg',
					})),
				},
			});
			expect(result.success).toBe(false);
		});
	});
});
