import express from 'express';
import request from 'supertest';

import { TEMPLATES_DIR } from '@/constants';
import { createHandlebarsEngine } from '@/utils/handlebars.util';

/**
 * `chat-shell.handlebars` is the hosted chat's trusted page: it holds the sandboxed
 * frame, the credential status bar and the "Connect your accounts" dialog, and it is
 * the only side carrying real authorize/revoke links. Nothing lints a Handlebars
 * view, so these render it through the same engine `AbstractServer` configures.
 *
 * The view model comes from `buildChatShellViewModel` in the ChatTrigger node, which
 * cannot be imported here — a nodes package is not a dependency of the CLI — so the
 * shapes below mirror it.
 */
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
		// Guards against a view model that silently drops fields: an empty one also
		// leaves no placeholders behind. Handlebars escapes `=` in the attribute, which
		// the browser decodes on read, so the frame still requests the intended URL.
		expect(html).toContain("data-src='/webhook/abc/chat?n8nShellInner&#x3D;1'");
		expect(html).toContain('1 account needed to start this chat');
	});

	// The frame's own storage dies with its opaque origin on every reload, so the
	// shell owns the session id and passes it in the fragment. This logic used to be
	// covered in `templates.test.ts`; it moved here with the markup.
	it('owns the session id so a frame reload continues the conversation', async () => {
		const html = await renderView(withOneMissingAccount);

		expect(html).toContain("'n8n-chat-shell/sessionId' + window.location.pathname");
		expect(html).toContain("'#sessionId=' + encodeURIComponent(sessionId)");
		// Keyed by path, so two chats on one instance never share a conversation.
		expect(html).toContain('window.location.pathname');
	});

	// The trusted document carries no author-shaped content: the widget, its
	// stylesheet and the author's CSS all belong to the sandboxed frame.
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
			// Bot replies use target="_blank", so the frame needs allow-popups — but not
			// the escape flag, which would let author script put a real-origin document
			// in front of the visitor.
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

	// Every value here reaches the page from a credential name, a request URL or an
	// OAuth link, so none of it may close an attribute and add markup of its own.
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
		])('escapes %s', async (_label, override, breakout) => {
			const html = await renderView({ ...withOneMissingAccount, ...override });

			expect(html).not.toContain(breakout);
			// Asserted positively too: absence alone would also hold if the value were
			// dropped from the template alrogether.
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

		// Test mode establishes identity from the builder's own credentials, so there is
		// nothing for them to connect.
		// Test mode resolves identity from the builder's own accounts, but the send gate
		// still refuses them when outstanding — so the control has to be there.
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

	// This page sets its own `Content-Security-Policy: frame-ancestors 'none'`, which
	// makes `hasOwnPolicy` short-circuit the instance's `script-src <nonce>` policy —
	// so its inline scripts carry no nonce, exactly as the form shell's do. Keeping it
	// free of inline handlers means adopting a nonce later needs no rewrite.
	it('uses no inline event handlers', async () => {
		const html = await renderView(withOneMissingAccount);

		expect(html).not.toMatch(/\son\w+=['"]/);
	});

	/**
	 * The inline script is neither typechecked nor linted, and `cli` has no jsdom, so
	 * these pin its invariants by inspecting the rendered source. They are weaker than
	 * executing it — they prove the guard is present, not that it works — and each one
	 * marks a regression that reached review.
	 */
	describe('the inline script', () => {
		const script = async (view: Record<string, unknown> = withOneMissingAccount) => {
			const html = await renderView(view);
			return html.slice(html.lastIndexOf('<script>'));
		};

		// The sandboxed frame can nest another frame, whose `source` is neither the
		// frame nor the popup, so excluding the frame alone would let author content
		// fake a connected account and un-gate the visitor's input.
		it('trusts a connect signal only from the popup it opened', async () => {
			expect(await script()).toContain('event.source !== pendingPopup');
		});

		// The platforms the tap toggle exists for have no hover to end.
		it('closes the tooltip on a click elsewhere', async () => {
			expect(await script()).toContain('barInfo.contains(e.target)');
		});

		// The authorize intent is read without being consumed, so a cancelled attempt
		// stays retryable within its TTL and must not dead-end into the dialog.
		it('does not refuse a retry after a failed attempt', async () => {
			expect(await script()).not.toMatch(/&&\s*!failed\[/);
		});

		// The AC requires a visible error, never a silent revert to Connect. Pinned here
		// because a regression that dropped the failure state would otherwise pass.
		it('shows a visible error when a connect fails or is cancelled', async () => {
			const src = await script();

			expect(src).toContain("'Connection failed \u00b7 try again'");
			expect(src).toContain("sub.classList.add('error')");
			// A popup closing with neither signal is treated as a cancelled attempt.
			expect(src).toContain('if (!pendingPopup || pendingPopup.closed) onErrorSignal()');
		});

		// One credential resolves once per distinct fallback resolver, so rows must not
		// share an identity — otherwise connecting one context marks the other ready.
		it('keys row state on the composite row key, not the credential id', async () => {
			const html = await renderView(withOneMissingAccount);

			expect(html).toContain("data-row-key='cred-1::system-n8n'");
			expect(html).not.toContain('data-cred-id');
			expect(await script()).toContain("row.getAttribute('data-row-key')");
		});

		it('refuses to open a popup at a non-http scheme', async () => {
			expect(await script()).toContain('/^https?:\\/\\//i.test(url)');
		});

		// Nothing can open the dialog in test mode, so shipping it would embed live
		// authorize links in unreachable markup.
		// Readiness is never forced true for test mode: claiming it would un-gate an
		// input whose first send the server rejects.
		it('does not claim readiness in test mode', async () => {
			expect(await script()).not.toContain('TEST_MODE || total <= count');
			expect(await script()).toContain('ready: total <= count');
		});

		// Decided server-side from the view model, not recomputed here, so the rule
		// that one account skips the dialog lives in one place.
		it('takes the one-account rule from the server', async () => {
			expect(await script()).toContain("barEl.getAttribute('data-use-dialog')");
			expect(await renderView(withOneMissingAccount)).toContain("data-use-dialog='false'");
		});
	});
});
