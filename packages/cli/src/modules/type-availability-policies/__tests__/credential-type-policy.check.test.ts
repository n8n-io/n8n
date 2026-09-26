import type { LicenseState } from '@n8n/backend-common';
import type {
	ContentImportTransport,
	CredentialDecryptContext,
	PolicedWorkflow,
} from '@n8n/decorators';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { CredentialTypePolicyCheck } from '../credential-type-policy.check';
import type {
	ComposedTypeEvaluation,
	ComposedTypeVerdict,
	TypeAvailabilityPolicyService,
} from '../type-availability-policy.service';

const SLACK_API = 'slackApi';
const GMAIL_OAUTH = 'gmailOAuth2';
const HTTP_BASIC = 'httpBasicAuth';

const SLACK_NODE = 'n8n-nodes-base.slack';
const HTTP_REQUEST = 'n8n-nodes-base.httpRequest';
const SET = 'n8n-nodes-base.set';

const decryptOf = (credentialType: string, nodeType: string | null = SLACK_NODE) =>
	({
		credentialType,
		credentialId: 'cred-1',
		consumer: nodeType === null ? null : { nodeType },
		projectId: 'project-1',
	}) satisfies CredentialDecryptContext;

const node = (
	nodeType: string,
	credentials: Record<string, string> = {},
	name = nodeType,
	disabled = false,
): INode =>
	({
		id: name,
		name,
		type: nodeType,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		disabled,
		...(Object.keys(credentials).length > 0 && {
			credentials: Object.fromEntries(
				Object.entries(credentials).map(([type, id]) => [type, { id, name: `${type} account` }]),
			),
		}),
	}) as INode;

const workflow = (nodes: INode[], id: string | null = 'wf-1'): PolicedWorkflow => ({
	id,
	name: 'My workflow',
	nodes,
});

const denied = (
	name: string,
	overrides: Partial<ComposedTypeVerdict> = {},
): ComposedTypeVerdict => ({
	name,
	action: 'deny',
	scope: 'instance',
	matchedRuleId: 'rule-7',
	optInAvailable: false,
	...overrides,
});

const allowed = (name: string): ComposedTypeVerdict => ({
	name,
	action: 'allow',
	scope: 'instance',
	matchedRuleId: null,
	optInAvailable: false,
});

const versions: ComposedTypeEvaluation['versions'] = [
	{ scope: 'instance', version: 4 },
	{ scope: 'project', version: 2 },
];

