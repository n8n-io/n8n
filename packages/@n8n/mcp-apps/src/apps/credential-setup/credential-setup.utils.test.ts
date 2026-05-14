import { describe, expect, it } from 'vitest';

import type { CredentialSetupField, CredentialSetupOutput } from '../../shared/credential-setup';
import {
	buildCredentialCreateArguments,
	createInitialFormData,
	isCredentialSetupOutput,
	serializeCredentialData,
} from './credential-setup.utils';

const fields: CredentialSetupField[] = [
	{
		name: 'apiKey',
		displayName: 'API Key',
		type: 'string',
		required: true,
		password: true,
	},
	{
		name: 'enabled',
		displayName: 'Enabled',
		type: 'boolean',
		required: false,
		password: false,
	},
	{
		name: 'scopes',
		displayName: 'Scopes',
		type: 'multiOptions',
		required: false,
		password: false,
		options: [
			{ name: 'Read', value: 'read' },
			{ name: 'Write', value: 'write' },
		],
	},
	{
		name: 'notes',
		displayName: 'Notes',
		type: 'notice',
		required: false,
		password: false,
		description: 'Use a scoped token.',
	},
];

const setup: CredentialSetupOutput = {
	setupSessionId: 'setup-1',
	credentialType: 'exampleApi',
	credentialDisplayName: 'Example API',
	credentialName: 'Example API account',
	projectId: 'project-1',
	isOAuth: false,
	fields,
	hasUnsupportedFields: false,
	unsupportedFieldNames: [],
	fallbackUrl: 'https://n8n.example/home/credentials',
};

describe('credential setup app utils', () => {
	it('initializes editable fields without including notice-only fields', () => {
		expect(createInitialFormData(fields)).toEqual({
			apiKey: '',
			enabled: false,
			scopes: [],
		});
	});

	it('serializes credential data without notice fields', () => {
		expect(
			serializeCredentialData(fields, {
				apiKey: 'secret-api-key',
				enabled: true,
				scopes: ['read', 'write', 10],
				notes: 'not submitted',
			}),
		).toEqual({
			apiKey: 'secret-api-key',
			enabled: true,
			scopes: ['read', 'write'],
		});
	});

	it('builds the app-only create payload with submitted data isolated to arguments.data', () => {
		expect(
			buildCredentialCreateArguments(setup, {
				apiKey: 'secret-api-key',
				enabled: true,
				scopes: [],
			}),
		).toEqual({
			setupSessionId: 'setup-1',
			credentialType: 'exampleApi',
			name: 'Example API account',
			projectId: 'project-1',
			data: {
				apiKey: 'secret-api-key',
				enabled: true,
				scopes: [],
			},
		});
	});

	it('accepts setup metadata only when the schema is safe for the app', () => {
		expect(isCredentialSetupOutput(setup)).toBe(true);
		expect(isCredentialSetupOutput({ ...setup, fields: [{ name: 'apiKey' }] })).toBe(false);
	});

	it('keeps setup metadata safe while carrying only the setup session id', () => {
		expect(isCredentialSetupOutput(setup)).toBe(true);
		expect(JSON.stringify(setup)).not.toContain('secret-api-key');
	});
});
