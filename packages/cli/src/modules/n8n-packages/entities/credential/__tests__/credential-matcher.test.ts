import type { Project, SlimProject, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { CredentialMatcherContext, UsableCredential } from '../credential-matcher';
import { CredentialMatcherFactory } from '../credential-matcher-factory';
import { createFailure } from '../credential.types';
import { IdBasedCredentialMatcher } from '../id-based-credential-matcher';
import { NameAndTypeCredentialMatcher } from '../name-and-type-credential-matcher';
import { TypeOnlyCredentialMatcher } from '../type-only-credential-matcher';

const usable = (id: string, type = 'githubApi'): UsableCredential =>
	({ id, type }) as UsableCredential;

const usableWith = (overrides: Partial<UsableCredential> & { id: string }): UsableCredential =>
	({
		type: 'githubApi',
		name: overrides.id,
		updatedAt: '2024-01-01T00:00:00.000Z',
		isGlobal: false,
		homeProject: null,
		sharedWithProjects: [],
		...overrides,
	}) as UsableCredential;

const credentialsService = mock<CredentialsService>();
const credentialTypes = mock<CredentialTypes>();
const targetProject = mock<Project>({ id: 'project-target' });
const targetProjectRef = mock<SlimProject>({ id: targetProject.id });
const user = mock<User>({ id: 'user-1' });

function createMatcherFactory(): CredentialMatcherFactory {
	Container.set(
		IdBasedCredentialMatcher,
		new IdBasedCredentialMatcher(credentialTypes, credentialsService),
	);
	Container.set(
		NameAndTypeCredentialMatcher,
		new NameAndTypeCredentialMatcher(credentialTypes, credentialsService),
	);
	Container.set(
		TypeOnlyCredentialMatcher,
		new TypeOnlyCredentialMatcher(credentialTypes, credentialsService),
	);
	return new CredentialMatcherFactory(
		Container.get(IdBasedCredentialMatcher),
		Container.get(NameAndTypeCredentialMatcher),
		Container.get(TypeOnlyCredentialMatcher),
	);
}

describe('IdBasedCredentialMatcher', () => {
	let context: CredentialMatcherContext;
	let matcherFactory: CredentialMatcherFactory;

	beforeEach(() => {
		vi.clearAllMocks();
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

describe('NameAndTypeCredentialMatcher', () => {
	let context: CredentialMatcherContext;
	let matcherFactory: CredentialMatcherFactory;

	const requirement = {
		id: 'source-cred',
		name: 'Production GitHub',
		type: 'githubApi',
		usedByWorkflows: ['wf-1'],
	};

	beforeEach(() => {
		vi.clearAllMocks();
		credentialTypes.recognizes.mockReturnValue(true);
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);
		context = { projectId: targetProject.id, user };
		matcherFactory = createMatcherFactory();
	});

	it('matches a credential with the exact same name and type', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({
				id: 'target-cred',
				name: 'Production GitHub',
				homeProject: targetProjectRef,
			}),
		]);

		const result = await matcherFactory.getMatcher('name-and-type').match([requirement], context);

		expect(result.successes).toEqual(new Map([['source-cred', 'target-cred']]));
		expect(result.failures).toEqual([]);
	});

	it('does not match when only the name is equal', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({
				id: 'target-cred',
				name: 'Production GitHub',
				type: 'slackApi',
				homeProject: targetProjectRef,
			}),
		]);

		const result = await matcherFactory.getMatcher('name-and-type').match([requirement], context);

		expect(result.successes).toEqual(new Map());
		expect(result.failures).toEqual([createFailure(requirement, 'not_found')]);
	});

	it('does not match when only the type is equal', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({
				id: 'target-cred',
				name: 'A different name',
				homeProject: targetProjectRef,
			}),
		]);

		const result = await matcherFactory.getMatcher('name-and-type').match([requirement], context);

		expect(result.successes).toEqual(new Map());
		expect(result.failures).toEqual([createFailure(requirement, 'not_found')]);
	});

	it('prefers a project-owned match over a more recently updated global match', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({
				id: 'global-cred',
				name: 'Production GitHub',
				isGlobal: true,
				updatedAt: '2024-06-01T00:00:00.000Z',
			}),
			usableWith({
				id: 'project-cred',
				name: 'Production GitHub',
				homeProject: targetProjectRef,
				updatedAt: '2024-01-01T00:00:00.000Z',
			}),
		]);

		const result = await matcherFactory.getMatcher('name-and-type').match([requirement], context);

		expect(result.successes).toEqual(new Map([['source-cred', 'project-cred']]));
	});

	it('falls back to a global match when no project-owned candidate exists', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({ id: 'global-cred', name: 'Production GitHub', isGlobal: true }),
		]);

		const result = await matcherFactory.getMatcher('name-and-type').match([requirement], context);

		expect(result.successes).toEqual(new Map([['source-cred', 'global-cred']]));
	});

	it('falls back to a credential shared into the target project when none is owned', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({
				id: 'shared-in-cred',
				name: 'Production GitHub',
				sharedWithProjects: [targetProjectRef],
			}),
			usableWith({
				id: 'global-cred',
				name: 'Production GitHub',
				isGlobal: true,
				updatedAt: '2024-06-01T00:00:00.000Z',
			}),
		]);

		const result = await matcherFactory.getMatcher('name-and-type').match([requirement], context);

		expect(result.successes).toEqual(new Map([['source-cred', 'shared-in-cred']]));
	});

	it('prefers an owned candidate over a more recently updated one merely shared into the project', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({
				id: 'owned-cred',
				name: 'Production GitHub',
				homeProject: targetProjectRef,
				updatedAt: '2024-01-01T00:00:00.000Z',
			}),
			usableWith({
				id: 'shared-in-cred',
				name: 'Production GitHub',
				sharedWithProjects: [targetProjectRef],
				updatedAt: '2024-06-01T00:00:00.000Z',
			}),
		]);

		const result = await matcherFactory.getMatcher('name-and-type').match([requirement], context);

		expect(result.successes).toEqual(new Map([['source-cred', 'owned-cred']]));
	});

	it('picks the most recently updated candidate within a tier', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({
				id: 'older-cred',
				name: 'Production GitHub',
				homeProject: targetProjectRef,
				updatedAt: '2024-01-01T00:00:00.000Z',
			}),
			usableWith({
				id: 'newer-cred',
				name: 'Production GitHub',
				homeProject: targetProjectRef,
				updatedAt: '2024-06-01T00:00:00.000Z',
			}),
		]);

		const result = await matcherFactory.getMatcher('name-and-type').match([requirement], context);

		expect(result.successes).toEqual(new Map([['source-cred', 'newer-cred']]));
	});

	it('keeps the more recently updated candidate when an older one is encountered after it', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({
				id: 'newer-cred',
				name: 'Production GitHub',
				homeProject: targetProjectRef,
				updatedAt: '2024-06-01T00:00:00.000Z',
			}),
			usableWith({
				id: 'older-cred',
				name: 'Production GitHub',
				homeProject: targetProjectRef,
				updatedAt: '2024-01-01T00:00:00.000Z',
			}),
		]);

		const result = await matcherFactory.getMatcher('name-and-type').match([requirement], context);

		expect(result.successes).toEqual(new Map([['source-cred', 'newer-cred']]));
	});

	it('breaks ties on identical updatedAt by the lexicographically smaller id', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({
				id: 'cred-b',
				name: 'Production GitHub',
				homeProject: targetProjectRef,
			}),
			usableWith({
				id: 'cred-a',
				name: 'Production GitHub',
				homeProject: targetProjectRef,
			}),
		]);

		const result = await matcherFactory.getMatcher('name-and-type').match([requirement], context);

		expect(result.successes).toEqual(new Map([['source-cred', 'cred-a']]));
	});

	it('keeps the tie-break winner when the smaller id is encountered first', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({
				id: 'cred-a',
				name: 'Production GitHub',
				homeProject: targetProjectRef,
			}),
			usableWith({
				id: 'cred-b',
				name: 'Production GitHub',
				homeProject: targetProjectRef,
			}),
		]);

		const result = await matcherFactory.getMatcher('name-and-type').match([requirement], context);

		expect(result.successes).toEqual(new Map([['source-cred', 'cred-a']]));
	});

	it('bypasses name/type matching for a reference with an explicit credentialBindings entry', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({
				id: 'name-type-match',
				name: 'Production GitHub',
				homeProject: targetProjectRef,
			}),
			usableWith({
				id: 'explicit-target',
				name: 'Completely unrelated name',
				type: 'slackApi',
				homeProject: targetProjectRef,
			}),
		]);

		const result = await matcherFactory.getMatcher('name-and-type').match([requirement], {
			...context,
			credentialBindings: new Map([['source-cred', 'explicit-target']]),
		});

		// Bound explicitly to a credential of a different type than the reference requires,
		// so it surfaces as a type_mismatch rather than silently matching by name/type instead.
		expect(result.successes).toEqual(new Map());
		expect(result.failures).toEqual([
			{
				...createFailure(requirement, 'type_mismatch'),
				targetId: 'explicit-target',
				expectedType: 'githubApi',
				actualType: 'slackApi',
			},
		]);
	});

	it('uses the explicit binding target even when another credential would win the name/type search', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({
				id: 'fuzzy-winner',
				name: 'Production GitHub', // exact name+type match — would win an unbound search
				homeProject: targetProjectRef,
			}),
			usableWith({
				id: 'explicit-target',
				name: 'Totally different name', // would never surface via name/type search on its own
				homeProject: targetProjectRef,
			}),
		]);

		const result = await matcherFactory.getMatcher('name-and-type').match([requirement], {
			...context,
			credentialBindings: new Map([['source-cred', 'explicit-target']]),
		});

		expect(result.successes).toEqual(new Map([['source-cred', 'explicit-target']]));
		expect(result.failures).toEqual([]);
	});
});

