import type {
	CreateDatastoreDto,
	CreateDatastoreFieldDto,
	UpdateDatastoreDto,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';
import type { ZodTypeAny } from 'zod';
import { z } from 'zod';

import type { DatastoreField } from './database/entities/datastore-field';
import { DatastoreFieldRepository } from './database/repositories/datastore-field.repository';
import { DatastoreRepository } from './database/repositories/datastore.repository';
import type { Datastore, DatastoreFieldType } from './datastore.types';

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

@Service()
export class DatastoreService {
	constructor(
		private readonly datastoreRepository: DatastoreRepository,
		private readonly datastoreFieldRepository: DatastoreFieldRepository,
	) {}

	async getDatastores(): Promise<Datastore[]> {
		const datastores = await this.datastoreRepository.find({
			relations: {
				fields: true,
			},
		});
		return datastores.map((datastore) => ({
			...datastore,
			fields: datastore.fields.map((field) => ({
				...field,
				type: field.type as DatastoreFieldType,
			})),
		}));
	}

	async createDatastore(createDatastore: CreateDatastoreDto): Promise<Datastore> {
		const datastore = await this.datastoreRepository.save(
			this.datastoreRepository.create({ name: createDatastore.name }),
		);
		const fields = createDatastore.fields.map((field) => ({
			...field,
			datastoreId: datastore.id,
		}));

		for (const field of fields) {
			await this.datastoreFieldRepository.save(this.datastoreFieldRepository.create(field));
		}

		// TODO : make sure to sanitize the table name and column names to avoid SQL injection
		const tableName = `datastore_${datastore.id}`;
		const columnsFields = fields.map(
			(field) => `\`${field.name}\` ${columnTypeMapping(field.type)}`,
		);
		await this.datastoreRepository.manager.query(
			`CREATE TABLE IF NOT EXISTS \`${tableName}\` (id VARCHAR(36) PRIMARY KEY${columnsFields.length > 0 ? `, ${columnsFields.join(', ')}` : ''})`,
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

	async deleteDatastore(datastoreId: string): Promise<void> {
		const datastore = await this.datastoreRepository.findOneByOrFail({
			id: datastoreId,
		});
		if (!datastore) {
			throw new OperationalError(`Datastore with ID ${datastoreId} not found`);
		}
		await this.datastoreRepository.manager.query('DROP TABLE IF EXISTS ??', [
			`datastore_${datastore.id}`,
		]);
		await this.datastoreRepository.delete({ id: datastoreId });
	}

	async addField(datastoreId: string, field: CreateDatastoreFieldDto): Promise<void> {
		const datastore = await this.datastoreRepository.findOneByOrFail({
			id: datastoreId,
		});
		if (!datastore) {
			throw new OperationalError(`Datastore with ID ${datastoreId} not found`);
		}
		const newField = await this.datastoreFieldRepository.save({
			...field,
			datastoreId: datastore.id,
		});
		await this.datastoreRepository.manager.query(
			`ALTER TABLE ?? ADD COLUMN ?? ${columnTypeMapping(newField.type)}`,
			[`datastore_${datastore.id}`, newField.name],
		);
	}

	async deleteField(datastoreId: string, fieldId: string): Promise<void> {
		const datastore = await this.datastoreRepository.findOneByOrFail({
			id: datastoreId,
		});
		if (!datastore) {
			throw new OperationalError(`Datastore with ID ${datastoreId} not found`);
		}
		const field = await this.datastoreFieldRepository.findOneByOrFail({
			id: fieldId,
			datastoreId: datastore.id,
		});
		if (!field) {
			throw new OperationalError(`Field with ID ${fieldId} not found in datastore ${datastoreId}`);
		}
		await this.datastoreRepository.manager.query('ALTER TABLE ?? DROP COLUMN ??', [
			`datastore_${datastore.id}`,
			field.name,
		]);
		await this.datastoreFieldRepository.delete({ id: fieldId });
	}

	async writeRecords(datastoreId: string, records: Array<Record<string, unknown>>): Promise<void> {
		const datastore = await this.datastoreRepository.findOneByOrFail({
			id: datastoreId,
		});

		if (!datastore) {
			throw new OperationalError(`Datastore with ID ${datastoreId} not found`);
		}

		const columns = Object.keys(records[0]);
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
