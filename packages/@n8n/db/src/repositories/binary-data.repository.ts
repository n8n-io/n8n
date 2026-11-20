import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { BinaryDataFile } from '../entities';
import type { SourceType } from '../entities';
import { dbType } from '../entities/abstract-entity';

@Service()
export class BinaryDataRepository extends Repository<BinaryDataFile> {
	constructor(
		dataSource: DataSource,
		private readonly databaseConfig: DatabaseConfig,
	) {
		super(BinaryDataFile, dataSource.manager);
	}

	/** Content bytes for a stored file, or null when the row is gone. */
	async findContentByFileId(fileId: string): Promise<Buffer | null> {
		const file = await this.findOne({ where: { fileId }, select: ['data'] });

		return file?.data ?? null;
	}

	/** Source that a stored file belongs to, or null when the row is gone. */
	async findSourceByFileId(
		fileId: string,
	): Promise<{ sourceType: SourceType; sourceId: string } | null> {
		const file = await this.findOne({ where: { fileId }, select: ['sourceType', 'sourceId'] });

		return file ? { sourceType: file.sourceType, sourceId: file.sourceId } : null;
	}

	async deleteByFileIds(fileIds: string[]): Promise<void> {
		if (fileIds.length === 0) return;

		await this.delete({ fileId: In(fileIds) });
	}

	async copyStoredFile(
		sourceFileId: string,
		targetFileId: string,
		targetSourceType: string,
		targetSourceId: string,
	): Promise<boolean> {
		const tableName = this.getTableName('binary_data');
		const fileId = this.getColumnName('fileId');
		const sourceType = this.getColumnName('sourceType');
		const sourceId = this.getColumnName('sourceId');
		const data = this.getColumnName('data');
		const mimeType = this.getColumnName('mimeType');
		const fileName = this.getColumnName('fileName');
		const fileSize = this.getColumnName('fileSize');

		const [first, second, third, fourth] =
			dbType === 'postgresdb' ? ['$1', '$2', '$3', '$4'] : ['?', '?', '?', '?'];

		const query = `
			INSERT INTO ${tableName} (${fileId}, ${sourceType}, ${sourceId}, ${data}, ${mimeType}, ${fileName}, ${fileSize})
			SELECT ${first}, ${second}, ${third}, ${data}, ${mimeType}, ${fileName}, ${fileSize}
			FROM ${tableName}
			WHERE ${fileId} = ${fourth}
		`;

		const args = [targetFileId, targetSourceType, targetSourceId, sourceFileId];

		await this.query(query, args);

		return await this.existsBy({ fileId: targetFileId });
	}

	private getTableName(name: string): string {
		const { tablePrefix } = this.databaseConfig;
		return this.manager.connection.driver.escape(`${tablePrefix}${name}`);
	}

	private getColumnName(name: string): string {
		return this.manager.connection.driver.escape(name);
	}
}