describe('TypeOnlyCredentialMatcher', () => {
	let context: CredentialMatcherContext;
	let matcherFactory: CredentialMatcherFactory;

	const requirement = {
		id: 'source-cred',
		name: 'Irrelevant name',
		type: 'githubApi',
		usedByWorkflows: ['wf-1'],
	};

	beforeEach(() => {
		vi.clearAllMocks();
		credentialTypes.recognizes.mockReturnValue(true);
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);
		context = { projectId: targetProject.id, user };
		matcherFactory = createMatcherFactory();
	});

	it('matches any credential of the same type regardless of name', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({
				id: 'target-cred',
				name: 'A completely different name',
				homeProject: targetProjectRef,
			}),
		]);

		const result = await matcherFactory.getMatcher('type-only').match([requirement], context);

		expect(result.successes).toEqual(new Map([['source-cred', 'target-cred']]));
		expect(result.failures).toEqual([]);
	});

	it('reports not_found when no credential of the type exists', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({ id: 'other-cred', type: 'slackApi', homeProject: targetProjectRef }),
		]);

		const result = await matcherFactory.getMatcher('type-only').match([requirement], context);

		expect(result.successes).toEqual(new Map());
		expect(result.failures).toEqual([createFailure(requirement, 'not_found')]);
	});

	it('prefers a project-owned match over a more recently updated global match', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({ id: 'global-cred', isGlobal: true, updatedAt: '2024-06-01T00:00:00.000Z' }),
			usableWith({
				id: 'project-cred',
				homeProject: targetProjectRef,
				updatedAt: '2024-01-01T00:00:00.000Z',
			}),
		]);

		const result = await matcherFactory.getMatcher('type-only').match([requirement], context);

		expect(result.successes).toEqual(new Map([['source-cred', 'project-cred']]));
	});

	it('falls back to a global match when no project-owned candidate exists', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({ id: 'global-cred', isGlobal: true }),
		]);

		const result = await matcherFactory.getMatcher('type-only').match([requirement], context);

		expect(result.successes).toEqual(new Map([['source-cred', 'global-cred']]));
	});

	it('falls back to a credential shared into the target project when none is owned', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({ id: 'shared-in-cred', sharedWithProjects: [targetProjectRef] }),
			usableWith({ id: 'global-cred', isGlobal: true, updatedAt: '2024-06-01T00:00:00.000Z' }),
		]);

		const result = await matcherFactory.getMatcher('type-only').match([requirement], context);

		expect(result.successes).toEqual(new Map([['source-cred', 'shared-in-cred']]));
	});

	it('prefers an owned candidate over a more recently updated one merely shared into the project', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({
				id: 'owned-cred',
				homeProject: targetProjectRef,
				updatedAt: '2024-01-01T00:00:00.000Z',
			}),
			usableWith({
				id: 'shared-in-cred',
				sharedWithProjects: [targetProjectRef],
				updatedAt: '2024-06-01T00:00:00.000Z',
			}),
		]);

		const result = await matcherFactory.getMatcher('type-only').match([requirement], context);

		expect(result.successes).toEqual(new Map([['source-cred', 'owned-cred']]));
	});

	it('picks the most recently updated candidate within a tier', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({
				id: 'older-cred',
				homeProject: targetProjectRef,
				updatedAt: '2024-01-01T00:00:00.000Z',
			}),
			usableWith({
				id: 'newer-cred',
				homeProject: targetProjectRef,
				updatedAt: '2024-06-01T00:00:00.000Z',
			}),
		]);

		const result = await matcherFactory.getMatcher('type-only').match([requirement], context);

		expect(result.successes).toEqual(new Map([['source-cred', 'newer-cred']]));
	});

	it('bypasses type matching for a reference with an explicit credentialBindings entry', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({ id: 'type-match', homeProject: targetProjectRef }),
			usableWith({ id: 'explicit-target', type: 'slackApi', homeProject: targetProjectRef }),
		]);

		const result = await matcherFactory.getMatcher('type-only').match([requirement], {
			...context,
			credentialBindings: new Map([['source-cred', 'explicit-target']]),
		});

		// Bound explicitly to a credential of a different type than the reference requires,
		// so it surfaces as a type_mismatch rather than silently matching by type instead.
		expect(result.successes).toEqual(new Map());
		expect(result.failures).toEqual([
			{
				...createFailure(requirement, 'type_mismatch'),
				targetId: 'explicit-target',
				expectedType: 'githubApi',
				actualType: 'slackApi',
			},
		]);
	});

	it('uses the explicit binding target even when another credential would win the type search', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usableWith({
				id: 'fuzzy-winner',
				homeProject: targetProjectRef, // project-tier — would win an unbound type-only search
				updatedAt: '2024-06-01T00:00:00.000Z',
			}),
			usableWith({
				id: 'explicit-target',
				isGlobal: true, // global-tier — would lose to fuzzy-winner in an unbound search
				updatedAt: '2020-01-01T00:00:00.000Z',
			}),
		]);

		const result = await matcherFactory.getMatcher('type-only').match([requirement], {
			...context,
			credentialBindings: new Map([['source-cred', 'explicit-target']]),
		});

		expect(result.successes).toEqual(new Map([['source-cred', 'explicit-target']]));
		expect(result.failures).toEqual([]);
	});
});

describe('CredentialMatcherFactory', () => {
	it('rejects unsupported credential matching modes', () => {
		const factory = createMatcherFactory();
		expect(() => factory.getMatcher('fuzzy-match' as 'id-only')).toThrow(BadRequestError);
	});
});
