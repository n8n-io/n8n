import type { Project, SharedCredentialsRepository, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';

import { CredentialImporter } from '../credential-importer';
import { CredentialMatcherFactory } from '../credential-matcher-factory';
import { CredentialMissingModeFactory } from '../credential-missing-mode-factory';
import type { CredentialBindingRequest } from '../credential.types';
import { IdBasedCredentialMatcher } from '../id-based-credential-matcher';

type UsableCredential = Awaited<
	ReturnType<CredentialsService['getCredentialsAUserCanUseInAWorkflow']>
>[number];

const usable = (id: string): UsableCredential => ({ id }) as UsableCredential;

describe('CredentialImporter', () => {
	const credentialsFinderService = mock<CredentialsFinderService>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const credentialsService = mock<CredentialsService>();
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
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);
		Container.set(
			IdBasedCredentialMatcher,
			new IdBasedCredentialMatcher(
				credentialsFinderService,
				sharedCredentialsRepository,
				credentialTypes,
				credentialsService,
			),
		);
		importer = new CredentialImporter(
			new CredentialMatcherFactory(Container.get(IdBasedCredentialMatcher)),
			new CredentialMissingModeFactory(),
		);
	});

	it('returns matched bindings when credentials exist on the target instance', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usable('cred-manifest'),
		]);

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

		expect(credentialResolution.successes).toEqual(new Map([['cred-manifest', 'cred-manifest']]));
		expect(credentialResolution.failures).toEqual([]);
	});
});
