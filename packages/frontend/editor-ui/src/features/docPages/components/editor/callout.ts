import { mergeAttributes, Node } from '@tiptap/core';

export const CALLOUT_VARIANTS = ['note', 'tip', 'warning'] as const;
export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];

const isCalloutVariant = (value: unknown): value is CalloutVariant =>
	CALLOUT_VARIANTS.some((variant) => variant === value);

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		callout: {
			setCallout: (variant: CalloutVariant) => ReturnType;
		};
	}
}

// A GitHub alert: "> [!note]" on the first quote line, then the quoted body.
const CALLOUT_REGEX =
	/^ {0,3}> ?\[!(note|tip|warning)\][ \t]*([^\n]*)(?:\n|$)((?: {0,3}>[^\n]*(?:\n|$))*)/i;
const CALLOUT_START_REGEX = /^ {0,3}> ?\[!(note|tip|warning)\]/im;

export const Callout = Node.create({
	name: 'callout',
	group: 'block',
	content: 'block+',
	defining: true,

	addAttributes() {
		return {
			variant: {
				default: 'note',
				parseHTML: (element) => {
					const variant = element.getAttribute('data-variant');
					return isCalloutVariant(variant) ? variant : 'note';
				},
				renderHTML: (attributes) => ({ 'data-variant': attributes.variant }),
			},
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-callout]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '' }), 0];
	},

	addCommands() {
		return {
			setCallout:
				(variant) =>
				({ commands }) =>
					commands.wrapIn(this.name, { variant }),
		};
	},

	markdownTokenizer: {
		name: 'callout',
		level: 'block',
		start: (src) => src.search(CALLOUT_START_REGEX),
		tokenize: (src, _tokens, lexer) => {
			const match = CALLOUT_REGEX.exec(src);
			if (!match) return undefined;

			const [raw, variant, firstLine, rest] = match;
			const body = rest.replace(/^ {0,3}> ?/gm, '');
			const inner = firstLine ? `${firstLine}\n${body}` : body;

			return {
				type: 'callout',
				raw,
				variant: variant.toLowerCase(),
				tokens: lexer.blockTokens(inner),
			};
		},
	},

	parseMarkdown: (token, helpers) => {
		const children = helpers.parseChildren(token.tokens ?? []);
		return helpers.createNode(
			'callout',
			{ variant: isCalloutVariant(token.variant) ? token.variant : 'note' },
			children.length > 0 ? children : [{ type: 'paragraph' }],
		);
	},

	renderMarkdown: (node, helpers) => {
		const variant = isCalloutVariant(node.attrs?.variant) ? node.attrs.variant : 'note';
		const body = helpers.renderChildren(node.content ?? [], '\n\n');
		return [`[!${variant}]`, ...body.split('\n')]
			.map((line) => (line.trim() === '' ? '>' : `> ${line}`))
			.join('\n');
	},
});
