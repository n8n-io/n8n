import type { INodeProperties } from 'n8n-workflow';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';

import {
	collectSecretFieldNames,
	redactSecretConfig,
	restoreSecretConfig,
} from '../config-redaction';

// Top-level secret + a secret nested inside a fixedCollection.
const options: INodeProperties[] = [
	{ displayName: 'Client ID', name: 'clientId', type: 'string', default: '' },
	{
		displayName: 'Signing Secret',
		name: 'signingSecret',
		type: 'string',
		typeOptions: { password: true },
		default: '',
	},
	{
		displayName: 'Advanced',
		name: 'advanced',
		type: 'fixedCollection',
		default: {},
		options: [
			{
				displayName: 'Auth',
				name: 'auth',
				values: [
					{
						displayName: 'Nested Secret',
						name: 'nestedSecret',
						type: 'string',
						typeOptions: { password: true },
						default: '',
					},
					{ displayName: 'Nested Plain', name: 'nestedPlain', type: 'string', default: '' },
				],
			},
		],
	},
];

describe('config-redaction', () => {
	describe('collectSecretFieldNames', () => {
		it('collects secret fields at the top level and inside collections', () => {
			expect(collectSecretFieldNames(options)).toEqual(new Set(['signingSecret', 'nestedSecret']));
		});

		it('returns an empty set when there are no options', () => {
			expect(collectSecretFieldNames(undefined)).toEqual(new Set());
		});
	});

	describe('redactSecretConfig', () => {
		it('blanks secret fields at any depth and keeps non-secret fields intact', () => {
			const secretFields = collectSecretFieldNames(options);
			const redacted = redactSecretConfig(
				{
					clientId: 'id',
					signingSecret: 'top-secret',
					advanced: { auth: { nestedSecret: 'deep-secret', nestedPlain: 'plain' } },
				},
				secretFields,
			);

			expect(redacted).toEqual({
				clientId: 'id',
				signingSecret: CREDENTIAL_BLANKING_VALUE,
				advanced: { auth: { nestedSecret: CREDENTIAL_BLANKING_VALUE, nestedPlain: 'plain' } },
			});
		});
	});

	describe('restoreSecretConfig', () => {
		it('restores blanked secrets at any depth from the stored config', () => {
			const secretFields = collectSecretFieldNames(options);
			const stored = {
				clientId: 'id',
				signingSecret: 'top-secret',
				advanced: { auth: { nestedSecret: 'deep-secret', nestedPlain: 'plain' } },
			};
			const incoming = {
				clientId: 'changed-id',
				signingSecret: CREDENTIAL_BLANKING_VALUE,
				advanced: { auth: { nestedSecret: CREDENTIAL_BLANKING_VALUE, nestedPlain: 'plain' } },
			};

			expect(restoreSecretConfig(incoming, stored, secretFields)).toEqual({
				clientId: 'changed-id',
				signingSecret: 'top-secret',
				advanced: { auth: { nestedSecret: 'deep-secret', nestedPlain: 'plain' } },
			});
		});

		it('keeps a newly provided secret instead of the stored one', () => {
			const secretFields = collectSecretFieldNames(options);
			const stored = { signingSecret: 'old-secret' };
			const incoming = { signingSecret: 'new-secret' };

			expect(restoreSecretConfig(incoming, stored, secretFields)).toEqual({
				signingSecret: 'new-secret',
			});
		});
	});
});
