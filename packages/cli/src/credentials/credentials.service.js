'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.CredentialsService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const permissions_1 = require('@n8n/permissions');
const typeorm_1 = require('@n8n/typeorm');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const constants_1 = require('@/constants');
const credential_types_1 = require('@/credential-types');
const credentials_helper_1 = require('@/credentials-helper');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const external_hooks_1 = require('@/external-hooks');
const generic_helpers_1 = require('@/generic-helpers');
const check_access_1 = require('@/permissions.ee/check-access');
const credentials_tester_service_1 = require('@/services/credentials-tester.service');
const ownership_service_1 = require('@/services/ownership.service');
const project_service_ee_1 = require('@/services/project.service.ee');
const role_service_1 = require('@/services/role.service');
const credentials_finder_service_1 = require('./credentials-finder.service');
let CredentialsService = class CredentialsService {
	constructor(
		credentialsRepository,
		sharedCredentialsRepository,
		ownershipService,
		logger,
		errorReporter,
		credentialsTester,
		externalHooks,
		credentialTypes,
		projectRepository,
		projectService,
		roleService,
		userRepository,
		credentialsFinderService,
	) {
		this.credentialsRepository = credentialsRepository;
		this.sharedCredentialsRepository = sharedCredentialsRepository;
		this.ownershipService = ownershipService;
		this.logger = logger;
		this.errorReporter = errorReporter;
		this.credentialsTester = credentialsTester;
		this.externalHooks = externalHooks;
		this.credentialTypes = credentialTypes;
		this.projectRepository = projectRepository;
		this.projectService = projectService;
		this.roleService = roleService;
		this.userRepository = userRepository;
		this.credentialsFinderService = credentialsFinderService;
	}
	async getMany(
		user,
		{
			listQueryOptions = {},
			includeScopes = false,
			includeData = false,
			onlySharedWithMe = false,
		} = {},
	) {
		const returnAll = (0, permissions_1.hasGlobalScope)(user, 'credential:list');
		const isDefaultSelect = !listQueryOptions.select;
		const projectId =
			typeof listQueryOptions.filter?.projectId === 'string'
				? listQueryOptions.filter.projectId
				: undefined;
		if (onlySharedWithMe) {
			listQueryOptions.filter = {
				...listQueryOptions.filter,
				withRole: 'credential:user',
				user,
			};
		}
		if (includeData) {
			includeScopes = true;
			listQueryOptions.includeData = true;
		}
		if (returnAll) {
			let project;
			if (projectId) {
				try {
					project = await this.projectService.getProject(projectId);
				} catch {}
			}
			if (project?.type === 'personal') {
				listQueryOptions.filter = {
					...listQueryOptions.filter,
					withRole: 'credential:owner',
				};
			}
			let credentials = await this.credentialsRepository.findMany(listQueryOptions);
			if (isDefaultSelect) {
				if (listQueryOptions.filter?.shared?.projectId ?? onlySharedWithMe) {
					const relations = await this.sharedCredentialsRepository.getAllRelationsForCredentials(
						credentials.map((c) => c.id),
					);
					credentials.forEach((c) => {
						c.shared = relations.filter((r) => r.credentialsId === c.id);
					});
				}
				credentials = credentials.map((c) => this.ownershipService.addOwnedByAndSharedWith(c));
			}
			if (includeScopes) {
				const projectRelations = await this.projectService.getProjectRelationsForUser(user);
				credentials = credentials.map((c) => this.roleService.addScopes(c, user, projectRelations));
			}
			if (includeData) {
				credentials = credentials.map((c) => {
					const data = c.scopes.includes('credential:update') ? this.decrypt(c) : undefined;
					if (data?.oauthTokenData) {
						data.oauthTokenData = true;
					}
					return {
						...c,
						data,
					};
				});
			}
			return credentials;
		}
		const ids = await this.credentialsFinderService.getCredentialIdsByUserAndRole([user.id], {
			scopes: ['credential:read'],
		});
		let credentials = await this.credentialsRepository.findMany(listQueryOptions, ids);
		if (isDefaultSelect) {
			if (listQueryOptions.filter?.shared?.projectId ?? onlySharedWithMe) {
				const relations = await this.sharedCredentialsRepository.getAllRelationsForCredentials(
					credentials.map((c) => c.id),
				);
				credentials.forEach((c) => {
					c.shared = relations.filter((r) => r.credentialsId === c.id);
				});
			}
			credentials = credentials.map((c) => this.ownershipService.addOwnedByAndSharedWith(c));
		}
		if (includeScopes) {
			const projectRelations = await this.projectService.getProjectRelationsForUser(user);
			credentials = credentials.map((c) => this.roleService.addScopes(c, user, projectRelations));
		}
		if (includeData) {
			credentials = credentials.map((c) => {
				return {
					...c,
					data: c.scopes.includes('credential:update') ? this.decrypt(c) : undefined,
				};
			});
		}
		return credentials;
	}
	async getCredentialsAUserCanUseInAWorkflow(user, options) {
		const projectRelations = await this.projectService.getProjectRelationsForUser(user);
		const allCredentials = await this.credentialsFinderService.findCredentialsForUser(user, [
			'credential:read',
		]);
		const allCredentialsForWorkflow =
			'workflowId' in options
				? (await this.findAllCredentialIdsForWorkflow(options.workflowId)).map((c) => c.id)
				: (await this.findAllCredentialIdsForProject(options.projectId)).map((c) => c.id);
		const intersection = allCredentials.filter((c) => allCredentialsForWorkflow.includes(c.id));
		return intersection
			.map((c) => this.roleService.addScopes(c, user, projectRelations))
			.map((c) => ({
				id: c.id,
				name: c.name,
				type: c.type,
				scopes: c.scopes,
				isManaged: c.isManaged,
			}));
	}
	async findAllCredentialIdsForWorkflow(workflowId) {
		const user = await this.userRepository.findPersonalOwnerForWorkflow(workflowId);
		if (user && (0, permissions_1.hasGlobalScope)(user, 'credential:read')) {
			return await this.credentialsRepository.findAllPersonalCredentials();
		}
		return await this.credentialsRepository.findAllCredentialsForWorkflow(workflowId);
	}
	async findAllCredentialIdsForProject(projectId) {
		const user = await this.userRepository.findPersonalOwnerForProject(projectId);
		if (user && (0, permissions_1.hasGlobalScope)(user, 'credential:read')) {
			return await this.credentialsRepository.findAllPersonalCredentials();
		}
		return await this.credentialsRepository.findAllCredentialsForProject(projectId);
	}
	async getSharing(user, credentialId, globalScopes, relations = { credentials: true }) {
		let where = { credentialsId: credentialId };
		if (!(0, permissions_1.hasGlobalScope)(user, globalScopes, { mode: 'allOf' })) {
			where = {
				...where,
				role: 'credential:owner',
				project: {
					projectRelations: {
						role: 'project:personalOwner',
						userId: user.id,
					},
				},
			};
		}
		return await this.sharedCredentialsRepository.findOne({
			where,
			relations,
		});
	}
	async prepareUpdateData(data, decryptedData) {
		const mergedData = (0, n8n_workflow_1.deepCopy)(data);
		if (mergedData.data) {
			mergedData.data = this.unredact(mergedData.data, decryptedData);
		}
		const updateData = this.credentialsRepository.create(mergedData);
		await (0, generic_helpers_1.validateEntity)(updateData);
		if (decryptedData.oauthTokenData) {
			updateData.data.oauthTokenData = decryptedData.oauthTokenData;
		}
		return updateData;
	}
	createEncryptedData(credential) {
		const credentials = new n8n_core_1.Credentials(
			{ id: credential.id, name: credential.name },
			credential.type,
		);
		credentials.setData(credential.data);
		const newCredentialData = credentials.getDataToSave();
		newCredentialData.updatedAt = new Date();
		return newCredentialData;
	}
	decrypt(credential, includeRawData = false) {
		const coreCredential = (0, credentials_helper_1.createCredentialsFromCredentialsEntity)(
			credential,
		);
		try {
			const data = coreCredential.getData();
			if (includeRawData) {
				return data;
			}
			return this.redact(data, credential);
		} catch (error) {
			if (error instanceof n8n_core_1.CredentialDataError) {
				this.errorReporter.error(error, {
					level: 'error',
					extra: { credentialId: credential.id },
					tags: { credentialType: credential.type },
				});
				return {};
			}
			throw error;
		}
	}
	async update(credentialId, newCredentialData) {
		await this.externalHooks.run('credentials.update', [newCredentialData]);
		await this.credentialsRepository.update(credentialId, newCredentialData);
		return await this.credentialsRepository.findOneBy({ id: credentialId });
	}
	async save(credential, encryptedData, user, projectId) {
		const newCredential = new db_1.CredentialsEntity();
		Object.assign(newCredential, credential, encryptedData);
		await this.externalHooks.run('credentials.create', [encryptedData]);
		const { manager: dbManager } = this.credentialsRepository;
		const result = await dbManager.transaction(async (transactionManager) => {
			const savedCredential = await transactionManager.save(newCredential);
			savedCredential.data = newCredential.data;
			const project =
				projectId === undefined
					? await this.projectRepository.getPersonalProjectForUserOrFail(
							user.id,
							transactionManager,
						)
					: await this.projectService.getProjectWithScope(
							user,
							projectId,
							['credential:create'],
							transactionManager,
						);
			if (typeof projectId === 'string' && project === null) {
				throw new bad_request_error_1.BadRequestError(
					"You don't have the permissions to save the credential in this project.",
				);
			}
			if (project === null) {
				throw new n8n_workflow_1.UnexpectedError('No personal project found');
			}
			const newSharedCredential = this.sharedCredentialsRepository.create({
				role: 'credential:owner',
				credentials: savedCredential,
				projectId: project.id,
			});
			await transactionManager.save(newSharedCredential);
			return savedCredential;
		});
		this.logger.debug('New credential created', {
			credentialId: newCredential.id,
			ownerId: user.id,
		});
		return result;
	}
	async delete(user, credentialId) {
		await this.externalHooks.run('credentials.delete', [credentialId]);
		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:delete'],
		);
		if (!credential) {
			return;
		}
		await this.credentialsRepository.remove(credential);
	}
	async test(userId, credentials) {
		return await this.credentialsTester.testCredentials(userId, credentials.type, credentials);
	}
	redact(data, credential) {
		const copiedData = (0, n8n_workflow_1.deepCopy)(data);
		let credType;
		try {
			credType = this.credentialTypes.getByName(credential.type);
		} catch {
			return data;
		}
		const getExtendedProps = (type) => {
			const props = [];
			for (const e of type.extends ?? []) {
				const extendsType = this.credentialTypes.getByName(e);
				const extendedProps = getExtendedProps(extendsType);
				n8n_workflow_1.NodeHelpers.mergeNodeProperties(props, extendedProps);
			}
			n8n_workflow_1.NodeHelpers.mergeNodeProperties(props, type.properties);
			return props;
		};
		const properties = getExtendedProps(credType);
		for (const dataKey of Object.keys(copiedData)) {
			if (dataKey === 'oauthTokenData' || dataKey === 'csrfSecret') {
				if (copiedData[dataKey].toString().length > 0) {
					copiedData[dataKey] = constants_1.CREDENTIAL_BLANKING_VALUE;
				} else {
					copiedData[dataKey] = n8n_workflow_1.CREDENTIAL_EMPTY_VALUE;
				}
				continue;
			}
			const prop = properties.find((v) => v.name === dataKey);
			if (!prop) {
				continue;
			}
			if (
				prop.typeOptions?.password &&
				(!copiedData[dataKey].startsWith('={{') || prop.noDataExpression)
			) {
				if (copiedData[dataKey].toString().length > 0) {
					copiedData[dataKey] = constants_1.CREDENTIAL_BLANKING_VALUE;
				} else {
					copiedData[dataKey] = n8n_workflow_1.CREDENTIAL_EMPTY_VALUE;
				}
			}
		}
		return copiedData;
	}
	unredactRestoreValues(unmerged, replacement) {
		for (const [key, value] of Object.entries(unmerged)) {
			if (
				value === constants_1.CREDENTIAL_BLANKING_VALUE ||
				value === n8n_workflow_1.CREDENTIAL_EMPTY_VALUE
			) {
				unmerged[key] = replacement[key];
			} else if (
				typeof value === 'object' &&
				value !== null &&
				key in replacement &&
				typeof replacement[key] === 'object' &&
				replacement[key] !== null
			) {
				this.unredactRestoreValues(value, replacement[key]);
			}
		}
	}
	unredact(redactedData, savedData) {
		const mergedData = (0, n8n_workflow_1.deepCopy)(redactedData);
		this.unredactRestoreValues(mergedData, savedData);
		return mergedData;
	}
	async getOne(user, credentialId, includeDecryptedData) {
		let sharing = null;
		let decryptedData = null;
		sharing = includeDecryptedData
			? await this.getSharing(user, credentialId, ['credential:read'])
			: null;
		if (sharing) {
			decryptedData = this.decrypt(sharing.credentials);
		} else {
			sharing = await this.getSharing(user, credentialId, ['credential:read']);
		}
		if (!sharing) {
			throw new not_found_error_1.NotFoundError(
				`Credential with ID "${credentialId}" could not be found.`,
			);
		}
		const { credentials: credential } = sharing;
		const { data: _, ...rest } = credential;
		if (decryptedData) {
			if (decryptedData?.oauthTokenData) {
				decryptedData.oauthTokenData = true;
			}
			return { data: decryptedData, ...rest };
		}
		return { ...rest };
	}
	async getCredentialScopes(user, credentialId) {
		const userProjectRelations = await this.projectService.getProjectRelationsForUser(user);
		const shared = await this.sharedCredentialsRepository.find({
			where: {
				projectId: (0, typeorm_1.In)([...new Set(userProjectRelations.map((pr) => pr.projectId))]),
				credentialsId: credentialId,
			},
		});
		return this.roleService.combineResourceScopes('credential', user, shared, userProjectRelations);
	}
	async transferAll(fromProjectId, toProjectId, trx) {
		trx = trx ?? this.credentialsRepository.manager;
		const allSharedCredentials = await trx.findBy(db_1.SharedCredentials, {
			projectId: (0, typeorm_1.In)([fromProjectId, toProjectId]),
		});
		const sharedCredentialsOfFromProject = allSharedCredentials.filter(
			(sc) => sc.projectId === fromProjectId,
		);
		const ownedCredentialIds = sharedCredentialsOfFromProject
			.filter((sc) => sc.role === 'credential:owner')
			.map((sc) => sc.credentialsId);
		await this.sharedCredentialsRepository.makeOwner(ownedCredentialIds, toProjectId, trx);
		await this.sharedCredentialsRepository.deleteByIds(ownedCredentialIds, fromProjectId, trx);
		const sharedCredentialIdsOfTransferee = allSharedCredentials
			.filter((sc) => sc.projectId === toProjectId)
			.map((sc) => sc.credentialsId);
		const sharedCredentialsToTransfer = sharedCredentialsOfFromProject.filter(
			(sc) =>
				sc.role !== 'credential:owner' &&
				!sharedCredentialIdsOfTransferee.includes(sc.credentialsId),
		);
		await trx.insert(
			db_1.SharedCredentials,
			sharedCredentialsToTransfer.map((sc) => ({
				credentialsId: sc.credentialsId,
				projectId: toProjectId,
				role: sc.role,
			})),
		);
	}
	async replaceCredentialContentsForSharee(user, credential, decryptedData, mergedCredentials) {
		if (
			!(await (0, check_access_1.userHasScopes)(user, ['credential:update'], false, {
				credentialId: credential.id,
			}))
		) {
			mergedCredentials.data = decryptedData;
		}
	}
	async createUnmanagedCredential(dto, user) {
		return await this.createCredential({ ...dto, isManaged: false }, user);
	}
	async createManagedCredential(dto, user) {
		return await this.createCredential({ ...dto, isManaged: true }, user);
	}
	async createCredential(opts, user) {
		const encryptedCredential = this.createEncryptedData({
			id: null,
			name: opts.name,
			type: opts.type,
			data: opts.data,
		});
		const credentialEntity = this.credentialsRepository.create({
			...encryptedCredential,
			isManaged: opts.isManaged,
		});
		const { shared, ...credential } = await this.save(
			credentialEntity,
			encryptedCredential,
			user,
			opts.projectId,
		);
		const scopes = await this.getCredentialScopes(user, credential.id);
		return { ...credential, scopes };
	}
};
exports.CredentialsService = CredentialsService;
exports.CredentialsService = CredentialsService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			db_1.CredentialsRepository,
			db_1.SharedCredentialsRepository,
			ownership_service_1.OwnershipService,
			backend_common_1.Logger,
			n8n_core_1.ErrorReporter,
			credentials_tester_service_1.CredentialsTester,
			external_hooks_1.ExternalHooks,
			credential_types_1.CredentialTypes,
			db_1.ProjectRepository,
			project_service_ee_1.ProjectService,
			role_service_1.RoleService,
			db_1.UserRepository,
			credentials_finder_service_1.CredentialsFinderService,
		]),
	],
	CredentialsService,
);
//# sourceMappingURL=credentials.service.js.map
