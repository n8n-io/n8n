import type { Project, SharedCredentialsRepository, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
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

const usable = (id: string, type = 'githubApi'): UsableCredential =>
	({ id, type }) as UsableCredential;

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
		options: {
			credentialBindings?: CredentialBindingRequest['credentialBindings'];
			missingMode?: CredentialBindingRequest['missingMode'];
		} = {},
	): CredentialBindingRequest => ({
		requirements,
		matchingMode: 'id-only',
		missingMode: options.missingMode ?? 'must-preexist',
		credentialBindings: options.credentialBindings,
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
			credentialsService,
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
			{
				kind: 'not_found',
				sourceId: 'cred-missing',
				name: 'Missing',
				type: 'githubApi',
				usedByWorkflows: ['wf-1'],
			},
		]);
		expect(importer.blockingFailures(credentialResolution, request)).toEqual([
			{
				kind: 'not_found',
				sourceId: 'cred-missing',
				name: 'Missing',
				type: 'githubApi',
				usedByWorkflows: ['wf-1'],
			},
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
			{ credentialBindings: new Map([['source-cred', 'target-cred']]) },
		);
		const credentialResolution = await importer.plan(request);

		expect(credentialResolution.successes).toEqual(new Map([['source-cred', 'target-cred']]));
		expect(credentialResolution.failures).toEqual([]);
	});

	it('should error when the source of an explicit credential binding is not in the package', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			usable('target-cred'),
		]);

		const request = bindingRequest([], {
			credentialBindings: new Map([['missing-source', 'target-cred']]),
		});
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
			{ credentialBindings: new Map([['source-cred', 'target-missing']]) },
		);
		const credentialResolution = await importer.plan(request);

		expect(credentialResolution.successes).toEqual(new Map());
		expect(credentialResolution.failures).toEqual([
			{
				kind: 'not_found',
				sourceId: 'source-cred',
				name: 'Source GitHub',
				type: 'githubApi',
				targetId: 'target-missing',
				usedByWorkflows: ['wf-1'],
			},
		]);
	});

	describe('create-stub', () => {
		it('apply creates one stub per missing source id and dedupes shared references', async () => {
			credentialsService.createImportStubCredential.mockResolvedValue({ id: 'stub-1' } as never);

			const request = bindingRequest(
				[
					{
						id: 'missing-cred',
						name: 'Missing GitHub',
						type: 'githubApi',
						usedByWorkflows: ['wf-1', 'wf-2'],
					},
				],
				{ missingMode: 'create-stub' },
			);
			const resolution = {
				successes: new Map<string, string>(),
				failures: [
					{
						kind: 'not_found' as const,
						sourceId: 'missing-cred',
						name: 'Missing GitHub',
						type: 'githubApi',
						usedByWorkflows: ['wf-1', 'wf-2'],
					},
				],
			};

			const result = await importer.apply(request, resolution);

			expect(credentialsService.createImportStubCredential).toHaveBeenCalledTimes(1);
			expect(credentialsService.createImportStubCredential).toHaveBeenCalledWith(
				{
					name: 'Missing GitHub',
					type: 'githubApi',
					projectId: 'project-target',
				},
				user,
			);
			expect(result).toEqual({
				bindings: new Map([['missing-cred', 'stub-1']]),
				matched: [],
				stubbed: ['missing-cred'],
			});
		});

		it('apply does not stub not_found failures with an explicit binding target', async () => {
			const request = bindingRequest(
				[
					{
						id: 'source-cred',
						name: 'Source GitHub',
						type: 'githubApi',
						usedByWorkflows: ['wf-1'],
					},
				],
				{
					missingMode: 'create-stub',
					credentialBindings: new Map([['source-cred', 'target-missing']]),
				},
			);

			const result = await importer.apply(request, {
				successes: new Map(),
				failures: [
					{
						kind: 'not_found',
						sourceId: 'source-cred',
						name: 'Source GitHub',
						type: 'githubApi',
						targetId: 'target-missing',
						usedByWorkflows: ['wf-1'],
					},
				],
			});

			expect(credentialsService.createImportStubCredential).not.toHaveBeenCalled();
			expect(result).toEqual({
				bindings: new Map(),
				matched: [],
				stubbed: [],
			});
		});

		it('apply stubs not_found failures from failure metadata without requirements', async () => {
			credentialsService.createImportStubCredential.mockResolvedValue({ id: 'stub-1' } as never);

			const result = await importer.apply(bindingRequest([], { missingMode: 'create-stub' }), {
				successes: new Map(),
				failures: [
					{
						kind: 'not_found',
						sourceId: 'orphan-not-in-requirements',
						name: 'Package GitHub',
						type: 'githubApi',
						usedByWorkflows: ['wf-1'],
					},
				],
			});

			expect(credentialsService.createImportStubCredential).toHaveBeenCalledWith(
				{
					name: 'Package GitHub',
					type: 'githubApi',
					projectId: 'project-target',
				},
				user,
			);
			expect(result.stubbed).toEqual(['orphan-not-in-requirements']);
		});

		it('apply rejects when stub creation lacks credential:create', async () => {
			credentialsService.createImportStubCredential.mockRejectedValue(
				new ForbiddenError(
					"You don't have the permissions to save the credential in this project.",
				),
			);

			await expect(
				importer.apply(
					bindingRequest(
						[
							{
								id: 'missing-cred',
								name: 'Missing',
								type: 'githubApi',
								usedByWorkflows: ['wf-1'],
							},
						],
						{ missingMode: 'create-stub' },
					),
					{
						successes: new Map(),
						failures: [
							{
								kind: 'not_found',
								sourceId: 'missing-cred',
								name: 'Missing',
								type: 'githubApi',
								usedByWorkflows: ['wf-1'],
							},
						],
					},
				),
			).rejects.toBeInstanceOf(ForbiddenError);
		});
	});
});
