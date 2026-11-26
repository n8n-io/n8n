import type { Types } from 'n8n-core';
import type { INodeTypeDescription } from 'n8n-workflow';

import {
	applyManagedCredentialToDescription,
	applyManagedCredentialToTypes,
	assertManagedCredentialType,
} from '@/spike-managed-credential-types';

const description = (d: Partial<INodeTypeDescription>): INodeTypeDescription =>
	({
		displayName: d.name,
		group: [],
		version: 1,
		defaults: {},
		inputs: [],
		outputs: [],
		properties: [],
		...d,
	}) as INodeTypeDescription;

const sheets = description({
	name: 'n8n-nodes-base.googleSheets',
	credentials: [
		{
			name: 'googleApi',
			required: true,
			displayOptions: { show: { authentication: ['serviceAccount'] } },
		},
		{
			name: 'googleSheetsOAuth2Api',
			required: true,
			displayOptions: { show: { authentication: ['oAuth2'] } },
		},
	],
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			default: 'serviceAccount',
			options: [
				{ name: 'Service Account', value: 'serviceAccount' },
				{ name: 'OAuth2', value: 'oAuth2' },
			],
		},
	],
});

const http = description({
	name: 'n8n-nodes-base.httpRequest',
	credentials: [{ name: 'httpSslAuth', required: true }],
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			default: 'none',
			options: [
				{ name: 'None', value: 'none' },
				{ name: 'Predefined Credential Type', value: 'predefinedCredentialType' },
				{ name: 'Generic Credential Type', value: 'genericCredentialType' },
			],
		},
	],
});

const types = (): Types => ({
	nodes: [description({ name: 'n8n-nodes-base.noOp' }), sheets, http],
	credentials: [
		{ name: 'slackApi', displayName: 'Slack', properties: [] },
		{ name: 'platformManagedApi', displayName: 'Managed by platform', properties: [] },
	],
});

describe('spike managed credential types', () => {
	beforeEach(() => {
		delete process.env.N8N_MANAGED_CREDENTIAL_TYPE;
	});

	afterEach(() => {
		delete process.env.N8N_MANAGED_CREDENTIAL_TYPE;
	});

	describe('applyManagedCredentialToTypes', () => {
		it('changes nothing when managed mode is off', () => {
			const t = types();
			const before = structuredClone(t);
			applyManagedCredentialToTypes(t);
			expect(t).toEqual(before);
		});

		describe('when managed mode is on', () => {
			let t: Types;
			beforeEach(() => {
				process.env.N8N_MANAGED_CREDENTIAL_TYPE = 'platformManagedApi';
				t = types();
				applyManagedCredentialToTypes(t);
			});

			it('sends only the managed credential type to the editor', () => {
				expect(t.credentials.map((c) => c.name)).toEqual(['platformManagedApi']);
			});

			it('lets nodes ask only for the managed type', () => {
				const sheetsOut = t.nodes.find((n) => n.name === sheets.name)!;
				expect(sheetsOut.credentials).toEqual([{ name: 'platformManagedApi', required: true }]);
			});

			it('removes auth options whose node signs a token itself', () => {
				const auth = t.nodes.find((n) => n.name === sheets.name)!.properties[0];
				expect(auth.options?.map((o) => ('value' in o ? o.value : undefined))).toEqual(['oAuth2']);
				expect(auth.default).toBe('oAuth2');
			});

			it('keeps HTTP Request credentials and removes only the generic type', () => {
				const httpOut = t.nodes.find((n) => n.name === http.name)!;
				expect(httpOut.credentials).toEqual(http.credentials);
				expect(
					httpOut.properties[0].options?.map((o) => ('value' in o ? o.value : undefined)),
				).toEqual(['none', 'predefinedCredentialType']);
			});

			it('fails at startup when the managed type is not loaded', () => {
				process.env.N8N_MANAGED_CREDENTIAL_TYPE = 'typoManagedApi';
				expect(() => applyManagedCredentialToTypes(types())).toThrow(
					'no credential type with that name is loaded',
				);
			});

			it('leaves nodes without credentials alone', () => {
				expect(t.nodes.find((n) => n.name === 'n8n-nodes-base.noOp')!.credentials).toBeUndefined();
			});
		});
	});

	describe('applyManagedCredentialToDescription', () => {
		it('changes nothing when managed mode is off', () => {
			expect(applyManagedCredentialToDescription(sheets)).toBe(sheets);
		});

		it('gives a description that the editor fetches alone only the managed type', () => {
			process.env.N8N_MANAGED_CREDENTIAL_TYPE = 'platformManagedApi';
			expect(applyManagedCredentialToDescription(sheets).credentials).toEqual([
				{ name: 'platformManagedApi', required: true },
			]);
		});
	});

	describe('assertManagedCredentialType', () => {
		it('allows any type when managed mode is off', () => {
			expect(() => assertManagedCredentialType('slackApi')).not.toThrow();
		});

		it('refuses every type when managed mode is on, because n8n builds the credential', () => {
			process.env.N8N_MANAGED_CREDENTIAL_TYPE = 'platformManagedApi';
			for (const type of ['platformManagedApi', 'slackApi']) {
				expect(() => assertManagedCredentialType(type)).toThrow(
					'Credentials cannot be created on this instance',
				);
			}
		});
	});
});