describe('CredentialTypePolicyCheck', () => {
	const service = mock<TypeAvailabilityPolicyService>();
	const licenseState = mock<LicenseState>();
	const check = new CredentialTypePolicyCheck(service, licenseState);

	/** Denies whichever of the requested types are in `deniedTypes`. */
	const denying = (deniedTypes: string[], verdictOverrides: Partial<ComposedTypeVerdict> = {}) =>
		service.evaluateComposedTypesFor.mockImplementation(async (_kind, _projectId, typeNames) => ({
			verdicts: typeNames.map((name) =>
				deniedTypes.includes(name) ? denied(name, verdictOverrides) : allowed(name),
			),
			versions,
		}));

	beforeEach(() => {
		vi.resetAllMocks();
		licenseState.isLicensed.mockReturnValue(true);
		denying([SLACK_API, GMAIL_OAUTH]);
	});

	describe('onWorkflowSave', () => {
		it('reports nothing when the stored workflow already asked for the denied type', async () => {
			const nodes = [node(SET), node(SLACK_NODE, { [SLACK_API]: 'cred-1' })];

			const result = await check.onWorkflowSave({
				workflow: workflow(nodes),
				storedWorkflow: workflow(nodes),
				projectId: 'project-1',
			});

			expect(result.violations).toEqual([]);
			expect(service.evaluateComposedTypesFor).not.toHaveBeenCalled();
		});

		it('reports only the newly added denied type', async () => {
			const result = await check.onWorkflowSave({
				workflow: workflow([
					node(SLACK_NODE, { [SLACK_API]: 'cred-1' }),
					node('n8n-nodes-base.gmail', { [GMAIL_OAUTH]: 'cred-2' }),
				]),
				storedWorkflow: workflow([node(SLACK_NODE, { [SLACK_API]: 'cred-1' })]),
				projectId: 'project-1',
			});

			expect(result.violations).toHaveLength(1);
			expect(result.violations[0].subject).toBe(GMAIL_OAUTH);
			expect(service.evaluateComposedTypesFor).toHaveBeenCalledWith(
				'credential-types',
				'project-1',
				[GMAIL_OAUTH],
			);
		});

		it('tolerates swapping to a different credential of an already stored denied type', async () => {
			const result = await check.onWorkflowSave({
				workflow: workflow([node(SLACK_NODE, { [SLACK_API]: 'cred-2' }, 'renamed')]),
				storedWorkflow: workflow([node(SLACK_NODE, { [SLACK_API]: 'cred-1' })]),
				projectId: 'project-1',
			});

			expect(result.violations).toEqual([]);
		});

		it('reports every denied type when the workflow is new', async () => {
			const result = await check.onWorkflowSave({
				workflow: workflow(
					[
						node(SLACK_NODE, { [SLACK_API]: 'cred-1' }),
						node('n8n-nodes-base.gmail', { [GMAIL_OAUTH]: 'cred-2' }),
						node(HTTP_REQUEST, { [HTTP_BASIC]: 'cred-3' }),
					],
					null,
				),
				storedWorkflow: null,
				projectId: 'project-1',
			});

			expect(result.violations.map((violation) => violation.subject)).toEqual([
				SLACK_API,
				GMAIL_OAUTH,
			]);
		});

		it('reports one violation for several nodes sharing a denied credential type', async () => {
			const result = await check.onWorkflowSave({
				workflow: workflow(
					[
						node(SLACK_NODE, { [SLACK_API]: 'cred-1' }, 'a'),
						node(HTTP_REQUEST, { [SLACK_API]: 'cred-1' }, 'b'),
					],
					null,
				),
				storedWorkflow: null,
				projectId: 'project-1',
			});

			expect(result.violations).toHaveLength(1);
			expect(service.evaluateComposedTypesFor).toHaveBeenCalledWith(
				'credential-types',
				'project-1',
				[SLACK_API],
			);
		});

		it('counts a disabled node, so enabling it later cannot slip past the diff', async () => {
			const result = await check.onWorkflowSave({
				workflow: workflow(
					[node(SET), node(SLACK_NODE, { [SLACK_API]: 'cred-1' }, 'Slack', true)],
					null,
				),
				storedWorkflow: null,
				projectId: 'project-1',
			});

			expect(result.violations.map((violation) => violation.subject)).toEqual([SLACK_API]);
		});

		it('counts every credential type on a node that names more than one', async () => {
			const result = await check.onWorkflowSave({
				workflow: workflow(
					[node(HTTP_REQUEST, { [HTTP_BASIC]: 'cred-1', [SLACK_API]: 'cred-2' })],
					null,
				),
				storedWorkflow: null,
				projectId: 'project-1',
			});

			expect(service.evaluateComposedTypesFor).toHaveBeenCalledWith(
				'credential-types',
				'project-1',
				[HTTP_BASIC, SLACK_API],
			);
			expect(result.violations.map((violation) => violation.subject)).toEqual([SLACK_API]);
		});
	});

	describe('the points that report the full list', () => {
		const nodes = [
			node(SET),
			node(SLACK_NODE, { [SLACK_API]: 'cred-1' }),
			node('n8n-nodes-base.gmail', { [GMAIL_OAUTH]: 'cred-2' }),
		];

		it('reports every denied type on publish, even one the stored workflow had', async () => {
			const result = await check.onWorkflowPublish({
				workflow: workflow(nodes),
				projectId: 'project-1',
			});

			expect(result.violations.map((violation) => violation.subject)).toEqual([
				SLACK_API,
				GMAIL_OAUTH,
			]);
		});

		it('reports every denied type on start', async () => {
			const result = await check.onWorkflowStart({
				workflow: workflow(nodes),
				projectId: 'project-1',
			});

			expect(result.violations.map((violation) => violation.subject)).toEqual([
				SLACK_API,
				GMAIL_OAUTH,
			]);
		});

		it('judges a transfer against the target project', async () => {
			const result = await check.onWorkflowTransfer({
				workflow: workflow(nodes),
				targetProjectId: 'target-project',
			});

			expect(result.violations.map((violation) => violation.subject)).toEqual([
				SLACK_API,
				GMAIL_OAUTH,
			]);
			expect(service.evaluateComposedTypesFor).toHaveBeenCalledWith(
				'credential-types',
				'target-project',
				[SLACK_API, GMAIL_OAUTH],
			);
		});

		const transports: ContentImportTransport[] = [
			'cli',
			'source-control',
			'package',
			'git-connection',
		];

		it.each(transports)('reports every denied type on a %s import', async (transport) => {
			const result = await check.onContentImport({
				workflow: workflow(nodes),
				projectId: 'project-1',
				transport,
			});

			expect(result.violations.map((violation) => violation.subject)).toEqual([
				SLACK_API,
				GMAIL_OAUTH,
			]);
		});

		it.each(transports)(
			'vetoes a credential import of a denied type on a %s import',
			async (transport) => {
				const result = await check.onContentImport({
					credential: { id: null, type: SLACK_API },
					projectId: 'project-1',
					transport,
				});

				expect(result.violations.map((violation) => violation.subject)).toEqual([SLACK_API]);
				expect(service.evaluateComposedTypesFor).toHaveBeenCalledWith(
					'credential-types',
					'project-1',
					[SLACK_API],
				);
			},
		);

		it('hands over a credential import whose type is available', async () => {
			const result = await check.onContentImport({
				credential: { id: 'cred-1', type: HTTP_BASIC },
				projectId: 'project-1',
				transport: 'cli',
			});

			expect(result.violations).toEqual([]);
		});
	});

	describe('onCredentialSave', () => {
		it('refuses a new credential of a denied type', async () => {
			const result = await check.onCredentialSave({
				credential: { id: null, type: SLACK_API },
				storedCredential: null,
				projectId: 'project-1',
			});

			expect(result.violations.map((violation) => violation.subject)).toEqual([SLACK_API]);
			expect(service.evaluateComposedTypesFor).toHaveBeenCalledWith(
				'credential-types',
				'project-1',
				[SLACK_API],
			);
		});

		it('leaves an existing credential of a now denied type editable', async () => {
			const result = await check.onCredentialSave({
				credential: { id: 'cred-1', type: SLACK_API },
				storedCredential: { id: 'cred-1', type: SLACK_API },
				projectId: 'project-1',
			});

			expect(result.violations).toEqual([]);
			expect(service.evaluateComposedTypesFor).not.toHaveBeenCalled();
		});

		it('refuses switching an existing credential onto a denied type', async () => {
			const result = await check.onCredentialSave({
				credential: { id: 'cred-1', type: SLACK_API },
				storedCredential: { id: 'cred-1', type: HTTP_BASIC },
				projectId: 'project-1',
			});

			expect(result.violations.map((violation) => violation.subject)).toEqual([SLACK_API]);
		});

		it('allows switching a denied type onto an available one', async () => {
			const result = await check.onCredentialSave({
				credential: { id: 'cred-1', type: HTTP_BASIC },
				storedCredential: { id: 'cred-1', type: SLACK_API },
				projectId: 'project-1',
			});

			expect(result.violations).toEqual([]);
		});

		it('evaluates instance-only for an instance-scoped credential', async () => {
			const result = await check.onCredentialSave({
				credential: { id: null, type: SLACK_API },
				storedCredential: null,
				projectId: null,
			});

			expect(service.evaluateComposedTypesFor).toHaveBeenCalledWith('credential-types', null, [
				SLACK_API,
			]);
			expect(result.violations).toHaveLength(1);
		});
	});

	describe('onCredentialDecrypt', () => {
		it('vetoes the decryption when the credential type is denied', async () => {
			const result = await check.onCredentialDecrypt(decryptOf(SLACK_API));

			expect(result.violations[0]).toStrictEqual({
				kind: 'credential-type-unavailable',
				checkId: 'credential-type-availability',
				message: `Credential type "${SLACK_API}" is blocked by an instance policy`,
				subject: SLACK_API,
				subjectType: 'credentialType',
				scope: 'instance',
				matchedRuleId: 'rule-7',
			});
			expect(service.evaluateComposedTypesFor).toHaveBeenCalledWith(
				'credential-types',
				'project-1',
				[SLACK_API],
			);
		});

		it('vetoes it for a node the node policy allows, which is the point of this check', async () => {
			const result = await check.onCredentialDecrypt(decryptOf(SLACK_API, HTTP_REQUEST));

			expect(result.violations).toHaveLength(1);
		});

		it('vetoes it when no node is asking, e.g. a credential test', async () => {
			const result = await check.onCredentialDecrypt(decryptOf(SLACK_API, null));

			expect(result.violations).toHaveLength(1);
		});

		it('hands over a credential whose type is available', async () => {
			const result = await check.onCredentialDecrypt(decryptOf(HTTP_BASIC));

			expect(result.violations).toEqual([]);
		});
	});

	describe('scope resolution', () => {
		it('evaluates instance-only when no project applies', async () => {
			const result = await check.onWorkflowStart({
				workflow: workflow([node(SLACK_NODE, { [SLACK_API]: 'cred-1' })]),
				projectId: null,
			});

			expect(service.evaluateComposedTypesFor).toHaveBeenCalledWith('credential-types', null, [
				SLACK_API,
			]);
			expect(result.violations).toHaveLength(1);
		});

		it('passes the read scope versions through for the audit line', async () => {
			denying([]);

			const result = await check.onWorkflowStart({
				workflow: workflow([node(HTTP_REQUEST, { [HTTP_BASIC]: 'cred-1' })]),
				projectId: 'project-1',
			});

			expect(result.violations).toEqual([]);
			expect(result.policyVersions).toEqual(versions);
		});
	});

	describe('violation shape', () => {
		it('names the deciding rule and scope', async () => {
			denying([SLACK_API], { scope: 'project', matchedRuleId: 'rule-3' });

			const result = await check.onWorkflowStart({
				workflow: workflow([node(SLACK_NODE, { [SLACK_API]: 'cred-1' })]),
				projectId: 'project-1',
			});

			expect(result.violations[0]).toStrictEqual({
				kind: 'credential-type-unavailable',
				checkId: 'credential-type-availability',
				message: `Credential type "${SLACK_API}" is blocked by this project's policy`,
				subject: SLACK_API,
				subjectType: 'credentialType',
				scope: 'project',
				matchedRuleId: 'rule-3',
			});
		});

		it('omits the rule id when the scope default decided', async () => {
			denying([SLACK_API], { matchedRuleId: null });

			const result = await check.onWorkflowStart({
				workflow: workflow([node(SLACK_NODE, { [SLACK_API]: 'cred-1' })]),
				projectId: 'project-1',
			});

			expect(result.violations[0]).toStrictEqual({
				kind: 'credential-type-unavailable',
				checkId: 'credential-type-availability',
				message: `Credential type "${SLACK_API}" is blocked by an instance policy`,
				subject: SLACK_API,
				subjectType: 'credentialType',
				scope: 'instance',
			});
		});
	});

	describe('when the store is not worth reading', () => {
		it('reports nothing without a license, and never reads the policy', async () => {
			licenseState.isLicensed.mockReturnValue(false);

			const result = await check.onWorkflowStart({
				workflow: workflow([node(SLACK_NODE, { [SLACK_API]: 'cred-1' })]),
				projectId: 'project-1',
			});

			expect(result.violations).toEqual([]);
			expect(service.evaluateComposedTypesFor).not.toHaveBeenCalled();
		});

		it('reports nothing on a credential decrypt without a license', async () => {
			licenseState.isLicensed.mockReturnValue(false);

			const result = await check.onCredentialDecrypt(decryptOf(SLACK_API));

			expect(result.violations).toEqual([]);
			expect(service.evaluateComposedTypesFor).not.toHaveBeenCalled();
		});

		it('reports nothing on a credential save without a license', async () => {
			licenseState.isLicensed.mockReturnValue(false);

			const result = await check.onCredentialSave({
				credential: { id: null, type: SLACK_API },
				storedCredential: null,
				projectId: 'project-1',
			});

			expect(result.violations).toEqual([]);
			expect(service.evaluateComposedTypesFor).not.toHaveBeenCalled();
		});

		it('reports nothing for a workflow whose nodes need no credentials', async () => {
			const result = await check.onWorkflowSave({
				workflow: workflow([node(SET)], null),
				storedWorkflow: null,
				projectId: 'project-1',
			});

			expect(result.violations).toEqual([]);
			expect(service.evaluateComposedTypesFor).not.toHaveBeenCalled();
		});
	});
});
