import type { ChannelPromptBody } from './channelClient';

export function formatPromptForClipboard(body: ChannelPromptBody): string {
	const lines: string[] = [body.prompt.trim(), '', '---', 'Element context:'];

	if (body.file) {
		const loc = body.line ? `:${body.line}${body.col ? `:${body.col}` : ''}` : '';
		lines.push(`- File: ${body.file}${loc}`);
	}
	if (body.component) lines.push(`- Component: ${body.component}`);
	if (body.testid) lines.push(`- Test ID: ${body.testid}`);
	if (body.selector) lines.push(`- Selector: ${body.selector}`);
	if (body.classes?.length) lines.push(`- Classes: ${body.classes.join(', ')}`);
	if (body.outerHtmlSnippet) {
		lines.push('', 'HTML snippet:', '```html', body.outerHtmlSnippet, '```');
	}

	return lines.join('\n');
}
