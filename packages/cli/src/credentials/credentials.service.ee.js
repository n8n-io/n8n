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
exports.EnterpriseCredentialsService = void 0;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const permissions_1 = require('@n8n/permissions');
const typeorm_1 = require('@n8n/typeorm');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const transfer_credential_error_1 = require('@/errors/response-errors/transfer-credential.error');
const ownership_service_1 = require('@/services/ownership.service');
const project_service_ee_1 = require('@/services/project.service.ee');
const credentials_finder_service_1 = require('./credentials-finder.service');
const credentials_service_1 = require('./credentials.service');
let EnterpriseCredentialsService = class EnterpriseCredentialsService {
	constructor(
		sharedCredentialsRepository,
		ownershipService,
		credentialsService,
		projectService,
		credentialsFinderService,
	) {
		this.sharedCredentialsRepository = sharedCredentialsRepository;
		this.ownershipService = ownershipService;
		this.credentialsService = credentialsService;
		this.projectService = projectService;
		this.credentialsFinderService = credentialsFinderService;
	}
	async shareWithProjects(user, credentialId, shareWithIds, entityManager) {
		const em = entityManager ?? this.sharedCredentialsRepository.manager;
		let projects = await em.find(db_1.Project, {
			where: [
				{
					id: (0, typeorm_1.In)(shareWithIds),
					type: 'team',
					...((0, permissions_1.hasGlobalScope)(user, 'project:list')
						? {}
						: {
								projectRelations: {
									userId: user.id,
									role: (0, typeorm_1.In)(
										(0, permissions_1.rolesWithScope)('project', 'project:list'),
									),
								},
							}),
				},
				{
					id: (0, typeorm_1.In)(shareWithIds),
					type: 'personal',
				},
			],
			relations: { sharedCredentials: true },
		});
		projects = projects.filter(
			(p) =>
				!p.sharedCredentials.some(
					(psc) => psc.credentialsId === credentialId && psc.role === 'credential:owner',
				),
		);
		const newSharedCredentials = projects.map((project) =>
			this.sharedCredentialsRepository.create({
				credentialsId: credentialId,
				role: 'credential:user',
				projectId: project.id,
			}),
		);
		return await em.save(newSharedCredentials);
	}
	async getOne(user, credentialId, includeDecryptedData) {
		let credential = null;
		let decryptedData = null;
		credential = includeDecryptedData
			? await this.credentialsFinderService.findCredentialForUser(credentialId, user, [
					'credential:read',
					'credential:update',
				])
			: null;
		if (credential) {
			decryptedData = this.credentialsService.decrypt(credential);
		} else {
			credential = await this.credentialsFinderService.findCredentialForUser(credentialId, user, [
				'credential:read',
			]);
		}
		if (!credential) {
			throw new not_found_error_1.NotFoundError(
				'Could not load the credential. If you think this is an error, ask the owner to share it with you again',
			);
		}
		credential = this.ownershipService.addOwnedByAndSharedWith(credential);
		const { data: _, ...rest } = credential;
		if (decryptedData) {
			if (decryptedData?.oauthTokenData) {
				decryptedData.oauthTokenData = true;
			}
			return { data: decryptedData, ...rest };
		}
		return { ...rest };
	}
	async transferOne(user, credentialId, destinationProjectId) {
		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:move'],
		);
		not_found_error_1.NotFoundError.isDefinedAndNotNull(
			credential,
			`Could not find the credential with the id "${credentialId}". Make sure you have the permission to move it.`,
		);
		const ownerSharing = credential.shared.find((s) => s.role === 'credential:owner');
		not_found_error_1.NotFoundError.isDefinedAndNotNull(
			ownerSharing,
			`Could not find owner for credential "${credential.id}"`,
		);
		const sourceProject = ownerSharing.project;
		const destinationProject = await this.projectService.getProjectWithScope(
			user,
			destinationProjectId,
			['credential:create'],
		);
		not_found_error_1.NotFoundError.isDefinedAndNotNull(
			destinationProject,
			`Could not find project with the id "${destinationProjectId}". Make sure you have the permission to create credentials in it.`,
		);
		if (sourceProject.id === destinationProject.id) {
			throw new transfer_credential_error_1.TransferCredentialError(
				"You can't transfer a credential into the project that's already owning it.",
			);
		}
		await this.sharedCredentialsRepository.manager.transaction(async (trx) => {
			await trx.remove(credential.shared);
			await trx.save(
				trx.create(db_1.SharedCredentials, {
					credentialsId: credential.id,
					projectId: destinationProject.id,
					role: 'credential:owner',
				}),
			);
		});
	}
};
exports.EnterpriseCredentialsService = EnterpriseCredentialsService;
exports.EnterpriseCredentialsService = EnterpriseCredentialsService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			db_1.SharedCredentialsRepository,
			ownership_service_1.OwnershipService,
			credentials_service_1.CredentialsService,
			project_service_ee_1.ProjectService,
			credentials_finder_service_1.CredentialsFinderService,
		]),
	],
	EnterpriseCredentialsService,
);
//# sourceMappingURL=credentials.service.ee.js.map
