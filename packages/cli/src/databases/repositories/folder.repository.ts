import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { FolderEntity } from '../entities/FolderEntity';

@Service()
export class FolderRepository extends Repository<FolderEntity> {
	constructor(dataSource: DataSource) {
		super(FolderEntity, dataSource.manager);
	}
}
