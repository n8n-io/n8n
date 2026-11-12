import type { DataSource, EntityMetadata, Table } from '@n8n/typeorm';

type DbType = 'sqlite' | 'postgresdb';

const TYPE_FAMILIES: Array<[RegExp, string]> = [
	[/uuid/, 'uuid'],
	[/simple-(array|json)/, 'string'],
	[/json/, 'json'],
	[/bool/, 'bool'],
	[/time|date/, 'datetime'],
	[/blob|bytea|binary/, 'binary'],
	[/int|numeric|decimal|real|double|float|number/, 'number'],
	[/char|text|string|clob|enum/, 'string'],
];

function typeFamily(type: string, dbType: DbType): string {
	const lower = type.toLowerCase();
	const family = TYPE_FAMILIES.find(([pattern]) => pattern.test(lower))?.[1] ?? lower;
	// SQLite has no native uuid or json type: both are text on disk.
	if (dbType === 'sqlite' && (family === 'uuid' || family === 'json')) return 'string';
	return family;
}

const columnKey = (columns: string[]) => [...columns].sort().join(',');

const lastSegment = (path: string) => path.split('.').pop() ?? path;

function compareEntity(
	metadata: EntityMetadata,
	table: Table,
	tableName: string,
	dataSource: DataSource,
	dbType: DbType,
	tablePrefix: string,
): string[] {
	const stripPrefix = (name: string) =>
		name.startsWith(tablePrefix) ? name.slice(tablePrefix.length) : name;
	const findings: string[] = [];
	const entityColumnNames = new Set<string>();

	for (const column of metadata.columns) {
		entityColumnNames.add(column.databaseName);
		const dbColumn = table.columns.find((c) => c.name === column.databaseName);
		if (!dbColumn) {
			findings.push(`${tableName}.${column.databaseName}: column is missing in the database`);
			continue;
		}
		// A join column without its own @Column takes its type from the column it references.
		const typeSource = column.isVirtual ? column.referencedColumn : column;
		if (!typeSource) continue;
		const entityType = String(
			typeof typeSource.type === 'string'
				? typeSource.type
				: dataSource.driver.normalizeType(typeSource),
		);
		const expected = typeFamily(entityType, dbType);
		const actual = typeFamily(dbColumn.type, dbType);
		if (expected !== actual) {
			findings.push(
				`${tableName}.${column.databaseName}: entity type is ${expected}, database type is ${actual}`,
			);
		}

		if (!column.isPrimary && column.isNullable !== dbColumn.isNullable) {
			findings.push(
				`${tableName}.${column.databaseName}: entity nullable is ${column.isNullable}, database nullable is ${dbColumn.isNullable}`,
			);
		}
	}

	for (const dbColumn of table.columns) {
		if (entityColumnNames.has(dbColumn.name)) continue;
		if (!dbColumn.isNullable && dbColumn.default === undefined && !dbColumn.isGenerated) {
			findings.push(
				`${tableName}.${dbColumn.name}: database column is NOT NULL without a default and has no entity column`,
			);
		}
	}

	for (const foreignKey of metadata.foreignKeys) {
		const key = columnKey(foreignKey.columnNames);
		const target = `${lastSegment(foreignKey.referencedTablePath)}(${columnKey(foreignKey.referencedColumnNames)})`;
		const found = table.foreignKeys.some(
			(fk) =>
				columnKey(fk.columnNames) === key &&
				`${lastSegment(fk.referencedTableName)}(${columnKey(fk.referencedColumnNames)})` === target,
		);
		if (!found) {
			findings.push(
				`${tableName}(${key}): foreign key to ${stripPrefix(target)} is missing in the database`,
			);
		}
	}

	// TypeORM reads Postgres index columns out of order, so only SQLite checks the order.
	const indexKey = (columns: string[]) =>
		dbType === 'sqlite' ? columns.join(',') : columnKey(columns);
	const primaryKey = columnKey(table.columns.filter((c) => c.isPrimary).map((c) => c.name));
	const discriminator = metadata.discriminatorColumn?.databaseName;
	// TypeORM adds junction table indexes on its own, so no entity declares them.
	const declaredIndices = metadata.tableType === 'junction' ? [] : metadata.indices;
	for (const index of declaredIndices) {
		const key = indexKey(index.columns.map((c) => c.databaseName));
		// Expression indexes have no columns to compare.
		if (key === '') continue;
		// TypeORM adds an index on the table inheritance column on its own.
		if (key === discriminator) continue;
		const found =
			columnKey(index.columns.map((c) => c.databaseName)) === primaryKey ||
			table.indices.some(
				(i) => indexKey(i.columnNames) === key && (!index.isUnique || i.isUnique),
			) ||
			(index.isUnique && table.uniques.some((u) => indexKey(u.columnNames) === key));
		if (!found) {
			findings.push(
				`${tableName}(${key}): ${index.isUnique ? 'unique index' : 'index'} is missing in the database`,
			);
		}
	}

	return findings;
}

/**
 * Compares the entity metadata of a migrated database with its real schema.
 * Returns one stable, prefix-free line for each mismatch.
 */
export async function findEntitySchemaMismatches(
	dataSource: DataSource,
	dbType: DbType,
	tablePrefix: string,
): Promise<string[]> {
	const queryRunner = dataSource.createQueryRunner();
	let tables: Table[];
	try {
		tables = await queryRunner.getTables();
	} finally {
		await queryRunner.release();
	}

	const tablesByName = new Map(tables.map((t) => [t.name.split('.').pop() ?? t.name, t]));
	const findings = new Set<string>();

	for (const metadata of dataSource.entityMetadatas) {
		if (metadata.tableType === 'view') continue;
		const tableName = metadata.tableName.startsWith(tablePrefix)
			? metadata.tableName.slice(tablePrefix.length)
			: metadata.tableName;
		const table = tablesByName.get(metadata.tableName);
		if (!table) {
			findings.add(`${tableName}: table is missing in the database`);
			continue;
		}
		for (const finding of compareEntity(
			metadata,
			table,
			tableName,
			dataSource,
			dbType,
			tablePrefix,
		)) {
			findings.add(finding);
		}
	}

	return [...findings].sort();
}
