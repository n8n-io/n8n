import * as saml from 'samlify';
import { getInstanceBaseUrl } from '@/UserManagement/UserManagementHelper';

let serviceProviderInstance: saml.ServiceProviderInstance | undefined;

saml.setSchemaValidator({
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	validate: async (response: string) => {
		// TODO:SAML: implment validation
		return Promise.resolve('skipped');
	},
});

const ssoUrl = getInstanceBaseUrl() + '/rest/sso';
const metadata = `
<EntityDescriptor
 xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
 xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
 xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
 entityID="${ssoUrl}/metadata">
    <SPSSODescriptor WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
        <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
        <AssertionConsumerService isDefault="true" index="0" Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${ssoUrl}/acs"/>
    </SPSSODescriptor>
</EntityDescriptor>
`;

export function getServiceProviderInstance(): saml.ServiceProviderInstance {
	if (serviceProviderInstance === undefined) {
		serviceProviderInstance = saml.ServiceProvider({
			metadata,
		});
	}

	return serviceProviderInstance;
}
