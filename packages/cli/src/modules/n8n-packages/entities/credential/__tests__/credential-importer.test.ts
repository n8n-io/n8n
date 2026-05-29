import type { CredentialsRepository, Project, SharedCredentialsRepository, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';

import { CredentialImporter } from '../credential-importer';
import type { CredentialBindingRequest } from '../credential.types';
import { createSuccessBinding } from '../credential.types';
import { IdBasedCredentialMatcher } from '../id-based-credential-matcher';

describe('CredentialImporter', () => {
	const credentialsFinderService = mock<CredentialsFinderService>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const credentialsRepository = mock<CredentialsRepository>();
	const credentialTypes = mock<CredentialTypes>();
	const targetProject = mock<Project>({ id: 'project-target' });
	const user = mock<User>({ id: 'user-1' });

	let importer: CredentialImporter;

	const bindingRequest = (
		requirements: CredentialBindingRequest['requirements'],
	): CredentialBindingRequest => ({
		requirements,
		matchingMode: 'id-only',
		missingMode: 'must-preexist',
		targetProject,
		user,
	});

	beforeEach(() => {
		jest.clearAllMocks();
		credentialTypes.recognizes.mockReturnValue(true);
		sharedCredentialsRepository.find.mockResolvedValue([]);
		credentialsRepository.find.mockResolvedValue([]);
		credentialsFinderService.findCredentialIdsWithScopeForUser.mockImplementation(
			async (credentialIds) => {
				await Promise.resolve();
				return new Set(credentialIds);
			},
		);
		Container.set(
			IdBasedCredentialMatcher,
			new IdBasedCredentialMatcher(
				credentialsFinderService,
				sharedCredentialsRepository,
				credentialTypes,
				credentialsRepository,
			),
		);
		importer = new CredentialImporter();
	});

	it('returns matched bindings when credentials exist on the target instance', async () => {
		sharedCredentialsRepository.find.mockResolvedValue([
			{ credentialsId: 'cred-manifest' },
		] as never);

		const credentialResolution = await importer.resolveForImport(
			bindingRequest([
				{
					id: 'cred-manifest',
					name: 'Manifest GitHub',
					type: 'githubApi',
					usedByWorkflows: ['wf-1'],
				},
			]),
		);

		expect(credentialResolution.successes).toEqual([
			createSuccessBinding('cred-manifest', 'cred-manifest'),
		]);
		expect(credentialResolution.failures).toEqual([]);
	});
});
