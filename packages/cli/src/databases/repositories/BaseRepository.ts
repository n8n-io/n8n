import { AbstractRepository, In } from 'typeorm';
import type { Connection, ObjectLiteral } from 'typeorm';

export abstract class BaseRepository<
	Entity extends ObjectLiteral,
> extends AbstractRepository<Entity> {
	get connection(): Connection {
		return this.repository.manager.connection;
	}

	async findAll(): Promise<Entity[]> {
		return this.repository.find();
	}

	async findOneById(id: Entity['id']): Promise<Entity | undefined> {
		return this.repository.findOne(id);
	}

	async findByIds(ids: Array<Entity['id']>): Promise<Entity[]> {
		return this.repository.find({
			where: { id: In(ids) },
		});
	}

	async clear() {
		return this.repository.clear();
	}
}
