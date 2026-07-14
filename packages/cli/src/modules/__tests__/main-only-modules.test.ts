import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import '../sso-oidc/sso-oidc.module.js';
import '../sso-saml/sso-saml.module.js';
import '../source-control.ee/source-control.module.js';
import '../provisioning.ee/provisioning.module.js';
import '../breaking-changes/breaking-changes.module.js';
import '../mcp/mcp.module.js';
import '../oauth-server/oauth-server.module.js';

describe('main-only modules', () => {
	const metadata = Container.get(ModuleMetadata);

	test.each(['sso-oidc', 'sso-saml', 'source-control', 'provisioning', 'breaking-changes', 'mcp'])(
		'%s should only run on main',
		(moduleName) => {
			expect(metadata.get(moduleName)?.instanceTypes).toEqual(['main']);
		},
	);
});
