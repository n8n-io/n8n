import {
	GLOBAL_OWNER_ROLE,
	ProjectRelationRepository,
	ProjectRepository,
	SettingsRepository,
	UserRepository,
	type User,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import { UnexpectedError } from 'n8n-workflow';

import config from '@/config';

const INSTANCE_OWNER_SETUP_KEY = 'userManagement.isInstanceOwnerSetUp';

/**
 * Fetch the auto-created shell user with the `global:owner` role, ensure they
 * have a personal project, and flip the `isInstanceOwnerSetUp` setting so that
 * downstream code paths treat the instance as fully provisioned.
 *
 * Headless runs intentionally skip the email/password ceremony performed by
 * `OwnershipService.setupOwner` — the shell user is the only identity needed
 * for the lifetime of the process.
 *
 * Idempotent: safe to call multiple times within the same process.
 */
export async function ensureOwner(): Promise<User> {
	const userRepository = Container.get(UserRepository);
	const projectRepository = Container.get(ProjectRepository);
	const projectRelationRepository = Container.get(ProjectRelationRepository);
	const settingsRepository = Container.get(SettingsRepository);

	const owner = await userRepository.findOne({
		where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
		relations: ['role'],
	});

	if (!owner) {
		throw new UnexpectedError(
			'Headless bootstrap: no shell user with role "global:owner" found. DB initialization must run before ensureOwner().',
		);
	}

	const existingProject = await projectRepository.getPersonalProjectForUser(owner.id);
	if (!existingProject) {
		const newProject = await projectRepository.save(
			projectRepository.create({
				type: 'personal',
				name: owner.createPersonalProjectName(),
				creatorId: owner.id,
			}),
		);

		await projectRelationRepository.save(
			projectRelationRepository.create({
				projectId: newProject.id,
				userId: owner.id,
				role: { slug: PROJECT_OWNER_ROLE_SLUG },
			}),
		);
	}

	// Mirror the dual-write OwnershipService.setupOwner performs: the persisted
	// setting survives restarts and the in-memory config flag is read by the
	// same-process code paths that gate on initial-setup state.
	await settingsRepository.upsert(
		{
			key: INSTANCE_OWNER_SETUP_KEY,
			value: JSON.stringify(true),
			loadOnStartup: true,
		},
		['key'],
	);
	config.set(INSTANCE_OWNER_SETUP_KEY, true);

	return owner;
}
