import { Service } from 'typedi';
import { DataSource, Repository } from '@n8n/typeorm';
import { CredentialsEntity } from '../entities/CredentialsEntity';

@Service()
export class CredentialsRepository extends Repository<CredentialsEntity> {
	constructor(dataSource: DataSource) {
		super(CredentialsEntity, dataSource.manager);
	}
}
