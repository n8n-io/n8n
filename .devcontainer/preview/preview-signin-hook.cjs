/**
 * One-click sign-in for preview instances. Loaded through EXTERNAL_HOOK_FILES by
 * scripts/preview-serve.mjs, so it is never part of a packaged n8n.
 *
 * The route performs an ordinary login on the visitor's behalf: it calls
 * /rest/login with the preview instance's own seeded credentials and forwards the
 * session cookie that endpoint returns. The visitor gets exactly the session a
 * normal sign-in would give them, so this is a convenience over the login form
 * rather than a different way in.
 *
 * Only enable this on a throwaway instance whose port is org-visible. It refuses to
 * register unless N8N_PREVIEW_SIGNIN is exactly "1", so loading the file by
 * accident does nothing.
 *
 * Calling /rest/login rather than AuthService keeps this working across changes to
 * n8n's internals, and means it can never grant more than a real login would.
 *
 * Two things make the route reachable:
 *  - `n8n.ready` fires after configure(), so the SPA catch-all is already
 *    registered. N8N_ADDITIONAL_NON_UI_ROUTES must list this path, or
 *    historyApiHandler answers with index.html before the route is reached.
 *  - the handler is registered on server.app, which AbstractServer exposes.
 */
const ROUTE = '/preview-signin';

module.exports = {
	n8n: {
		ready: [
			async function previewSignin(server) {
				if (process.env.N8N_PREVIEW_SIGNIN !== '1') return;

				const email = process.env.PREVIEW_OWNER_EMAIL;
				const password = process.env.PREVIEW_OWNER_PASSWORD;
				if (!email || !password) {
					console.warn(
						`[preview-signin] PREVIEW_OWNER_EMAIL or PREVIEW_OWNER_PASSWORD is unset — ${ROUTE} not registered`,
					);
					return;
				}

				const port = process.env.N8N_PORT ?? '5678';

				server.app.get(ROUTE, async (_req, res) => {
					const fallback = `Sign in as ${email} instead.`;
					try {
						const login = await fetch(`http://127.0.0.1:${port}/rest/login`, {
							method: 'POST',
							headers: { 'content-type': 'application/json' },
							body: JSON.stringify({ emailOrLdapLoginId: email, password }),
							signal: AbortSignal.timeout(15_000),
						});

						if (!login.ok) {
							res
								.status(502)
								.type('text')
								.send(`Preview sign-in failed: /rest/login returned ${login.status}. ${fallback}`);
							return;
						}

						// Hand the browser exactly the cookies the login endpoint issued.
						const cookies = login.headers.getSetCookie();
						if (cookies.length === 0) {
							res
								.status(502)
								.type('text')
								.send(`Preview sign-in failed: no session cookie was issued. ${fallback}`);
							return;
						}
						res.setHeader('set-cookie', cookies);
						res.redirect('/');
					} catch (error) {
						res.status(502).type('text').send(`Preview sign-in failed: ${error.message}. ${fallback}`);
					}
				});

				console.log(`[preview-signin] ${ROUTE} is live — it signs the visitor in as ${email}`);
			},
		],
	},
};
