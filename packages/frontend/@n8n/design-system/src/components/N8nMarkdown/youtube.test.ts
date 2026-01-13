import Markdown from 'markdown-it';

import { markdownYoutubeEmbed, type YoutubeEmbedConfig } from './youtube';

describe('markdownYoutubeEmbed', () => {
	it('should render YouTube embed iframe with default options', () => {
		const options: YoutubeEmbedConfig = {};
		const md = new Markdown().use(markdownYoutubeEmbed, options);

		const result = md.render('@[youtube](ZCuL2e4zC_4)');
		expect(result).toContain(
			'<p><iframe width="100%" src="https://www.youtube-nocookie.com/embed/ZCuL2e4zC_4" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe></p>',
		);
	});

	it('should be strict about YouTube video IDs and not include extra query parameters', () => {
		const options: YoutubeEmbedConfig = {};
		const md = new Markdown().use(markdownYoutubeEmbed, options);

		const result = md.render('@[youtube](ZCuL2e4zC_4?autoplay=1)');
		expect(result).toContain('<p>@<a href="ZCuL2e4zC_4?autoplay=1">youtube</a></p>');
	});

	it('should render YouTube embed iframe with custom options', () => {
		const options: YoutubeEmbedConfig = {
			width: 640,
			height: 360,
			title: 'Test Title',
		};
		const md = new Markdown().use(markdownYoutubeEmbed, options);

		const result = md.render('@[youtube](ZCuL2e4zC_4)');
		expect(result).toContain(
			'<p><iframe width="640" height="360" src="https://www.youtube-nocookie.com/embed/ZCuL2e4zC_4" title="Test Title" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe></p>',
		);
	});

	it('should render YouTube embed iframe with cookies', () => {
		const options: YoutubeEmbedConfig = {
			width: 640,
			height: 360,
			title: 'Test Title',
			nocookie: false,
		};
		const md = new Markdown().use(markdownYoutubeEmbed, options);

		const result = md.render('@[youtube](ZCuL2e4zC_4)');
		expect(result).toContain(
			'<p><iframe width="640" height="360" src="https://www.youtube.com/embed/ZCuL2e4zC_4" title="Test Title" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe></p>',
		);
	});

	it('should render sticky HTML content with YouTube embed', () => {
		const options: YoutubeEmbedConfig = {};
		const md = new Markdown().use(markdownYoutubeEmbed, options);

		const result = md.render(
			"## I'm a note \n**Double click** to edit me. [Guide](https://docs.n8n.io/workflows/components/sticky-notes/)\n@[youtube](ZCuL2e4zC_4)",
		);
		expect(result).toContain(
			"<h2>I'm a note</h2>\n" +
				'<p><strong>Double click</strong> to edit me. <a href="https://docs.n8n.io/workflows/components/sticky-notes/">Guide</a>\n' +
				'<iframe width="100%" src="https://www.youtube-nocookie.com/embed/ZCuL2e4zC_4" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe></p>',
		);
	});
});
