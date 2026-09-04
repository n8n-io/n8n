import express from 'express';
import request from 'supertest';

import { TEMPLATES_DIR } from '@/constants';
import { createHandlebarsEngine } from '@/utils/handlebars.util';

const baseView = {
	iframeSrc: '/webhook/abc/chat?n8nShellInner=1',
	sandbox: 'allow-scripts allow-forms allow-modals allow-popups',
};

const withOneMissingAccount = {
	...baseView,
	hasCredentials: true,
	ready: false,
	visitorEmail: 'visitor@example.com',
	barText: '1 account needed to start this chat',
	useDialog: false,
	total: 1,
	connectedCount: 0,
	footerText: '0 of 1 account connected',
	credentials: [
		{
			key: 'cred-1::system-n8n',
			id: 'cred-1',
			name: 'Slack account',
			connected: false,
			initial: 'S',
			resolverId: 'system-n8n',
			authorizationUrl: 'https://n8n.example.com/credentials/cred-1/authorize',
		},
	],
};

const withRefresh = {
	...baseView,
	refreshUrl: '/webhook/abc/chat?n8nChatRefresh=1',
	refreshExpiresIn: 3600,
};

const renderView = async (view: Record<string, unknown>) => {
	const app = express();
	app.engine('handlebars', createHandlebarsEngine());
	app.set('view engine', 'handlebars');
	app.set('views', TEMPLATES_DIR);
	app.get('/', (_req, res) => res.render('chat-shell', view));

	const response = await request(app).get('/');
	return response.text;
};

