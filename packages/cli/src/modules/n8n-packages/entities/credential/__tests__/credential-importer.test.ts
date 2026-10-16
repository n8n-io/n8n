import type { CredentialsFinderService } from '@n8n/backend-services';
import type { CredentialsEntity, Project, SharedCredentials, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@n8n/errors';
import type { CredentialTypes } from '@/credential-types';
import type { CredentialsService } from '@/credentials/credentials.service';

import type { ImportContext } from '../../../n8n-packages.types';
import { CredentialImporter } from '../credential-importer';
import { CredentialMatcherFactory } from '../credential-matcher-factory';
import type { SerializedCredential } from '../../../spec/serialized/credential.schema';
import type { CredentialBindingRequest, CredentialResolutionFailure } from '../credential.types';
import { IdBasedCredentialMatcher } from '../id-based-credential-matcher';
import type { NameAndTypeCredentialMatcher } from '../name-and-type-credential-matcher';
import type { TypeOnlyCredentialMatcher } from '../type-only-credential-matcher';

type UsableCredential = Awaited<
	ReturnType<CredentialsService['getCredentialsAUserCanUseInAWorkflow']>
>[number];
type CredentialRequirement = NonNullable<CredentialBindingRequest['requirements']>[number];

const usable = (id: string, type = 'githubApi'): UsableCredential =>
	({ id, type }) as UsableCredential;

describe('CredentialImporter', () => {
	const credentialsService = mock<CredentialsService>();
	const credentialsFinder = mock<CredentialsFinderService>();
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
			matchingMode?: CredentialBindingRequest['matchingMode'];
			conflictPolicy?: CredentialBindingRequest['conflictPolicy'];
			packageCredentials?: CredentialBindingRequest['packageCredentials'];
			updateScope?: CredentialBindingRequest['updateScope'];
		} = {},
	): CredentialBindingRequest => ({
		requirements,
		matchingMode: options.matchingMode ?? 'id-only',
		missingMode: options.missingMode ?? 'must-preexist',
		credentialBindings: options.credentialBindings,
		conflictPolicy: options.conflictPolicy ?? 'keep-existing',
		packageCredentials: options.packageCredentials,
		updateScope: options.updateScope ?? { projectIds: new Set([targetProject.id]) },
	});

	const packageCredential = (
		overrides: Partial<CredentialRequirement> & Pick<CredentialRequirement, 'id'>,
	): CredentialRequirement => ({
		name: 'Source GitHub',
		type: 'githubApi',
		usedBy: [{ kind: 'workflow', id: 'wf-1' }],
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
		...overrides,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		credentialTypes.recognizes.mockReturnValue(true);
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);
		Container.set(
			IdBasedCredentialMatcher,
			new IdBasedCredentialMatcher(credentialTypes, credentialsService),
		);
		importer = new CredentialImporter(
			new CredentialMatcherFactory(
				Container.get(IdBasedCredentialMatcher),
				mock<NameAndTypeCredentialMatcher>(),
				mock<TypeOnlyCredentialMatcher>(),
			),
			credentialsService,
			credentialsFinder,
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
				usedBy: [{ kind: 'workflow', id: 'wf-1' }],
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
			{
				id: 'cred-missing',
				name: 'Missing',
				type: 'githubApi',
				usedBy: [
					{ kind: 'workflow', id: 'wf-1' },
					{ kind: 'agent', id: 'wf-1' },
				],
			},
		]);
		const credentialResolution = await importer.plan(context, request);

		expect(credentialResolution.successes).toEqual(new Map());
		expect(credentialResolution.failures).toEqual([
			{
				kind: 'not_found',
				sourceId: 'cred-missing',
				name: 'Missing',
				type: 'githubApi',
			},
		]);
		expect(importer.blockingFailures(request, credentialResolution)).toEqual([
			{
				kind: 'not_found',
				sourceId: 'cred-missing',
				name: 'Missing',
				type: 'githubApi',
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
					usedBy: [{ kind: 'workflow', id: 'wf-1' }],
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
					usedBy: [{ kind: 'workflow', id: 'wf-1' }],
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
			},
		]);
	});

	describe('create-stub', () => {
		it('apply creates one stub per missing source id and dedupes shared references', async () => {
			credentialsService.createStubCredential.mockResolvedValue({ id: 'stub-1' } as never);

			const missingCredential = packageCredential({
				id: 'missing-cred',
				name: 'Missing GitHub',
				usedBy: [
					{ kind: 'workflow', id: 'wf-1' },
					{ kind: 'workflow', id: 'wf-2' },
				],
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
					id: 'missing-cred',
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
				seeded: [],
				incomplete: [],
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
				seeded: [],
				incomplete: [],
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
					id: 'orphan-not-in-requirements',
					name: 'Package GitHub',
					type: 'githubApi',
					projectId: 'project-target',
				},
				user,
			);
			expect(result.stubbed).toEqual(['orphan-not-in-requirements']);
		});

		it('apply mints a fresh id (no reused source id) under name-and-type matching', async () => {
			credentialsService.createStubCredential.mockResolvedValue({ id: 'stub-1' } as never);

			const missingCredential = packageCredential({ id: 'missing-cred', name: 'Missing GitHub' });
			const request = bindingRequest([missingCredential], {
				missingMode: 'create-stub',
				matchingMode: 'name-and-type',
			});

			await importer.apply(context, request, {
				successes: new Map(),
				failures: [notFoundFailure(missingCredential)],
			});

			expect(credentialsService.createStubCredential).toHaveBeenCalledWith(
				{
					id: undefined,
					name: 'Missing GitHub',
					type: 'githubApi',
					projectId: 'project-target',
				},
				user,
			);
		});

		it('reuses the source id so a repeated pull resolves the stub instead of restubbing', async () => {
			const missingCredential = packageCredential({ id: 'cred-source', name: 'Source GitHub' });

			credentialsService.createStubCredential.mockResolvedValue({ id: 'cred-source' } as never);
			const firstRequest = bindingRequest([missingCredential], { missingMode: 'create-stub' });
			const firstResult = await importer.apply(context, firstRequest, {
				successes: new Map(),
				failures: [notFoundFailure(missingCredential)],
			});

			expect(credentialsService.createStubCredential).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'cred-source' }),
				user,
			);
			expect(firstResult.bindings).toEqual(new Map([['cred-source', 'cred-source']]));

			vi.clearAllMocks();
			credentialTypes.recognizes.mockReturnValue(true);
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
				usable('cred-source'),
			]);

			const resolution = await importer.plan(context, firstRequest);
			const secondResult = await importer.apply(context, firstRequest, resolution);

			expect(credentialsService.createStubCredential).not.toHaveBeenCalled();
			expect(secondResult).toEqual({
				bindings: new Map([['cred-source', 'cred-source']]),
				matched: ['cred-source'],
				stubbed: [],
				seeded: [],
				incomplete: [],
			});
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
	describe('conflict policy', () => {
		const EXPRESSION = '={{ $vars.githubToken }}';
		const requirement = packageCredential({
			id: 'cred-1',
			usedBy: [
				{ kind: 'workflow', id: 'wf-2' },
				{ kind: 'workflow', id: 'wf-1' },
			],
		});

		const packageFile = (overrides: Partial<SerializedCredential> = {}): SerializedCredential => ({
			id: 'cred-1',
			name: 'Source GitHub',
			type: 'githubApi',
			data: { accessToken: EXPRESSION },
			...overrides,
		});

		const destination = (overrides: Partial<CredentialsEntity> = {}) =>
			mock<CredentialsEntity>({
				id: 'cred-1',
				name: 'Source GitHub',
				type: 'githubApi',
				isManaged: false,
				isResolvable: false,
				isGlobal: false,
				usageScope: 'project',
				shared: [
					mock<SharedCredentials>({ role: 'credential:owner', projectId: targetProject.id }),
				],
				...overrides,
			});

		beforeEach(() => {
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([usable('cred-1')]);
			credentialsFinder.findCredentialIdsWithScopeForUser.mockImplementation(
				async (ids) => await Promise.resolve(new Set(ids)),
			);
		});

		it('keep-existing loads and decrypts nothing', async () => {
			const result = await importer.plan(
				context,
				bindingRequest([requirement], {
					conflictPolicy: 'keep-existing',
					packageCredentials: new Map([['cred-1', packageFile({ name: 'Renamed' })]]),
				}),
			);

			expect(result.successes).toEqual(new Map([['cred-1', 'cred-1']]));
			expect(result.candidates).toEqual([]);
			expect(result.updates).toEqual([]);
			expect(result.forbidden).toEqual([]);
			expect(credentialsFinder.findById).not.toHaveBeenCalled();
			expect(credentialsFinder.findCredentialIdsWithScopeForUser).not.toHaveBeenCalled();
			expect(credentialsService.decrypt).not.toHaveBeenCalled();
		});

		it('plans an update when the package value differs from the stored value', async () => {
			credentialsFinder.findById.mockResolvedValue(destination());
			credentialsService.decrypt.mockResolvedValue({ accessToken: 'stored-secret' });

			const result = await importer.plan(
				context,
				bindingRequest([requirement], {
					conflictPolicy: 'fail',
					packageCredentials: new Map([['cred-1', packageFile()]]),
				}),
			);

			const candidate = {
				sourceId: 'cred-1',
				targetId: 'cred-1',
				targetName: 'Source GitHub',
				name: 'Source GitHub',
				data: { accessToken: EXPRESSION },
				usedBy: [
					{ kind: 'workflow', id: 'wf-1' },
					{ kind: 'workflow', id: 'wf-2' },
				],
			};
			expect(result.candidates).toEqual([candidate]);
			expect(result.updates).toEqual([candidate]);
			expect(credentialsFinder.findById).toHaveBeenCalledWith('cred-1', {
				includeSharedProject: true,
			});
			expect(credentialsService.decrypt).toHaveBeenCalledWith(expect.anything(), true);
		});

		it('keeps an equal candidate out of the updates', async () => {
			credentialsFinder.findById.mockResolvedValue(destination());
			credentialsService.decrypt.mockResolvedValue({ accessToken: EXPRESSION, other: 'secret' });

			const result = await importer.plan(
				context,
				bindingRequest([requirement], {
					conflictPolicy: 'overwrite',
					packageCredentials: new Map([['cred-1', packageFile()]]),
				}),
			);

			expect(result.candidates).toHaveLength(1);
			expect(result.updates).toEqual([]);
		});

		it('only binds a match without a package file', async () => {
			const result = await importer.plan(
				context,
				bindingRequest([requirement], { conflictPolicy: 'fail', packageCredentials: new Map() }),
			);

			expect(result.successes).toEqual(new Map([['cred-1', 'cred-1']]));
			expect(result.candidates).toEqual([]);
			expect(credentialsFinder.findById).not.toHaveBeenCalled();
		});

		it('only binds a match that is not an update candidate', async () => {
			credentialsFinder.findById.mockResolvedValue(destination({ isManaged: true }));

			const result = await importer.plan(
				context,
				bindingRequest([requirement], {
					conflictPolicy: 'fail',
					packageCredentials: new Map([['cred-1', packageFile({ name: 'Renamed' })]]),
				}),
			);

			expect(result.candidates).toEqual([]);
			expect(result.updates).toEqual([]);
			expect(credentialsService.decrypt).not.toHaveBeenCalled();
		});

		it('reports a match in scope that the user cannot update as forbidden, and decrypts nothing', async () => {
			credentialsFinder.findById.mockResolvedValue(destination());
			credentialsFinder.findCredentialIdsWithScopeForUser.mockResolvedValue(new Set());

			const result = await importer.plan(
				context,
				bindingRequest([requirement], {
					conflictPolicy: 'fail',
					packageCredentials: new Map([['cred-1', packageFile({ name: 'Renamed' })]]),
				}),
			);

			expect(result.successes).toEqual(new Map([['cred-1', 'cred-1']]));
			expect(result.candidates).toEqual([]);
			expect(result.updates).toEqual([]);
			expect(result.forbidden).toEqual([
				{
					sourceId: 'cred-1',
					targetId: 'cred-1',
					targetName: 'Source GitHub',
					usedBy: [
						{ kind: 'workflow', id: 'wf-1' },
						{ kind: 'workflow', id: 'wf-2' },
					],
				},
			]);
			expect(credentialsFinder.findCredentialIdsWithScopeForUser).toHaveBeenCalledWith(
				['cred-1'],
				user,
				['credential:update'],
			);
			expect(credentialsService.decrypt).not.toHaveBeenCalled();
		});

		it('only binds a match out of scope, and checks no permission for it', async () => {
			credentialsFinder.findById.mockResolvedValue(
				destination({
					shared: [
						mock<SharedCredentials>({ role: 'credential:owner', projectId: 'project-other' }),
					],
				}),
			);

			const result = await importer.plan(
				context,
				bindingRequest([requirement], {
					conflictPolicy: 'overwrite',
					packageCredentials: new Map([['cred-1', packageFile({ name: 'Renamed' })]]),
				}),
			);

			expect(result.candidates).toEqual([]);
			expect(result.forbidden).toEqual([]);
			expect(credentialsFinder.findCredentialIdsWithScopeForUser).not.toHaveBeenCalled();
			expect(credentialsService.decrypt).not.toHaveBeenCalled();
		});

		it('only binds a match the finder does not return (an instance credential)', async () => {
			credentialsFinder.findById.mockResolvedValue(null);

			const result = await importer.plan(
				context,
				bindingRequest([requirement], {
					conflictPolicy: 'overwrite',
					packageCredentials: new Map([['cred-1', packageFile()]]),
				}),
			);

			expect(result.candidates).toEqual([]);
		});

		it('loads a destination once when two package credentials resolve to it', async () => {
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
				usable('cred-target'),
			]);
			credentialsFinder.findById.mockResolvedValue(destination({ id: 'cred-target' }));
			credentialsService.decrypt.mockResolvedValue({ accessToken: 'stored-secret' });
			const other = packageCredential({ id: 'cred-2' });

			const result = await importer.plan(
				context,
				bindingRequest([requirement, other], {
					conflictPolicy: 'overwrite',
					credentialBindings: new Map([
						['cred-1', 'cred-target'],
						['cred-2', 'cred-target'],
					]),
					packageCredentials: new Map([
						['cred-1', packageFile()],
						['cred-2', packageFile({ id: 'cred-2' })],
					]),
				}),
			);

			expect(result.candidates.map(({ sourceId }) => sourceId)).toEqual(['cred-1', 'cred-2']);
			expect(credentialsFinder.findById).toHaveBeenCalledTimes(1);
		});
	});

	describe('create-with-values', () => {
		it('apply seeds a created credential from the requirement package data', async () => {
			credentialsService.createStubCredential.mockResolvedValue({ id: 'created-1' } as never);

			const missingCredential = packageCredential({
				id: 'missing-cred',
				packageData: { token: '={{ $secrets.github.token }}' },
				packageDataIsComplete: true,
			});

			const result = await importer.apply(
				context,
				bindingRequest([missingCredential], { missingMode: 'create-with-values' }),
				{
					successes: new Map(),
					failures: [notFoundFailure(missingCredential)],
				},
			);

			expect(credentialsService.createStubCredential).toHaveBeenCalledWith(
				{
					id: 'missing-cred',
					name: 'Source GitHub',
					type: 'githubApi',
					projectId: 'project-target',
					data: { token: '={{ $secrets.github.token }}' },
				},
				user,
			);
			expect(result).toEqual({
				bindings: new Map([['missing-cred', 'created-1']]),
				matched: [],
				stubbed: [],
				seeded: ['missing-cred'],
				incomplete: [],
			});
		});

		it('apply falls back to an empty stub when the package carries no data', async () => {
			credentialsService.createStubCredential.mockResolvedValue({ id: 'created-1' } as never);

			const withoutData = packageCredential({ id: 'no-data-cred' });
			const withEmptyData = packageCredential({ id: 'empty-data-cred', packageData: {} });

			const result = await importer.apply(
				context,
				bindingRequest([withoutData, withEmptyData], { missingMode: 'create-with-values' }),
				{
					successes: new Map(),
					failures: [notFoundFailure(withoutData), notFoundFailure(withEmptyData)],
				},
			);

			expect(credentialsService.createStubCredential).toHaveBeenCalledWith(
				{
					id: 'no-data-cred',
					name: 'Source GitHub',
					type: 'githubApi',
					projectId: 'project-target',
				},
				user,
			);
			expect(result.stubbed).toEqual(['no-data-cred', 'empty-data-cred']);
			expect(result.seeded).toEqual([]);
		});

		it('apply never seeds under create-stub even when the package carries data', async () => {
			credentialsService.createStubCredential.mockResolvedValue({ id: 'created-1' } as never);

			const missingCredential = packageCredential({
				id: 'missing-cred',
				packageData: { token: '={{ $secrets.github.token }}' },
			});

			const result = await importer.apply(
				context,
				bindingRequest([missingCredential], { missingMode: 'create-stub' }),
				{
					successes: new Map(),
					failures: [notFoundFailure(missingCredential)],
				},
			);

			expect(credentialsService.createStubCredential).toHaveBeenCalledWith(
				{
					id: 'missing-cred',
					name: 'Source GitHub',
					type: 'githubApi',
					projectId: 'project-target',
				},
				user,
			);
			expect(result.stubbed).toEqual(['missing-cred']);
			expect(result.seeded).toEqual([]);
			expect(result.incomplete).toEqual([]);
		});
	});
});
