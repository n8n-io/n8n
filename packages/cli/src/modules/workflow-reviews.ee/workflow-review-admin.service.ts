import { ProjectRelationRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	GLOBAL_ADMIN_ROLE_SLUG,
	GLOBAL_OWNER_ROLE_SLUG,
	PROJECT_ADMIN_ROLE_SLUG,
} from '@n8n/permissions';

/**
 * Who counts as an admin of a review: the single source for the rule the inbox
 * visibility and the decision policy both build on, so the reviews a holder can
 * see and the reviews they may decide can never drift apart.
 *
 * Limitation: only the built-in global/project admin roles qualify — custom
 * roles never make someone a review admin.
 */
@Service()
export class WorkflowReviewAdminService {
	constructor(private readonly projectRelationRepository: ProjectRelationRepository) {}

	/** Global admins and owners are admins of every review on the instance. */
	isGlobalAdmin(user: User): boolean {
		return user.role.slug === GLOBAL_ADMIN_ROLE_SLUG || user.role.slug === GLOBAL_OWNER_ROLE_SLUG;
	}

	/** The projects the user administers, and therefore whose reviews they may decide. */
	async findAdminProjectIds(user: User): Promise<string[]> {
		return await this.projectRelationRepository.getAccessibleProjectsByRoles(user.id, [
			PROJECT_ADMIN_ROLE_SLUG,
		]);
	}

	/** Admins may decide reviews they authored. */
	async isAdminForProject(user: User, projectId: string): Promise<boolean> {
		if (this.isGlobalAdmin(user)) {
			return true;
		}

		return (await this.findAdminProjectIds(user)).includes(projectId);
	}
}
