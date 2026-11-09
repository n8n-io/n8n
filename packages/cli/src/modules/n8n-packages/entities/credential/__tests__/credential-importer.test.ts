import type { SerializedCredential } from '@n8n/api-types';
import type { CredentialsFinderService, EventService } from '@n8n/backend-services';
import { GLOBAL_OWNER_ROLE } from '@n8n/db';
import type { CredentialsEntity, ICredentialsDb, Project, SharedCredentials, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError, NotFoundError, UnprocessableRequestError } from '@n8n/errors';
import { CredentialDataError, Credentials } from 'n8n-core';
import type { CredentialTypes } from '@/credential-types';
import type { CredentialDescriptionsService } from '@/credentials/credential-descriptions.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { CredentialsOverwrites } from '@/credentials-overwrites';

import type { ImportContext } from '../../../n8n-packages.types';
import { CredentialImporter } from '../credential-importer';
import { CredentialMatcherFactory } from '../credential-matcher-factory';
import type {
	CredentialBindingRequest,
	CredentialImportPlan,
	CredentialResolutionFailure,
	CredentialUpdateCandidate,
} from '../credential.types';
import { IdBasedCredentialMatcher } from '../id-based-credential-matcher';
import { NameAndTypeCredentialMatcher } from '../name-and-type-credential-matcher';
import { TypeOnlyCredentialMatcher } from '../type-only-credential-matcher';

type UsableCredential = Awaited<
	ReturnType<CredentialsService['getCredentialsAUserCanUseInAWorkflow']>
>[number];
type CredentialRequirement = NonNullable<CredentialBindingRequest['requirements']>[number];

const usable = (id: string, type = 'githubApi'): UsableCredential =>
	({ id, type }) as UsableCredential;

const unreadable = () =>
	new CredentialDataError(
		new Credentials({ id: 'cred-1', name: 'GitHub' }, 'githubApi'),
		'Credentials could not be decrypted.',
	);

