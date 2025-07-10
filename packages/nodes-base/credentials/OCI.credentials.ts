import type {
	ICredentialType,
	INodeProperties
} from 'n8n-workflow';

export class Oci implements ICredentialType {
	name = 'oci';

	displayName = 'Oracle Cloud Infrastructure';

	documentationUrl = 'https://docs.oracle.com/en-us/iaas/Content/home.htm';

	icon = 'file:icons/OCI.svg' as const;

	properties: INodeProperties[] = [
		{
			displayName: 'User OCID',
			name: 'userOcid',
			type: 'string',
			default: '',
			placeholder: 'ocid1.user.oc1..xxxxxxxxxxxx',
		},
		{
			displayName: 'Tenancy OCID',
			name: 'tenancyOcid',
			type: 'string',
			default: '',
			placeholder: 'ocid1.tenancy.oc1..xxxxxxxxxxxx',
		},
		{
			displayName: 'Key Fingerprint',
			name: 'keyFingerprint',
			type: 'string',
			default: '',
			placeholder: 'xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx',
		},
		{
			displayName: 'Region',
			name: 'region',
			type: 'string',
			default: '',
			placeholder: 'us-ashburn-1',
		},
		{
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string',
			typeOptions: {
				rows: 4,
				password: true,
			},
			default: '',
			placeholder: '-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----',
		},
	];
}
