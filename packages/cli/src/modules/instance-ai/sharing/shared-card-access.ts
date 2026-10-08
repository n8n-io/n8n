import type { SharedCardRule, SharedCardTarget } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

import { userHasScopes } from '@/permissions.ee/check-access';

type ResourceIds = Parameters<typeof userHasScopes>[3];

function resourceIds({ type, id }: SharedCardTarget): ResourceIds {
	switch (type) {
		case 'workflow':
			return { workflowId: id };
		case 'credential':
			return { credentialId: id };
		case 'dataTable':
			return { dataTableId: id };
		case 'project':
			return { projectId: id };
	}
}

/**
 * Checks a teammate's own access to the resource that a card changes. The answer runs as
 * the thread owner, who can reach resources that the teammate cannot.
 */
@Service()
export class SharedCardAccess {
	/** Whether `user` holds every scope of the rule on its target. A missing target is no access. */
	async canAnswer(user: User, { scopes, target }: SharedCardRule): Promise<boolean> {
		try {
			return await userHasScopes(user, scopes, false, resourceIds(target));
		} catch (error) {
			if (error instanceof NotFoundError) return false;
			throw error;
		}
	}
}
