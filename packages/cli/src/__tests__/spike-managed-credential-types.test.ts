import type { Types } from 'n8n-core';
import type { INodeTypeDescription } from 'n8n-workflow';

import {
	applyManagedCredentialToDescription,
	applyManagedCredentialToTypes,
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

			it('keeps every credential type, because the platform controls who creates credentials', () => {
				expect(t.credentials.map((c) => c.name)).toEqual(['slackApi', 'platformManagedApi']);
			});

			it('lets nodes ask only for the managed type', () => {
				const sheetsOut = t.nodes.find((n) => n.name === sheets.name)!;
				expect(sheetsOut.credentials).toEqual([{ name: 'platformManagedApi', required: true }]);
			});

			it("keeps the node's auth options", () => {
				expect(t.nodes.find((n) => n.name === sheets.name)!.properties).toEqual(sheets.properties);
			});

			it('leaves HTTP Request unchanged, because it picks its credential type in a parameter', () => {
				expect(t.nodes.find((n) => n.name === http.name)).toEqual(http);
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

		it('leaves the HTTP Request tool variant unchanged too', () => {
			process.env.N8N_MANAGED_CREDENTIAL_TYPE = 'platformManagedApi';
			const tool = { ...http, name: 'n8n-nodes-base.httpRequestTool' };
			expect(applyManagedCredentialToDescription(tool)).toEqual(tool);
		});

		it('keeps HTTP Request credentials when the fetched description has the short node name', () => {
			process.env.N8N_MANAGED_CREDENTIAL_TYPE = 'platformManagedApi';
			const shortName = { ...http, name: 'httpRequest' };
			expect(
				applyManagedCredentialToDescription(shortName, 'n8n-nodes-base.httpRequest').credentials,
			).toEqual(http.credentials);
		});
	});
});
