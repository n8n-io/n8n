import type { PostBindingContext } from 'samlify/types/src/entity';

import { getInitSSOFormView } from '../views/init-sso-post';

describe('getInitSSOFormView', () => {
	const context: PostBindingContext = {
		id: 'request-1',
		context: 'base64-saml-request',
		entityEndpoint: 'https://idp.example.com/sso',
		type: 'SAMLRequest',
		relayState: '',
	} as PostBindingContext;

	it('should put the nonce on the auto-submit script', () => {
		const html = getInitSSOFormView(context, 'nonce-value');

		expect(html).toContain('<script type="text/javascript" nonce="nonce-value">');
	});

	it('should not rely on an inline event handler, which no nonce can cover', () => {
		const html = getInitSSOFormView(context, 'nonce-value');

		expect(html).not.toMatch(/\son[a-z]+=/i);
	});
});
