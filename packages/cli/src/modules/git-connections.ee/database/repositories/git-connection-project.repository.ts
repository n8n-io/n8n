import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { GitConnectionProject } from '../entities/git-connection-project.entity';

@Service()
export class GitConnectionProjectRepository extends Repository<GitConnectionProject> {
	constructor(dataSource: DataSource) {
		super(GitConnectionProject, dataSource.manager);
	}

	async findByProjectId(projectId: string): Promise<GitConnectionProject | null> {
		return await this.findOneBy({ projectId });
	}

	/**
	 * Links a project without changing an existing link. Concurrent inserts race on
	 * the project primary key, and all callers read the link that won.
	 */
	async linkProject(projectId: string, gitConnectionId: string): Promise<GitConnectionProject> {
		const link = this.create({ projectId, gitConnectionId });
		await this.createQueryBuilder().insert().values(link).orIgnore().execute();
		return await this.findOneByOrFail({ projectId });
	}

	/**
	 * Unlinks a project only if it still belongs to the given connection. The entity's
	 * primary key is `projectId` alone, so an entity-based `remove` would delete
	 * whichever link currently holds the project — including one reassigned to another
	 * connection after the caller's read. Returns the number of links removed, which is
	 * 0 when the link no longer belongs to this connection, so the caller can tell a
	 * lost race from a successful unlink.
	 */
	async unlinkProject(projectId: string, gitConnectionId: string): Promise<number> {
		const result = await this.delete({ projectId, gitConnectionId });
		return result.affected ?? 0;
	}

	/** Project IDs linked to a connection, ordered for a stable response. */
	async findProjectIdsByConnection(gitConnectionId: string) {
		const rows = await this.find({
			where: { gitConnectionId },
			select: { projectId: true },
			order: { projectId: 'ASC' },
		});
		return rows.map((row) => row.projectId);
	}
}