describe('CredentialImporter', () => {
	const credentialsService = mock<CredentialsService>();
	const credentialsFinder = mock<CredentialsFinderService>();
	const eventService = mock<EventService>();
	const credentialDescriptions = mock<CredentialDescriptionsService>();
	const credentialsOverwrites = mock<CredentialsOverwrites>();
	const credentialTypes = mock<CredentialTypes>();
	const targetProject = mock<Project>({ id: 'project-target' });
	const user = mock<User>({ id: 'user-1', role: GLOBAL_OWNER_ROLE });

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

	const emptyPlan = (): CredentialImportPlan => ({
		successes: new Map(),
		stubIds: new Map(),
		failures: [],
		candidates: [],
		updates: [],
		forbidden: [],
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
		credentialsService.findUsageScopes.mockResolvedValue(new Map());
		Container.set(
			IdBasedCredentialMatcher,
			new IdBasedCredentialMatcher(credentialTypes, credentialsService),
		);
		importer = new CredentialImporter(
			new CredentialMatcherFactory(
				Container.get(IdBasedCredentialMatcher),
				new NameAndTypeCredentialMatcher(credentialTypes, credentialsService),
				new TypeOnlyCredentialMatcher(credentialTypes, credentialsService),
			),
			credentialsService,
			credentialsFinder,
			eventService,
			credentialDescriptions,
			credentialsOverwrites,
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
				reason: 'not-on-instance',
				sourceId: 'cred-missing',
				name: 'Missing',
				type: 'githubApi',
			},
		]);
		expect(importer.blockingFailures(request, credentialResolution)).toEqual([
			{
				kind: 'not_found',
				reason: 'not-on-instance',
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
				reason: 'not-on-instance',
				sourceId: 'source-cred',
				name: 'Source GitHub',
				type: 'githubApi',
				targetId: 'target-missing',
			},
		]);
	});

	describe('create-stub', () => {
		it('blocks an unresolved untyped Agent credential instead of planning a stub', async () => {
			const request = bindingRequest(
				[{ id: 'unknown', usedBy: [{ kind: 'agent', id: 'agent' }] }],
				{ missingMode: 'create-stub' },
			);
			const plan = await importer.plan(context, request);
			expect(plan.stubIds.size).toBe(0);
			expect(importer.blockingFailures(request, plan)).toEqual([
				expect.objectContaining({ sourceId: 'unknown', kind: 'not_found' }),
			]);
		});
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
			const resolution = await importer.plan(context, request);

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
				...emptyPlan(),
				stubIds: new Map(),
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
					...emptyPlan(),
					stubIds: new Map([['orphan-not-in-requirements', 'orphan-not-in-requirements']]),
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

		it('apply uses the fresh ID reserved during name-and-type planning', async () => {
			credentialsService.createStubCredential.mockResolvedValue({ id: 'stub-1' } as never);

			const missingCredential = packageCredential({ id: 'missing-cred', name: 'Missing GitHub' });
			const request = bindingRequest([missingCredential], {
				missingMode: 'create-stub',
				matchingMode: 'name-and-type',
			});

			const plan = await importer.plan(context, request);
			const targetId = plan.stubIds.get('missing-cred');
			expect(targetId).toBeDefined();
			expect(targetId).not.toBe('missing-cred');
			await importer.apply(context, request, plan);

			expect(credentialsService.createStubCredential).toHaveBeenCalledWith(
				{
					id: targetId,
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
				...emptyPlan(),
				stubIds: new Map([[missingCredential.id, missingCredential.id]]),
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
						...emptyPlan(),
						stubIds: new Map([[missingCredential.id, missingCredential.id]]),
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
			expect(credentialsService.decryptOrFail).not.toHaveBeenCalled();
		});

		it('plans an update when the package value differs from the stored value', async () => {
			credentialsFinder.findById.mockResolvedValue(destination());
			credentialsService.decryptOrFail.mockResolvedValue({ accessToken: 'stored-secret' });

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
				targetType: 'githubApi',
				ownerProjectId: targetProject.id,
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
			expect(credentialsService.decryptOrFail).toHaveBeenCalledWith(expect.anything());
		});

		it('blocks when the stored data of a candidate is unreadable', async () => {
			credentialsFinder.findById.mockResolvedValue(destination());
			credentialsService.decryptOrFail.mockRejectedValue(unreadable());

			await expect(
				importer.plan(
					context,
					bindingRequest([requirement], {
						conflictPolicy: 'overwrite',
						packageCredentials: new Map([['cred-1', packageFile()]]),
					}),
				),
			).rejects.toThrow(UnprocessableRequestError);
		});

		it('keeps an equal candidate out of the updates', async () => {
			credentialsFinder.findById.mockResolvedValue(destination());
			credentialsService.decryptOrFail.mockResolvedValue({
				accessToken: EXPRESSION,
				other: 'secret',
			});

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
			expect(credentialsService.decryptOrFail).not.toHaveBeenCalled();
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
			expect(credentialsService.decryptOrFail).not.toHaveBeenCalled();
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
			expect(credentialsService.decryptOrFail).not.toHaveBeenCalled();
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
			credentialsService.decryptOrFail.mockResolvedValue({ accessToken: 'stored-secret' });
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

	describe('credential updates', () => {
		const EXPRESSION = '={{ $vars.githubToken }}';

		const update = (
			overrides: Partial<CredentialUpdateCandidate> = {},
		): CredentialUpdateCandidate => ({
			sourceId: 'cred-1',
			targetId: 'cred-1',
			targetName: 'GitHub',
			targetType: 'githubApi',
			ownerProjectId: targetProject.id,
			name: 'Renamed',
			data: { accessToken: EXPRESSION },
			usedBy: [{ kind: 'workflow', id: 'wf-1' }],
			...overrides,
		});

		const plan = (updates: CredentialUpdateCandidate[]): CredentialImportPlan => ({
			successes: new Map(updates.map(({ sourceId, targetId }) => [sourceId, targetId])),
			stubIds: new Map(),
			failures: [],
			candidates: updates,
			updates,
			forbidden: [],
		});

		const stored = (overrides: Partial<CredentialsEntity> = {}) =>
			mock<CredentialsEntity>({ id: 'cred-1', name: 'GitHub', type: 'githubApi', ...overrides });

		const storedData = {
			accessToken: 'stored-secret',
			server: 'https://api.github.com',
			oauthTokenData: { access_token: 'token' },
		};

		beforeEach(() => {
			credentialsFinder.findById.mockResolvedValue(stored());
			credentialsService.decryptOrFail.mockResolvedValue(storedData);
			// Plain objects: a mock would report every property as present.
			credentialsService.prepareUpdateData.mockImplementation(
				async (_user, data) => await Promise.resolve({ ...data } as unknown as CredentialsEntity),
			);
			credentialsService.createEncryptedData.mockImplementation(
				async (credential) =>
					await Promise.resolve({ ...credential, data: 'encrypted' } as ICredentialsDb),
			);
			credentialsService.update.mockResolvedValue(stored());
		});

		describe('assertCanUpdate', () => {
			it('prepares each update without writing it', async () => {
				await importer.assertCanUpdate(
					context,
					bindingRequest([], { conflictPolicy: 'overwrite' }),
					plan([update()]),
				);

				expect(credentialsFinder.findById).toHaveBeenCalledWith('cred-1', {
					includeSharedProject: true,
				});
				expect(credentialsService.decryptOrFail).toHaveBeenCalledWith(expect.anything());
				expect(credentialsService.prepareUpdateData).toHaveBeenCalledWith(
					user,
					{
						name: 'Renamed',
						type: 'githubApi',
						data: { accessToken: EXPRESSION, server: 'https://api.github.com' },
					},
					expect.objectContaining({ id: 'cred-1' }),
				);
				expect(credentialsService.createEncryptedData).not.toHaveBeenCalled();
				expect(credentialsService.update).not.toHaveBeenCalled();
			});

			it.each(['keep-existing', 'fail'] as const)('prepares nothing under %s', async (policy) => {
				await importer.assertCanUpdate(
					context,
					bindingRequest([], { conflictPolicy: policy }),
					plan([update()]),
				);

				expect(credentialsFinder.findById).not.toHaveBeenCalled();
				expect(credentialsService.prepareUpdateData).not.toHaveBeenCalled();
			});

			it('propagates an error of prepareUpdateData', async () => {
				const error = new ForbiddenError('No access to the external secrets provider');
				credentialsService.prepareUpdateData.mockRejectedValue(error);

				await expect(
					importer.assertCanUpdate(
						context,
						bindingRequest([], { conflictPolicy: 'overwrite' }),
						plan([update()]),
					),
				).rejects.toBe(error);
			});

			it('fails before it prepares an update when the stored data is unreadable', async () => {
				credentialsService.decryptOrFail.mockRejectedValue(unreadable());

				await expect(
					importer.assertCanUpdate(
						context,
						bindingRequest([], { conflictPolicy: 'overwrite' }),
						plan([update()]),
					),
				).rejects.toThrow(UnprocessableRequestError);
				expect(credentialsService.prepareUpdateData).not.toHaveBeenCalled();
			});

			it('prepares a destination once when two package credentials resolve to it', async () => {
				await importer.assertCanUpdate(
					context,
					bindingRequest([], { conflictPolicy: 'overwrite' }),
					plan([update(), update({ sourceId: 'cred-2' })]),
				);

				expect(credentialsService.prepareUpdateData).toHaveBeenCalledTimes(1);
			});

			it('fails when the destination no longer exists', async () => {
				credentialsFinder.findById.mockResolvedValue(null);

				await expect(
					importer.assertCanUpdate(
						context,
						bindingRequest([], { conflictPolicy: 'overwrite' }),
						plan([update()]),
					),
				).rejects.toThrow(NotFoundError);
			});
		});

		describe('applyUpdates', () => {
			it('writes the package name and the merged data, and keeps the other columns', async () => {
				const updated = await importer.applyUpdates(
					context,
					bindingRequest([], { conflictPolicy: 'overwrite' }),
					plan([update()]),
				);

				expect(updated).toEqual(['cred-1']);
				const written = { accessToken: EXPRESSION, server: 'https://api.github.com' };
				expect(credentialsService.createEncryptedData).toHaveBeenCalledWith({
					id: 'cred-1',
					name: 'Renamed',
					type: 'githubApi',
					data: written,
				});
				expect(credentialsService.update).toHaveBeenCalledWith(
					'cred-1',
					expect.objectContaining({ id: 'cred-1', name: 'Renamed', type: 'githubApi' }),
					{ kind: 'user', user },
					written,
					{ user },
				);
				const [, encrypted] = credentialsService.update.mock.calls[0];
				expect(encrypted).not.toHaveProperty('isGlobal');
				expect(encrypted).not.toHaveProperty('isResolvable');
				expect(encrypted).not.toHaveProperty('description');
			});

			it('emits credentials-updated for the written credential', async () => {
				credentialsService.update.mockResolvedValue(
					stored({ name: 'Renamed', isResolvable: false, description: 'Team token' }),
				);
				credentialDescriptions.isEnabled.mockResolvedValue(true);
				credentialsOverwrites.supportsManagedAuth.mockReturnValue(false);
				credentialsOverwrites.usesManagedAuth.mockReturnValue(false);
				credentialsOverwrites.getManagedAppVersion.mockReturnValue(2);

				await importer.applyUpdates(
					context,
					bindingRequest([], { conflictPolicy: 'overwrite' }),
					plan([update()]),
				);

				expect(eventService.emit).toHaveBeenCalledTimes(1);
				expect(eventService.emit).toHaveBeenCalledWith('credentials-updated', {
					user,
					credentialType: 'githubApi',
					credentialId: 'cred-1',
					credentialName: 'Renamed',
					credentialDescriptionLength: 10,
					isDynamic: false,
					usesExternalSecrets: false,
					jweEnabled: false,
					supportsManagedAuth: false,
					usesManagedAuth: false,
					managedAppVersion: 2,
				});
				expect(credentialsOverwrites.usesManagedAuth).toHaveBeenCalledWith('githubApi', {
					accessToken: EXPRESSION,
					server: 'https://api.github.com',
				});
			});

			it('reports external secrets in the written data', async () => {
				credentialsService.decryptOrFail.mockResolvedValue({ accessToken: 'stored-secret' });

				await importer.applyUpdates(
					context,
					bindingRequest([], { conflictPolicy: 'overwrite' }),
					plan([update({ data: { accessToken: '={{ $secrets.vault.githubToken }}' } })]),
				);

				expect(eventService.emit).toHaveBeenCalledWith(
					'credentials-updated',
					expect.objectContaining({ usesExternalSecrets: true }),
				);
			});

			it('leaves the stored token to prepareUpdateData', async () => {
				await importer.applyUpdates(
					context,
					bindingRequest([], { conflictPolicy: 'overwrite' }),
					plan([update()]),
				);

				const [, input, , options] = credentialsService.prepareUpdateData.mock.calls[0];
				expect(input.data).not.toHaveProperty('oauthTokenData');
				expect(options).toBeUndefined();
			});

			it('skips a destination that no longer differs', async () => {
				credentialsFinder.findById.mockResolvedValue(stored({ name: 'Renamed' }));
				credentialsService.decryptOrFail.mockResolvedValue({ accessToken: EXPRESSION });

				const updated = await importer.applyUpdates(
					context,
					bindingRequest([], { conflictPolicy: 'overwrite' }),
					plan([update()]),
				);

				expect(updated).toEqual([]);
				expect(credentialsService.prepareUpdateData).not.toHaveBeenCalled();
				expect(credentialsService.update).not.toHaveBeenCalled();
				expect(eventService.emit).not.toHaveBeenCalled();
			});

			it('writes one destination once across two scopes', async () => {
				const request = bindingRequest([], { conflictPolicy: 'overwrite' });
				const first = await importer.applyUpdates(context, request, plan([update()]));
				// The second scope reads what the first one wrote.
				credentialsFinder.findById.mockResolvedValue(stored({ name: 'Renamed' }));
				credentialsService.decryptOrFail.mockResolvedValue({
					...storedData,
					accessToken: EXPRESSION,
				});
				const second = await importer.applyUpdates(context, request, plan([update()]));

				expect(first).toEqual(['cred-1']);
				expect(second).toEqual([]);
				expect(credentialsService.update).toHaveBeenCalledTimes(1);
			});

			it('writes once and lists every package credential that resolves to the destination', async () => {
				const updated = await importer.applyUpdates(
					context,
					bindingRequest([], { conflictPolicy: 'overwrite' }),
					plan([update(), update({ sourceId: 'cred-2' })]),
				);

				expect(updated).toEqual(['cred-1', 'cred-2']);
				expect(credentialsService.update).toHaveBeenCalledTimes(1);
				expect(eventService.emit).toHaveBeenCalledTimes(1);
			});

			it.each(['keep-existing', 'fail'] as const)('writes nothing under %s', async (policy) => {
				const updated = await importer.applyUpdates(
					context,
					bindingRequest([], { conflictPolicy: policy }),
					plan([update()]),
				);

				expect(updated).toEqual([]);
				expect(credentialsService.update).not.toHaveBeenCalled();
			});

			it('fails when the update finds no credential', async () => {
				credentialsService.update.mockResolvedValue(null);

				await expect(
					importer.applyUpdates(
						context,
						bindingRequest([], { conflictPolicy: 'overwrite' }),
						plan([update()]),
					),
				).rejects.toThrow(NotFoundError);
			});
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
					...emptyPlan(),
					stubIds: new Map([[missingCredential.id, missingCredential.id]]),
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
					...emptyPlan(),
					stubIds: new Map([
						[withoutData.id, withoutData.id],
						[withEmptyData.id, withEmptyData.id],
					]),
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
					...emptyPlan(),
					stubIds: new Map([[missingCredential.id, missingCredential.id]]),
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
