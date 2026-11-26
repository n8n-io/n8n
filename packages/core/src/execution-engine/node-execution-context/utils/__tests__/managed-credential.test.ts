import type { INode, INodeProperties } from 'n8n-workflow';

import { fillManagedPlaceholders, resolveManagedCredentialType } from '../managed-credential';

const node = (type = 'n8n-nodes-base.slack'): INode => ({
	id: '1',
	name: 'Node',
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

describe('managed credential (spike)', () => {
	beforeEach(() => {
		delete process.env.N8N_MANAGED_CREDENTIAL_TYPE;
	});

	afterEach(() => {
		delete process.env.N8N_MANAGED_CREDENTIAL_TYPE;
	});

	describe('resolveManagedCredentialType', () => {
		it('keeps the requested type when managed mode is off', () => {
			expect(resolveManagedCredentialType(node(), 'slackApi')).toBe('slackApi');
		});

		it('resolves every type to the managed type when managed mode is on', () => {
			process.env.N8N_MANAGED_CREDENTIAL_TYPE = 'platformManagedApi';
			expect(resolveManagedCredentialType(node(), 'slackApi')).toBe('platformManagedApi');
			expect(resolveManagedCredentialType(node(), 'microsoftOutlookOAuth2Api')).toBe(
				'platformManagedApi',
			);
		});
	});

	describe('fillManagedPlaceholders', () => {
		const property = (p: Partial<INodeProperties>): INodeProperties =>
			({ displayName: p.name, type: 'string', default: '', ...p }) as INodeProperties;

		it('uses the default, then the UI example, then a placeholder', () => {
			const filled = fillManagedPlaceholders(
				[
					property({ name: 'graphApiBaseUrl', default: 'https://graph.microsoft.com' }),
					property({ name: 'domain', placeholder: 'https://example.atlassian.net' }),
					property({ name: 'subdomain' }),
					property({ name: 'apiKey' }),
					property({ name: 'note', type: 'notice' }),
				],
				{},
			);
			expect(filled).toEqual({
				graphApiBaseUrl: 'https://graph.microsoft.com',
				domain: 'https://example.atlassian.net',
				subdomain: 'managed',
				apiKey: 'managed',
				note: '',
			});
		});

		it('leaves secret fields empty, so no stand-in secret leaves n8n', () => {
			const filled = fillManagedPlaceholders(
				[property({ name: 'accessToken', typeOptions: { password: true } })],
				{},
			);
			expect(filled).toEqual({ accessToken: '' });
		});

		it('keeps values stored in the managed credential', () => {
			const filled = fillManagedPlaceholders([property({ name: 'apiKey' })], { managedBy: 'acme' });
			expect(filled).toEqual({ apiKey: 'managed', managedBy: 'acme' });
		});
	});
});
