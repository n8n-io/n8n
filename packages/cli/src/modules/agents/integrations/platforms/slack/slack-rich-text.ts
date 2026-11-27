import type { Nodes, Root } from 'chat';

type Style = { bold?: true; italic?: true; strike?: true; code?: true };
type Inline =
	| { type: 'text'; text: string; style?: Style }
	| { type: 'link'; url: string; text: string; style?: Style };
type Section = { type: 'rich_text_section' | 'rich_text_preformatted'; elements: Inline[] };
type Block = { type: 'rich_text'; elements: Section[] } | { type: 'markdown'; text: string };

function renderInline(node: Nodes, style?: Style): Inline | undefined {
	switch (node.type) {
		case 'text':
		case 'html':
			return { type: 'text', text: node.value, style };
		case 'inlineCode':
			return { type: 'text', text: node.value, style: { ...style, code: true } };
		case 'break':
			return { type: 'text', text: '\n', style };
		case 'link': {
			if (!/^(https?:\/\/|mailto:)/i.test(node.url) || !URL.canParse(node.url)) return;
			if (!node.children.every((child) => child.type === 'text')) return;
			return {
				type: 'link',
				url: node.url,
				text: node.children.map((child) => child.value).join(''),
				style,
			};
		}
		default:
			return undefined;
	}
}

function renderInlines(nodes: Nodes[], style?: Style): Inline[] | undefined {
	const elements: Inline[] = [];
	for (const node of nodes) {
		const format = { emphasis: 'italic', strong: 'bold', delete: 'strike' } as const;
		if (node.type === 'emphasis' || node.type === 'strong' || node.type === 'delete') {
			const children = renderInlines(node.children, { ...style, [format[node.type]]: true });
			if (!children) return;
			elements.push(...children);
		} else {
			const element = renderInline(node, style);
			if (!element) return;
			const previous = elements.at(-1);
			if (
				element.type === 'text' &&
				previous?.type === 'text' &&
				previous.style === element.style
			) {
				previous.text += element.text;
			} else if (element.text) {
				elements.push(element);
			}
		}
	}
	return elements;
}

function renderSection(node: Root['children'][number]): Section | undefined {
	if (node.type === 'code' && node.value) {
		return { type: 'rich_text_preformatted', elements: [{ type: 'text', text: node.value }] };
	}
	if (node.type === 'paragraph' || node.type === 'heading') {
		const elements = renderInlines(
			node.children,
			node.type === 'heading' ? { bold: true } : undefined,
		);
		if (elements?.length) return { type: 'rich_text_section', elements };
	}
	return undefined;
}

// Use rich text for literal bullets, stars, and backticks. Keep other Markdown structures intact.
export function renderSlackRichText(ast: Root, markdown: string) {
	const blocks: Block[] = [];
	const fallback: string[] = [];
	let hasRichText = false;
	for (const node of ast.children) {
		const previous = blocks.at(-1);
		const section = renderSection(node);
		if (section) {
			hasRichText = true;
			if (previous?.type === 'rich_text') previous.elements.push(section);
			else blocks.push({ type: 'rich_text', elements: [section] });
			fallback.push(
				section.elements
					.map((element) =>
						element.type === 'link' && element.text !== element.url
							? `${element.text} (${element.url})`
							: element.text,
					)
					.join(''),
			);
		} else {
			const start = node.position?.start.offset;
			const end = node.position?.end.offset;
			if (start === undefined || end === undefined) return;
			const text = markdown.slice(start, end);
			if (previous?.type === 'markdown') previous.text += `\n\n${text}`;
			else blocks.push({ type: 'markdown', text });
			fallback.push(text);
		}
	}
	if (!hasRichText || blocks.length > 50) return;
	const text = fallback
		.join('\n\n')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
	return { text, blocks };
}
