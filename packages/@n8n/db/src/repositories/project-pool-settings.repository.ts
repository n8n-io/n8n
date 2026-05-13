import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ProjectPoolSettings } from '../entities';

@Service()
export class ProjectPoolSettingsRepository extends Repository<ProjectPoolSettings> {
	constructor(dataSource: DataSource) {
		super(ProjectPoolSettings, dataSource.manager);
	}
}
