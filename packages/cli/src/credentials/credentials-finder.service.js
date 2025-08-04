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
exports.CredentialsFinderService = void 0;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const permissions_1 = require('@n8n/permissions');
const typeorm_1 = require('@n8n/typeorm');
let CredentialsFinderService = class CredentialsFinderService {
	constructor(sharedCredentialsRepository, credentialsRepository) {
		this.sharedCredentialsRepository = sharedCredentialsRepository;
		this.credentialsRepository = credentialsRepository;
	}
	async findCredentialsForUser(user, scopes) {
		let where = {};
		if (!(0, permissions_1.hasGlobalScope)(user, scopes, { mode: 'allOf' })) {
			const projectRoles = (0, permissions_1.rolesWithScope)('project', scopes);
			const credentialRoles = (0, permissions_1.rolesWithScope)('credential', scopes);
			where = {
				...where,
				shared: {
					role: (0, typeorm_1.In)(credentialRoles),
					project: {
						projectRelations: {
							role: (0, typeorm_1.In)(projectRoles),
							userId: user.id,
						},
					},
				},
			};
		}
		return await this.credentialsRepository.find({ where, relations: { shared: true } });
	}
	async findCredentialForUser(credentialsId, user, scopes) {
		let where = { credentialsId };
		if (!(0, permissions_1.hasGlobalScope)(user, scopes, { mode: 'allOf' })) {
			const projectRoles = (0, permissions_1.rolesWithScope)('project', scopes);
			const credentialRoles = (0, permissions_1.rolesWithScope)('credential', scopes);
			where = {
				...where,
				role: (0, typeorm_1.In)(credentialRoles),
				project: {
					projectRelations: {
						role: (0, typeorm_1.In)(projectRoles),
						userId: user.id,
					},
				},
			};
		}
		const sharedCredential = await this.sharedCredentialsRepository.findOne({
			where,
			relations: {
				credentials: {
					shared: { project: { projectRelations: { user: true } } },
				},
			},
		});
		if (!sharedCredential) return null;
		return sharedCredential.credentials;
	}
	async findAllCredentialsForUser(user, scopes, trx) {
		let where = {};
		if (!(0, permissions_1.hasGlobalScope)(user, scopes, { mode: 'allOf' })) {
			const projectRoles = (0, permissions_1.rolesWithScope)('project', scopes);
			const credentialRoles = (0, permissions_1.rolesWithScope)('credential', scopes);
			where = {
				role: (0, typeorm_1.In)(credentialRoles),
				project: {
					projectRelations: {
						role: (0, typeorm_1.In)(projectRoles),
						userId: user.id,
					},
				},
			};
		}
		const sharedCredential = await this.sharedCredentialsRepository.findCredentialsWithOptions(
			where,
			trx,
		);
		return sharedCredential.map((sc) => ({ ...sc.credentials, projectId: sc.projectId }));
	}
	async getCredentialIdsByUserAndRole(userIds, options, trx) {
		const projectRoles =
			'scopes' in options
				? (0, permissions_1.rolesWithScope)('project', options.scopes)
				: options.projectRoles;
		const credentialRoles =
			'scopes' in options
				? (0, permissions_1.rolesWithScope)('credential', options.scopes)
				: options.credentialRoles;
		const sharings = await this.sharedCredentialsRepository.findCredentialsByRoles(
			userIds,
			projectRoles,
			credentialRoles,
			trx,
		);
		return sharings.map((s) => s.credentialsId);
	}
};
exports.CredentialsFinderService = CredentialsFinderService;
exports.CredentialsFinderService = CredentialsFinderService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [db_1.SharedCredentialsRepository, db_1.CredentialsRepository]),
	],
	CredentialsFinderService,
);
//# sourceMappingURL=credentials-finder.service.js.map
