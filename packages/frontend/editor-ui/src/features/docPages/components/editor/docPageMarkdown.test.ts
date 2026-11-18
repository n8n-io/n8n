import { Editor } from '@tiptap/core';

import { createChildPageLink } from './childPageLink';
import { createDocPageBaseExtensions } from './docPageExtensions';
import { findSectionRange } from './findSectionRange';

const createEditor = (markdown: string) =>
	new Editor({
		extensions: [...createDocPageBaseExtensions(), createChildPageLink('p1')],
		content: markdown,
		contentType: 'markdown',
	});

describe('doc page markdown', () => {
	it('parses a callout and writes it back', () => {
		const markdown = '> [!warning]\n> Do not **delete** this.';
		const editor = createEditor(markdown);

		expect(editor.getJSON().content?.[0]).toMatchObject({
			type: 'callout',
			attrs: { variant: 'warning' },
			content: [{ type: 'paragraph' }],
		});
		expect(editor.getMarkdown().trim()).toBe(markdown);
		editor.destroy();
	});

	it('keeps a plain quote as a quote', () => {
		const editor = createEditor('> Just a quote');

		expect(editor.getJSON().content?.[0].type).toBe('blockquote');
		editor.destroy();
	});

	it('replaces one section with parsed markdown, as applyFinding does', () => {
		const editor = createEditor(
			'## Overview\n\nIntro\n\n## Endpoint\n\nGET /old\n\n## Authentication\n\nNone',
		);
		const onUpdate = vi.fn();
		editor.on('update', onUpdate);

		const range = findSectionRange(editor.state.doc, 'Endpoint');
		editor
			.chain()
			.insertContentAt(range!, '## Endpoint\n\n> [!note]\n> GET /new', { contentType: 'markdown' })
			.run();

		expect(onUpdate).toHaveBeenCalled();
		expect(editor.getMarkdown().trim()).toBe(
			'## Overview\n\nIntro\n\n## Endpoint\n\n> [!note]\n> GET /new\n\n## Authentication\n\nNone',
		);
		editor.destroy();
	});

	it('parses a child page link and writes it back', () => {
		const markdown = '[Runbook \\[v2\\]](/projects/p1/docs/abc123)';
		const editor = createEditor(`Intro\n\n${markdown}`);

		expect(editor.getJSON().content?.[1]).toMatchObject({
			type: 'childPageLink',
			attrs: { pageId: 'abc123', title: 'Runbook [v2]' },
		});
		expect(editor.getMarkdown().trim()).toBe(`Intro\n\n${markdown}`);
		editor.destroy();
	});
});
