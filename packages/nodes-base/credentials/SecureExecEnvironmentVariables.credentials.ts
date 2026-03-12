/* eslint-disable n8n-nodes-base/cred-class-name-unsuffixed */
/* eslint-disable n8n-nodes-base/cred-class-field-name-unsuffixed */
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SecureExecEnvironmentVariables implements ICredentialType {
	name = 'secureExecEnvironmentVariables';

	displayName = 'Secure Exec Environment Variables';

	documentationUrl = 'secureExec';

	properties: INodeProperties[] = [
		{
			displayName: 'Variables',
			name: 'variables',
			type: 'fixedCollection',
			default: { values: [{ name: '', value: '' }] },
			typeOptions: {
				multipleValues: true,
			},
			placeholder: 'Add Variable',
			options: [
				{
					displayName: 'Variable',
					name: 'values',
					values: [
						{
							displayName: 'Name',
							name: 'name',
							type: 'string',
							default: '',
						},
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							default: '',
							typeOptions: {
								password: true,
							},
						},
					],
				},
			],
		},
	];
}
