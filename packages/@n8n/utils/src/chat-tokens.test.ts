import {
	chatTokensToPlainText,
	formatChatResourceHref,
	formatChatToken,
	listChatTokens,
	parseChatResourceHref,
	splitChatTokens,
} from './chat-tokens';

describe('chat tokens', () => {
	it('formats a token as an inline link', () => {
		expect(formatChatToken({ label: 'Orders', href: 'n8n-resource://workflow/abc' })).toBe(
			'[@Orders](n8n-resource://workflow/abc)',
		);
	});

	it('cleans characters that would end the label or the target early', () => {
		const text = formatChatToken({
			label: 'My [old]\nflow',
			href: 'n8n-resource://workflow/a b(c)',
		});
		expect(text).toBe('[@My old flow](n8n-resource://workflow/a%20b%28c%29)');
		expect(listChatTokens(text)).toEqual([
			{ label: 'My old flow', href: 'n8n-resource://workflow/a%20b%28c%29' },
		]);
	});

	it('splits text into text and tokens in order', () => {
		const text =
			'Do x with [@Foo](n8n-resource://workflow/1) and y with [@Bar](n8n-resource://agent/2).';
		expect(splitChatTokens(text)).toEqual([
			{ type: 'text', text: 'Do x with ' },
			{ type: 'token', label: 'Foo', href: 'n8n-resource://workflow/1' },
			{ type: 'text', text: ' and y with ' },
			{ type: 'token', label: 'Bar', href: 'n8n-resource://agent/2' },
			{ type: 'text', text: '.' },
		]);
	});

	it('leaves normal links and lookalikes as text', () => {
		const text = 'See [@docs](https://docs.n8n.io) and [Orders](n8n-resource://workflow/1)';
		expect(listChatTokens(text)).toEqual([]);
		expect(splitChatTokens(text)).toEqual([{ type: 'text', text }]);
	});

	it('writes tokens as plain @labels', () => {
		expect(chatTokensToPlainText('Fix [@Orders](n8n-resource://workflow/1) now')).toBe(
			'Fix @Orders now',
		);
	});

	it('builds and reads resource targets with encoded ids', () => {
		const href = formatChatResourceHref('node', 'wf/1', 'node 2');
		expect(href).toBe('n8n-resource://node/wf%2F1/node%202');
		expect(parseChatResourceHref(href)).toEqual({ kind: 'node', ids: ['wf/1', 'node 2'] });
		expect(parseChatResourceHref('https://example.com')).toBeUndefined();
		expect(parseChatResourceHref('n8n-resource://workflow')).toBeUndefined();
	});

	it('keeps a target with parentheses the same in a token', () => {
		const href = formatChatResourceHref('agent', 'a(1)');
		expect(href).toBe('n8n-resource://agent/a%281%29');
		expect(listChatTokens(formatChatToken({ label: 'A', href }))).toEqual([{ label: 'A', href }]);
		expect(parseChatResourceHref(href)).toEqual({ kind: 'agent', ids: ['a(1)'] });
	});
});
