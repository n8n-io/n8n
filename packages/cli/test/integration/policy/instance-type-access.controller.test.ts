import { mockInstance, testDb } from '@n8n/backend-test-utils';
import type { PolicyRule } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { HiddenNodeTypes } from '@/modules/type-availability-policies/hidden-node-types';
import { NodeTypes } from '@/node-types';
import { createMember, createOwner } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

import { fakeResolveBaseName } from './shared/workflow-index';

const nodeTypes = mockInstance(NodeTypes);
const hiddenNodeTypes = mockInstance(HiddenNodeTypes);

const testServer = utils.setupTestServer({
	endpointGroups: ['type-availability-policies'],
	modules: ['type-availability-policies'],
	enabledFeatures: [LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES],
});

const NODE_ROUTE = '/node-type-policies';
const CREDENTIAL_ROUTE = '/credential-type-policies';

const SLACK = 'n8n-nodes-base.slack';
const NOTION = 'n8n-nodes-base.notion';
const GMAIL = 'n8n-nodes-base.gmail';

const KNOWN_CREDENTIALS = {
	oAuth2Api: { className: 'oAuth2Api', sourcePath: '' },
	googleOAuth2Api: { className: 'googleOAuth2Api', sourcePath: '', extends: ['oAuth2Api'] },
	googleSheetsOAuth2Api: {
		className: 'googleSheetsOAuth2Api',
		sourcePath: '',
		extends: ['googleOAuth2Api'],
	},
	slackApi: { className: 'slackApi', sourcePath: '' },
};

let owner: User;
let member: User;

const knownTypes = (names: string[]) =>
	Object.fromEntries(names.map((name) => [name, { className: name, sourcePath: '' }]));

async function putInstancePolicy(route: string, rules: PolicyRule[], defaultAction = 'allow') {
	const response = await testServer
		.authAgentFor(owner)
		.put(`${route}/instance`)
		.send({ rules, defaultAction, version: 0 });
	expect(response.statusCode).toBe(200);
}

beforeAll(async () => {
	owner = await createOwner();
	member = await createMember();

	// Both the credential type list and the `extends` chain read this registry.
	Object.defineProperty(Container.get(LoadNodesAndCredentials), 'knownCredentials', {
		configurable: true,
		value: KNOWN_CREDENTIALS,
	});
});

afterAll(() => {
	delete (Container.get(LoadNodesAndCredentials) as { knownCredentials?: unknown })
		.knownCredentials;
});

beforeEach(() => {
	hiddenNodeTypes.get.mockResolvedValue(new Set());
	nodeTypes.getKnownTypes.mockReturnValue(knownTypes([SLACK, NOTION, GMAIL]));
	nodeTypes.resolveBaseName.mockImplementation((name) => ({
		baseName: name,
		isSyntheticTool: false,
	}));
});

afterEach(async () => {
	testServer.license.enable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);
	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
	]);
});

describe('GET /instance/access gating', () => {
	test.each([NODE_ROUTE, CREDENTIAL_ROUTE])(
		'%s/instance/access rejects a user without the policy scope with 403',
		async (route) => {
			const response = await testServer.authAgentFor(member).get(`${route}/instance/access`);

			expect(response.statusCode).toBe(403);
		},
	);

	test.each([NODE_ROUTE, CREDENTIAL_ROUTE])(
		'%s/instance/access rejects an owner with 403 when the license feature is disabled',
		async (route) => {
			testServer.license.disable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);

			const response = await testServer.authAgentFor(owner).get(`${route}/instance/access`);

			expect(response.statusCode).toBe(403);
		},
	);
});

