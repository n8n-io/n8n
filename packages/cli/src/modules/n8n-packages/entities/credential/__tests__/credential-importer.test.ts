import type { Project, SharedCredentialsRepository, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { CredentialTypes } from '@/credential-types';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';

import type { ImportContext } from '../../../n8n-packages.types';
import { CredentialImporter } from '../credential-importer';
import { CredentialMatcherFactory } from '../credential-matcher-factory';
import type { CredentialBindingRequest, CredentialResolutionFailure } from '../credential.types';
import { IdBasedCredentialMatcher } from '../id-based-credential-matcher';

type UsableCredential = Awaited<
	ReturnType<CredentialsService['getCredentialsAUserCanUseInAWorkflow']>
>[number];
type CredentialRequirement = NonNullable<CredentialBindingRequest['requirements']>[number];

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

	const context: ImportContext = { user, projectId: targetProject.id, folderId: null };

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
	});

	const packageCredential = (
		overrides: Partial<CredentialRequirement> & Pick<CredentialRequirement, 'id'>,
	): CredentialRequirement => ({
		name: 'Source GitHub',
		type: 'githubApi',
		usedByWorkflows: ['wf-1'],
		...overrides,
	});

	const notFoundFailure = (
		credential: CredentialRequirement,
		overrides: Partial<CredentialResolutionFailure> = {},
	): CredentialResolutionFailure => ({
		kind: 'not_found',
		sourceId: credential.id,
		name: credential.name,
		type: credential.type,
		usedByWorkflows: credential.usedByWorkflows,
		...overrides,
	});

	beforeEach(() => {
		vi.clearAllMocks();
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
		const credentialResolution = await importer.plan(context, request);

		expect(credentialResolution.successes).toEqual(new Map([['cred-manifest', 'cred-manifest']]));
		expect(credentialResolution.failures).toEqual([]);
		expect(importer.blockingFailures(request, credentialResolution)).toEqual([]);
	});

	it('plan reports failures without throwing, and must-preexist treats them as blocking', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);

		const request = bindingRequest([
			{ id: 'cred-missing', name: 'Missing', type: 'githubApi', usedByWorkflows: ['wf-1'] },
		]);
		const credentialResolution = await importer.plan(context, request);

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
		expect(importer.blockingFailures(request, credentialResolution)).toEqual([
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
		const credentialResolution = await importer.plan(context, request);

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
		const credentialResolution = await importer.plan(context, request);

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
		const credentialResolution = await importer.plan(context, request);

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
			credentialsService.createStubCredential.mockResolvedValue({ id: 'stub-1' } as never);

			const missingCredential = packageCredential({
				id: 'missing-cred',
				name: 'Missing GitHub',
				usedByWorkflows: ['wf-1', 'wf-2'],
			});
			const request = bindingRequest([missingCredential], { missingMode: 'create-stub' });
			const resolution = {
				successes: new Map<string, string>(),
				failures: [notFoundFailure(missingCredential)],
			};

			const result = await importer.apply(context, request, resolution);

			expect(credentialsService.createStubCredential).toHaveBeenCalledTimes(1);
			expect(credentialsService.createStubCredential).toHaveBeenCalledWith(
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
			const sourceCredential = packageCredential({ id: 'source-cred' });
			const request = bindingRequest([sourceCredential], {
				missingMode: 'create-stub',
				credentialBindings: new Map([['source-cred', 'target-missing']]),
			});

			const result = await importer.apply(context, request, {
				successes: new Map(),
				failures: [notFoundFailure(sourceCredential, { targetId: 'target-missing' })],
			});

			expect(credentialsService.createStubCredential).not.toHaveBeenCalled();
			expect(result).toEqual({
				bindings: new Map(),
				matched: [],
				stubbed: [],
			});
		});

		it('apply stubs not_found failures from failure metadata without requirements', async () => {
			credentialsService.createStubCredential.mockResolvedValue({ id: 'stub-1' } as never);

			const result = await importer.apply(
				context,
				bindingRequest([], { missingMode: 'create-stub' }),
				{
					successes: new Map(),
					failures: [
						notFoundFailure(
							packageCredential({
								id: 'orphan-not-in-requirements',
								name: 'Package GitHub',
							}),
						),
					],
				},
			);

			expect(credentialsService.createStubCredential).toHaveBeenCalledWith(
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
			credentialsService.createStubCredential.mockRejectedValue(
				new ForbiddenError(
					"You don't have the permissions to save the credential in this project.",
				),
			);

			const missingCredential = packageCredential({
				id: 'missing-cred',
				name: 'Missing',
			});
			await expect(
				importer.apply(
					context,
					bindingRequest([missingCredential], { missingMode: 'create-stub' }),
					{
						successes: new Map(),
						failures: [notFoundFailure(missingCredential)],
					},
				),
			).rejects.toBeInstanceOf(ForbiddenError);
		});
	});
});
