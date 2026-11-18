import { mergeAttributes, Node } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';

import DocMentionView from './DocMentionView.vue';

// A mention is a markdown link like `[Absence API](doc:workflow/<id>/api)`.
// The backend gives the LLM this exact form for each workflow and agent.
const MENTION_REGEX =
	/^\[((?:\\.|[^\]\\\n])*)\]\(doc:(workflow|agent)\/([^/\s)]+)\/(api|schedule|event|agent)\)/;
const MENTION_START_REGEX = /\[(?:\\.|[^\]\\\n])*\]\(doc:/;

const escapeTitle = (title: string) => title.replace(/[[\]\\]/g, '\\$&');
const unescapeTitle = (title: string) => title.replace(/\\(.)/g, '$1');

export const DocMention = Node.create({
	name: 'docMention',
	group: 'inline',
	inline: true,
	atom: true,
	selectable: true,

	addAttributes() {
		const attr = (key: string, dataName: string) => ({
			default: '',
			parseHTML: (element: HTMLElement) => element.getAttribute(dataName) ?? '',
			renderHTML: (attributes: Record<string, unknown>) => {
				const value = attributes[key];
				return { [dataName]: typeof value === 'string' ? value : '' };
			},
		});
		return {
			resourceType: attr('resourceType', 'data-resource-type'),
			resourceId: attr('resourceId', 'data-resource-id'),
			kind: attr('kind', 'data-kind'),
			title: {
				default: '',
				parseHTML: (element) => element.textContent ?? '',
				renderHTML: () => ({}),
			},
		};
	},

	parseHTML() {
		return [{ tag: 'span[data-doc-mention]' }];
	},

	renderHTML({ node, HTMLAttributes }) {
		return ['span', mergeAttributes(HTMLAttributes, { 'data-doc-mention': '' }), node.attrs.title];
	},

	addNodeView() {
		return VueNodeViewRenderer(DocMentionView);
	},

	markdownTokenizer: {
		name: 'docMention',
		level: 'inline',
		start: (src) => src.search(MENTION_START_REGEX),
		tokenize: (src) => {
			const match = MENTION_REGEX.exec(src);
			if (!match) return undefined;
			return {
				type: 'docMention',
				raw: match[0],
				title: unescapeTitle(match[1]),
				resourceType: match[2],
				resourceId: match[3],
				kind: match[4],
			};
		},
	},

	parseMarkdown: (token, helpers) =>
		helpers.createNode('docMention', {
			resourceType: token.resourceType,
			resourceId: token.resourceId,
			kind: token.kind,
			title: token.title,
		}),

	renderMarkdown: (node) => {
		const { title, resourceType, resourceId, kind } = node.attrs ?? {};
		return `[${escapeTitle(String(title ?? ''))}](doc:${String(resourceType)}/${String(resourceId)}/${String(kind)})`;
	},
});
