import type { LicenseState } from '@n8n/backend-common';
import type { ICredentialType } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialTypes } from '@/credential-types';

import { CredentialTypePolicyRestrictionsProvider } from '../credential-restrictions.provider';
import type {
	ComposedTypeVerdict,
	TypeAvailabilityPolicyService,
} from '../type-availability-policy.service';

const HTTP_REQUEST = 'n8n-nodes-base.httpRequest';
const SLACK = 'n8n-nodes-base.slack';
const SLACK_TRIGGER = 'n8n-nodes-base.slackTrigger';

const definitions: Record<string, Partial<ICredentialType>> = {
	slackApi: { authenticate: { type: 'generic', properties: {} } },
	signedApi: {},
	acmeOAuth2Api: { extends: ['oAuth2Api'] },
	noNodesApi: {},
};
const supportedNodes: Record<string, string[]> = {
	slackApi: [SLACK, SLACK_TRIGGER],
	signedApi: ['n8n-nodes-base.signed'],
	acmeOAuth2Api: ['n8n-nodes-base.acme'],
	noNodesApi: [],
};

type Denials = Record<string, Partial<ComposedTypeVerdict>>;

const verdicts = (names: string[], denied: Denials = {}): ComposedTypeVerdict[] =>
	names.map((name) => ({
		name,
		action: name in denied ? 'deny' : 'allow',
		scope: 'instance',
		matchedRuleId: null,
		optInAvailable: false,
		...denied[name],
	}));

