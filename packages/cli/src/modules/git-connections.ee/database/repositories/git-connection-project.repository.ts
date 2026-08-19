import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { GitConnectionProject } from '../entities/git-connection-project.entity';

@Service()
export class GitConnectionProjectRepository extends Repository<GitConnectionProject> {
	constructor(dataSource: DataSource) {
		super(GitConnectionProject, dataSource.manager);
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
