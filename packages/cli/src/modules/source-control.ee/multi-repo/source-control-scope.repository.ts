import { Service } from '@n8n/di';
import { DataSource, Not, IsNull, Repository } from '@n8n/typeorm';

import { SourceControlScope } from './source-control-scope.entity';

@Service()
export class SourceControlScopeRepository extends Repository<SourceControlScope> {
	constructor(dataSource: DataSource) {
		super(SourceControlScope, dataSource.manager);
	}

	async findInstanceScope() {
		return await this.findOne({ where: { scopeType: 'instance' } });
	}

	async findScopeForProject(projectId: string) {
		return await this.findOne({ where: { scopeType: 'project', projectId } });
	}

	async findProjectScopesForConnection(connectionId: string) {
		return await this.find({ where: { scopeType: 'project', connectionId } });
	}

	async findClaimedProjectIds(): Promise<string[]> {
		const scopes = await this.find({
			select: ['projectId'],
			where: { scopeType: 'project', projectId: Not(IsNull()) },
		});
		return scopes.map((scope) => scope.projectId).filter((id): id is string => id !== null);
	}
}
