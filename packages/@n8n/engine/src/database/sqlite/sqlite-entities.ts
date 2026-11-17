import {
	EntitySchema,
	getMetadataArgsStorage,
	type ColumnType,
	type EntitySchemaColumnOptions,
	type EntitySchemaIndexOptions,
} from '@n8n/typeorm';

import { entities } from '../entities';

/**
 * The Postgres column types the decorated entities declare, and what the
 * SQLite driver stores them as. Everything else passes through unchanged.
 */
const COLUMN_TYPES: Partial<Record<string, ColumnType>> = {
	jsonb: 'json',
	timestamptz: 'datetime',
	uuid: 'varchar',
};

/**
 * Written for `created_at` and `updated_at` when an insert supplies neither.
 * The driver's own default is `datetime('now')`, which keeps no milliseconds;
 * a row stamped to the second then sorts after a cursor taken from it.
 */
const TIMESTAMP_DEFAULT = () => "strftime('%Y-%m-%d %H:%M:%f', 'now')";

/**
 * The engine's entities, re-declared for SQLite.
 *
 * The decorated classes name Postgres types (`jsonb`, `timestamptz`) that the
 * SQLite driver rejects. A `DataSource` given only `EntitySchema`s ignores the
 * decorators on their targets, so these schemas re-use the same classes with
 * the column types remapped: a repository for `WorkflowExecution` works on
 * either dialect, and so does every test that reads rows through one.
 *
 * The schemas are built from the decorator metadata, not written by hand, so
 * a column added to an entity reaches SQLite without a second edit.
 */
export function sqliteEntitySchemas(): Array<EntitySchema<object>> {
	const storage = getMetadataArgsStorage();
	return entities.map((target) => {
		const [table] = storage.filterTables(target);
		const columns: Record<string, EntitySchemaColumnOptions> = {};
		for (const column of storage.filterColumns(target)) {
			const { type, name, nullable, primary, length, default: defaultValue } = column.options;
			const typeName = typeof type === 'string' ? type : 'varchar';
			const isTimestamp = column.mode === 'createDate' || column.mode === 'updateDate';
			columns[column.propertyName] = {
				name,
				nullable,
				primary,
				length,
				default: isTimestamp ? TIMESTAMP_DEFAULT : defaultValue,
				type: COLUMN_TYPES[typeName] ?? (type as ColumnType),
				createDate: column.mode === 'createDate',
				updateDate: column.mode === 'updateDate',
			};
		}
		const indices: EntitySchemaIndexOptions[] = storage.filterIndices(target).map((index) => ({
			name: index.name,
			columns: index.columns,
			unique: index.unique,
			where: index.where,
		}));
		return new EntitySchema<object>({
			name: target.name,
			tableName: table.name,
			target,
			columns,
			indices,
		});
	});
}
