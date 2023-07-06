import { Request } from 'express';
import { Service } from 'typedi';
import { v4 as uuid } from 'uuid';
import config from '@/config';
import type { Role } from '@db/entities/Role';
import { RoleRepository, SettingsRepository, UserRepository } from '@db/repositories';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { hashPassword } from '@/UserManagement/UserManagementHelper';
import { eventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { License } from '@/License';
import { LICENSE_FEATURES, inE2ETests } from '@/constants';
import { NoAuthRequired, Patch, Post, RestController } from '@/decorators';
import type { UserSetupPayload } from '@/requests';

if (!inE2ETests) {
	console.error('E2E endpoints only allowed during E2E tests');
	process.exit(1);
}

const tablesToTruncate = [
	'auth_identity',
	'auth_provider_sync_history',
	'event_destinations',
	'shared_workflow',
	'shared_credentials',
	'webhook_entity',
	'workflows_tags',
	'credentials_entity',
	'tag_entity',
	'workflow_statistics',
	'workflow_entity',
	'execution_entity',
	'settings',
	'installed_packages',
	'installed_nodes',
	'user',
	'role',
	'variables',
];

type ResetRequest = Request<
	{},
	{},
	{
		owner: UserSetupPayload;
		members: UserSetupPayload[];
	}
>;

@Service()
@NoAuthRequired()
@RestController('/e2e')
export class E2EController {
	private enabledFeatures: Record<LICENSE_FEATURES, boolean> = {
		[LICENSE_FEATURES.SHARING]: false,
		[LICENSE_FEATURES.LDAP]: false,
		[LICENSE_FEATURES.SAML]: false,
		[LICENSE_FEATURES.LOG_STREAMING]: false,
		[LICENSE_FEATURES.ADVANCED_EXECUTION_FILTERS]: false,
		[LICENSE_FEATURES.SOURCE_CONTROL]: false,
		[LICENSE_FEATURES.VARIABLES]: false,
		[LICENSE_FEATURES.API_DISABLED]: false,
	};

	constructor(
		license: License,
		private roleRepo: RoleRepository,
		private settingsRepo: SettingsRepository,
		private userRepo: UserRepository,
		private workflowRunner: ActiveWorkflowRunner,
	) {
		license.isFeatureEnabled = (feature: LICENSE_FEATURES) =>
			this.enabledFeatures[feature] ?? false;
	}

	@Post('/reset')
	async reset(req: ResetRequest) {
		config.set('ui.banners.v1.dismissed', true);
		this.resetFeatures();
		await this.resetLogStreaming();
		await this.removeActiveWorkflows();
		await this.truncateAll();
		await this.setupUserManagement(req.body.owner, req.body.members);
	}

	@Patch('/feature')
	setFeature(req: Request<{}, {}, { feature: LICENSE_FEATURES; enabled: boolean }>) {
		const { enabled, feature } = req.body;
		this.enabledFeatures[feature] = enabled;
	}

	private resetFeatures() {
		for (const feature of Object.keys(this.enabledFeatures)) {
			this.enabledFeatures[feature as LICENSE_FEATURES] = false;
		}
	}

	private async removeActiveWorkflows() {
		this.workflowRunner.removeAllQueuedWorkflowActivations();
		await this.workflowRunner.removeAll();
	}

	private async resetLogStreaming() {
		for (const id in eventBus.destinations) {
			await eventBus.removeDestination(id);
		}
	}

	private async truncateAll() {
		for (const table of tablesToTruncate) {
			try {
				const { connection } = this.roleRepo.manager;
				await connection.query(
					`DELETE FROM ${table}; DELETE FROM sqlite_sequence WHERE name=${table};`,
				);
			} catch (error) {
				console.warn('Dropping Table for E2E Reset error: ', error);
			}
		}
	}

	private async setupUserManagement(owner: UserSetupPayload, members: UserSetupPayload[]) {
		const roles: Array<[Role['name'], Role['scope']]> = [
			['owner', 'global'],
			['member', 'global'],
			['owner', 'workflow'],
			['owner', 'credential'],
			['user', 'credential'],
			['editor', 'workflow'],
		];

		const [{ id: globalOwnerRoleId }, { id: globalMemberRoleId }] = await this.roleRepo.save(
			roles.map(([name, scope], index) => ({ name, scope, id: index.toString() })),
		);

		const users = [];
		users.push({
			id: uuid(),
			...owner,
			password: await hashPassword(owner.password),
			globalRoleId: globalOwnerRoleId,
		});
		for (const { password, ...payload } of members) {
			users.push(
				this.userRepo.create({
					id: uuid(),
					...payload,
					password: await hashPassword(password),
					globalRoleId: globalMemberRoleId,
				}),
			);
		}

		await this.userRepo.insert(users);

		await this.settingsRepo.update(
			{ key: 'userManagement.isInstanceOwnerSetUp' },
			{ value: 'true' },
		);

		config.set('userManagement.isInstanceOwnerSetUp', true);
	}
}
