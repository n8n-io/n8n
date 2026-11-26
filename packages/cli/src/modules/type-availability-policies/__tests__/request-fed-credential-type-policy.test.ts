import type { LicenseState } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import type { TransactionRunner } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { NodeTypes } from '@/node-types';

import { REQUEST_FED_CREDENTIAL_TYPES_KIND } from '../constants';
import { TypeAvailabilityPolicyScope } from '../database/entities/type-availability-policy-scope.entity';
import type { TypeAvailabilityPolicyAttachmentRepository } from '../database/repositories/type-availability-policy-attachment.repository';
import type { TypeAvailabilityPolicyRepository } from '../database/repositories/type-availability-policy.repository';
import type { TypeAvailabilityPolicyScopeRepository } from '../database/repositories/type-availability-policy-scope.repository';
import type { PolicyAction, PolicyRule } from '../policy-rule.types';
import { RequestFedCredentialTypePolicy } from '../request-fed-credential-type-policy';
import type { TypeAvailabilityPolicySnapshot } from '../type-availability-policy-snapshot';
import { TypeAvailabilityPolicyService } from '../type-availability-policy.service';

const KIND = REQUEST_FED_CREDENTIAL_TYPES_KIND;
const PROJECT_ID = 'project-1';

const rule = (id: string, action: PolicyAction, kind: 'name' | 'extends', value: string) =>
	({ id, action, selector: { kind, value } }) satisfies PolicyRule;

