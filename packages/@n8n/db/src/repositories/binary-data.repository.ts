import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { BinaryDataFile } from '../entities';

@Service()
export class BinaryDataRepository extends Repository<BinaryDataFile> {
	constructor(dataSource: DataSource) {
		super(BinaryDataFile, dataSource.manager);
	}
}
