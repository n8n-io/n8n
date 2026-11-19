import { Service } from '@n8n/di';

export type AccountProject = { id: string; name: string };

/** Links service accounts to the projects that they act for. */
export interface ServiceAccountProjectSource {
	/** The project of each account that has one, by account ID. */
	findProjectsOfAccounts(accountIds: string[]): Promise<Map<string, AccountProject>>;
	/** The IDs of the accounts that act for one of these projects. */
	findAccountIdsInProjects(projectIds: string[]): Promise<string[]>;
}

/**
 * The module that owns service accounts registers its source here, so core code
 * does not depend on that module. Without a source, no account has a project.
 */
@Service()
export class ServiceAccountProjects {
	private source?: ServiceAccountProjectSource;

	register(source: ServiceAccountProjectSource) {
		this.source = source;
	}

	async findProjectsOfAccounts(accountIds: string[]): Promise<Map<string, AccountProject>> {
		if (!this.source || accountIds.length === 0) return new Map();
		return await this.source.findProjectsOfAccounts(accountIds);
	}

	async findAccountIdsInProjects(projectIds: string[]): Promise<string[]> {
		if (!this.source || projectIds.length === 0) return [];
		return await this.source.findAccountIdsInProjects(projectIds);
	}
}