describe('GET /node-type-policies/instance/access', () => {
	const mockNodeTypes = (loaded: string[], generated: string[]) => {
		nodeTypes.getKnownTypes.mockReturnValue(knownTypes([...loaded, ...generated]));
		nodeTypes.resolveBaseName.mockImplementation(fakeResolveBaseName(loaded));
	};

	test('leaves out the tool variants that n8n generates, and keeps a trigger and the real tool nodes', async () => {
		const trigger = `${SLACK}Trigger`;
		const toolCode = '@n8n/n8n-nodes-langchain.toolCode';
		const mcpClientTool = '@n8n/n8n-nodes-langchain.mcpClientTool';
		mockNodeTypes([SLACK, trigger, toolCode, mcpClientTool], [`${SLACK}Tool`, `${SLACK}HitlTool`]);

		const response = await testServer.authAgentFor(owner).get(`${NODE_ROUTE}/instance/access`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.types.map((type: { name: string }) => type.name)).toEqual([
			SLACK,
			trigger,
			toolCode,
			mcpClientTool,
		]);
	});

	test('keeps a tool variant that a rule of its own decides', async () => {
		const slackTool = `${SLACK}Tool`;
		mockNodeTypes([SLACK], [slackTool, `${SLACK}HitlTool`]);
		await putInstancePolicy(NODE_ROUTE, [
			{ id: 'deny-slack-tool', action: 'deny', selector: { kind: 'name', value: slackTool } },
			{ id: 'allow-slack', action: 'allow', selector: { kind: 'name', value: SLACK } },
		]);

		const response = await testServer.authAgentFor(owner).get(`${NODE_ROUTE}/instance/access`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.types).toEqual([
			{ name: SLACK, access: 'allow', matchedRuleId: 'allow-slack' },
			{ name: slackTool, access: 'deny', matchedRuleId: 'deny-slack-tool' },
		]);
	});

	test('leaves out a hidden node type, unless an instance name rule decides it', async () => {
		const hidden = 'n8n-nodes-base.hiddenHelper';
		const hiddenByName = 'n8n-nodes-base.hiddenNamed';
		nodeTypes.getKnownTypes.mockReturnValue(knownTypes([SLACK, hidden, hiddenByName]));
		hiddenNodeTypes.get.mockResolvedValue(new Set([hidden, hiddenByName]));
		await putInstancePolicy(NODE_ROUTE, [
			{ id: 'deny-hidden', action: 'deny', selector: { kind: 'name', value: hiddenByName } },
			{ id: 'deny-base', action: 'deny', selector: { kind: 'package', value: 'n8n-nodes-base' } },
		]);

		const response = await testServer.authAgentFor(owner).get(`${NODE_ROUTE}/instance/access`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.types).toEqual([
			{ name: SLACK, access: 'deny', matchedRuleId: 'deny-base' },
			{ name: hiddenByName, access: 'deny', matchedRuleId: 'deny-hidden' },
		]);
	});

	test('fails when the hidden node types cannot be read', async () => {
		hiddenNodeTypes.get.mockRejectedValue(new Error('ENOENT'));

		const response = await testServer.authAgentFor(owner).get(`${NODE_ROUTE}/instance/access`);

		expect(response.statusCode).toBe(500);
	});

	test('reports allow from the default action at version 0 when no policy is written', async () => {
		const response = await testServer.authAgentFor(owner).get(`${NODE_ROUTE}/instance/access`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual({
			scopeId: null,
			version: 0,
			defaultAction: 'allow',
			types: [SLACK, NOTION, GMAIL].map((name) => ({
				name,
				access: 'allow',
				matchedRuleId: null,
			})),
		});
	});

	test('reports each type with the rule that decides it, and a version that a write accepts', async () => {
		const agent = testServer.authAgentFor(owner);
		await putInstancePolicy(NODE_ROUTE, [
			{ id: 'deny-slack', action: 'deny', selector: { kind: 'name', value: SLACK } },
			{ id: 'delegate-notion', action: 'delegate', selector: { kind: 'name', value: NOTION } },
		]);
		const policy = await agent.get(`${NODE_ROUTE}/instance`);

		const response = await agent.get(`${NODE_ROUTE}/instance/access`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual({
			scopeId: policy.body.data.scopeId,
			version: policy.body.data.version,
			defaultAction: 'allow',
			types: [
				{ name: SLACK, access: 'deny', matchedRuleId: 'deny-slack' },
				{ name: NOTION, access: 'delegate', matchedRuleId: 'delegate-notion' },
				{ name: GMAIL, access: 'allow', matchedRuleId: null },
			],
		});

		const write = await agent
			.put(`${NODE_ROUTE}/instance`)
			.send({ rules: [], defaultAction: 'allow', version: response.body.data.version });
		expect(write.statusCode).toBe(200);
	});
});

describe('GET /credential-type-policies/instance/access', () => {
	test('gives every type that extends the parent of an extends rule the access of that rule', async () => {
		await putInstancePolicy(CREDENTIAL_ROUTE, [
			{ id: 'deny-oauth2', action: 'deny', selector: { kind: 'extends', value: 'oAuth2Api' } },
		]);

		const response = await testServer
			.authAgentFor(owner)
			.get(`${CREDENTIAL_ROUTE}/instance/access`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.version).toBe(1);
		expect(response.body.data.types).toEqual([
			{ name: 'oAuth2Api', access: 'deny', matchedRuleId: 'deny-oauth2' },
			{ name: 'googleOAuth2Api', access: 'deny', matchedRuleId: 'deny-oauth2' },
			{ name: 'googleSheetsOAuth2Api', access: 'deny', matchedRuleId: 'deny-oauth2' },
			{ name: 'slackApi', access: 'allow', matchedRuleId: null },
		]);
	});

	test('reads the credential type policy, not the node type policy', async () => {
		await putInstancePolicy(NODE_ROUTE, [], 'deny');

		const response = await testServer
			.authAgentFor(owner)
			.get(`${CREDENTIAL_ROUTE}/instance/access`);

		expect(response.body.data.defaultAction).toBe('allow');
		expect(response.body.data.version).toBe(0);
	});
});
