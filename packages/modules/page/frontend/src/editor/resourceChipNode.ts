import { parseResourcePath } from '@n8n/api-types';
import { Node, type JSONContent } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';

import ResourceChipNodeView from './ResourceChipNodeView.vue';

export const RESOURCE_CHIP_NODE = 'pageResourceChip';

const CHIP_ATTRIBUTE = 'data-page-resource-chip';

/** The `link` mark has priority 1000. A higher priority makes this node read link tokens first. */
const PRIORITY_ABOVE_LINK = 1100;

/** Escapes the characters that would end the text of a markdown link. */
function toMarkdownLinkText(label: string): string {
	return label.replace(/[\\[\]]/g, '\\$&');
}

/** Reverses `toMarkdownLinkText`. */
function fromMarkdownLinkText(text: string): string {
	return text.replace(/\\([\\[\]])/g, '$1');
}

function isResourcePath(href: unknown): href is string {
	return typeof href === 'string' && parseResourcePath(href) !== undefined;
}

/** The editor content of a chip that links to `path` and stores `label` as the link text. */
export function toResourceChipContent(path: string, label: string): JSONContent {
	return { type: RESOURCE_CHIP_NODE, attrs: { href: path, label } };
}

/**
 * Renders a link to an n8n resource as a chip.
 * In markdown the node is the plain link `[label](href)`, in both directions.
 * A link to anything else stays a `link` mark.
 */
export const ResourceChipNode = Node.create({
	name: RESOURCE_CHIP_NODE,
	priority: PRIORITY_ABOVE_LINK,
	group: 'inline',
	inline: true,
	atom: true,
	selectable: true,

	addAttributes() {
		return {
			href: { default: '' },
			label: { default: '' },
		};
	},

	parseHTML() {
		return [
			{
				tag: `a[${CHIP_ATTRIBUTE}]`,
				priority: 60,
				getAttrs: (element) => ({
					href: element.getAttribute('href') ?? '',
					label: element.textContent ?? '',
				}),
			},
		];
	},

	renderHTML({ node }) {
		return ['a', { href: String(node.attrs.href), [CHIP_ATTRIBUTE]: '' }, String(node.attrs.label)];
	},

	renderText({ node }) {
		return String(node.attrs.label);
	},

	markdownTokenName: 'link',

	parseMarkdown(token, helpers) {
		if (isResourcePath(token.href)) {
			return toResourceChipContent(token.href, fromMarkdownLinkText(String(token.text ?? '')));
		}

		// Only the first handler of a token runs, so this node also parses the other links.
		return helpers.applyMark('link', helpers.parseInline(token.tokens ?? []), {
			href: token.href,
			title: token.title ?? null,
		});
	},

	renderMarkdown(node) {
		return `[${toMarkdownLinkText(String(node.attrs?.label ?? ''))}](${String(node.attrs?.href ?? '')})`;
	},

	addNodeView() {
		return VueNodeViewRenderer(ResourceChipNodeView);
	},
});
