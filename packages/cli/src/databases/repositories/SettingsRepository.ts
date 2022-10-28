import { AbstractRepository, EntityRepository } from 'typeorm';
import { Settings } from '../entities/Settings';

@EntityRepository(Settings)
export class SettingsRepository extends AbstractRepository<Settings> {
	async get(key: string): Promise<Settings> {
		return this.repository.findOneOrFail({ key });
	}

	async getAll(): Promise<Settings[]> {
		return this.repository.find({ loadOnStartup: true });
	}

	async update(key: string, value: string) {
		return this.repository.update({ key }, { value });
	}

	async clear() {
		return this.repository.clear();
	}
}
