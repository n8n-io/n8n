import express from 'express';
import request from 'supertest';

import { TEMPLATES_DIR } from '@/constants';
import { createContentSecurityPolicyMiddleware } from '@/middlewares/content-security-policy';
import { createHandlebarsEngine } from '@/utils/handlebars.util';

/**
 * The pages n8n renders from a handlebars template read the nonce out of `res.locals`
 * as `{{cspNonce}}`. These tests render the real templates through the same view engine
 * `AbstractServer` sets up, so the wiring cannot silently break and leave the scripts on
 * those pages without a nonce.
 */
const TEMPLATES_WITH_SCRIPTS = [
	'oauth-callback',
	'oauth-error-callback',
	'saml-connection-test-success',
	'saml-connection-test-failed',
];

const setupApp = () => {
	const app = express();
	app.engine('handlebars', createHandlebarsEngine());
	app.set('view engine', 'handlebars');
	app.set('views', TEMPLATES_DIR);
	app.use(createContentSecurityPolicyMiddleware({ enforced: 'script-src <nonce>' }));
	app.get('/:template', (req, res) => {
		res.render(req.params.template, { error: { message: 'test' }, message: 'test' });
	});

	return app;
};

describe('handlebars templates', () => {
	const app = setupApp();

	test.each(TEMPLATES_WITH_SCRIPTS)(
		'%s should give its scripts the nonce from the CSP header',
		async (template) => {
			const response = await request(app).get(`/${template}`);

			const nonce = /'nonce-([^']+)'/.exec(response.headers['content-security-policy'])?.[1];

			expect(nonce).toBeDefined();
			expect(response.text).toContain(`nonce="${nonce}"`);
			expect(response.text).not.toContain('{{cspNonce}}');
		},
	);

	test.each(TEMPLATES_WITH_SCRIPTS)(
		'%s should not rely on an inline event handler, which a nonce cannot allow',
		async (template) => {
			const response = await request(app).get(`/${template}`);

			expect(response.text).not.toMatch(/\son\w+=/);
		},
	);
});
