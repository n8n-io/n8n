import type { INode, INodeProperties } from 'n8n-workflow';

import {
	addManagedOrdId,
	fillManagedPlaceholders,
	readManagedOrdId,
	resolveManagedCredentialType,
} from '../managed-credential';

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

	describe('readManagedOrdId', () => {
		it('reads the ORD ID from the node credential reference, with no stored record', () => {
			const slack = {
				...node(),
				credentials: {
					platformManagedApi: { id: null, name: 'Slack', ordId: 'acme:apiResource:SLACK:v1' },
				},
			};
			expect(readManagedOrdId(slack, 'platformManagedApi')).toBe('acme:apiResource:SLACK:v1');
		});

		it('returns nothing when the reference has no ORD ID', () => {
			const noOrdId = {
				...node(),
				credentials: { platformManagedApi: { id: null, name: 'Slack' } },
			};
			expect(readManagedOrdId(noOrdId, 'platformManagedApi')).toBeUndefined();
			expect(readManagedOrdId(node(), 'platformManagedApi')).toBeUndefined();
		});

		it('ignores an ORD ID on another credential type', () => {
			const other = {
				...node(),
				credentials: { slackApi: { id: '1', name: 'Slack', ordId: 'acme:apiResource:SLACK:v1' } },
			};
			expect(readManagedOrdId(other, 'platformManagedApi')).toBeUndefined();
		});
	});

	describe('addManagedOrdId', () => {
		const ordId = 'acme:apiResource:SLACK:v1';
		const slack = {
			...node(),
			credentials: { platformManagedApi: { id: null, name: 'Slack', ordId } },
		};

		beforeEach(() => {
			process.env.N8N_MANAGED_CREDENTIAL_TYPE = 'platformManagedApi';
		});

		it("adds the node's ORD ID", () => {
			expect(addManagedOrdId(slack, { headers: { a: '1' } })?.headers).toEqual({
				a: '1',
				ordID: ordId,
			});
		});

		it('adds the ORD ID when the request has no options', () => {
			expect(addManagedOrdId(slack, undefined)).toEqual({ headers: { ordID: ordId } });
		});

		it('overrides an ordID header that the node set', () => {
			expect(addManagedOrdId(slack, { headers: { ordID: 'typed' } })?.headers).toEqual({
				ordID: ordId,
			});
		});

		it('changes nothing for a node with no ORD ID', () => {
			const options = { headers: { ordID: 'from-workflow' } };
			expect(addManagedOrdId(node(), options)).toBe(options);
		});

		it('changes nothing when managed mode is off', () => {
			delete process.env.N8N_MANAGED_CREDENTIAL_TYPE;
			const options = { headers: {} };
			expect(addManagedOrdId(slack, options)).toBe(options);
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
