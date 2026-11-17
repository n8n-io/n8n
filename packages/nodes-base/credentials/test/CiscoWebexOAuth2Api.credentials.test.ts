import { CiscoWebex } from '../../nodes/Cisco/Webex/CiscoWebex.node';
import { CiscoWebexTrigger } from '../../nodes/Cisco/Webex/CiscoWebexTrigger.node';
import { CiscoWebexOAuth2Api } from '../CiscoWebexOAuth2Api.credentials';

describe('CiscoWebexOAuth2Api Credential', () => {
	const credential = new CiscoWebexOAuth2Api();

	it('should keep the internal name for existing credentials and workflows', () => {
		expect(credential.name).toBe('ciscoWebexOAuth2Api');
	});

	it('should use the Webex by Cisco brand wording in the display name', () => {
		// NODE-6782: Match the node name so users can find the credential.
		expect(credential.displayName).toBe('Webex by Cisco OAuth2 API');
	});

	it.each([new CiscoWebex(), new CiscoWebexTrigger()])(
		'should keep the credential reference for $description.displayName',
		(node) => {
			expect(node.description.credentials).toContainEqual({
				name: credential.name,
				required: true,
			});
		},
	);
});
