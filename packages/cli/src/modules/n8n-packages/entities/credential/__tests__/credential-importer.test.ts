import type { Project, SharedCredentialsRepository, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';

import { CredentialImporter } from '../credential-importer';
import { CredentialMatcherFactory } from '../credential-matcher-factory';
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
		credentialBindings?: CredentialBindingRequest['credentialBindings'],
	): CredentialBindingRequest => ({
		requirements,
		matchingMode: 'id-only',
		missingMode: 'must-preexist',
		credentialBindings,
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
		);
	});

	it('returns matched bindings when credentials exist on the target instance', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usable('cred-manifest'),
		]);

		const request = bindingRequest([
			{
				id: 'cred-manifest',
				name: 'Manifest GitHub',
				type: 'githubApi',
				usedByWorkflows: ['wf-1'],
			},
		]);
		const credentialResolution = await importer.plan(request);

		expect(credentialResolution.successes).toEqual(new Map([['cred-manifest', 'cred-manifest']]));
		expect(credentialResolution.failures).toEqual([]);
		expect(importer.blockingFailures(credentialResolution, request)).toEqual([]);
	});

	it('plan reports failures without throwing, and must-preexist treats them as blocking', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);

		const request = bindingRequest([
			{ id: 'cred-missing', name: 'Missing', type: 'githubApi', usedByWorkflows: ['wf-1'] },
		]);
		const credentialResolution = await importer.plan(request);

		expect(credentialResolution.successes).toEqual(new Map());
		expect(credentialResolution.failures).toEqual([
			{ kind: 'not_found', sourceId: 'cred-missing', usedByWorkflows: ['wf-1'] },
		]);
		expect(importer.blockingFailures(credentialResolution, request)).toEqual([
			{ kind: 'not_found', sourceId: 'cred-missing', usedByWorkflows: ['wf-1'] },
		]);
	});

	it('uses explicit bindings before id-only matching', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usable('target-cred'),
		]);

		const request = bindingRequest(
			[
				{
					id: 'source-cred',
					name: 'Source GitHub',
					type: 'githubApi',
					usedByWorkflows: ['wf-1'],
				},
			],
			new Map([['source-cred', 'target-cred']]),
		);
		const credentialResolution = await importer.plan(request);

		expect(credentialResolution.successes).toEqual(new Map([['source-cred', 'target-cred']]));
		expect(credentialResolution.failures).toEqual([]);
	});

	it('should error when the source of an explicit credential binding is not in the package', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usable('target-cred'),
		]);

		const request = bindingRequest([], new Map([['missing-source', 'target-cred']]));
		const credentialResolution = await importer.plan(request);

		expect(credentialResolution.successes).toEqual(new Map());
		expect(credentialResolution.failures).toEqual([
			{
				kind: 'source_not_found',
				sourceId: 'missing-source',
				targetId: 'target-cred',
				usedByWorkflows: [],
			},
		]);
	});

	it('should error when the target of an explicit credential binding is inaccessible', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usable('source-cred'),
		]);

		const request = bindingRequest(
			[
				{
					id: 'source-cred',
					name: 'Source GitHub',
					type: 'githubApi',
					usedByWorkflows: ['wf-1'],
				},
			],
			new Map([['source-cred', 'target-missing']]),
		);
		const credentialResolution = await importer.plan(request);

		expect(credentialResolution.successes).toEqual(new Map());
		expect(credentialResolution.failures).toEqual([
			{
				kind: 'not_found',
				sourceId: 'source-cred',
				targetId: 'target-missing',
				usedByWorkflows: ['wf-1'],
			},
		]);
	});
});
