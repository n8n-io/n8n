// Chat widget of the `agent-chat` block. Relies on window.n8nApp (app.js) for
// the access token; holds nothing itself. History lasts one page load.
(function () {
	'use strict';

	const READY_ATTRIBUTE = 'data-app-chat-ready';

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
						assistant.textContent += event.delta;
						messages.scrollTop = messages.scrollHeight;
					} else if (event.type === 'error') {
						bubble('notice', event.message);
					} else if (event.type === 'done' && event.sessionId) {
						threadId = event.sessionId;
					}
				});
				if (!assistant.textContent) assistant.remove();
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

	for (const root of document.querySelectorAll('[data-app-chat]')) init(root);
})();
