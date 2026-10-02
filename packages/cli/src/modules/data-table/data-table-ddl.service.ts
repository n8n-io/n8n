import { Service } from '@n8n/di';

import { DataTableDDLRepository } from './data-table-ddl.repository';

@Service()
export class DataTableDDLService {
	constructor(private readonly ddlRepository: DataTableDDLRepository) {}

	async createTableWithColumns(
		...args: Parameters<DataTableDDLRepository['createTableWithColumns']>
	) {
		await this.ddlRepository.createTableWithColumns(...args);
	}

	async dropTable(...args: Parameters<DataTableDDLRepository['dropTable']>) {
		await this.ddlRepository.dropTable(...args);
	}

	async renameTable(...args: Parameters<DataTableDDLRepository['renameTable']>) {
		await this.ddlRepository.renameTable(...args);
	}

	async tableExists(...args: Parameters<DataTableDDLRepository['tableExists']>): Promise<boolean> {
		return await this.ddlRepository.tableExists(...args);
	}

	async addColumn(...args: Parameters<DataTableDDLRepository['addColumn']>) {
		await this.ddlRepository.addColumn(...args);
	}

	async dropColumnFromTable(...args: Parameters<DataTableDDLRepository['dropColumnFromTable']>) {
		await this.ddlRepository.dropColumnFromTable(...args);
	}

	async renameColumn(...args: Parameters<DataTableDDLRepository['renameColumn']>) {
		await this.ddlRepository.renameColumn(...args);
	}
}
