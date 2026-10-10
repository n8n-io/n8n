import type { CredentialOptionsRequestDto } from '@n8n/api-types';
import type { CredentialsFinderService } from '@n8n/backend-services';
import { GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE, type CredentialsEntity, type User } from '@n8n/db';
import type {
	ICredentialType,
	IWorkflowExecuteAdditionalData,
	ProjectSharingData,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialsHelper } from '@/credentials-helper';
import type { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import type { SecretsProviderAccessCheckService } from '@/modules/external-secrets.ee/secret-provider-access-check.service.ee';
import { userHasScopes } from '@/permissions.ee/check-access';
import { getBase } from '@/workflow-execute-additional-data';

import { CredentialOptionsService } from '../credential-options.service';
import type { CredentialsService } from '../credentials.service';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));
vi.mock('@/workflow-execute-additional-data', () => ({ getBase: vi.fn() }));

describe('CredentialOptionsService', () => {
	const credentialTypes = mock<CredentialTypes>();
	const helper = mock<CredentialsHelper>();
	const credentials = mock<CredentialsService>();
	const finder = mock<CredentialsFinderService>();
	const externalSecretsConfig = mock<ExternalSecretsConfig>();
	const secretProviderAccess = mock<SecretsProviderAccessCheckService>();
	const service = new CredentialOptionsService(
		credentialTypes,
		helper,
		credentials,
		finder,
		externalSecretsConfig,
		secretProviderAccess,
	);
	const user = mock<User>({ id: 'user-id', role: GLOBAL_OWNER_ROLE });
	const stored = mock<CredentialsEntity>({
		id: 'saved-id',
		name: 'Vertex',
		type: 'googleVertexAiApi',
		isManaged: false,
	});
	const loader = vi.fn();
	const homeProject = mock<ProjectSharingData>({ id: 'owning-project' });
	const type: ICredentialType = {
		name: 'googleVertexAiApi',
		displayName: 'Google Vertex AI',
		properties: [
			{
				name: 'project',
				displayName: 'Project',
				type: 'options',
				options: [{ name: 'Custom', value: '__custom__' }],
				default: '__custom__',
				typeOptions: { loadOptionsMethod: 'projects' },
			},
		],
		methods: { loadOptions: { projects: loader } },
	};
	const request: CredentialOptionsRequestDto = {
		type: type.name,
		propertyName: 'project',
		data: { email: 'service@example.com', privateKey: 'draft-key' },
		paginationToken: 'page-two',
	};

	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(userHasScopes).mockResolvedValue(true);
		vi.mocked(getBase).mockResolvedValue(mock<IWorkflowExecuteAdditionalData>());
		credentialTypes.getByName.mockReturnValue(type);
		helper.getCredentialsProperties.mockReturnValue(type.properties);
		helper.applyDefaultsAndOverwrites.mockImplementation(async (_, data) => data);
		finder.findCredentialForUser.mockResolvedValue(stored);
		credentials.prepareCredentialsForUse.mockResolvedValue({
			credentials: {
				id: stored.id,
				name: stored.name,
				type: stored.type,
				data: request.data,
				homeProject,
			},
			storedData: request.data,
		});
		loader.mockResolvedValue({ results: [{ name: 'Target project', value: 'target-project' }] });
	});

	it('loads an unsaved draft with its n8n project context and prepared values', async () => {
		helper.applyDefaultsAndOverwrites.mockResolvedValue({
			...request.data,
			privateKey: 'overwritten-key',
			region: 'global',
		});
		await expect(service.lookupDraft(user, request, 'n8n-project')).resolves.toEqual({
			results: [{ name: 'Target project', value: 'target-project' }],
		});
		expect(getBase).toHaveBeenCalledWith({ userId: user.id, projectId: 'n8n-project' });
		expect(loader).toHaveBeenCalledWith(
			{ email: 'service@example.com', privateKey: 'overwritten-key', region: 'global' },
			undefined,
			'page-two',
		);
		expect(credentials.enforceCredentialUse).toHaveBeenCalledWith(
			{ id: '', type: type.name },
			{ kind: 'user', user },
			'n8n-project',
		);
	});

	it('loads a stored credential with the restored data and server-owned project', async () => {
		await service.lookupStored(user, stored.id, { ...request, data: { privateKey: '***' } });
		expect(getBase).toHaveBeenCalledWith({ userId: user.id, projectId: 'owning-project' });
		expect(loader).toHaveBeenCalledWith(request.data, undefined, 'page-two');
	});

	it('uses stored values for managed credentials', async () => {
		finder.findCredentialForUser.mockResolvedValue({ ...stored, isManaged: true });
		await service.lookupStored(user, stored.id, request);
		expect(credentials.prepareCredentialsForUse).toHaveBeenCalledWith({
			storedCredential: { ...stored, isManaged: true },
			user,
			credentialsToUse: undefined,
		});
	});

	it('rejects drafts outside the allowed project before a provider call', async () => {
		vi.mocked(userHasScopes).mockResolvedValue(false);
		await expect(service.lookupDraft(user, request, 'other-project')).rejects.toThrow();
		expect(loader).not.toHaveBeenCalled();
	});

	it.each([false, true])(
		'enforces instance credential access for an owner: %s',
		async (isOwner) => {
			const actor = mock<User>({
				id: 'actor',
				role: isOwner ? GLOBAL_OWNER_ROLE : GLOBAL_MEMBER_ROLE,
			});
			const result = service.lookupDraft(actor, request, null);
			if (isOwner) {
				await expect(result).resolves.toMatchObject({ results: [{ value: 'target-project' }] });
				expect(credentials.validateInstanceCredentialData).toHaveBeenCalledWith(request.data);
			} else {
				await expect(result).rejects.toThrow();
				expect(loader).not.toHaveBeenCalled();
			}
		},
	);

	it.each(['missing', 'wrong-type', 'blocked'])(
		'rejects a %s stored credential before a provider call',
		async (reason) => {
			if (reason === 'missing') finder.findCredentialForUser.mockResolvedValue(null);
			if (reason === 'wrong-type')
				finder.findCredentialForUser.mockResolvedValue({ ...stored, type: 'googleApi' });
			if (reason === 'blocked')
				credentials.prepareCredentialsForUse.mockRejectedValue(
					new Error('Credential use is blocked'),
				);
			await expect(service.lookupStored(user, stored.id, request)).rejects.toThrow();
			expect(loader).not.toHaveBeenCalled();
		},
	);

	it.each([false, true])(
		'checks secret-reference permissions when stored values change: %s',
		async (isChanged) => {
			vi.mocked(userHasScopes).mockResolvedValue(false);
			secretProviderAccess.isProviderAvailableInProject.mockImplementation(
				async (providerKey, projectId) => providerKey === 'vault' && projectId === homeProject.id,
			);
			const storedData = { ...request.data, privateKey: '={{ $secrets.vault.existingKey }}' };
			const data = {
				...storedData,
				privateKey: isChanged ? '={{ $secrets.vault.newKey }}' : storedData.privateKey,
			};
			credentials.prepareCredentialsForUse.mockResolvedValue({
				credentials: {
					id: stored.id,
					name: stored.name,
					type: stored.type,
					homeProject,
					data,
				},
				storedData,
			});
			const result = service.lookupStored(user, stored.id, { ...request, data });
			if (isChanged) {
				await expect(result).rejects.toThrow('permissions');
				expect(loader).not.toHaveBeenCalled();
			} else {
				await expect(result).resolves.toEqual({
					results: [{ name: 'Target project', value: 'target-project' }],
				});
			}
		},
	);

	it('rejects fields without a declared list callback', async () => {
		await expect(
			service.lookupDraft(user, { ...request, propertyName: 'privateKey' }, 'n8n-project'),
		).rejects.toThrow('does not support');
		expect(loader).not.toHaveBeenCalled();
	});

	it('returns a safe error when discovery fails', async () => {
		loader.mockRejectedValue(new Error('Provider failed with private key draft-key'));
		await expect(service.lookupDraft(user, request, 'n8n-project')).rejects.toThrow(
			'Could not load the list. Try again or enter an ID.',
		);
	});
});
