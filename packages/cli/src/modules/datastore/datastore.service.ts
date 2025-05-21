import type {
	CreateDatastoreDto,
	CreateDatastoreFieldDto,
	UpdateDatastoreDto,
} from '@n8n/api-types';
import { generateNanoId } from '@n8n/db';
import { Service } from '@n8n/di';
import { createResultError, createResultOk, type Result } from 'n8n-workflow';
import { z } from 'zod';
import type { ZodTypeAny } from 'zod';

import { Datastore } from './database/entities/datastore';
import type { DatastoreField } from './database/entities/datastore-field';
import { DatastoreFieldRepository } from './database/repositories/datastore-field.repository';
import { DatastoreRepository } from './database/repositories/datastore.repository';
import type { DatastoreFieldType } from './datastore.types';
import { NotFoundError } from '../../errors/response-errors/not-found.error';

const dataStoreFieldTypeToSql = (type: DatastoreFieldType) => {
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
			throw new NotFoundError(`Unsupported field type: ${type as string}`);
	}
};

const dataStoreFieldTypeToZod = (fieldType: DatastoreFieldType) => {
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
			throw new NotFoundError(`Unsupported field type: ${fieldType as string}`);
	}
};

const buildZodSchema = (fields: DatastoreField[]) => {
	const shape: Record<string, ZodTypeAny> = {};
	for (const field of fields) {
		shape[field.name] = dataStoreFieldTypeToZod(field.type) ?? z.any();
	}
	return z.object(shape);
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
		return datastores;
	}

	async getDatastore(id: string): Promise<Datastore | null> {
		const datastore = await this.datastoreRepository.findOne({
			where: { id },
			relations: {
				fields: true,
			},
		});
		return datastore;
	}

	async createDatastore(createDatastore: CreateDatastoreDto): Promise<Datastore> {
		const datastore = await this.datastoreRepository.save(
			this.datastoreRepository.create({ name: createDatastore.name }),
		);
		const fields = createDatastore.fields.map((field) => ({
			...field,
			datastoreId: datastore.id,
		}));

		const savedFields = await this.datastoreFieldRepository.save(
			fields.map((field) => this.datastoreFieldRepository.create(field)),
		);

		// TODO : make sure to sanitize the table name and column names to avoid SQL injection
		const tableName = this.toTableName(datastore.id);
		const columnsFields = savedFields.map(
			(field) => `\`${field.name}\` ${dataStoreFieldTypeToSql(field.type)}`,
		);

		await this.datastoreRepository.manager.query(
			`CREATE TABLE IF NOT EXISTS \`${tableName}\` (id VARCHAR(36) PRIMARY KEY${columnsFields.length > 0 ? `, ${columnsFields.join(', ')}` : ''})`,
		);

		return datastore;
	}

	async updateDatastore(
		datastoreId: string,
		updateDatastore: UpdateDatastoreDto,
	): Promise<Datastore> {
		const result = await this.datastoreRepository.update(
			{ id: datastoreId },
			{
				name: updateDatastore.name,
			},
		);

		if (!result.affected) {
			throw new NotFoundError('Datastore not found');
		}

		return await this.datastoreRepository.findOneByOrFail({ id: datastoreId });
	}

	async deleteDatastore(datastoreId: string): Promise<void> {
		const datastore = await this.datastoreRepository.findOneByOrFail({
			id: datastoreId,
		});

		if (!datastore) {
			throw new NotFoundError(`Datastore with ID "${datastoreId}" not found`);
		}

		await this.datastoreRepository.manager.transaction(async (tx) => {
			await tx.delete(Datastore, { id: datastoreId });
			await tx.query(`DROP TABLE IF EXISTS ${this.toTableName(datastore.id)}`);
		});
	}

	async addField(datastoreId: string, field: CreateDatastoreFieldDto): Promise<DatastoreField> {
		const datastore = await this.datastoreRepository.findOneByOrFail({
			id: datastoreId,
		});
		if (!datastore) {
			throw new NotFoundError(`Datastore with ID ${datastoreId} not found`);
		}
		const newField = await this.datastoreFieldRepository.save(
			this.datastoreFieldRepository.create({
				...field,
				datastoreId: datastore.id,
			}),
		);

		await this.datastoreRepository.manager.query(
			`ALTER TABLE ${this.toTableName(datastore.id)} ADD COLUMN ${newField.name} ${dataStoreFieldTypeToSql(newField.type)}`,
		);

		return newField;
	}

	async deleteField(datastoreId: string, fieldId: string): Promise<void> {
		const datastore = await this.datastoreRepository.findOneBy({
			id: datastoreId,
		});
		if (!datastore) {
			throw new NotFoundError(`Datastore with ID ${datastoreId} not found`);
		}
		const field = await this.datastoreFieldRepository.findOneBy({
			id: fieldId,
			datastoreId: datastore.id,
		});
		if (!field) {
			throw new NotFoundError(`Field with ID ${fieldId} not found in datastore ${datastoreId}`);
		}
		await this.datastoreRepository.manager.query(
			`ALTER TABLE ${this.toTableName(datastore.id)} DROP COLUMN ${field.id}`,
		);
		await this.datastoreFieldRepository.delete({ id: fieldId });
	}

	async writeRecords(
		datastoreId: string,
		records: Array<Record<string, unknown>>,
	): Promise<Result<null, z.ZodIssue>> {
		const datastore = await this.datastoreRepository.findOne({
			where: {
				id: datastoreId,
			},
			relations: {
				fields: true,
			},
		});

		if (!datastore) {
			throw new NotFoundError(`Datastore with ID ${datastoreId} not found`);
		}

		const schema = z.array(buildZodSchema(datastore.fields));

		const parsedRecord = schema.safeParse(records);
		if (!parsedRecord.success) {
			return createResultError(parsedRecord.error.errors[0]);
		}

		// {id: 1, name: 'John', age: 30}, {id: 2, age: 25, name: 'Jane'}

		const columns = datastore.fields.map((field) => field.name);
		const values = records.map((record) => {
			return [generateNanoId(), ...columns.map((column) => record[column] ?? null)];
		});

		const rowPlaceholders = values.map((row) => `(${row.map(() => '?').join(', ')})`).join(', ');

		await this.datastoreRepository.manager.query(
			`INSERT INTO ${this.toTableName(datastore.id)} (id, ${columns.join(', ')}) VALUES ${rowPlaceholders}`,
			values.flat(),
		);

		return createResultOk(null);
	}

	async getRecords(datastoreId: string): Promise<Array<Record<string, unknown>>> {
		const datastore = await this.datastoreRepository.findOne({
			where: {
				id: datastoreId,
			},
			relations: {
				fields: true,
			},
		});

		if (!datastore) {
			throw new NotFoundError(`Datastore with ID ${datastoreId} not found`);
		}

		const columns = datastore.fields.map((field) => field.name);
		return await this.datastoreRepository.manager.query(
			`SELECT ${columns.join(', ')} FROM ${this.toTableName(datastore.id)}`,
		);
	}

	toTableName(datastoreId: string): string {
		return `datastore_${datastoreId}`;
	}
}
