import { Service } from 'typedi';
import type { EntityManager, FindManyOptions } from '@n8n/typeorm';
import { DataSource, In, IsNull, Not, Repository } from '@n8n/typeorm';
import type { ListQuery } from '@/requests';
import { Passkeys } from '../entities/Passkeys';

@Service()
export class PasskeyRepository extends Repository<Passkeys> {
	constructor(dataSource: DataSource) {
		super(Passkeys, dataSource.manager);
	}
}
