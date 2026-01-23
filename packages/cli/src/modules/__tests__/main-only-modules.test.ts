import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import '../sso-oidc/sso-oidc.module';
import '../sso-saml/sso-saml.module';
import '../source-control.ee/source-control.module';
import '../provisioning.ee/provisioning.module';
import '../breaking-changes/breaking-changes.module';

describe('main-only modules', () => {
	const metadata = Container.get(ModuleMetadata);

	test.each(['sso-oidc', 'sso-saml', 'source-control', 'provisioning', 'breaking-changes'])(
		'%s should only run on main',
		(moduleName) => {
			expect(metadata.get(moduleName)?.instanceTypes).toEqual(['main']);
		},
	);
});