describe('chat-shell.handlebars', () => {
	it('renders without leaving any placeholder unresolved', async () => {
		const html = await renderView(withOneMissingAccount);

		expect(html).not.toContain('{{');
		expect(html).toContain("data-src='/webhook/abc/chat?n8nShellInner&#x3D;1'");
		expect(html).toContain('1 account needed to start this chat');
	});

	it('owns the session id so a frame reload continues the conversation', async () => {
		const html = await renderView(withOneMissingAccount);

		expect(html).toContain("'n8n-chat-shell/sessionId' + window.location.pathname");
		expect(html).toContain("'#sessionId=' + encodeURIComponent(sessionId)");
		// Keyed by path, so two chats on one instance never share a conversation.
		expect(html).toContain('window.location.pathname');
	});

	it('carries no widget or author code of its own', async () => {
		const html = await renderView(withOneMissingAccount);

		expect(html).not.toContain('cdn.jsdelivr.net');
		expect(html).not.toContain('createChat');
	});

	describe('the sandboxed frame', () => {
		it('gives the frame no origin of its own', async () => {
			const html = await renderView(withOneMissingAccount);

			expect(html).toContain("sandbox='allow-scripts allow-forms allow-modals allow-popups'");
			expect(html).not.toContain('allow-same-origin');
			expect(html).not.toContain('allow-popups-to-escape-sandbox');
		});

		it('renders the frame even when no accounts are needed', async () => {
			const html = await renderView({ ...baseView, hasCredentials: false });

			expect(html).toContain("id='n8n-chat-frame'");
			expect(html).not.toMatch(/<div[^>]*class='connect-bar/);
			expect(html).not.toContain("id='n8n-connect-overlay'");
			// No status signal is posted into the frame either.
			expect(html).not.toContain('n8n-chat:credential-status');
		});
	});

	describe('escaping', () => {
		it.each([
			['the frame src', { iframeSrc: '/chat?x="><img src=x onerror=alert(1)>' }, '<img src=x'],
			[
				'a credential name',
				{ credentials: [{ id: 'c1', initial: 'X', name: '"><script>alert(1)</script>' }] },
				'<script>alert(1)',
			],
			[
				'an authorize URL',
				{
					credentials: [
						{ id: 'c1', initial: 'X', name: 'n', authorizationUrl: '"><script>alert(2)</script>' },
					],
				},
				'<script>alert(2)',
			],
			['the visitor email', { visitorEmail: '"><script>alert(3)</script>' }, '<script>alert(3)'],
			['the bar text', { barText: '"><script>alert(4)</script>' }, '<script>alert(4)'],
			[
				'the refresh URL',
				{ refreshUrl: '/chat?x="><script>alert(5)</script>' },
				'<script>alert(5)',
			],
		])('escapes %s', async (_label, override, breakout) => {
			const html = await renderView({ ...withOneMissingAccount, ...override });

			expect(html).not.toContain(breakout);
			expect(html).toContain('&quot;&gt;');
		});
	});

	describe('the status bar', () => {
		it('offers Connect while an account is outstanding', async () => {
			const html = await renderView(withOneMissingAccount);

			expect(html).toContain('1 account needed to start this chat');
			expect(html).toMatch(/<button[^>]*bar-action/);
			expect(html).toContain('>Connect<');
			expect(html).not.toMatch(/class='connect-bar all-connected/);
		});

		it('switches to a quiet Manage control once every account is connected', async () => {
			const html = await renderView({
				...withOneMissingAccount,
				ready: true,
				connectedCount: 1,
				barText: 'All 1 account connected · ready to chat',
				credentials: [
					{
						id: 'cred-1',
						name: 'Slack account',
						connected: true,
						initial: 'S',
						account: 'visitor@example.com',
						revokeUrl: 'https://n8n.example.com/credentials/cred-1/revoke?resolverId=system-n8n',
					},
				],
			});

			expect(html).toMatch(/class='connect-bar all-connected/);
			expect(html).toContain('>Manage<');
			// The dialog is what carries Disconnect, so Manage has somewhere to land.
			expect(html).toContain('btn-disconnect');
			expect(html).toContain('Connected as visitor@example.com');
		});

		it('keeps the control in test mode while accounts are outstanding', async () => {
			const html = await renderView({
				...withOneMissingAccount,
				testMode: true,
				barText: 'Connect Slack account to start this chat',
			});

			expect(html).toMatch(/<button[^>]*bar-action/);
			expect(html).toContain("data-test-mode='true'");
			expect(html).toContain('Connect Slack account to start this chat');
		});
	});

	describe('the connect dialog', () => {
		it('lists every account with its own authorize link', async () => {
			const html = await renderView({
				...withOneMissingAccount,
				useDialog: true,
				total: 2,
				footerText: '0 of 2 accounts connected',
				credentials: [
					...withOneMissingAccount.credentials,
					{
						id: 'cred-2',
						name: 'Google account',
						connected: false,
						initial: 'G',
						authorizationUrl: 'https://n8n.example.com/credentials/cred-2/authorize',
					},
				],
			});

			expect(html).toContain('Connect your accounts');
			expect(html).toContain('0 of 2 accounts connected');
			expect(html).toContain("data-url='https://n8n.example.com/credentials/cred-1/authorize'");
			expect(html).toContain("data-url='https://n8n.example.com/credentials/cred-2/authorize'");
		});

		it('says to ask the owner when no authorize link could be built', async () => {
			const html = await renderView({
				...withOneMissingAccount,
				credentials: [{ id: 'cred-1', name: 'Slack account', connected: false, initial: 'S' }],
			});

			expect(html).toContain('Ask the workflow owner');
			expect(html).not.toContain('data-url=');
		});
	});

	describe('the token refresh leg', () => {
		// The script is static and reads the endpoint and schedule off the frame's data
		// attributes, so nothing server-supplied enters script context.
		const refreshScript = async (view: Record<string, unknown> = withRefresh) => {
			const html = await renderView(view);
			return html.slice(html.indexOf('<script>'), html.indexOf('</script>'));
		};

		it('passes the endpoint and the schedule as data attributes', async () => {
			const html = await renderView(withRefresh);

			expect(html).toContain("data-refresh-url='/webhook/abc/chat?n8nChatRefresh&#x3D;1'");
			expect(html).toContain("data-refresh-expires-in='3600'");
			expect(await refreshScript()).toContain("getAttribute('data-refresh-url')");
		});

		it('omits the leg entirely when the shell is rendered without one', async () => {
			const html = await renderView(withOneMissingAccount);

			expect(html).not.toContain('data-refresh-url');
			expect(html).not.toContain('x-n8n-chat-refresh');
		});

		// The CSRF guard on the leg: a custom header needs a preflight no other origin
		// gets past.
		it('asks for a token with the custom header and no cache', async () => {
			const src = await refreshScript();

			expect(src).toContain("'x-n8n-chat-refresh': '1'");
			expect(src).toContain("credentials: 'same-origin'");
			expect(src).toContain("cache: 'no-store'");
		});

		// A port is an object in the frame document's realm, so it dies with that
		// document. Posting at `contentWindow` would hand the next token to whatever
		// author script navigated the frame to.
		it("delivers every token down the frame's port, never at its window", async () => {
			const src = await refreshScript();

			expect(src).toContain("port.postMessage({ type: 'n8n-chat-auth-token'");
			expect(src).not.toContain('frame.contentWindow.postMessage');
		});

		it('accepts the port only from the frame, and only once', async () => {
			const src = await refreshScript();

			expect(src).toContain('event.source !== frame.contentWindow');
			expect(src).toContain('if (latched) return;');
		});

		// A refresh can beat the frame's bootstrap, and the post is one-shot.
		it('holds the newest token until the port arrives', async () => {
			const src = await refreshScript();

			expect(src).toContain('pendingToken = token;');
			expect(src).toContain(
				"port.postMessage({ type: 'n8n-chat-auth-token', token: pendingToken })",
			);
			// If no port ever arrives, reload rather than fall back to the frame's window.
			expect(src).toContain('portTimer = setTimeout(portMissing, 10000);');
		});

		it('retries once and then reloads exactly once', async () => {
			const src = await refreshScript();

			expect(src).toContain('refresh(true)');
			expect(src).toContain('window.location.reload()');
			expect(src).toContain('if (reloaded) return;');
		});

		// The whole point of the httpOnly cookie: the refresh token exists in no document.
		it('carries no refresh token', async () => {
			const html = await renderView(withRefresh);

			expect(html).not.toContain('refreshToken');
			expect(html).not.toContain('n8n-chat-oauth-refresh');
		});
	});

	it('uses no inline event handlers', async () => {
		const html = await renderView(withOneMissingAccount);

		expect(html).not.toMatch(/\son\w+=['"]/);
	});

	describe('the inline script keeps its security gates', () => {
		const script = async () => {
			const html = await renderView(withOneMissingAccount);
			return html.slice(html.lastIndexOf('<script>'));
		};

		it('trusts a connect signal only from the popup it opened', async () => {
			expect(await script()).toContain('event.source !== pendingPopup');
		});

		it('refuses to open a popup at a non-http scheme', async () => {
			expect(await script()).toContain('/^https?:\\/\\//i.test(url)');
		});

		it('never forces readiness in test mode', async () => {
			const src = await script();

			expect(src).toContain('ready: total <= count');
			expect(src).not.toContain('TEST_MODE || total <= count');
		});

		it('surfaces a failed or cancelled attempt', async () => {
			const src = await script();

			expect(src).toContain("'Connection failed \u00b7 try again'");
			expect(src).toContain("sub.classList.add('error')");
			expect(src).toContain('if (!pendingPopup || pendingPopup.closed) onErrorSignal()');
		});

		it('carries the credential id on each row, so a rejection can find it', async () => {
			expect(await renderView(withOneMissingAccount)).toContain("data-id='cred-1'");
		});
	});

	/**
	 * Runs the rendered connect-bar script against a fake DOM. Asserting on its source
	 * cannot tell whether the reconciliation works, and this bar is a trust boundary:
	 * the frame is sandboxed and everything it sends is suspect.
	 */
	describe('send-gate rejection from the frame', () => {
		type Row = {
			getAttribute: (key: string) => string | null;
			setAttribute: (key: string, value: string) => void;
			removeAttribute: (key: string) => void;
			[key: string]: unknown;
		};

		function makeElement(attrs: Record<string, string> = {}): Row {
			const own = { ...attrs };
			const element: Row = {
				getAttribute: (key: string) => (key in own ? own[key] : null),
				setAttribute: (key: string, value: string) => {
					own[key] = value;
				},
				removeAttribute: (key: string) => {
					delete own[key];
				},
				classes: new Set<string>(),
				classList: {
					add(name: string) {
						(this as unknown as { owner: { classes: Set<string> } }).owner.classes.add(name);
					},
					remove(name: string) {
						(this as unknown as { owner: { classes: Set<string> } }).owner.classes.delete(name);
					},
					contains: () => false,
				},
				querySelector: () => null,
				querySelectorAll: () => [],
				addEventListener: () => {},
				replaceWith: () => {},
				style: {},
			};
			(element.classList as { owner?: Row }).owner = element;
			return element;
		}

		async function runBarScript() {
			const html = await renderView({
				...baseView,
				hasCredentials: true,
				ready: true,
				useDialog: false,
				total: 2,
				connectedCount: 2,
				credentials: [
					{ key: 'cred-1::system-n8n', id: 'cred-1', name: 'Slack account', connected: true },
					{ key: 'cred-2::system-n8n', id: 'cred-2', name: 'Gmail account', connected: true },
				],
			});
			const source = html.slice(html.lastIndexOf('<script>') + '<script>'.length);
			const js = source.slice(0, source.indexOf('</script>'));

			const rows = [
				makeElement({
					'data-row-key': 'cred-1::system-n8n',
					'data-id': 'cred-1',
					'data-connected': 'true',
				}),
				makeElement({
					'data-row-key': 'cred-2::system-n8n',
					'data-id': 'cred-2',
					'data-connected': 'true',
				}),
			];

			const posted: Array<Record<string, unknown>> = [];
			const frame = {
				...makeElement(),
				contentWindow: { postMessage: (message: Record<string, unknown>) => posted.push(message) },
			};
			const bar = makeElement({ 'data-test-mode': 'false', 'data-use-dialog': 'false' });
			const overlay = makeElement();
			const byId: Record<string, Row> = {
				'n8n-chat-frame': frame,
				'n8n-connect-bar': bar,
				'n8n-connect-overlay': overlay,
			};

			const listeners: Array<(event: unknown) => void> = [];
			const doc = {
				getElementById: (id: string) => byId[id] ?? makeElement(),
				querySelector: () => makeElement(),
				querySelectorAll: (selector: string) => {
					if (selector === '.cred-row') return rows;
					const key = /data-row-key="([^"]+)"/.exec(selector)?.[1];
					return key ? rows.filter((row) => row.getAttribute('data-row-key') === key) : [];
				},
				addEventListener: () => {},
				createElement: () => makeElement(),
				body: makeElement(),
			};
			const win = {
				addEventListener: (type: string, fn: (event: unknown) => void) => {
					if (type === 'message') listeners.push(fn);
				},
				removeEventListener: () => {},
				location: { reload: () => {}, href: '' },
				parent: {},
				open: () => null,
			};

			// The script names these as globals; passing them as parameters keeps the
			// real Node globals out of its reach.
			// eslint-disable-next-line @typescript-eslint/no-implied-eval
			new Function(
				'window',
				'document',
				'setTimeout',
				'setInterval',
				'clearTimeout',
				'clearInterval',
				'fetch',
				'MessageChannel',
				js,
			)(
				win,
				doc,
				() => 0,
				() => 0,
				() => {},
				() => {},
				async () => await Promise.resolve(new Response('{}')),
				class {},
			);

			function send(data: unknown, source: unknown = frame.contentWindow) {
				posted.length = 0;
				listeners.forEach((fn) => fn({ source, data }));
				return posted;
			}

			return { rows, send, posted, overlay };
		}

		async function runSingleAccountBarScript() {
			const html = await renderView({
				...baseView,
				hasCredentials: true,
				ready: false,
				useDialog: false,
				total: 1,
				connectedCount: 0,
				credentials: [
					{
						key: 'cred-1::system-n8n',
						id: 'cred-1',
						name: 'Slack account',
						connected: false,
						authorizationUrl: 'https://n8n.example.com/credentials/cred-1/authorize',
					},
				],
			});
			const source = html.slice(html.lastIndexOf('<script>') + '<script>'.length);
			const js = source.slice(0, source.indexOf('</script>'));

			const connectButton = makeElement({
				'data-url': 'https://n8n.example.com/credentials/cred-1/authorize',
			});
			const row = makeElement({ 'data-row-key': 'cred-1::system-n8n', 'data-id': 'cred-1' });
			row.querySelector = (selector: string) => (selector === '.connect' ? connectButton : null);

			const posted: Array<Record<string, unknown>> = [];
			const frame = {
				...makeElement(),
				contentWindow: { postMessage: (message: Record<string, unknown>) => posted.push(message) },
			};
			const bar = makeElement({ 'data-test-mode': 'false', 'data-use-dialog': 'false' });
			const overlay = makeElement();
			const byId: Record<string, Row> = {
				'n8n-chat-frame': frame,
				'n8n-connect-bar': bar,
				'n8n-connect-overlay': overlay,
			};

			const listeners: Array<(event: unknown) => void> = [];
			const opened: string[] = [];
			const doc = {
				getElementById: (id: string) => byId[id] ?? makeElement(),
				querySelector: (selector: string) => (selector === '.cred-row' ? row : makeElement()),
				querySelectorAll: (selector: string) => (selector === '.cred-row' ? [row] : []),
				addEventListener: () => {},
				createElement: () => makeElement(),
				body: makeElement(),
			};
			const win = {
				addEventListener: (type: string, fn: (event: unknown) => void) => {
					if (type === 'message') listeners.push(fn);
				},
				removeEventListener: () => {},
				location: { reload: () => {}, href: '' },
				parent: {},
				open: (url: string) => {
					opened.push(url);
					return null;
				},
			};

			// eslint-disable-next-line @typescript-eslint/no-implied-eval
			new Function(
				'window',
				'document',
				'setTimeout',
				'setInterval',
				'clearTimeout',
				'clearInterval',
				'fetch',
				'MessageChannel',
				js,
			)(
				win,
				doc,
				() => 0,
				() => 0,
				() => {},
				() => {},
				async () => await Promise.resolve(new Response('{}')),
				class {},
			);

			function send(data: unknown, source: unknown = frame.contentWindow) {
				opened.length = 0;
				listeners.forEach((fn) => fn({ source, data }));
				return opened;
			}

			return { overlay, opened, send };
		}

		const rejection = (ids: unknown) => ({ type: 'n8n-chat-credentials-rejected', ids });

		it('flips only the account the gate named, and re-signals the frame', async () => {
			const { rows, send } = await runBarScript();

			const posted = send(rejection(['cred-1']));

			expect(rows[0].getAttribute('data-connected')).toBeNull();
			expect(rows[1].getAttribute('data-connected')).toBe('true');
			expect(posted).toEqual([
				{ type: 'n8n-chat:credential-status', ready: false, missingCount: 1, testMode: false },
			]);
		});

		it.each([
			['an id the server never rendered', rejection(['not-a-row'])],
			['a prototype key as an id', rejection(['__proto__'])],
			['a constructor key as an id', rejection(['constructor'])],
			['ids that are not strings', rejection([{}, 42, null])],
			['ids that are not an array', rejection('cred-1')],
			['a message of another type', { type: 'something-else', ids: ['cred-1'] }],
		])('ignores %s', async (_label, data) => {
			const { rows, send } = await runBarScript();

			const posted = send(data);

			expect(rows[0].getAttribute('data-connected')).toBe('true');
			expect(posted).toEqual([]);
		});

		it('ignores a rejection that did not come from the frame', async () => {
			const { rows, send } = await runBarScript();

			const posted = send(rejection(['cred-1']), { notTheFrame: true });

			expect(rows[0].getAttribute('data-connected')).toBe('true');
			expect(posted).toEqual([]);
		});

		it('opens the connect panel when the frame refuses a send', async () => {
			const { overlay, send } = await runBarScript();

			send({ type: 'n8n-chat-connect-requested' });

			expect([...(overlay.classes as Set<string>)]).toContain('open');
		});

		it('opens the panel only for the frame', async () => {
			const { overlay, send } = await runBarScript();

			send({ type: 'n8n-chat-connect-requested' }, { notTheFrame: true });

			expect([...(overlay.classes as Set<string>)]).not.toContain('open');
		});

		it('opens the dialog for a single missing account too, since a message from the frame is never a real click', async () => {
			const { overlay, opened, send } = await runSingleAccountBarScript();

			send({ type: 'n8n-chat-connect-requested' });

			expect(opened).toEqual([]);
			expect([...(overlay.classes as Set<string>)]).toContain('open');
		});

		it('never marks an account connected, whatever the frame sends', async () => {
			const { rows, send } = await runBarScript();

			send(rejection(['cred-1']));
			expect(rows[0].getAttribute('data-connected')).toBeNull();

			// No message can undo it: this path only ever disconnects.
			send(rejection(['cred-1']));
			expect(rows[0].getAttribute('data-connected')).toBeNull();
		});
	});
});
