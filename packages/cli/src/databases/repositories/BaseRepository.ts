import { AbstractRepository, In, ObjectLiteral } from 'typeorm';

export abstract class BaseRepository<
	Entity extends ObjectLiteral,
> extends AbstractRepository<Entity> {
	async findByIds(ids: Array<Entity['id']>): Promise<Entity[]> {
		return this.repository.find({
			where: { id: In(ids) },
		});
	}

	async clear() {
		return this.repository.clear();
	}
}
