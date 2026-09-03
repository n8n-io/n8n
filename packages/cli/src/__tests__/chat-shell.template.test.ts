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
	});
});
