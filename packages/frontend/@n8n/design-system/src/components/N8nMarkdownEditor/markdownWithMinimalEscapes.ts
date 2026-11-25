import {
	callOrReturn,
	encodeHtmlEntities,
	getExtensionField,
	type JSONContent,
} from '@tiptap/core';
import { Markdown, type MarkdownManager } from '@tiptap/markdown';

function isLiteralText(text: string, manager: MarkdownManager) {
	const blocks = manager.parse(text).content;
	const content = blocks?.[0]?.content;
	return (
		blocks?.length === 1 &&
		blocks[0].type === 'paragraph' &&
		content?.every((node) => node.type === 'text' && !node.marks?.length) &&
		content.map((node) => node.text).join('') === text
	);
}

function escapeText(
	text: string,
	manager: MarkdownManager,
	escapeStart = false,
	escapeEnd = false,
	escapeLinkBrackets = false,
): string {
	if (escapeLinkBrackets) {
		// Keep existing escapes and protect the closing delimiter of a link label.
		return escapeText(text, manager, escapeStart, escapeEnd).replace(/\\[\s\S]|]/g, (token) =>
			token === ']' ? '\\]' : token,
		);
	}

	// Literal delimiters must not join the markup of an adjacent mark.
	if (escapeStart && /^[\\`*_[\]~]/.test(text)) {
		return `\\${text.charAt(0)}${escapeText(text.slice(1), manager, false, escapeEnd)}`;
	}
	if (escapeEnd && /[\\`*_[\]~]$/.test(text)) {
		return `${escapeText(text.slice(0, -1), manager)}\\${text.slice(-1)}`;
	}
	const tokens = manager.instance.Lexer.lexInline(text, manager.instance.defaults);
	if (tokens.some((token) => token.type === 'html') && isLiteralText(text, manager)) return text;

	return tokens
		.map((token) => {
			if (token.type === 'link' && token.raw === token.text) return token.raw;
			if (token.type === 'text') {
				return token.raw.replace(/&(?:lt|gt|quot|amp);/g, encodeHtmlEntities);
			}

			if (token.type === 'html') {
				if (isLiteralText(`Before ${token.raw} after`, manager)) {
					return token.raw;
				}
			}

			return encodeHtmlEntities(token.raw).replace(/([\\`*_[\]~])/g, '\\$1');
		})
		.join('')
		.replace(/(^|\n)([ \t]{0,3})\*(?=\s|$)/g, '$1$2\\*')
		.replace(/(^|\n)>/g, '$1\\>');
}

export const MarkdownWithMinimalEscapes = Markdown.extend({
	onBeforeCreate(event) {
		this.parent?.(event);
		const manager = this.editor.markdown;
		if (!manager) return;

		const codeTypes = new Set(
			this.editor.extensionManager.extensions
				.filter((extension) => callOrReturn(getExtensionField(extension, 'code')))
				.map((extension) => extension.name),
		);
		const isCode = (node: JSONContent, parent?: JSONContent) =>
			(parent?.type !== undefined && codeTypes.has(parent.type)) ||
			node.marks?.some((mark) => codeTypes.has(mark.type));
		const renderNode = manager.renderNodeToMarkdown.bind(manager);
		manager.renderNodeToMarkdown = (node, parent, ...args) =>
			node.type === 'text' && !isCode(node, parent)
				? escapeText(
						node.text ?? '',
						manager,
						!!node.marks?.length,
						!!node.marks?.length,
						node.marks?.some((mark) => mark.type === 'link'),
					)
				: renderNode(node, parent, ...args);
		const renderNodes = manager.renderNodes.bind(manager);

		// Tiptap handles text before extension renderers. Bypass its blanket text encoder.
		manager.renderNodes = (nodes, parent, ...args) => {
			if (
				!Array.isArray(nodes) ||
				!nodes.some((node) => node.type === 'text' && !isCode(node, parent))
			) {
				return renderNodes(nodes, parent, ...args);
			}

			let prefix = 'n8nMarkdownText';
			const json = JSON.stringify(nodes);
			while (json.includes(prefix)) prefix += 'x';
			const replacements: string[] = [];

			const protectText = (node: JSONContent, index: number): JSONContent => {
				if (node.type === 'text' && node.text && !isCode(node, parent)) {
					return {
						...node,
						// Keep edge spaces so Tiptap can place mark delimiters correctly.
						text: node.text.replace(/\S[\s\S]*\S|\S/g, (text) => {
							const placeholder = `${prefix}${replacements.length}End`;
							replacements.push(
								escapeText(
									text,
									manager,
									!!node.marks?.length ||
										(!!nodes[index - 1]?.marks?.length && node.text?.startsWith(text)),
									!!node.marks?.length ||
										(!!nodes[index + 1]?.marks?.length && node.text?.endsWith(text)),
									node.marks?.some((mark) => mark.type === 'link'),
								),
							);
							return placeholder;
						}),
					};
				}

				return node;
			};

			// Restore text before parent renderers format tables or indent lists.
			return renderNodes(nodes.map(protectText), parent, ...args).replace(
				new RegExp(`${prefix}(\\d+)End`, 'g'),
				(_placeholder, index: string) => replacements[Number(index)],
			);
		};
	},
});
