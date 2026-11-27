import type { Message } from 'chat';

import { loadChatSdk } from './esm-loader';

/** Keep links and, for Slack, code delimiters that the SDK plain-text projection removes. */
export async function getInboundMessageText(
	message: Message<unknown>,
	{ preserveCode = false } = {},
): Promise<string> {
	if (!message.formatted) return message.text;
	const { isLinkNode, paragraph, root, stringifyMarkdown, text, toPlainText, walkAst } =
		await loadChatSdk();
	// Keep the supplied text when the adapter does not use the SDK projection.
	if (toPlainText(message.formatted) !== message.text) return message.text;
	const formatted = walkAst(structuredClone(message.formatted), (node) => {
		if (preserveCode && node.type === 'code') {
			return text(stringifyMarkdown(root([node])).trimEnd());
		}
		if (preserveCode && node.type === 'inlineCode') {
			return text(stringifyMarkdown(root([paragraph([node])])).trimEnd());
		}
		if (!isLinkNode(node)) return node;
		const label = toPlainText(root([node]));
		// Keep GFM autolinks because their labels already contain the URL.
		if ([label, `http://${label}`, `mailto:${label}`].includes(node.url)) return node;
		return text(`[${label}](${node.url})`);
	});
	return toPlainText(formatted);
}
