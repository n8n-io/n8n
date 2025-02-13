import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { Folder } from '../entities/folder';

@Service()
export class FolderRepository extends Repository<Folder> {
	constructor(dataSource: DataSource) {
		super(Folder, dataSource.manager);
	}
}
