import { Service, Container } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { Settings } from '../entities/Settings';
import { License } from '../../License';

@Service()
export class SettingsRepository extends Repository<Settings> {
	constructor(dataSource: DataSource) {
		super(Settings, dataSource.manager);
	}

	get usersQuota() {
		const license = Container.get(License);
		return license.getUsersLimit();
	}
}