describe('CredentialTypePolicyRestrictionsProvider', () => {
	const service = mock<TypeAvailabilityPolicyService>();
	const licenseState = mock<LicenseState>();
	const credentialTypes = mock<CredentialTypes>();
	const provider = new CredentialTypePolicyRestrictionsProvider(
		service,
		licenseState,
		credentialTypes,
	);

	const evaluate = ({
		credentialTypes: credentialDenials = {},
		nodeTypes: nodeDenials = {},
		byProject = {},
	}: {
		credentialTypes?: Denials;
		nodeTypes?: Denials;
		byProject?: Record<string, { credentialTypes?: Denials; nodeTypes?: Denials }>;
	}) => {
		service.evaluateComposedTypesForAllProjects.mockImplementation(async (kind, names) => {
			const key = kind === 'credential-types' ? 'credentialTypes' : 'nodeTypes';
			const shared = key === 'credentialTypes' ? credentialDenials : nodeDenials;
			return {
				withoutProjectPolicy: verdicts([...names], shared),
				byProject: Object.entries(byProject).flatMap(([projectId, denials]) =>
					denials[key] ? [{ projectId, verdicts: verdicts([...names], denials[key]) }] : [],
				),
			};
		});
	};

	beforeEach(() => {
		vi.resetAllMocks();
		licenseState.isLicensed.mockReturnValue(true);
		credentialTypes.recognizes.mockImplementation((type) => type in definitions);
		credentialTypes.getSupportedNodes.mockImplementation((type) => supportedNodes[type] ?? []);
		credentialTypes.getParentTypes.mockImplementation((type) => definitions[type]?.extends ?? []);
		credentialTypes.getByName.mockImplementation((type) => {
			const definition = definitions[type];
			if (!definition) throw new Error(`Unknown credential type ${type}`);
			return { name: type, displayName: type, properties: [], ...definition };
		});
		evaluate({});
	});

	it('restricts nothing and evaluates nothing when the instance is not licensed', async () => {
		licenseState.isLicensed.mockReturnValue(false);

		await expect(
			provider.findRestrictions([{ type: 'slackApi', projectId: 'p1' }]),
		).resolves.toEqual([null]);
		expect(service.evaluateComposedTypesForAllProjects).not.toHaveBeenCalled();
	});

	it('judges each credential by the policy of its home project, in one evaluation for all projects', async () => {
		evaluate({
			byProject: { 'team-1': { credentialTypes: { slackApi: { scope: 'project' } } } },
		});

		const restrictions = await provider.findRestrictions([
			{ type: 'slackApi', projectId: 'team-1' },
			{ type: 'slackApi', projectId: 'team-2' },
			{ type: 'slackApi', projectId: 'team-1' },
		]);

		expect(restrictions).toEqual([
			{
				reason: 'typeRestricted',
				restriction: { name: 'slackApi', available: false, scope: 'project' },
			},
			null,
			{
				reason: 'typeRestricted',
				restriction: { name: 'slackApi', available: false, scope: 'project' },
			},
		]);
		expect(service.evaluateComposedTypesForAllProjects).toHaveBeenCalledTimes(2);
		expect(service.evaluateComposedTypesForAllProjects).toHaveBeenCalledWith('credential-types', [
			'slackApi',
		]);
		expect(service.evaluateComposedTypesForAllProjects).toHaveBeenCalledWith('node-types', [
			HTTP_REQUEST,
			SLACK,
			SLACK_TRIGGER,
		]);
	});

	it('uses the shared verdicts for a credential without a home project', async () => {
		evaluate({ credentialTypes: { slackApi: {} } });

		await expect(
			provider.findRestrictions([{ type: 'slackApi', projectId: null }]),
		).resolves.toEqual([expect.objectContaining({ reason: 'typeRestricted' })]);
	});

	it('restricts a type whose nodes and HTTP Request are all denied, and names the nodes', async () => {
		evaluate({
			nodeTypes: {
				[SLACK]: {},
				[SLACK_TRIGGER]: { scope: 'project', matchedRuleId: 'rule-1' },
				[HTTP_REQUEST]: {},
			},
		});

		await expect(
			provider.findRestrictions([{ type: 'slackApi', projectId: 'p1' }]),
		).resolves.toEqual([
			{
				reason: 'nodesRestricted',
				// The project verdict, because a project admin can lift it.
				restriction: {
					name: SLACK_TRIGGER,
					available: false,
					scope: 'project',
					matchedRuleId: 'rule-1',
				},
				nodeTypes: [SLACK, SLACK_TRIGGER],
			},
		]);
	});

	it('does not restrict a type while one of its nodes is allowed', async () => {
		evaluate({ nodeTypes: { [SLACK]: {}, [HTTP_REQUEST]: {} } });

		await expect(
			provider.findRestrictions([{ type: 'slackApi', projectId: 'p1' }]),
		).resolves.toEqual([null]);
	});

	it.each([
		['authenticates requests itself', 'slackApi', [SLACK, SLACK_TRIGGER]],
		['extends OAuth2', 'acmeOAuth2Api', ['n8n-nodes-base.acme']],
	])(
		'does not restrict a type that HTTP Request can still use because it %s',
		async (_, type, nodes) => {
			evaluate({ nodeTypes: Object.fromEntries(nodes.map((node) => [node, {}])) });

			await expect(provider.findRestrictions([{ type, projectId: 'p1' }])).resolves.toEqual([null]);
		},
	);

	it('ignores HTTP Request for a type it cannot use', async () => {
		evaluate({ nodeTypes: { 'n8n-nodes-base.signed': {} } });

		await expect(
			provider.findRestrictions([{ type: 'signedApi', projectId: 'p1' }]),
		).resolves.toEqual([expect.objectContaining({ reason: 'nodesRestricted' })]);
	});

	it('does not judge the nodes of a type that lists no nodes, or of an unknown type', async () => {
		evaluate({ nodeTypes: { [HTTP_REQUEST]: {} } });

		await expect(
			provider.findRestrictions([
				{ type: 'noNodesApi', projectId: 'p1' },
				{ type: 'uninstalledApi', projectId: 'p1' },
			]),
		).resolves.toEqual([null, null]);
		expect(service.evaluateComposedTypesForAllProjects).toHaveBeenCalledWith('credential-types', [
			'noNodesApi',
			'uninstalledApi',
		]);
	});

	it('restricts a denied type whose package is not loaded', async () => {
		evaluate({ credentialTypes: { uninstalledApi: {} } });

		await expect(
			provider.findRestrictions([{ type: 'uninstalledApi', projectId: 'p1' }]),
		).resolves.toEqual([expect.objectContaining({ reason: 'typeRestricted' })]);
	});
});
