import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { Role } from '../entities/Role';

@Service()
export class RoleRepository extends Repository<Role> {
	constructor(dataSource: DataSource) {
		super(Role, dataSource.manager);
	}
}
