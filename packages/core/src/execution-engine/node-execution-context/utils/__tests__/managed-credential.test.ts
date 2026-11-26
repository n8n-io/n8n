import type { INode, INodeProperties } from 'n8n-workflow';

import {
	fillManagedPlaceholders,
	findMissingManagedFields,
	getManagedReferenceData,
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

	describe('getManagedReferenceData', () => {
		it("returns the fields that the platform put on the node's reference, without id and name", () => {
			const slack = {
				...node(),
				credentials: {
					platformManagedApi: { id: null, name: 'Slack', ordId: 'acme:apiResource:SLACK:v1' },
				},
			};
			expect(getManagedReferenceData(slack, 'platformManagedApi')).toEqual({
				ordId: 'acme:apiResource:SLACK:v1',
			});
		});

		it('returns nothing for a node with no managed reference', () => {
			expect(getManagedReferenceData(node(), 'platformManagedApi')).toEqual({});
		});

		it('ignores fields on another credential type', () => {
			const other = {
				...node(),
				credentials: { slackApi: { id: '1', name: 'Slack', ordId: 'acme:apiResource:SLACK:v1' } },
			};
			expect(getManagedReferenceData(other, 'platformManagedApi')).toEqual({});
		});
	});

	describe('findMissingManagedFields', () => {
		const field = (name: string, extra: Partial<INodeProperties> = {}): INodeProperties =>
			({ displayName: name, name, type: 'string', default: '', ...extra }) as INodeProperties;

		it('lists required fields that the reference does not fill', () => {
			const properties = [field('ordId', { required: true }), field('optional')];
			expect(findMissingManagedFields(properties, {})).toEqual(['ordId']);
			expect(findMissingManagedFields(properties, { ordId: '' })).toEqual(['ordId']);
			expect(findMissingManagedFields(properties, { ordId: 'x' })).toEqual([]);
		});

		it('treats null as missing', () => {
			expect(
				findMissingManagedFields([field('ordId', { required: true })], { ordId: null } as never),
			).toEqual(['ordId']);
		});

		it('ignores required secret fields, which never sit on the node', () => {
			const secret = field('token', { required: true, typeOptions: { password: true } });
			expect(findMissingManagedFields([secret], {})).toEqual([]);
		});

		it('ignores required fields that are shown only under a condition', () => {
			const conditional = field('domain', {
				required: true,
				displayOptions: { show: { variant: ['server'] } },
			});
			expect(findMissingManagedFields([conditional], {})).toEqual([]);
		});

		it('ignores notices', () => {
			expect(
				findMissingManagedFields([field('notice', { type: 'notice', required: true })], {}),
			).toEqual([]);
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
