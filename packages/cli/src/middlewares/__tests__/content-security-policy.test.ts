import express from 'express';
import request from 'supertest';

import type { ContentSecurityPolicies } from '@/security/content-security-policy';

import { createContentSecurityPolicyMiddleware } from '../content-security-policy';

const ENFORCED = 'content-security-policy';
const REPORT_ONLY = 'content-security-policy-report-only';

const setupApp = (policies: ContentSecurityPolicies) => {
	const app = express();
	app.use(createContentSecurityPolicyMiddleware(policies));

	app.get('/page', (_req, res) => {
		res.type('html').send(`<script nonce="${res.locals.cspNonce}"></script>`);
	});

	app.get('/api', (_req, res) => {
		res.json({ ok: true });
	});

	app.get('/sandboxed', (_req, res) => {
		res.setHeader('Content-Security-Policy', 'sandbox allow-scripts');
		res.type('html').send('<p>sandboxed</p>');
	});

	// Handlers that pass their headers to `writeHead` rather than setting them on `res`,
	// as the streaming webhook and chat responses do.
	app.get('/raw-page', (_req, res) => {
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end(`<script nonce="${res.locals.cspNonce}"></script>`);
	});

	app.get('/raw-page-with-status-message', (_req, res) => {
		res.writeHead(200, 'OK', { 'Content-Type': 'text/html' });
		res.end('<p>page</p>');
	});

	app.get('/raw-sandboxed', (_req, res) => {
		res.writeHead(200, {
			'Content-Type': 'text/html',
			'Content-Security-Policy': 'sandbox allow-scripts',
		});
		res.end('<p>sandboxed</p>');
	});

	app.get('/raw-stream', (_req, res) => {
		res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
		res.end('{"ok":true}');
	});

	return app;
};

const nonceOf = (header: string) => /'nonce-([^']+)'/.exec(header)?.[1];

describe('createContentSecurityPolicyMiddleware', () => {
	describe('enforced policy', () => {
		const app = setupApp({ enforced: "script-src <nonce> 'strict-dynamic'" });

		it('should serve the policy on an HTML response', async () => {
			const response = await request(app).get('/page');

			expect(response.headers[ENFORCED]).toMatch(/^script-src 'nonce-[\w-]+' 'strict-dynamic'$/);
			expect(response.headers[REPORT_ONLY]).toBeUndefined();
		});

		it('should serve the nonce that the page used for its scripts', async () => {
			const response = await request(app).get('/page');

			expect(response.text).toContain(`nonce="${nonceOf(response.headers[ENFORCED])}"`);
		});

		it('should serve a different nonce on every request', async () => {
			const [first, second] = await Promise.all([
				request(app).get('/page'),
				request(app).get('/page'),
			]);

			expect(nonceOf(first.headers[ENFORCED])).not.toBe(nonceOf(second.headers[ENFORCED]));
		});

		it('should not serve a policy on a non-HTML response', async () => {
			const response = await request(app).get('/api');

			expect(response.headers[ENFORCED]).toBeUndefined();
			expect(response.headers[REPORT_ONLY]).toBeUndefined();
		});

		it('should leave a response that sets its own policy untouched', async () => {
			const response = await request(app).get('/sandboxed');

			expect(response.headers[ENFORCED]).toBe('sandbox allow-scripts');
			expect(response.headers[REPORT_ONLY]).toBeUndefined();
		});
	});

	describe('headers passed to writeHead instead of set on the response', () => {
		const app = setupApp({ enforced: "script-src <nonce> 'strict-dynamic'" });

		it('should serve the policy when writeHead carries the html content type', async () => {
			const response = await request(app).get('/raw-page');

			expect(response.headers[ENFORCED]).toMatch(/^script-src 'nonce-[\w-]+' 'strict-dynamic'$/);
			expect(response.text).toContain(`nonce="${nonceOf(response.headers[ENFORCED])}"`);
		});

		it('should serve the policy when writeHead also carries a status message', async () => {
			const response = await request(app).get('/raw-page-with-status-message');

			expect(response.headers[ENFORCED]).toMatch(/^script-src 'nonce-[\w-]+' 'strict-dynamic'$/);
		});

		it('should leave a policy that writeHead carries untouched', async () => {
			const response = await request(app).get('/raw-sandboxed');

			expect(response.headers[ENFORCED]).toBe('sandbox allow-scripts');
		});

		it('should not serve a policy when writeHead carries a non-html content type', async () => {
			const response = await request(app).get('/raw-stream');

			expect(response.headers[ENFORCED]).toBeUndefined();
			expect(response.headers[REPORT_ONLY]).toBeUndefined();
		});
	});

	describe('report-only policy', () => {
		const app = setupApp({ reportOnly: 'script-src <nonce>' });

		it('should serve the policy report-only and not enforce it', async () => {
			const response = await request(app).get('/page');

			expect(response.headers[REPORT_ONLY]).toMatch(/^script-src 'nonce-[\w-]+'$/);
			expect(response.headers[ENFORCED]).toBeUndefined();
		});

		it('should not report on a response that sets its own policy', async () => {
			const response = await request(app).get('/sandboxed');

			expect(response.headers[REPORT_ONLY]).toBeUndefined();
		});
	});

	describe('enforced and report-only policies together', () => {
		const app = setupApp({
			enforced: "script-src <nonce> 'strict-dynamic'",
			reportOnly: "script-src <nonce>; object-src 'none'",
		});

		it('should serve both headers with the same nonce', async () => {
			const response = await request(app).get('/page');

			const enforced = response.headers[ENFORCED];
			const reportOnly = response.headers[REPORT_ONLY];

			expect(enforced).toContain("'strict-dynamic'");
			expect(reportOnly).toContain("object-src 'none'");
			expect(nonceOf(enforced)).toBe(nonceOf(reportOnly));
			expect(response.text).toContain(`nonce="${nonceOf(enforced)}"`);
		});
	});

	describe('policy without a nonce placeholder', () => {
		const app = setupApp({ enforced: "script-src 'self'" });

		it('should serve the policy as configured', async () => {
			const response = await request(app).get('/page');

			expect(response.headers[ENFORCED]).toBe("script-src 'self'");
		});
	});

	// `Server` installs this middleware only after `AbstractServer` has registered the
	// webhook and form routes, so those pages never reach it. That ordering is what keeps
	// the instance policy off HTML a workflow author wrote - including when the `sandbox`
	// policy is switched off and such a page carries no policy of its own to defer to.
	describe('routes registered before the middleware', () => {
		const app = express();

		// Stands in for a form or webhook page served with `N8N_INSECURE_DISABLE_*_SANDBOX`
		// on: HTML that sets no policy at all.
		app.get('/webhook/unsandboxed', (_req, res) => {
			res.type('html').send('<p>author HTML</p>');
		});

		app.use(createContentSecurityPolicyMiddleware({ enforced: "script-src 'self'" }));

		app.get('/page', (_req, res) => {
			res.type('html').send('<p>page</p>');
		});

		it('should serve no policy, even on an HTML response that sets none', async () => {
			const response = await request(app).get('/webhook/unsandboxed');

			expect(response.headers[ENFORCED]).toBeUndefined();
			expect(response.headers[REPORT_ONLY]).toBeUndefined();
		});

		it('should still serve the policy on a route registered after it', async () => {
			const response = await request(app).get('/page');

			expect(response.headers[ENFORCED]).toBe("script-src 'self'");
		});
	});
});
