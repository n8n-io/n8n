// Chat widget of the `agent-chat` block. Relies on window.n8nApp (app.js) for
// the access token; holds nothing itself. History lasts one page load.
(function () {
	'use strict';

	const READY_ATTRIBUTE = 'data-app-chat-ready';

	// ponytail: a fixed markdown subset (headings, lists, quotes, rules, code,
	// bold, italic, links) is what an agent reply uses; swap in a real parser if
	// tables or footnotes are ever needed. The text is escaped before a single
	// tag is produced, so a reply cannot inject HTML.

	const LINK_PROTOCOLS = ['http:', 'https:', 'mailto:'];

	// Marks the code held back while the rest is parsed: a block of its own, or
	// inline. Neither character can occur in the escaped text.
	const BLOCK_MARK = '\u0000';
	const INLINE_MARK = '\u0001';
	const HELD = /[\u0000\u0001](\d+)[\u0000\u0001]/g;
	const HELD_BLOCK = /^\u0000\d+\u0000$/;

	const escapeHtml = (text) =>
		text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

	const safeHref = (url) => {
		try {
			return LINK_PROTOCOLS.includes(new URL(url, 'https://n8n.invalid').protocol) ? url : null;
		} catch {
			return null;
		}
	};

	const renderInline = (text) =>
		text
			.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
			.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
			.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
				const href = safeHref(url);
				return href
					? '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + label + '</a>'
					: match;
			});

	const renderBlocks = (text) => {
		const html = [];
		const paragraph = [];
		let open = null;
		const closeParagraph = () => {
			if (!paragraph.length) return;
			html.push('<p>' + renderInline(paragraph.join('<br>')) + '</p>');
			paragraph.length = 0;
		};
		const close = () => {
			closeParagraph();
			if (open) html.push('</' + open + '>');
			open = null;
		};
		const push = (tag, content) => {
			closeParagraph();
			if (open !== tag) {
				if (open) html.push('</' + open + '>');
				html.push('<' + tag + '>');
				open = tag;
			}
			html.push(content);
		};

		for (const line of text.split('\n')) {
			const trimmed = line.trim();
			const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
			const bullet = /^[-*+]\s+(.+)$/.exec(trimmed);
			const ordered = /^\d+[.)]\s+(.+)$/.exec(trimmed);
			const quote = /^&gt;\s?(.*)$/.exec(trimmed);

			if (!trimmed) {
				close();
			} else if (HELD_BLOCK.test(trimmed)) {
				// A code block of its own: it must not end up inside a paragraph.
				close();
				html.push(trimmed);
			} else if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
				close();
				html.push('<hr>');
			} else if (heading) {
				close();
				const level = heading[1].length;
				html.push('<h' + level + '>' + renderInline(heading[2]) + '</h' + level + '>');
			} else if (bullet || ordered) {
				push(bullet ? 'ul' : 'ol', '<li>' + renderInline((bullet || ordered)[1]) + '</li>');
			} else if (quote) {
				push('blockquote', '<p>' + renderInline(quote[1]) + '</p>');
			} else {
				if (open) close();
				paragraph.push(line);
			}
		}
		close();
		return html.join('');
	};

	/** The markdown of an agent reply, as HTML. Safe to assign to `innerHTML`. */
	const renderMarkdown = (text) => {
		const held = [];
		const hold = (mark, html) => mark + (held.push(html) - 1) + mark;
		const codeBlock = (content) => hold(BLOCK_MARK, '<pre><code>' + content + '</code></pre>');

		const parsed = escapeHtml(text)
			.replace(/```[^\n]*\n?([\s\S]*?)```/g, (_match, content) => codeBlock(content))
			// A reply that still streams: the fence that opened has no closing one yet.
			.replace(/```[^\n]*\n?([\s\S]*)$/, (_match, content) => codeBlock(content))
			.replace(/`([^`\n]+)`/g, (_match, content) =>
				hold(INLINE_MARK, '<code>' + content + '</code>'),
			);

		return renderBlocks(parsed).replace(HELD, (_match, index) => held[index]);
	};

	const readEvents = async (response, onEvent) => {
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		for (;;) {
			const { done, value } = await reader.read();
			if (done) return;
			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() || '';
			for (const line of lines) {
				if (!line.startsWith('data: ')) continue;
				try {
					onEvent(JSON.parse(line.slice(6)));
				} catch {}
			}
		}
	};

	const init = (root) => {
		if (root.hasAttribute(READY_ATTRIBUTE)) return;
		root.setAttribute(READY_ATTRIBUTE, '');

		const chatUrl = root.getAttribute('data-chat-url');
		const messages = root.querySelector('[data-app-chat-messages]');
		const form = root.querySelector('form');
		const textarea = form.querySelector('textarea');
		const button = form.querySelector('button');
		let threadId = null;
		let busy = false;

		const bubble = (role, text) => {
			const element = document.createElement('div');
			element.className = 'app-chat-bubble app-chat-bubble--' + role;
			element.textContent = text;
			messages.append(element);
			messages.scrollTop = messages.scrollHeight;
			return element;
		};

		// The reply arrives in deltas, so the bubble keeps the markdown it was sent
		// and renders all of it again on every delta.
		const appendMarkdown = (element, delta) => {
			element.dataset.markdown = (element.dataset.markdown || '') + delta;
			element.innerHTML = renderMarkdown(element.dataset.markdown);
		};

		const setBusy = (value) => {
			busy = value;
			textarea.disabled = value;
			button.disabled = value;
		};

		const send = async (message) => {
			const app = window.n8nApp;
			if (!app || !(await app.ready)) {
				bubble('notice', 'Chat is not available here.');
				return;
			}
			setBusy(true);
			bubble('user', message);
			const assistant = bubble('assistant', '');
			try {
				const response = await app.fetch(chatUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
					body: JSON.stringify(threadId ? { message, threadId } : { message }),
				});
				if (!response.ok) {
					const error = await response.json().catch(() => ({}));
					assistant.remove();
					bubble('notice', error.error || 'Something went wrong');
					return;
				}
				await readEvents(response, (event) => {
					if (event.type === 'text-delta') {
						appendMarkdown(assistant, event.delta);
						messages.scrollTop = messages.scrollHeight;
					} else if (event.type === 'error') {
						bubble('notice', event.message);
					} else if (event.type === 'done' && event.sessionId) {
						threadId = event.sessionId;
					}
				});
				if (!assistant.dataset.markdown) assistant.remove();
			} catch {
				assistant.remove();
				bubble('notice', 'Something went wrong');
			} finally {
				setBusy(false);
				textarea.focus();
			}
		};

		const submit = () => {
			const message = textarea.value.trim();
			if (!message || busy) return;
			textarea.value = '';
			void send(message);
		};

		// Handled here, before the document-level listener of app.js, so the form
		// is never posted as a page form.
		form.addEventListener('submit', (event) => {
			event.preventDefault();
			submit();
		});
		textarea.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' && !event.shiftKey) {
				event.preventDefault();
				submit();
			}
		});
	};

	// The widget's namespace; app-chat-markdown.test.ts renders through it.
	window.n8nAppChat = { renderMarkdown };

	for (const root of document.querySelectorAll('[data-app-chat]')) init(root);
})();
