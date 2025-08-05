/**
 * Test suite for YouTube markdown plugin utility functions
 */

import { describe, it, expect, vi } from 'vitest';
import MarkdownIt from 'markdown-it';
import { markdownYoutubeEmbed, YOUTUBE_EMBED_SRC_REGEX, type YoutubeEmbedConfig } from '../youtube';

describe('youtube markdown utilities', () => {
	describe('YOUTUBE_EMBED_SRC_REGEX', () => {
		it('should match valid YouTube embed URLs', () => {
			const validUrls = [
				'https://www.youtube.com/embed/dQw4w9WgXcQ',
				'https://youtube.com/embed/dQw4w9WgXcQ',
				'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
				'https://youtube-nocookie.com/embed/dQw4w9WgXcQ',
				'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1',
				'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=30&end=60',
			];

			validUrls.forEach((url) => {
				expect(YOUTUBE_EMBED_SRC_REGEX.test(url)).toBe(true);
			});
		});

		it('should reject invalid YouTube URLs', () => {
			const invalidUrls = [
				'https://www.google.com/embed/dQw4w9WgXcQ',
				'https://youtube.com/watch?v=dQw4w9WgXcQ',
				'https://youtu.be/dQw4w9WgXcQ',
				'http://www.youtube.com/embed/dQw4w9WgXcQ', // http instead of https
				'https://www.youtube.com/embed/short123', // video ID too short
				'https://www.youtube.com/embed/toolongvideoid123', // video ID too long
				'ftp://www.youtube.com/embed/dQw4w9WgXcQ',
				'https://evil-youtube.com/embed/dQw4w9WgXcQ',
			];

			invalidUrls.forEach((url) => {
				expect(YOUTUBE_EMBED_SRC_REGEX.test(url)).toBe(false);
			});
		});

		it('should handle case insensitive matching', () => {
			const urls = [
				'HTTPS://WWW.YOUTUBE.COM/EMBED/dQw4w9WgXcQ',
				'https://WWW.YouTube.COM/embed/dQw4w9WgXcQ',
				'HTTPS://youtube-nocookie.COM/EMBED/dQw4w9WgXcQ',
			];

			urls.forEach((url) => {
				expect(YOUTUBE_EMBED_SRC_REGEX.test(url)).toBe(true);
			});
		});
	});

	describe('markdownYoutubeEmbed', () => {
		let md: MarkdownIt;

		beforeEach(() => {
			md = new MarkdownIt();
		});

		it('should register the plugin without errors', () => {
			expect(() => {
				markdownYoutubeEmbed(md, {});
			}).not.toThrow();
		});

		it('should register with default options', () => {
			markdownYoutubeEmbed(md, {});

			// Verify plugin was registered by checking if ruler was modified
			expect(md.inline.ruler).toBeDefined();
			expect(md.renderer.rules.youtube_embed).toBeInstanceOf(Function);
		});

		it('should register with custom options', () => {
			const customOptions: YoutubeEmbedConfig = {
				width: 640,
				height: 480,
				title: 'Custom Video Player',
				nocookie: false,
			};

			markdownYoutubeEmbed(md, customOptions);

			expect(md.renderer.rules.youtube_embed).toBeInstanceOf(Function);
		});

		it('should handle empty options object', () => {
			expect(() => {
				markdownYoutubeEmbed(md, {});
			}).not.toThrow();

			expect(md.renderer.rules.youtube_embed).toBeInstanceOf(Function);
		});

		it('should handle partial options', () => {
			const partialOptions: YoutubeEmbedConfig = {
				width: 800,
				title: 'Partial Options Test',
			};

			expect(() => {
				markdownYoutubeEmbed(md, partialOptions);
			}).not.toThrow();

			expect(md.renderer.rules.youtube_embed).toBeInstanceOf(Function);
		});

		it('should render YouTube embed with default options', () => {
			markdownYoutubeEmbed(md, {});

			const result = md.render('@[youtube](dQw4w9WgXcQ)');

			expect(result).toContain('<iframe');
			expect(result).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
			expect(result).toContain('width="100%"');
			expect(result).toContain('title="YouTube video player"');
			expect(result).toContain('allowfullscreen');
		});

		it('should render YouTube embed with custom options', () => {
			const customOptions: YoutubeEmbedConfig = {
				width: 640,
				height: 480,
				title: 'Custom Player',
				nocookie: false,
			};

			markdownYoutubeEmbed(md, customOptions);

			const result = md.render('@[youtube](dQw4w9WgXcQ)');

			expect(result).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"');
			expect(result).toContain('width="640"');
			expect(result).toContain('height="480"');
			expect(result).toContain('title="Custom Player"');
		});

		it('should handle video IDs with query parameters', () => {
			markdownYoutubeEmbed(md, {});

			const result = md.render('@[youtube](dQw4w9WgXcQ?start=30&end=90)');

			expect(result).toContain(
				'src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=30&end=90"',
			);
		});

		it('should escape HTML in title option', () => {
			markdownYoutubeEmbed(md, {
				title: '<script>alert("xss")</script>',
			});

			const result = md.render('@[youtube](dQw4w9WgXcQ)');

			expect(result).not.toContain('<script>');
			expect(result).toContain('&lt;script&gt;');
		});

		it('should handle multiple YouTube embeds in one document', () => {
			markdownYoutubeEmbed(md, {});

			const markdown = `
Here's video 1: @[youtube](dQw4w9WgXcQ)

And here's video 2: @[youtube](oHg5SJYRHA0)
			`;

			const result = md.render(markdown);

			expect(result).toContain('dQw4w9WgXcQ');
			expect(result).toContain('oHg5SJYRHA0');
			expect((result.match(/<iframe/g) || []).length).toBe(2);
		});

		it('should not interfere with regular markdown links', () => {
			markdownYoutubeEmbed(md, {});

			const markdown = `
Regular link: [YouTube](https://youtube.com)
YouTube embed: @[youtube](dQw4w9WgXcQ)
			`;

			const result = md.render(markdown);

			expect(result).toContain('<a href="https://youtube.com">YouTube</a>');
			expect(result).toContain('<iframe');
		});

		it('should handle nocookie option correctly', () => {
			markdownYoutubeEmbed(md, { nocookie: true });
			const result1 = md.render('@[youtube](dQw4w9WgXcQ)');
			expect(result1).toContain('youtube-nocookie.com');

			// Reset markdown instance for second test
			md = new MarkdownIt();
			markdownYoutubeEmbed(md, { nocookie: false });
			const result2 = md.render('@[youtube](dQw4w9WgXcQ)');
			expect(result2).toContain('youtube.com/embed');
			expect(result2).not.toContain('youtube-nocookie.com');
		});

		it('should include all required iframe attributes', () => {
			markdownYoutubeEmbed(md, {});

			const result = md.render('@[youtube](dQw4w9WgXcQ)');

			const requiredAttributes = [
				'frameborder="0"',
				'allowfullscreen',
				'referrerpolicy="strict-origin-when-cross-origin"',
				'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"',
			];

			requiredAttributes.forEach((attr) => {
				expect(result).toContain(attr);
			});
		});

		it('should handle invalid YouTube video IDs gracefully', () => {
			markdownYoutubeEmbed(md, {});

			const invalidMarkdown = '@[youtube](invalid-id)';
			const result = md.render(invalidMarkdown);

			// The regex only matches 11-character video IDs, so this won't be parsed as YouTube
			expect(result).not.toContain('<iframe');
		});

		it('should not parse malformed YouTube tags', () => {
			markdownYoutubeEmbed(md, {});

			const malformedTags = [
				'@[youtube]',
				'@youtube(dQw4w9WgXcQ)',
				'[youtube](dQw4w9WgXcQ)',
				'@[youtube](dQw4w9WgXcQ',
				'@[youtube]dQw4w9WgXcQ)',
			];

			malformedTags.forEach((tag) => {
				const result = md.render(tag);
				expect(result).not.toContain('<iframe');
				// Don't expect exact text match due to markdown processing
			});
		});
	});

	describe('YoutubeEmbedConfig interface', () => {
		it('should accept all valid configuration options', () => {
			const configs: YoutubeEmbedConfig[] = [
				{},
				{ width: 640 },
				{ height: 480 },
				{ title: 'Test Video' },
				{ nocookie: true },
				{ nocookie: false },
				{ width: '100%', height: '50vh' },
				{ width: 800, height: 600, title: 'Full Config', nocookie: true },
			];

			configs.forEach((config) => {
				expect(() => {
					markdownYoutubeEmbed(new MarkdownIt(), config);
				}).not.toThrow();
			});
		});

		it('should handle string and number width values', () => {
			const md1 = new MarkdownIt();
			const md2 = new MarkdownIt();

			markdownYoutubeEmbed(md1, { width: 640 });
			markdownYoutubeEmbed(md2, { width: '80%' });

			const result1 = md1.render('@[youtube](dQw4w9WgXcQ)');
			const result2 = md2.render('@[youtube](dQw4w9WgXcQ)');

			expect(result1).toContain('width="640"');
			expect(result2).toContain('width="80%"');
		});

		it('should handle string and number height values', () => {
			const md1 = new MarkdownIt();
			const md2 = new MarkdownIt();

			markdownYoutubeEmbed(md1, { height: 480 });
			markdownYoutubeEmbed(md2, { height: '50vh' });

			const result1 = md1.render('@[youtube](dQw4w9WgXcQ)');
			const result2 = md2.render('@[youtube](dQw4w9WgXcQ)');

			expect(result1).toContain('height="480"');
			expect(result2).toContain('height="50vh"');
		});
	});
});
