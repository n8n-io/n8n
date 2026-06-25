import type { Project, SharedCredentialsRepository, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { CredentialMatcherContext } from '../credential-matcher';
import { CredentialMatcherFactory } from '../credential-matcher-factory';
import { createFailure } from '../credential.types';
import { IdBasedCredentialMatcher } from '../id-based-credential-matcher';

type UsableCredential = Awaited<
	ReturnType<CredentialsService['getCredentialsAUserCanUseInAWorkflow']>
>[number];

const usable = (id: string, type = 'githubApi'): UsableCredential =>
	({ id, type }) as UsableCredential;

const credentialsFinderService = mock<CredentialsFinderService>();
const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
const credentialsService = mock<CredentialsService>();
const credentialTypes = mock<CredentialTypes>();
const targetProject = mock<Project>({ id: 'project-target' });
const user = mock<User>({ id: 'user-1' });

function createMatcherFactory(): CredentialMatcherFactory {
	Container.set(
		IdBasedCredentialMatcher,
		new IdBasedCredentialMatcher(
			credentialsFinderService,
			sharedCredentialsRepository,
			credentialTypes,
			credentialsService,
		),
	);
	return new CredentialMatcherFactory(Container.get(IdBasedCredentialMatcher));
}

describe('IdBasedCredentialMatcher', () => {
	let context: CredentialMatcherContext;
	let matcherFactory: CredentialMatcherFactory;

	beforeEach(() => {
		jest.clearAllMocks();
		credentialTypes.recognizes.mockReturnValue(true);
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);
		context = { projectId: targetProject.id, user };
		matcherFactory = createMatcherFactory();
	});

	it('reports a missing credential when the user cannot use it in the target project', async () => {
		const requirement = {
			id: 'cred-global',
			name: 'Global',
			type: 'httpBasicAuth',
			usedByWorkflows: ['wf-1'],
		};

		const result = await matcherFactory.getMatcher('id-only').match([requirement], context);

		expect(result.successes).toEqual(new Map());
		expect(result.failures).toEqual([createFailure(requirement, 'not_found')]);
		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(user, {
			projectId: targetProject.id,
		});
	});

	it('does not query the database for unknown credential types', async () => {
		credentialTypes.recognizes.mockReturnValue(false);

		const requirement = {
			id: 'cred-x',
			name: 'Unknown',
			type: 'unknownCredentialType',
			usedByWorkflows: ['wf-1'],
		};

		const result = await matcherFactory.getMatcher('id-only').match([requirement], context);

		expect(result.failures).toEqual([createFailure(requirement, 'unknown_type')]);
		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow.mock.calls).toHaveLength(0);
	});

	it('resolves credentials owned by the target project', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usable('cred-manifest'),
		]);

		const result = await matcherFactory.getMatcher('id-only').match(
			[
				{
					id: 'cred-manifest',
					name: 'Manifest GitHub',
					type: 'githubApi',
					usedByWorkflows: ['wf-1'],
				},
			],
			context,
		);

		expect(result.successes).toEqual(new Map([['cred-manifest', 'cred-manifest']]));
		expect(result.failures).toEqual([]);
	});

	it('resolves credentials shared with the target project', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usable('cred-shared'),
		]);

		const result = await matcherFactory.getMatcher('id-only').match(
			[
				{
					id: 'cred-shared',
					name: 'Shared',
					type: 'githubApi',
					usedByWorkflows: ['wf-1'],
				},
			],
			context,
		);

		expect(result.successes).toEqual(new Map([['cred-shared', 'cred-shared']]));
		expect(result.failures).toEqual([]);
	});

	it('resolves global credentials usable in the target project', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usable('cred-global', 'httpBasicAuth'),
		]);

		const result = await matcherFactory.getMatcher('id-only').match(
			[
				{
					id: 'cred-global',
					name: 'Global',
					type: 'httpBasicAuth',
					usedByWorkflows: ['wf-1'],
				},
			],
			context,
		);

		expect(result.successes).toEqual(new Map([['cred-global', 'cred-global']]));
		expect(result.failures).toEqual([]);
	});

	it('treats credentials the user cannot read as missing', async () => {
		// getCredentialsAUserCanUseInAWorkflow only returns credentials the user can read, so a
		// custom role granting workflow:import without credential:read yields an empty result.
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);

		const requirement = {
			id: 'cred-manifest',
			name: 'Manifest GitHub',
			type: 'githubApi',
			usedByWorkflows: ['wf-1'],
		};

		const result = await matcherFactory.getMatcher('id-only').match([requirement], context);

		expect(result.successes).toEqual(new Map());
		expect(result.failures).toEqual([createFailure(requirement, 'not_found')]);
	});

	it('only binds requested ids even when more are usable in the project', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usable('cred-manifest'),
			usable('cred-unrelated'),
		]);

		const result = await matcherFactory.getMatcher('id-only').match(
			[
				{
					id: 'cred-manifest',
					name: 'Manifest GitHub',
					type: 'githubApi',
					usedByWorkflows: ['wf-1'],
				},
			],
			context,
		);

		expect(result.successes).toEqual(new Map([['cred-manifest', 'cred-manifest']]));
		expect(result.failures).toEqual([]);
	});

	it('should resolve explicit credential bindings when the target credential is accessible', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usable('target-cred'),
		]);

		const requirement = {
			id: 'source-cred',
			name: 'Source GitHub',
			type: 'githubApi',
			usedByWorkflows: ['wf-1'],
		};

		const result = await matcherFactory.getMatcher('id-only').match([requirement], {
			...context,
			credentialBindings: new Map([['source-cred', 'target-cred']]),
		});

		expect(result.successes).toEqual(new Map([['source-cred', 'target-cred']]));
		expect(result.failures).toEqual([]);
	});

	it('should error when the target of an explicit credential binding is inaccessible', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usable('source-cred'),
		]);

		const requirement = {
			id: 'source-cred',
			name: 'Source GitHub',
			type: 'githubApi',
			usedByWorkflows: ['wf-1'],
		};

		const result = await matcherFactory.getMatcher('id-only').match([requirement], {
			...context,
			credentialBindings: new Map([['source-cred', 'target-missing']]),
		});

		expect(result.successes).toEqual(new Map());
		expect(result.failures).toEqual([
			{ ...createFailure(requirement, 'not_found'), targetId: 'target-missing' },
		]);
	});

	it('should report a type mismatch when an explicit binding targets a credential of a different type', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usable('target-cred', 'slackApi'),
		]);

		const requirement = {
			id: 'source-cred',
			name: 'Source GitHub',
			type: 'githubApi',
			usedByWorkflows: ['wf-1'],
		};

		const result = await matcherFactory.getMatcher('id-only').match([requirement], {
			...context,
			credentialBindings: new Map([['source-cred', 'target-cred']]),
		});

		expect(result.successes).toEqual(new Map());
		expect(result.failures).toEqual([
			{
				...createFailure(requirement, 'type_mismatch'),
				targetId: 'target-cred',
				expectedType: 'githubApi',
				actualType: 'slackApi',
			},
		]);
	});
});

describe('CredentialMatcherFactory', () => {
	it('rejects unsupported credential matching modes', () => {
		const factory = createMatcherFactory();
		expect(() => factory.getMatcher('name-and-type' as 'id-only')).toThrow(BadRequestError);
	});
});
