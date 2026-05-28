import type { Project, SharedCredentialsRepository, User } from '@n8n/db';
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
	const credentialTypes = mock<CredentialTypes>();
	const targetProject = mock<Project>({ id: 'project-target' });
	const user = mock<User>({ id: 'user-1' });

	let context: CredentialMatcherContext;

	beforeEach(() => {
		jest.clearAllMocks();
		credentialTypes.recognizes.mockReturnValue(true);
		sharedCredentialsRepository.find.mockResolvedValue([]);
		credentialsFinderService.findAllCredentialsForUser.mockResolvedValue([]);
		context = { targetProject, user };
		Container.set(
			IdBasedCredentialMatcher,
			new IdBasedCredentialMatcher(
				credentialsFinderService,
				sharedCredentialsRepository,
				credentialTypes,
			),
		);
	});

	it('treats global credentials as missing when the user lacks credential:read', async () => {
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
		expect(credentialsFinderService.findAllCredentialsForUser.mock.calls).toHaveLength(0);
	});

	it('resolves credentials owned in the target project', async () => {
		sharedCredentialsRepository.find.mockResolvedValue([
			{ credentialsId: 'cred-manifest' },
		] as never);
		credentialsFinderService.findAllCredentialsForUser.mockResolvedValue([
			{ id: 'cred-manifest', isGlobal: false },
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
		expect(credentialsFinderService.findAllCredentialsForUser).toHaveBeenCalledWith(
			user,
			['credential:read'],
			undefined,
			{ includeGlobalCredentials: true },
		);
	});

	it('resolves global credentials readable by the user but not owned in the target project', async () => {
		credentialsFinderService.findAllCredentialsForUser.mockResolvedValue([
			{ id: 'cred-global', isGlobal: true },
		] as never);

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

	it('does not match credentials the user can read but are not owned in the target project', async () => {
		credentialsFinderService.findAllCredentialsForUser.mockResolvedValue([
			{ id: 'cred-shared', isGlobal: false },
		] as never);

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
});

describe('createCredentialMatcher', () => {
	it('rejects unsupported credential matching modes', () => {
		expect(() => createCredentialMatcher('name-and-type' as 'id-only')).toThrow(BadRequestError);
	});
});
