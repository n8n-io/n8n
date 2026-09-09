import express from 'express';
import request from 'supertest';

import { TEMPLATES_DIR } from '@/constants';
import { createContentSecurityPolicyMiddleware } from '@/middlewares/content-security-policy';
import { createHandlebarsEngine } from '@/utils/handlebars.util';

// Rendered through the same view engine `AbstractServer` sets up, so a break in the
// `{{cspNonce}}` wiring cannot leave these pages' scripts without a nonce.
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