describe('RequestFedCredentialTypePolicy', () => {
	const policyRepository = mock<TypeAvailabilityPolicyRepository>();
	const scopeRepository = mock<TypeAvailabilityPolicyScopeRepository>();
	const attachmentRepository = mock<TypeAvailabilityPolicyAttachmentRepository>();
	const transactionRunner = mock<TransactionRunner>();
	const snapshot = mock<TypeAvailabilityPolicySnapshot>();
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>();
	const licenseState = mock<LicenseState>();

	const service = new TypeAvailabilityPolicyService(
		policyRepository,
		scopeRepository,
		attachmentRepository,
		transactionRunner,
		mock<EventService>(),
		snapshot,
		loadNodesAndCredentials,
		mock<NodeTypes>(),
	);

	let policy: RequestFedCredentialTypePolicy;

	/** Stores one scope, instance or project, with its rules in one attached policy. */
	const givenScope = (
		projectId: string | null,
		rules: PolicyRule[],
		defaultAction: PolicyAction = 'allow',
	) => scopes.set(projectId, { rules, defaultAction });
	const scopes = new Map<string | null, { rules: PolicyRule[]; defaultAction: PolicyAction }>();

	beforeEach(() => {
		vi.clearAllMocks();
		scopes.clear();
		snapshot.read.mockReturnValue(null);
		licenseState.isLicensed.mockReturnValue(true);
		Object.defineProperty(loadNodesAndCredentials, 'knownCredentials', {
			configurable: true,
			value: {
				oAuth2Api: { className: '', sourcePath: '' },
				googleOAuth2Api: { className: '', sourcePath: '', extends: ['oAuth2Api'] },
				slackApi: { className: '', sourcePath: '' },
			},
		});
		scopeRepository.findScopeByKindAndProject.mockImplementation(async (_kind, projectId) => {
			const stored = scopes.get(projectId);
			if (!stored) return null;
			return Object.assign(new TypeAvailabilityPolicyScope(), {
				id: `scope-${projectId ?? 'instance'}`,
				kind: KIND,
				projectId,
				defaultAction: stored.defaultAction,
				version: 3,
				updatedBy: 'user-1',
			});
		});
		attachmentRepository.listAttachmentsForScope.mockImplementation(async (scopeId) => {
			const projectId = scopeId === 'scope-instance' ? null : scopeId.replace('scope-', '');
			return [
				{ policyId: 'p1', rules: scopes.get(projectId)?.rules ?? [], priority: 0, isFloor: false },
			];
		});

		policy = new RequestFedCredentialTypePolicy(service, licenseState);
		RequestFedCredentialTypePolicy.isActive = true;
	});

	afterEach(() => {
		RequestFedCredentialTypePolicy.isActive = false;
	});

	it('allows every type when no policy exists', async () => {
		await expect(policy.assertAllowed('slackApi', PROJECT_ID)).resolves.toBeUndefined();
		await expect(policy.assertAllowed('slackApi', null)).resolves.toBeUndefined();
	});

	it('reads the request-fed kind, not the credential type kind', async () => {
		await policy.assertAllowed('slackApi', PROJECT_ID);

		expect(scopeRepository.findScopeByKindAndProject).toHaveBeenCalledWith(KIND, null, {});
		expect(scopeRepository.findScopeByKindAndProject).toHaveBeenCalledWith(KIND, PROJECT_ID, {});
	});

	describe('instance scope', () => {
		it('throws for a type an instance name rule denies', async () => {
			givenScope(null, [rule('r1', 'deny', 'name', 'slackApi')]);

			await expect(policy.assertAllowed('slackApi', PROJECT_ID)).rejects.toThrow(
				'Credential type "slackApi" cannot receive a value from the request: it is blocked by an instance policy',
			);
		});

		it('throws for an instance deny when the execution has no project', async () => {
			givenScope(null, [rule('r1', 'deny', 'name', 'slackApi')]);

			await expect(policy.assertAllowed('slackApi', null)).rejects.toThrow('instance policy');
		});

		it('allows a type the instance deny does not name', async () => {
			givenScope(null, [rule('r1', 'deny', 'name', 'slackApi')]);

			await expect(policy.assertAllowed('googleOAuth2Api', PROJECT_ID)).resolves.toBeUndefined();
		});

		it('denies a type that extends a denied parent', async () => {
			givenScope(null, [rule('r1', 'deny', 'extends', 'oAuth2Api')]);

			await expect(policy.assertAllowed('googleOAuth2Api', PROJECT_ID)).rejects.toThrow(
				'instance policy',
			);
		});

		it('allows only the listed types when the instance default is deny', async () => {
			givenScope(null, [rule('r1', 'allow', 'name', 'slackApi')], 'deny');

			await expect(policy.assertAllowed('slackApi', PROJECT_ID)).resolves.toBeUndefined();
			await expect(policy.assertAllowed('googleOAuth2Api', PROJECT_ID)).rejects.toThrow(
				'instance policy',
			);
		});
	});

	describe('project scope', () => {
		it('lets a project deny a type the instance allows', async () => {
			givenScope(PROJECT_ID, [rule('r1', 'deny', 'name', 'slackApi')]);

			await expect(policy.assertAllowed('slackApi', PROJECT_ID)).rejects.toThrow(
				'blocked by a project policy',
			);
		});

		it('does not apply one project policy to another project', async () => {
			givenScope(PROJECT_ID, [rule('r1', 'deny', 'name', 'slackApi')]);

			await expect(policy.assertAllowed('slackApi', 'project-2')).resolves.toBeUndefined();
		});

		it('does not let a project allow a type the instance denies', async () => {
			givenScope(null, [rule('r1', 'deny', 'name', 'slackApi')]);
			givenScope(PROJECT_ID, [rule('r2', 'allow', 'name', 'slackApi')]);

			await expect(policy.assertAllowed('slackApi', PROJECT_ID)).rejects.toThrow('instance policy');
		});
	});

	describe('delegate', () => {
		it('allows a delegated type when the project allows it by rule', async () => {
			givenScope(null, [rule('r1', 'delegate', 'name', 'slackApi')]);
			givenScope(PROJECT_ID, [rule('r2', 'allow', 'name', 'slackApi')]);

			await expect(policy.assertAllowed('slackApi', PROJECT_ID)).resolves.toBeUndefined();
		});

		it('denies a delegated type when the project has no explicit allow', async () => {
			givenScope(null, [rule('r1', 'delegate', 'name', 'slackApi')]);

			await expect(policy.assertAllowed('slackApi', PROJECT_ID)).rejects.toThrow('policy');
		});

		it('denies a delegated type when the execution has no project', async () => {
			givenScope(null, [rule('r1', 'delegate', 'name', 'slackApi')]);

			await expect(policy.assertAllowed('slackApi', null)).rejects.toThrow('policy');
		});
	});

	describe('when the check does not apply', () => {
		it('allows before the module activates it', async () => {
			givenScope(null, [rule('r1', 'deny', 'name', 'slackApi')]);
			RequestFedCredentialTypePolicy.isActive = false;
			const inactive = new RequestFedCredentialTypePolicy(service, licenseState);

			await expect(inactive.assertAllowed('slackApi', PROJECT_ID)).resolves.toBeUndefined();
			expect(scopeRepository.findScopeByKindAndProject).not.toHaveBeenCalled();
		});

		it('allows when the license is off', async () => {
			givenScope(null, [rule('r1', 'deny', 'name', 'slackApi')]);
			licenseState.isLicensed.mockReturnValue(false);

			await expect(policy.assertAllowed('slackApi', PROJECT_ID)).resolves.toBeUndefined();
			expect(scopeRepository.findScopeByKindAndProject).not.toHaveBeenCalled();
		});
	});

	describe('rule writes', () => {
		it('accepts an extends rule', async () => {
			policyRepository.createPolicy.mockResolvedValue(mock());

			await expect(
				service.createPolicyDocument(KIND, [rule('r1', 'deny', 'extends', 'oAuth2Api')], 'user-1'),
			).resolves.toBeDefined();
		});
	});
});
