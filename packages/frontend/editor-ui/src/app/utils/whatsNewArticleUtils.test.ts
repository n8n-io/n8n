import { getWhatsNewArticleImage, splitWhatsNewArticleCta } from './whatsNewArticleUtils';

describe('splitWhatsNewArticleCta', () => {
	it('lifts a link that is the whole last paragraph', () => {
		const content =
			'Intro.\n\n- one\n- two\n\n[Learn more in the docs](https://docs.n8n.io/agents)';
		expect(splitWhatsNewArticleCta(content)).toEqual({
			body: 'Intro.\n\n- one\n- two',
			cta: { label: 'Learn more in the docs', href: 'https://docs.n8n.io/agents' },
		});
	});

	it('drops a trailing period and a link title from the label', () => {
		const content = 'Intro.\n\n[Learn more.](https://docs.n8n.io/agents "Docs")\n';
		expect(splitWhatsNewArticleCta(content).cta).toEqual({
			label: 'Learn more',
			href: 'https://docs.n8n.io/agents',
		});
	});

	it('lifts a link that closes the last sentence and keeps the sentence', () => {
		const content =
			'Intro.\n\nAvailable on Cloud. [Learn more in the docs.](https://docs.n8n.io/credits)';
		expect(splitWhatsNewArticleCta(content)).toEqual({
			body: 'Intro.\n\nAvailable on Cloud.',
			cta: { label: 'Learn more in the docs', href: 'https://docs.n8n.io/credits' },
		});
	});

	it('keeps a link that is followed by a full stop in the body', () => {
		const content = 'Get started with Loops in the [docs](https://docs.n8n.io/loops).';
		expect(splitWhatsNewArticleCta(content)).toEqual({ body: content });
	});

	it('keeps a link that is followed by more text in the body', () => {
		const content = 'Intro.\n\n[Docs](https://docs.n8n.io) and more.';
		expect(splitWhatsNewArticleCta(content)).toEqual({ body: content });
	});

	it('ignores links that are not http(s) urls', () => {
		const content = 'Intro.\n\n[Mail us](mailto:hello@n8n.io)';
		expect(splitWhatsNewArticleCta(content)).toEqual({ body: content });
	});

	it('handles an article that is only a link', () => {
		expect(splitWhatsNewArticleCta('[Read](https://n8n.io/blog)')).toEqual({
			body: '',
			cta: { label: 'Read', href: 'https://n8n.io/blog' },
		});
	});
});

describe('getWhatsNewArticleImage', () => {
	it('returns the first markdown image', () => {
		const content =
			'Intro\n\n![Agent](https://cdn.example.com/agent.png)\n\n![Other](https://cdn.example.com/other.png)';
		expect(getWhatsNewArticleImage(content)).toBe('https://cdn.example.com/agent.png');
	});

	it('returns the first inline html image', () => {
		const content = '<p>Intro</p><img width="600" src="https://cdn.example.com/a.gif" alt="" />';
		expect(getWhatsNewArticleImage(content)).toBe('https://cdn.example.com/a.gif');
	});

	it('ignores images that are not http(s) urls', () => {
		expect(getWhatsNewArticleImage('![x](data:image/png;base64,AAAA)')).toBeUndefined();
	});

	it('returns undefined when the article has no image', () => {
		expect(getWhatsNewArticleImage('Just text')).toBeUndefined();
	});
});
