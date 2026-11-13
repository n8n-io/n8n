import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NodeTypeAvailability } from '@n8n/api-types';
import { useTypeAvailabilityPoliciesStore } from '@n8n/frontend-module-type-availability-policies';
import type { ICredentialType, INodeTypeDescription } from 'n8n-workflow';

import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '../credentials.store';
import { isUsableByHttpRequest, useCredentialTypeUsability } from './useCredentialTypeUsability';

const HTTP_REQUEST = 'n8n-nodes-base.httpRequest';

const mailjetApi = {
	name: 'mailjetEmailApi',
	displayName: 'Mailjet Email API',
	properties: [],
	authenticate: { type: 'generic', properties: {} },
	supportedNodes: ['n8n-nodes-base.mailjet', 'n8n-nodes-base.mailjetTrigger'],
} satisfies ICredentialType;

const signedApi = {
	name: 'signedApi',
	displayName: 'Signed API',
	properties: [],
	supportedNodes: ['n8n-nodes-base.signed'],
} satisfies ICredentialType;

const acmeOAuth2Api = {
	name: 'acmeOAuth2Api',
	displayName: 'Acme OAuth2 API',
	extends: ['oAuth2Api'],
	properties: [],
} satisfies ICredentialType;

const nestedOAuth2Api = {
	name: 'nestedOAuth2Api',
	displayName: 'Nested OAuth2 API',
	extends: ['acmeOAuth2Api'],
	properties: [],
} satisfies ICredentialType;

const credentialTypes: Record<string, ICredentialType> = {
	mailjetEmailApi: mailjetApi,
	signedApi,
	acmeOAuth2Api,
	nestedOAuth2Api,
};
const getCredentialType = (name: string) => credentialTypes[name];

describe('isUsableByHttpRequest', () => {
	it('accepts a type with its own authentication', () => {
		expect(isUsableByHttpRequest(mailjetApi, getCredentialType)).toBe(true);
	});

	it('accepts a type that extends OAuth2, directly or through a parent', () => {
		expect(isUsableByHttpRequest(acmeOAuth2Api, getCredentialType)).toBe(true);
		expect(isUsableByHttpRequest(nestedOAuth2Api, getCredentialType)).toBe(true);
	});

	it('rejects a type with no authentication, a generic auth type and a type locked to its nodes', () => {
		expect(isUsableByHttpRequest(signedApi, getCredentialType)).toBe(false);
		expect(isUsableByHttpRequest({ ...mailjetApi, genericAuth: true }, getCredentialType)).toBe(
			false,
		);
		expect(
			isUsableByHttpRequest({ ...mailjetApi, restrictToSupportedNodes: true }, getCredentialType),
		).toBe(false);
	});
});

describe('useCredentialTypeUsability', () => {
	let restrictedNodes: Record<string, NodeTypeAvailability>;
	let restrictedCredentials: Set<string>;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));

		const credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.state.credentialTypes = credentialTypes;

		const nodeTypesStore = mockedStore(useNodeTypesStore);
		nodeTypesStore.getNodeType = vi.fn(
			(name: string) =>
				({
					'n8n-nodes-base.mailjet': { displayName: 'Mailjet' },
					'n8n-nodes-base.mailjetTrigger': { displayName: 'Mailjet Trigger' },
				})[name] as INodeTypeDescription | undefined,
		) as unknown as typeof nodeTypesStore.getNodeType;

		restrictedNodes = {};
		restrictedCredentials = new Set();
		const policies = useTypeAvailabilityPoliciesStore();
		vi.spyOn(policies, 'getNodeTypeAvailability').mockImplementation(
			(name) => restrictedNodes[name] ?? { name, available: true },
		);
		vi.spyOn(policies, 'getCredentialTypeAvailability').mockImplementation((name) =>
			restrictedCredentials.has(name)
				? { name, available: false, scope: 'instance' }
				: { name, available: true },
		);
	});

	function restrictNode(name: string, verdict: Partial<NodeTypeAvailability> = {}) {
		restrictedNodes[name] = { name, available: false, scope: 'instance', ...verdict };
	}

	it('reports a type that a policy blocks', () => {
		restrictedCredentials.add('mailjetEmailApi');

		expect(useCredentialTypeUsability().getCredentialTypeUsability('mailjetEmailApi')).toEqual({
			reason: 'typeRestricted',
			restriction: { name: 'mailjetEmailApi', available: false, scope: 'instance' },
		});
	});

	it('reports a type whose nodes and HTTP Request are all restricted, naming the nodes', () => {
		restrictNode('n8n-nodes-base.mailjet');
		restrictNode('n8n-nodes-base.mailjetTrigger');
		restrictNode(HTTP_REQUEST);

		expect(useCredentialTypeUsability().getCredentialTypeUsability('mailjetEmailApi')).toEqual({
			reason: 'nodesRestricted',
			restriction: expect.objectContaining({ name: 'n8n-nodes-base.mailjet' }),
			nodeTypeNames: ['Mailjet', 'Mailjet Trigger'],
		});
	});

	it('treats a type as usable while HTTP Request can still use it', () => {
		restrictNode('n8n-nodes-base.mailjet');
		restrictNode('n8n-nodes-base.mailjetTrigger');

		expect(useCredentialTypeUsability().getCredentialTypeUsability('mailjetEmailApi')).toBeNull();
	});

	it('treats a type as usable while one of its nodes is allowed', () => {
		restrictNode('n8n-nodes-base.mailjet');
		restrictNode(HTTP_REQUEST);

		expect(useCredentialTypeUsability().getCredentialTypeUsability('mailjetEmailApi')).toBeNull();
	});

	it('ignores HTTP Request for a type it cannot use', () => {
		restrictNode('n8n-nodes-base.signed');

		expect(useCredentialTypeUsability().getCredentialTypeUsability('signedApi')).toMatchObject({
			reason: 'nodesRestricted',
			nodeTypeNames: ['n8n-nodes-base.signed'],
		});
	});

	it('points at the project admin when one of the restrictions is the project', () => {
		restrictNode('n8n-nodes-base.mailjet');
		restrictNode('n8n-nodes-base.mailjetTrigger', { scope: 'project' });
		restrictNode(HTTP_REQUEST);

		expect(
			useCredentialTypeUsability().getCredentialTypeUsability('mailjetEmailApi'),
		).toMatchObject({ restriction: { name: 'n8n-nodes-base.mailjetTrigger', scope: 'project' } });
	});

	it('does not judge a type that lists no nodes', () => {
		restrictNode(HTTP_REQUEST);

		expect(useCredentialTypeUsability().getCredentialTypeUsability('acmeOAuth2Api')).toBeNull();
	});
});
