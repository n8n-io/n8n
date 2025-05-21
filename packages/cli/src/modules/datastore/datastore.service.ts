import type { CreateDatastoreDto, UpdateDatastoreDto } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';
import type { ZodTypeAny } from 'zod';
import { z } from 'zod';

import { DatastoreFieldRepository } from './database/repositories/datastore-field.repository';
import { DatastoreRepository } from './database/repositories/datastore.repository';
import type { Datastore, DatastoreFieldType } from './datastore.types';
import { DatastoreField } from './database/entities/datastore-field';

@Service()
export class DatastoreService {
	constructor(
		private readonly datastoreRepository: DatastoreRepository,
		private readonly datastoreFieldRepository: DatastoreFieldRepository,
	) {}

	async createDatastore(createDatastore: CreateDatastoreDto): Promise<Datastore> {
		const datastore = await this.datastoreRepository.save({
			name: createDatastore.name,
		});
		const fields = createDatastore.fields.map((field) => ({
			...field,
			datastoreId: datastore.id,
		}));

		await this.datastoreFieldRepository.insert(fields);

		const columnTypeMapping = (type: DatastoreFieldType) => {
			switch (type) {
				case 'string':
					return 'VARCHAR(255)';
				case 'number':
					return 'FLOAT';
				case 'boolean':
					return 'BOOLEAN';
				case 'date':
					return 'DATETIME';
				default:
					throw new OperationalError(`Unsupported field type: ${type as string}`);
			}
		};

		// TODO : make sure to parametrize the table name and column names to avoid SQL injection
		const columnsFields = fields.map((field) => `?? ${columnTypeMapping(field.type)}`);
		await this.datastoreRepository.manager.query(
			`CREATE TABLE IF NOT EXISTS ?? (id VARCHAR(36) PRIMARY KEY) ${
				columnsFields.length > 0 ? `, ${columnsFields.join(', ')}` : ''
			}`,
			[`datastore_${datastore.id}`, ...fields.map((field) => field.name)],
		);

		return datastore;
	}

	async updateDatastore(datastoreId: string, updateDatastore: UpdateDatastoreDto): Promise<void> {
		await this.datastoreRepository.update(
			{ id: datastoreId },
			{
				name: updateDatastore.name,
			},
		);
	}

	async writeRecords(datastoreId: string, records: Array<Record<string, unknown>>): Promise<void> {
		const datastore = await this.datastoreRepository.findOneByOrFail({
			id: datastoreId,
		});

		if (!datastore) {
			throw new OperationalError(`Datastore with ID ${datastoreId} not found`);
		}

		const columns = Object.keys(records[0]);

		const typeMap = (fieldType: DatastoreFieldType) => {
			switch (fieldType) {
				case 'string':
					return z.string();
				case 'number':
					return z.number();
				case 'boolean':
					return z.boolean();
				case 'date':
					return z.date();
				default:
					throw new OperationalError(`Unsupported field type: ${fieldType as string}`);
			}
		};
		const buildZodSchema = (fields: DatastoreField[]) => {
			const shape: Record<string, ZodTypeAny> = {};
			for (const field of fields) {
				shape[field.name] = typeMap(field.type) ?? z.any();
			}
			return z.object(shape);
		};

		const schema = buildZodSchema(datastore.fields);
		records.map((record) => {
			const parsedRecord = schema.safeParse(record);
			if (!parsedRecord.success) {
				const errors = parsedRecord.error.errors.map((error) => error.message).join(', ');
				throw new OperationalError(`Invalid record: ${errors}`);
			}
			return parsedRecord.data;
		});

		const values = records.map((record) => columns.map((column) => record[column]));

		await this.datastoreRepository.manager.query('INSERT INTO ?? (??) VALUES ?', [
			`datastore_${datastore.id}`,
			columns,
			values,
		]);
	}
}
