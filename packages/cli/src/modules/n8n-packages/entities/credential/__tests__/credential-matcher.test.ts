import type { CredentialsRepository, Project, SharedCredentialsRepository, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { CredentialMatcherContext } from '../credential-matcher';
import { applyCredentialMatching, createCredentialMatcher } from '../credential-matcher-factory';
import { createFailure, createSuccessBinding } from '../credential.types';
import { IdBasedCredentialMatcher } from '../id-based-credential-matcher';

describe('IdBasedCredentialMatcher', () => {
	const credentialsFinderService = mock<CredentialsFinderService>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const credentialsRepository = mock<CredentialsRepository>();
	const credentialTypes = mock<CredentialTypes>();
	const targetProject = mock<Project>({ id: 'project-target' });
	const user = mock<User>({ id: 'user-1' });

	let context: CredentialMatcherContext;

	beforeEach(() => {
		jest.clearAllMocks();
		credentialTypes.recognizes.mockReturnValue(true);
		sharedCredentialsRepository.find.mockResolvedValue([]);
		credentialsRepository.find.mockResolvedValue([]);
		// By default the user can read every credential we hand to the accessibility filter.
		credentialsFinderService.findCredentialIdsWithScopeForUser.mockImplementation(
			async (credentialIds) => {
				await Promise.resolve();
				return new Set(credentialIds);
			},
		);
		context = { targetProject, user };
		Container.set(
			IdBasedCredentialMatcher,
			new IdBasedCredentialMatcher(
				credentialsFinderService,
				sharedCredentialsRepository,
				credentialTypes,
				credentialsRepository,
			),
		);
	});

	it('reports a missing credential when it is neither owned by the project nor global', async () => {
		const requirement = {
			id: 'cred-global',
			name: 'Global',
			type: 'httpBasicAuth',
			usedByWorkflows: ['wf-1'],
		};

		const result = await applyCredentialMatching('id-only', [requirement], context);

		expect(result.successes).toEqual([]);
		expect(result.failures).toEqual([createFailure(requirement, 'not_found')]);
	});

	it('does not query the database for unknown credential types', async () => {
		credentialTypes.recognizes.mockReturnValue(false);

		const requirement = {
			id: 'cred-x',
			name: 'Unknown',
			type: 'unknownCredentialType',
			usedByWorkflows: ['wf-1'],
		};

		const result = await applyCredentialMatching('id-only', [requirement], context);

		expect(result.failures).toEqual([createFailure(requirement, 'unknown_type')]);
		expect(sharedCredentialsRepository.find.mock.calls).toHaveLength(0);
		expect(credentialsRepository.find.mock.calls).toHaveLength(0);
		expect(credentialsFinderService.findCredentialIdsWithScopeForUser.mock.calls).toHaveLength(0);
	});

	it('resolves credentials owned in the target project without a global lookup', async () => {
		sharedCredentialsRepository.find.mockResolvedValue([
			{ credentialsId: 'cred-manifest' },
		] as never);

		const result = await applyCredentialMatching(
			'id-only',
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

		expect(result.successes).toEqual([createSuccessBinding('cred-manifest', 'cred-manifest')]);
		expect(result.failures).toEqual([]);
		// Everything resolved against the project, so the instance-wide global lookup is skipped.
		expect(credentialsRepository.find.mock.calls).toHaveLength(0);
	});

	it('falls back to global credentials when not owned in the target project', async () => {
		credentialsRepository.find.mockResolvedValue([{ id: 'cred-global' }] as never);

		const result = await applyCredentialMatching(
			'id-only',
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

		expect(result.successes).toEqual([createSuccessBinding('cred-global', 'cred-global')]);
		expect(result.failures).toEqual([]);
	});

	it('does not match credentials that are neither owned in the target project nor global', async () => {
		const requirement = {
			id: 'cred-shared',
			name: 'Shared',
			type: 'githubApi',
			usedByWorkflows: ['wf-1'],
		};

		const result = await applyCredentialMatching('id-only', [requirement], context);

		expect(result.successes).toEqual([]);
		expect(result.failures).toEqual([createFailure(requirement, 'not_found')]);
	});

	it('treats credentials the user cannot read as missing even when owned by the target project', async () => {
		sharedCredentialsRepository.find.mockResolvedValue([
			{ credentialsId: 'cred-manifest' },
		] as never);
		// A custom role can grant workflow:import without credential:read, so the credential is
		// owned by the project but the user is not allowed to read it.
		credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(new Set());

		const requirement = {
			id: 'cred-manifest',
			name: 'Manifest GitHub',
			type: 'githubApi',
			usedByWorkflows: ['wf-1'],
		};

		const result = await applyCredentialMatching('id-only', [requirement], context);

		expect(result.successes).toEqual([]);
		expect(result.failures).toEqual([createFailure(requirement, 'not_found')]);
		expect(credentialsFinderService.findCredentialIdsWithScopeForUser.mock.calls[0]).toEqual([
			['cred-manifest'],
			user,
			['credential:read'],
		]);
	});
});

describe('createCredentialMatcher', () => {
	it('rejects unsupported credential matching modes', () => {
		expect(() => createCredentialMatcher('name-and-type' as 'id-only')).toThrow(BadRequestError);
	});
});
