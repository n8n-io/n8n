import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { Settings } from '../entities/Settings';

@Service()
export class SettingsRepository extends Repository<Settings> {
	constructor(dataSource: DataSource) {
		super(Settings, dataSource.manager);
	}
}
