import { getInstanceBaseUrl } from '@/UserManagement/UserManagementHelper';
import type { ServiceProviderInstance } from 'samlify';
import { ServiceProvider } from 'samlify';
import { SamlUrls } from './constants';

let serviceProviderInstance: ServiceProviderInstance | undefined;

const metadata = `
<EntityDescriptor
 xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
 xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
 xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
 entityID="${getInstanceBaseUrl() + SamlUrls.restMetadata}">
    <SPSSODescriptor WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
        <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
        <AssertionConsumerService isDefault="true" index="0" Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${
					getInstanceBaseUrl() + SamlUrls.restAcs
				}"/>
    </SPSSODescriptor>
</EntityDescriptor>
`;

export function getServiceProviderInstance(): ServiceProviderInstance {
	if (serviceProviderInstance === undefined) {
		serviceProviderInstance = ServiceProvider({
			metadata,
		});
	}

	return serviceProviderInstance;
}
