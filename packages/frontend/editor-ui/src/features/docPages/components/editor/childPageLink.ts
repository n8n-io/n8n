import { mergeAttributes, Node } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';

import ChildPageLinkView from './ChildPageLinkView.vue';

export const childPagePath = (projectId: string, pageId: string) =>
	`/projects/${projectId}/docs/${pageId}`;

// A child page is a link on its own line that points to a doc page.
const LINK_REGEX =
	/^\[((?:\\.|[^\]\\\n])*)\]\(\/projects\/[^/\s)]+\/docs\/([^/\s)]+)\)[ \t]*(?:\n|$)/;
const LINK_START_REGEX = /^\[(?:\\.|[^\]\\\n])*\]\(\/projects\/[^/\s)]+\/docs\/[^/\s)]+\)[ \t]*$/m;

const escapeTitle = (title: string) => title.replace(/[[\]\\]/g, '\\$&');
const unescapeTitle = (title: string) => title.replace(/\\(.)/g, '$1');

export const createChildPageLink = (projectId: string) =>
	Node.create({
		name: 'childPageLink',
		group: 'block',
		atom: true,
		selectable: true,
		draggable: true,

		addOptions() {
			return { projectId };
		},

		addAttributes() {
			return {
				pageId: {
					default: '',
					parseHTML: (element) => element.getAttribute('data-page-id') ?? '',
					renderHTML: (attributes) => ({ 'data-page-id': attributes.pageId }),
				},
				title: {
					default: '',
					parseHTML: (element) => element.textContent ?? '',
					renderHTML: () => ({}),
				},
			};
		},

		parseHTML() {
			return [{ tag: 'div[data-child-page-link]' }];
		},

		renderHTML({ node, HTMLAttributes }) {
			return [
				'div',
				mergeAttributes(HTMLAttributes, { 'data-child-page-link': '' }),
				node.attrs.title,
			];
		},

		addNodeView() {
			return VueNodeViewRenderer(ChildPageLinkView);
		},

		markdownTokenizer: {
			name: 'childPageLink',
			level: 'block',
			start: (src) => src.search(LINK_START_REGEX),
			tokenize: (src) => {
				const match = LINK_REGEX.exec(src);
				if (!match) return undefined;
				return {
					type: 'childPageLink',
					raw: match[0],
					title: unescapeTitle(match[1]),
					pageId: match[2],
				};
			},
		},

		parseMarkdown: (token, helpers) =>
			helpers.createNode('childPageLink', { pageId: token.pageId, title: token.title }),

		renderMarkdown: (node) =>
			`[${escapeTitle(String(node.attrs?.title ?? ''))}](${childPagePath(projectId, String(node.attrs?.pageId ?? ''))})`,
	});
