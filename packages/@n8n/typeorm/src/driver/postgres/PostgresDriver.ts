import { ObjectLiteral } from '../../common/ObjectLiteral';
import { DataSource } from '../../data-source/DataSource';
import { ConnectionIsNotSetError } from '../../error/ConnectionIsNotSetError';
import { DriverPackageNotInstalledError } from '../../error/DriverPackageNotInstalledError';
import { ColumnMetadata } from '../../metadata/ColumnMetadata';
import { EntityMetadata } from '../../metadata/EntityMetadata';
import { QueryRunner } from '../../query-runner/QueryRunner';
import { RdbmsSchemaBuilder } from '../../schema-builder/RdbmsSchemaBuilder';
import { TableColumn } from '../../schema-builder/table/TableColumn';
import { ApplyValueTransformers } from '../../util/ApplyValueTransformers';
import { DateUtils } from '../../util/DateUtils';
import { OrmUtils } from '../../util/OrmUtils';
import { Driver } from '../Driver';
import { ColumnType } from '../types/ColumnTypes';
import { CteCapabilities } from '../types/CteCapabilities';
import { DataTypeDefaults } from '../types/DataTypeDefaults';
import { MappedColumnTypes } from '../types/MappedColumnTypes';
import { ReplicationMode } from '../types/ReplicationMode';
import { VersionUtils } from '../../util/VersionUtils';
import { PostgresConnectionCredentialsOptions } from './PostgresConnectionCredentialsOptions';
import { PostgresConnectionOptions } from './PostgresConnectionOptions';
import { PostgresQueryRunner } from './PostgresQueryRunner';
import { DriverUtils } from '../DriverUtils';
import { TypeORMError } from '../../error';
import { Table } from '../../schema-builder/table/Table';
import { View } from '../../schema-builder/view/View';
import { TableForeignKey } from '../../schema-builder/table/TableForeignKey';
import { InstanceChecker } from '../../util/InstanceChecker';
import { UpsertType } from '../types/UpsertType';
import type pg from 'pg';

/**
 * Organizes communication with PostgreSQL DBMS.
 */
export class PostgresDriver implements Driver {
	// -------------------------------------------------------------------------
	// Public Properties
	// -------------------------------------------------------------------------

	/**
	 * Connection used by driver.
	 */
	connection: DataSource;

	/**
	 * Postgres underlying library.
	 */
	postgres: typeof pg;

	/**
	 * Pool for master database.
	 */
	master: pg.Pool | undefined;

	/**
	 * Pool for slave databases.
	 * Used in replication.
	 */
	slaves: any[] = [];

	/**
	 * We store all created query runners because we need to release them.
	 */
	connectedQueryRunners: QueryRunner[] = [];

	// -------------------------------------------------------------------------
	// Public Implemented Properties
	// -------------------------------------------------------------------------

	/**
	 * Connection options.
	 */
	options: PostgresConnectionOptions;

	/**
	 * Version of Postgres. Requires a SQL query to the DB, so it is not always set
	 */
	version?: string;

	/**
	 * Database name used to perform all write queries.
	 */
	database?: string;

	/**
	 * Schema name used to perform all write queries.
	 */
	schema?: string;

	/**
	 * Schema that's used internally by Postgres for object resolution.
	 *
	 * Because we never set this we have to track it in separately from the `schema` so
	 * we know when we have to specify the full schema or not.
	 *
	 * In most cases this will be `public`.
	 */
	searchSchema?: string;

	/**
	 * Indicates if replication is enabled.
	 */
	isReplicated: boolean = false;

	/**
	 * Indicates if tree tables are supported by this driver.
	 */
	treeSupport = true;

	/**
	 * Represent transaction support by this driver
	 */
	transactionSupport = 'nested' as const;

	/**
	 * Gets list of supported column data types by a driver.
	 *
	 * @see https://www.tutorialspoint.com/postgresql/postgresql_data_types.htm
	 * @see https://www.postgresql.org/docs/9.2/static/datatype.html
	 */
	supportedDataTypes: ColumnType[] = [
		'int',
		'int2',
		'int4',
		'int8',
		'smallint',
		'integer',
		'bigint',
		'decimal',
		'numeric',
		'real',
		'float',
		'float4',
		'float8',
		'double precision',
		'money',
		'character varying',
		'varchar',
		'character',
		'char',
		'text',
		'citext',
		'hstore',
		'bytea',
		'bit',
		'varbit',
		'bit varying',
		'timetz',
		'timestamptz',
		'timestamp',
		'timestamp without time zone',
		'timestamp with time zone',
		'date',
		'time',
		'time without time zone',
		'time with time zone',
		'interval',
		'bool',
		'boolean',
		'enum',
		'point',
		'line',
		'lseg',
		'box',
		'path',
		'polygon',
		'circle',
		'cidr',
		'inet',
		'macaddr',
		'tsvector',
		'tsquery',
		'uuid',
		'xml',
		'json',
		'jsonb',
		'int4range',
		'int8range',
		'numrange',
		'tsrange',
		'tstzrange',
		'daterange',
		'int4multirange',
		'int8multirange',
		'nummultirange',
		'tsmultirange',
		'tstzmultirange',
		'datemultirange',
		'geometry',
		'geography',
		'cube',
		'ltree',
	];

	/**
	 * Returns type of upsert supported by driver if any
	 */
	supportedUpsertTypes: UpsertType[] = ['on-conflict-do-update'];

	/**
	 * Gets list of spatial column data types.
	 */
	spatialTypes: ColumnType[] = ['geometry', 'geography'];

	/**
	 * Gets list of column data types that support length by a driver.
	 */
	withLengthColumnTypes: ColumnType[] = [
		'character varying',
		'varchar',
		'character',
		'char',
		'bit',
		'varbit',
		'bit varying',
	];

	/**
	 * Gets list of column data types that support precision by a driver.
	 */
	withPrecisionColumnTypes: ColumnType[] = [
		'numeric',
		'decimal',
		'interval',
		'time without time zone',
		'time with time zone',
		'timestamp without time zone',
		'timestamp with time zone',
	];

	/**
	 * Gets list of column data types that support scale by a driver.
	 */
	withScaleColumnTypes: ColumnType[] = ['numeric', 'decimal'];

	/**
	 * Orm has special columns and we need to know what database column types should be for those types.
	 * Column types are driver dependant.
	 */
	mappedDataTypes: MappedColumnTypes = {
		createDate: 'timestamp',
		createDateDefault: 'now()',
		updateDate: 'timestamp',
		updateDateDefault: 'now()',
		deleteDate: 'timestamp',
		deleteDateNullable: true,
		version: 'int4',
		treeLevel: 'int4',
		migrationId: 'int4',
		migrationName: 'varchar',
		migrationTimestamp: 'int8',
		cacheId: 'int4',
		cacheIdentifier: 'varchar',
		cacheTime: 'int8',
		cacheDuration: 'int4',
		cacheQuery: 'text',
		cacheResult: 'text',
		metadataType: 'varchar',
		metadataDatabase: 'varchar',
		metadataSchema: 'varchar',
		metadataTable: 'varchar',
		metadataName: 'varchar',
		metadataValue: 'text',
	};

	/**
	 * The prefix used for the parameters
	 */
	parametersPrefix: string = '$';

	/**
	 * Default values of length, precision and scale depends on column data type.
	 * Used in the cases when length/precision/scale is not specified by user.
	 */
	dataTypeDefaults: DataTypeDefaults = {
		character: { length: 1 },
		bit: { length: 1 },
		interval: { precision: 6 },
		'time without time zone': { precision: 6 },
		'time with time zone': { precision: 6 },
		'timestamp without time zone': { precision: 6 },
		'timestamp with time zone': { precision: 6 },
	};

	/**
	 * Max length allowed by Postgres for aliases.
	 * @see https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS
	 */
	maxAliasLength = 63;

	isGeneratedColumnsSupported: boolean = false;

	cteCapabilities: CteCapabilities = {
		enabled: true,
		writable: true,
		requiresRecursiveHint: true,
		materializedHint: true,
	};

	/**
	 * Is true if the native driver is used. The native driver does not support
	 * streaming, so you can use this property to disable streaming in your
	 * application.
	 */
	isNative = false;

	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor(connection?: DataSource) {
		if (!connection) {
			return;
		}

		this.connection = connection;
		this.options = connection.options as PostgresConnectionOptions;
		this.isReplicated = this.options.replication ? true : false;
		if (this.options.useUTC) {
			process.env.PGTZ = 'UTC';
		}
		// load postgres package
		this.loadDependencies();

		this.database = DriverUtils.buildDriverOptions(
			this.options.replication ? this.options.replication.master : this.options,
		).database;
		this.schema = DriverUtils.buildDriverOptions(this.options).schema;

		// ObjectUtils.assign(this.options, DriverUtils.buildDriverOptions(connection.options)); // todo: do it better way
		// validate options to make sure everything is set
		// todo: revisit validation with replication in mind
		// if (!this.options.host)
		//     throw new DriverOptionNotSetError("host");
		// if (!this.options.username)
		//     throw new DriverOptionNotSetError("username");
		// if (!this.options.database)
		//     throw new DriverOptionNotSetError("database");
	}

	// -------------------------------------------------------------------------
	// Public Implemented Methods
	// -------------------------------------------------------------------------

	/**
	 * Performs connection to the database.
	 * Based on pooling options, it can either create connection immediately,
	 * either create a pool and create connection when needed.
	 */
	async connect(): Promise<void> {
		if (this.options.replication) {
			this.slaves = await Promise.all(
				this.options.replication.slaves.map((slave) => {
					return this.createPool(this.options, slave);
				}),
			);
			this.master = await this.createPool(this.options, this.options.replication.master);
		} else {
			this.master = await this.createPool(this.options, this.options);
		}

		if (!this.database || !this.searchSchema) {
			const queryRunner = await this.createQueryRunner('master');

			if (!this.database) {
				this.database = await queryRunner.getCurrentDatabase();
			}

			if (!this.searchSchema) {
				this.searchSchema = await queryRunner.getCurrentSchema();
			}

			await queryRunner.release();
		}

		if (!this.schema) {
			this.schema = this.searchSchema;
		}
	}

	/**
	 * Makes any action after connection (e.g. create extensions in Postgres driver).
	 */
	async afterConnect(): Promise<void> {
		const extensionsMetadata = await this.checkMetadataForExtensions();
		const [connection, release] = await this.obtainMasterConnection();

		// Create schema if it doesn't exist (only runs once during initialization)
		const { schema } = this.options;
		if (schema && schema !== 'public') {
			await this.executeQuery(connection, `CREATE SCHEMA IF NOT EXISTS "${schema}"`);
		}

		const installExtensions =
			this.options.installExtensions === undefined || this.options.installExtensions;
		if (installExtensions && extensionsMetadata.hasExtensions) {
			await this.enableExtensions(extensionsMetadata, connection);
		}

		const results = (await this.executeQuery(connection, 'SELECT version();')) as {
			rows: {
				version: string;
			}[];
		};
		const versionString = results.rows[0].version.replace(/^PostgreSQL ([\d.]+) .*$/, '$1');
		this.version = versionString;
		this.isGeneratedColumnsSupported = VersionUtils.isGreaterOrEqual(versionString, '12.0');

		await release();
	}

	protected async enableExtensions(extensionsMetadata: any, connection: any) {
		const { logger } = this.connection;

		const {
			hasUuidColumns,
			hasCitextColumns,
			hasHstoreColumns,
			hasCubeColumns,
			hasGeometryColumns,
			hasLtreeColumns,
			hasExclusionConstraints,
		} = extensionsMetadata;

		if (hasUuidColumns)
			try {
				await this.executeQuery(
					connection,
					`CREATE EXTENSION IF NOT EXISTS "${this.options.uuidExtension || 'uuid-ossp'}"`,
				);
			} catch (_) {
				logger.log(
					'warn',
					`At least one of the entities has uuid column, but the '${
						this.options.uuidExtension || 'uuid-ossp'
					}' extension cannot be installed automatically. Please install it manually using superuser rights, or select another uuid extension.`,
				);
			}
		if (hasCitextColumns)
			try {
				await this.executeQuery(connection, `CREATE EXTENSION IF NOT EXISTS "citext"`);
			} catch (_) {
				logger.log(
					'warn',
					"At least one of the entities has citext column, but the 'citext' extension cannot be installed automatically. Please install it manually using superuser rights",
				);
			}
		if (hasHstoreColumns)
			try {
				await this.executeQuery(connection, `CREATE EXTENSION IF NOT EXISTS "hstore"`);
			} catch (_) {
				logger.log(
					'warn',
					"At least one of the entities has hstore column, but the 'hstore' extension cannot be installed automatically. Please install it manually using superuser rights",
				);
			}
		if (hasGeometryColumns)
			try {
				await this.executeQuery(connection, `CREATE EXTENSION IF NOT EXISTS "postgis"`);
			} catch (_) {
				logger.log(
					'warn',
					"At least one of the entities has a geometry column, but the 'postgis' extension cannot be installed automatically. Please install it manually using superuser rights",
				);
			}
		if (hasCubeColumns)
			try {
				await this.executeQuery(connection, `CREATE EXTENSION IF NOT EXISTS "cube"`);
			} catch (_) {
				logger.log(
					'warn',
					"At least one of the entities has a cube column, but the 'cube' extension cannot be installed automatically. Please install it manually using superuser rights",
				);
			}
		if (hasLtreeColumns)
			try {
				await this.executeQuery(connection, `CREATE EXTENSION IF NOT EXISTS "ltree"`);
			} catch (_) {
				logger.log(
					'warn',
					"At least one of the entities has a ltree column, but the 'ltree' extension cannot be installed automatically. Please install it manually using superuser rights",
				);
			}
		if (hasExclusionConstraints)
			try {
				// The btree_gist extension provides operator support in PostgreSQL exclusion constraints
				await this.executeQuery(connection, `CREATE EXTENSION IF NOT EXISTS "btree_gist"`);
			} catch (_) {
				logger.log(
					'warn',
					"At least one of the entities has an exclusion constraint, but the 'btree_gist' extension cannot be installed automatically. Please install it manually using superuser rights",
				);
			}
	}

	protected async checkMetadataForExtensions() {
		const hasUuidColumns = this.connection.entityMetadatas.some((metadata) => {
			return (
				metadata.generatedColumns.filter((column) => column.generationStrategy === 'uuid').length >
				0
			);
		});
		const hasCitextColumns = this.connection.entityMetadatas.some((metadata) => {
			return metadata.columns.filter((column) => column.type === 'citext').length > 0;
		});
		const hasHstoreColumns = this.connection.entityMetadatas.some((metadata) => {
			return metadata.columns.filter((column) => column.type === 'hstore').length > 0;
		});
		const hasCubeColumns = this.connection.entityMetadatas.some((metadata) => {
			return metadata.columns.filter((column) => column.type === 'cube').length > 0;
		});
		const hasGeometryColumns = this.connection.entityMetadatas.some((metadata) => {
			return (
				metadata.columns.filter((column) => this.spatialTypes.indexOf(column.type) >= 0).length > 0
			);
		});
		const hasLtreeColumns = this.connection.entityMetadatas.some((metadata) => {
			return metadata.columns.filter((column) => column.type === 'ltree').length > 0;
		});
		const hasExclusionConstraints = this.connection.entityMetadatas.some((metadata) => {
			return metadata.exclusions.length > 0;
		});

		return {
			hasUuidColumns,
			hasCitextColumns,
			hasHstoreColumns,
			hasCubeColumns,
			hasGeometryColumns,
			hasLtreeColumns,
			hasExclusionConstraints,
			hasExtensions:
				hasUuidColumns ||
				hasCitextColumns ||
				hasHstoreColumns ||
				hasGeometryColumns ||
				hasCubeColumns ||
				hasLtreeColumns ||
				hasExclusionConstraints,
		};
	}

	/**
	 * Closes connection with database.
	 */
	async disconnect(): Promise<void> {
		if (!this.master) return Promise.reject(new ConnectionIsNotSetError('postgres'));

		await this.closePool(this.master);
		await Promise.all(this.slaves.map((slave) => this.closePool(slave)));
		this.master = undefined;
		this.slaves = [];
	}

	/**
	 * Creates a schema builder used to build and sync a schema.
	 */
	createSchemaBuilder() {
		return new RdbmsSchemaBuilder(this.connection);
	}

	/**
	 * Creates a query runner used to execute database queries.
	 */
	createQueryRunner(mode: ReplicationMode): QueryRunner {
		return new PostgresQueryRunner(this, mode);
	}

	/**
	 * Prepares given value to a value to be persisted, based on its column type and metadata.
	 */
	preparePersistentValue(value: any, columnMetadata: ColumnMetadata): any {
		if (columnMetadata.transformer)
			value = ApplyValueTransformers.transformTo(columnMetadata.transformer, value);

		if (value === null || value === undefined) return value;

		if (columnMetadata.type === Boolean) {
			return value === true ? 1 : 0;
		} else if (columnMetadata.type === 'date') {
			return DateUtils.mixedDateToDateString(value);
		} else if (columnMetadata.type === 'time') {
			return DateUtils.mixedDateToTimeString(value);
		} else if (
			columnMetadata.type === 'datetime' ||
			columnMetadata.type === Date ||
			columnMetadata.type === 'timestamp' ||
			columnMetadata.type === 'timestamp with time zone' ||
			columnMetadata.type === 'timestamp without time zone'
		) {
			return DateUtils.mixedDateToDate(value);
		} else if (['json', 'jsonb', ...this.spatialTypes].indexOf(columnMetadata.type) >= 0) {
			return JSON.stringify(value);
		} else if (columnMetadata.type === 'hstore') {
			if (typeof value === 'string') {
				return value;
			} else {
				// https://www.postgresql.org/docs/9.0/hstore.html
				const quoteString = (value: unknown) => {
					// If a string to be quoted is `null` or `undefined`, we return a literal unquoted NULL.
					// This way, NULL values can be stored in the hstore object.
					if (value === null || typeof value === 'undefined') {
						return 'NULL';
					}
					// Convert non-null values to string since HStore only stores strings anyway.
					// To include a double quote or a backslash in a key or value, escape it with a backslash.
					return `"${`${value}`.replace(/(?=["\\])/g, '\\')}"`;
				};
				return Object.keys(value)
					.map((key) => quoteString(key) + '=>' + quoteString(value[key]))
					.join(',');
			}
		} else if (columnMetadata.type === 'simple-array') {
			return DateUtils.simpleArrayToString(value);
		} else if (columnMetadata.type === 'simple-json') {
			return DateUtils.simpleJsonToString(value);
		} else if (columnMetadata.type === 'cube') {
			if (columnMetadata.isArray) {
				return `{${value.map((cube: number[]) => `"(${cube.join(',')})"`).join(',')}}`;
			}
			return `(${value.join(',')})`;
		} else if (columnMetadata.type === 'ltree') {
			return value.split('.').filter(Boolean).join('.').replace(/[\s]+/g, '_');
		} else if (
			(columnMetadata.type === 'enum' || columnMetadata.type === 'simple-enum') &&
			!columnMetadata.isArray
		) {
			return '' + value;
		}

		return value;
	}

	/**
	 * Prepares given value to a value to be persisted, based on its column type or metadata.
	 */
	prepareHydratedValue(value: any, columnMetadata: ColumnMetadata): any {
		if (value === null || value === undefined)
			return columnMetadata.transformer
				? ApplyValueTransformers.transformFrom(columnMetadata.transformer, value)
				: value;

		if (columnMetadata.type === Boolean) {
			value = value ? true : false;
		} else if (
			columnMetadata.type === 'datetime' ||
			columnMetadata.type === Date ||
			columnMetadata.type === 'timestamp' ||
			columnMetadata.type === 'timestamptz' ||
			columnMetadata.type === 'timestamp with time zone' ||
			columnMetadata.type === 'timestamp without time zone'
		) {
			value = DateUtils.normalizeHydratedDate(value);
		} else if (columnMetadata.type === 'date') {
			value = DateUtils.mixedDateToDateString(value);
		} else if (columnMetadata.type === 'time') {
			value = DateUtils.mixedTimeToString(value);
		} else if (columnMetadata.type === 'hstore') {
			if (columnMetadata.hstoreType === 'object') {
				const unescapeString = (str: string) => str.replace(/\\./g, (m) => m[1]);
				const regexp = /"([^"\\]*(?:\\.[^"\\]*)*)"=>(?:(NULL)|"([^"\\]*(?:\\.[^"\\]*)*)")(?:,|$)/g;
				const object: ObjectLiteral = {};
				`${value}`.replace(regexp, (_, key, nullValue, stringValue) => {
					object[unescapeString(key)] = nullValue ? null : unescapeString(stringValue);
					return '';
				});
				value = object;
			}
		} else if (columnMetadata.type === 'simple-array') {
			value = DateUtils.stringToSimpleArray(value);
		} else if (columnMetadata.type === 'simple-json') {
			value = DateUtils.stringToSimpleJson(value);
		} else if (columnMetadata.type === 'cube') {
			value = value.replace(/[()\s]+/g, ''); // remove whitespace
			if (columnMetadata.isArray) {
				/**
				 * Strips these groups from `{"1,2,3","",NULL}`:
				 * 1. ["1,2,3", undefined]  <- cube of arity 3
				 * 2. ["", undefined]         <- cube of arity 0
				 * 3. [undefined, "NULL"]     <- NULL
				 */
				const regexp = /(?:"((?:[\d\s.,])*)")|(?:(NULL))/g;
				const unparsedArrayString = value;

				value = [];
				let cube: RegExpExecArray | null = null;
				// Iterate through all regexp matches for cubes/null in array
				while ((cube = regexp.exec(unparsedArrayString)) !== null) {
					if (cube[1] !== undefined) {
						value.push(cube[1].split(',').filter(Boolean).map(Number));
					} else {
						value.push(undefined);
					}
				}
			} else {
				value = value.split(',').filter(Boolean).map(Number);
			}
		} else if (columnMetadata.type === 'enum' || columnMetadata.type === 'simple-enum') {
			if (columnMetadata.isArray) {
				if (value === '{}') return [];

				// manually convert enum array to array of values (pg does not support, see https://github.com/brianc/node-pg-types/issues/56)
				value = (value as string)
					.substr(1, (value as string).length - 2)
					.split(',')
					.map((val) => {
						// replace double quotes from the beginning and from the end
						if (val.startsWith(`"`) && val.endsWith(`"`)) val = val.slice(1, -1);
						// replace double escaped backslash to single escaped e.g. \\\\ -> \\
						val = val.replace(/(\\\\)/g, '\\');
						// replace escaped double quotes to non-escaped e.g. \"asd\" -> "asd"
						return val.replace(/(\\")/g, '"');
					});

				// convert to number if that exists in possible enum options
				value = value.map((val: string) => {
					return !isNaN(+val) && columnMetadata.enum!.indexOf(parseInt(val)) >= 0
						? parseInt(val)
						: val;
				});
			} else {
				// convert to number if that exists in possible enum options
				value =
					!isNaN(+value) && columnMetadata.enum!.indexOf(parseInt(value)) >= 0
						? parseInt(value)
						: value;
			}
		} else if (columnMetadata.type === Number) {
			// convert to number if number
			value = !isNaN(+value) ? parseInt(value) : value;
		}

		if (columnMetadata.transformer)
			value = ApplyValueTransformers.transformFrom(columnMetadata.transformer, value);
		return value;
	}

	/**
	 * Replaces parameters in the given sql with special escaping character
	 * and an array of parameter names to be passed to a query.
	 */
	escapeQueryWithParameters(
		sql: string,
		parameters: ObjectLiteral,
		nativeParameters: ObjectLiteral,
	): [string, any[]] {
		const escapedParameters: any[] = Object.keys(nativeParameters).map(
			(key) => nativeParameters[key],
		);
		if (!parameters || !Object.keys(parameters).length) return [sql, escapedParameters];

		const parameterIndexMap = new Map<string, number>();
		sql = sql.replace(
			/:(\.\.\.)?([A-Za-z0-9_.]+)/g,
			(full, isArray: string, key: string): string => {
				if (!parameters.hasOwnProperty(key)) {
					return full;
				}

				if (parameterIndexMap.has(key)) {
					return this.parametersPrefix + parameterIndexMap.get(key);
				}

				let value: any = parameters[key];

				if (isArray) {
					return value
						.map((v: any) => {
							escapedParameters.push(v);
							return this.createParameter(key, escapedParameters.length - 1);
						})
						.join(', ');
				}

				if (typeof value === 'function') {
					return value();
				}

				escapedParameters.push(value);
				parameterIndexMap.set(key, escapedParameters.length);
				return this.createParameter(key, escapedParameters.length - 1);
			},
		); // todo: make replace only in value statements, otherwise problems
		return [sql, escapedParameters];
	}

	/**
	 * Escapes a column name.
	 */
	escape(columnName: string): string {
		return '"' + columnName + '"';
	}

	/**
	 * Build full table name with schema name and table name.
	 * E.g. myDB.mySchema.myTable
	 */
	buildTableName(tableName: string, schema?: string): string {
		let tablePath = [tableName];

		if (schema) {
			tablePath.unshift(schema);
		}

		return tablePath.join('.');
	}

	/**
	 * Parse a target table name or other types and return a normalized table definition.
	 */
	parseTableName(target: EntityMetadata | Table | View | TableForeignKey | string): {
		database?: string;
		schema?: string;
		tableName: string;
	} {
		const driverDatabase = this.database;
		const driverSchema = this.schema;

		if (InstanceChecker.isTable(target) || InstanceChecker.isView(target)) {
			const parsed = this.parseTableName(target.name);

			return {
				database: target.database || parsed.database || driverDatabase,
				schema: target.schema || parsed.schema || driverSchema,
				tableName: parsed.tableName,
			};
		}

		if (InstanceChecker.isTableForeignKey(target)) {
			const parsed = this.parseTableName(target.referencedTableName);

			return {
				database: target.referencedDatabase || parsed.database || driverDatabase,
				schema: target.referencedSchema || parsed.schema || driverSchema,
				tableName: parsed.tableName,
			};
		}

		if (InstanceChecker.isEntityMetadata(target)) {
			// EntityMetadata tableName is never a path

			return {
				database: target.database || driverDatabase,
				schema: target.schema || driverSchema,
				tableName: target.tableName,
			};
		}

		const parts = target.split('.');

		return {
			database: driverDatabase,
			schema: (parts.length > 1 ? parts[0] : undefined) || driverSchema,
			tableName: parts.length > 1 ? parts[1] : parts[0],
		};
	}

	/**
	 * Creates a database type from a given column metadata.
	 */
	normalizeType(column: {
		type?: ColumnType;
		length?: number | string;
		precision?: number | null;
		scale?: number;
		isArray?: boolean;
	}): string {
		if (column.type === Number || column.type === 'int' || column.type === 'int4') {
			return 'integer';
		} else if (column.type === String || column.type === 'varchar') {
			return 'character varying';
		} else if (column.type === Date || column.type === 'timestamp') {
			return 'timestamp without time zone';
		} else if (column.type === 'timestamptz') {
			return 'timestamp with time zone';
		} else if (column.type === 'time') {
			return 'time without time zone';
		} else if (column.type === 'timetz') {
			return 'time with time zone';
		} else if (column.type === Boolean || column.type === 'bool') {
			return 'boolean';
		} else if (column.type === 'simple-array') {
			return 'text';
		} else if (column.type === 'simple-json') {
			return 'text';
		} else if (column.type === 'simple-enum') {
			return 'enum';
		} else if (column.type === 'int2') {
			return 'smallint';
		} else if (column.type === 'int8') {
			return 'bigint';
		} else if (column.type === 'decimal') {
			return 'numeric';
		} else if (column.type === 'float8' || column.type === 'float') {
			return 'double precision';
		} else if (column.type === 'float4') {
			return 'real';
		} else if (column.type === 'char') {
			return 'character';
		} else if (column.type === 'varbit') {
			return 'bit varying';
		} else {
			return (column.type as string) || '';
		}
	}

	/**
	 * Normalizes "default" value of the column.
	 */
	normalizeDefault(columnMetadata: ColumnMetadata): string | undefined {
		const defaultValue = columnMetadata.default;

		if (defaultValue === null || defaultValue === undefined) {
			return undefined;
		}

		if (columnMetadata.isArray && Array.isArray(defaultValue)) {
			return `'{${defaultValue.map((val: string) => `${val}`).join(',')}}'`;
		}

		if (
			(columnMetadata.type === 'enum' ||
				columnMetadata.type === 'simple-enum' ||
				typeof defaultValue === 'number' ||
				typeof defaultValue === 'string') &&
			defaultValue !== undefined
		) {
			return `'${defaultValue}'`;
		}

		if (typeof defaultValue === 'boolean') {
			return defaultValue ? 'true' : 'false';
		}

		if (typeof defaultValue === 'function') {
			const value = defaultValue();

			return this.normalizeDatetimeFunction(value);
		}

		if (typeof defaultValue === 'object') {
			return `'${JSON.stringify(defaultValue)}'`;
		}

		return `${defaultValue}`;
	}

	/**
	 * Compares "default" value of the column.
	 * Postgres sorts json values before it is saved, so in that case a deep comparison has to be performed to see if has changed.
	 */
	private defaultEqual(columnMetadata: ColumnMetadata, tableColumn: TableColumn): boolean {
		if (
			['json', 'jsonb'].includes(columnMetadata.type as string) &&
			!['function', 'undefined'].includes(typeof columnMetadata.default)
		) {
			const tableColumnDefault =
				typeof tableColumn.default === 'string'
					? JSON.parse(tableColumn.default.substring(1, tableColumn.default.length - 1))
					: tableColumn.default;

			return OrmUtils.deepCompare(columnMetadata.default, tableColumnDefault);
		}

		const columnDefault = this.lowerDefaultValueIfNecessary(this.normalizeDefault(columnMetadata));
		return columnDefault === tableColumn.default;
	}

	/**
	 * Normalizes "isUnique" value of the column.
	 */
	normalizeIsUnique(column: ColumnMetadata): boolean {
		return column.entityMetadata.uniques.some(
			(uq) => uq.columns.length === 1 && uq.columns[0] === column,
		);
	}

	/**
	 * Returns default column lengths, which is required on column creation.
	 */
	getColumnLength(column: ColumnMetadata): string {
		return column.length ? column.length.toString() : '';
	}

	/**
	 * Creates column type definition including length, precision and scale
	 */
	createFullType(column: TableColumn): string {
		let type = column.type;

		if (column.length) {
			type += '(' + column.length + ')';
		} else if (
			column.precision !== null &&
			column.precision !== undefined &&
			column.scale !== null &&
			column.scale !== undefined
		) {
			type += '(' + column.precision + ',' + column.scale + ')';
		} else if (column.precision !== null && column.precision !== undefined) {
			type += '(' + column.precision + ')';
		}

		if (column.type === 'time without time zone') {
			type =
				'TIME' +
				(column.precision !== null && column.precision !== undefined
					? '(' + column.precision + ')'
					: '');
		} else if (column.type === 'time with time zone') {
			type =
				'TIME' +
				(column.precision !== null && column.precision !== undefined
					? '(' + column.precision + ')'
					: '') +
				' WITH TIME ZONE';
		} else if (column.type === 'timestamp without time zone') {
			type =
				'TIMESTAMP' +
				(column.precision !== null && column.precision !== undefined
					? '(' + column.precision + ')'
					: '');
		} else if (column.type === 'timestamp with time zone') {
			type =
				'TIMESTAMP' +
				(column.precision !== null && column.precision !== undefined
					? '(' + column.precision + ')'
					: '') +
				' WITH TIME ZONE';
		} else if (this.spatialTypes.indexOf(column.type as ColumnType) >= 0) {
			if (column.spatialFeatureType != null && column.srid != null) {
				type = `${column.type}(${column.spatialFeatureType},${column.srid})`;
			} else if (column.spatialFeatureType != null) {
				type = `${column.type}(${column.spatialFeatureType})`;
			} else {
				type = column.type;
			}
		}

		if (column.isArray) type += ' array';

		return type;
	}

	/**
	 * Obtains a new database connection to a master server.
	 * Used for replication.
	 * If replication is not setup then returns default connection's database connection.
	 */
	async obtainMasterConnection(): Promise<[any, Function]> {
		if (!this.master) {
			throw new TypeORMError('Driver not Connected');
		}

		const connection = await this.master.connect();
		// Apply per-connection session settings (schema creation moved to afterConnect)
		const { schema, statementTimeout } = this.options;
		if (schema && schema !== 'public') {
			await connection.query(`SET search_path TO "${schema}",public`);
		} else {
			await connection.query('SET search_path TO public');
		}
		if (statementTimeout) {
			await connection.query(`SET statement_timeout = ${statementTimeout}`);
		}

		return [connection, () => connection.release()];
	}

	/**
	 * Obtains a new database connection to a slave server.
	 * Used for replication.
	 * If replication is not setup then returns master (default) connection's database connection.
	 */
	async obtainSlaveConnection(): Promise<[any, Function]> {
		if (!this.slaves.length) {
			return this.obtainMasterConnection();
		}

		const random = Math.floor(Math.random() * this.slaves.length);

		return new Promise((ok, fail) => {
			this.slaves[random].connect((err: any, connection: any, release: any) => {
				err ? fail(err) : ok([connection, release]);
			});
		});
	}

	/**
	 * Creates generated map of values generated or returned by database after INSERT query.
	 *
	 * todo: slow. optimize Object.keys(), OrmUtils.mergeDeep and column.createValueMap parts
	 */
	createGeneratedMap(metadata: EntityMetadata, insertResult: ObjectLiteral) {
		if (!insertResult) return undefined;

		return Object.keys(insertResult).reduce((map, key) => {
			const column = metadata.findColumnWithDatabaseName(key);
			if (column) {
				OrmUtils.mergeDeep(map, column.createValueMap(insertResult[key]));
				// OrmUtils.mergeDeep(map, column.createValueMap(this.prepareHydratedValue(insertResult[key], column))); // TODO: probably should be like there, but fails on enums, fix later
			}
			return map;
		}, {} as ObjectLiteral);
	}

	/**
	 * Differentiate columns of this table and columns from the given column metadatas columns
	 * and returns only changed.
	 */
	findChangedColumns(
		tableColumns: TableColumn[],
		columnMetadatas: ColumnMetadata[],
	): ColumnMetadata[] {
		return columnMetadatas.filter((columnMetadata) => {
			const tableColumn = tableColumns.find((c) => c.name === columnMetadata.databaseName);
			if (!tableColumn) return false; // we don't need new columns, we only need exist and changed

			const isColumnChanged =
				tableColumn.name !== columnMetadata.databaseName ||
				tableColumn.type !== this.normalizeType(columnMetadata) ||
				tableColumn.length !== columnMetadata.length ||
				tableColumn.isArray !== columnMetadata.isArray ||
				tableColumn.precision !== columnMetadata.precision ||
				(columnMetadata.scale !== undefined && tableColumn.scale !== columnMetadata.scale) ||
				tableColumn.comment !== this.escapeComment(columnMetadata.comment) ||
				(!tableColumn.isGenerated && !this.defaultEqual(columnMetadata, tableColumn)) || // we included check for generated here, because generated columns already can have default values
				tableColumn.isPrimary !== columnMetadata.isPrimary ||
				tableColumn.isNullable !== columnMetadata.isNullable ||
				tableColumn.isUnique !== this.normalizeIsUnique(columnMetadata) ||
				tableColumn.enumName !== columnMetadata.enumName ||
				(tableColumn.enum &&
					columnMetadata.enum &&
					!OrmUtils.isArraysEqual(
						tableColumn.enum,
						columnMetadata.enum.map((val) => val + ''),
					)) || // enums in postgres are always strings
				tableColumn.isGenerated !== columnMetadata.isGenerated ||
				(tableColumn.spatialFeatureType || '').toLowerCase() !==
					(columnMetadata.spatialFeatureType || '').toLowerCase() ||
				tableColumn.srid !== columnMetadata.srid ||
				tableColumn.generatedType !== columnMetadata.generatedType ||
				(tableColumn.asExpression || '').trim() !== (columnMetadata.asExpression || '').trim();

			// DEBUG SECTION
			// if (isColumnChanged) {
			//     console.log("table:", columnMetadata.entityMetadata.tableName)
			//     console.log(
			//         "name:",
			//         tableColumn.name,
			//         columnMetadata.databaseName,
			//     )
			//     console.log(
			//         "type:",
			//         tableColumn.type,
			//         this.normalizeType(columnMetadata),
			//     )
			//     console.log(
			//         "length:",
			//         tableColumn.length,
			//         columnMetadata.length,
			//     )
			//     console.log(
			//         "isArray:",
			//         tableColumn.isArray,
			//         columnMetadata.isArray,
			//     )
			//     console.log(
			//         "precision:",
			//         tableColumn.precision,
			//         columnMetadata.precision,
			//     )
			//     console.log("scale:", tableColumn.scale, columnMetadata.scale)
			//     console.log(
			//         "comment:",
			//         tableColumn.comment,
			//         this.escapeComment(columnMetadata.comment),
			//     )
			//     console.log(
			//         "enumName:",
			//         tableColumn.enumName,
			//         columnMetadata.enumName,
			//     )
			//     console.log(
			//         "enum:",
			//         tableColumn.enum &&
			//             columnMetadata.enum &&
			//             !OrmUtils.isArraysEqual(
			//                 tableColumn.enum,
			//                 columnMetadata.enum.map((val) => val + ""),
			//             ),
			//     )
			//     console.log(
			//         "isPrimary:",
			//         tableColumn.isPrimary,
			//         columnMetadata.isPrimary,
			//     )
			//     console.log(
			//         "isNullable:",
			//         tableColumn.isNullable,
			//         columnMetadata.isNullable,
			//     )
			//     console.log(
			//         "isUnique:",
			//         tableColumn.isUnique,
			//         this.normalizeIsUnique(columnMetadata),
			//     )
			//     console.log(
			//         "isGenerated:",
			//         tableColumn.isGenerated,
			//         columnMetadata.isGenerated,
			//     )
			//     console.log(
			//         "generatedType:",
			//         tableColumn.generatedType,
			//         columnMetadata.generatedType,
			//     )
			//     console.log(
			//         "asExpression:",
			//         (tableColumn.asExpression || "").trim(),
			//         (columnMetadata.asExpression || "").trim(),
			//     )
			//     console.log(
			//         "collation:",
			//         tableColumn.collation,
			//         columnMetadata.collation,
			//     )
			//     console.log(
			//         "isGenerated 2:",
			//         !tableColumn.isGenerated &&
			//             this.lowerDefaultValueIfNecessary(
			//                 this.normalizeDefault(columnMetadata),
			//             ) !== tableColumn.default,
			//     )
			//     console.log(
			//         "spatialFeatureType:",
			//         (tableColumn.spatialFeatureType || "").toLowerCase(),
			//         (columnMetadata.spatialFeatureType || "").toLowerCase(),
			//     )
			//     console.log("srid", tableColumn.srid, columnMetadata.srid)
			//     console.log("==========================================")
			// }

			return isColumnChanged;
		});
	}

	private lowerDefaultValueIfNecessary(value: string | undefined) {
		// Postgres saves function calls in default value as lowercase #2733
		if (!value) {
			return value;
		}
		return value
			.split(`'`)
			.map((v, i) => {
				return i % 2 === 1 ? v : v.toLowerCase();
			})
			.join(`'`);
	}

	/**
	 * Returns true if driver supports RETURNING / OUTPUT statement.
	 */
	isReturningSqlSupported(): boolean {
		return true;
	}

	/**
	 * Returns true if driver supports uuid values generation on its own.
	 */
	isUUIDGenerationSupported(): boolean {
		return true;
	}

	/**
	 * Returns true if driver supports fulltext indices.
	 */
	isFullTextColumnTypeSupported(): boolean {
		return false;
	}

	get uuidGenerator(): string {
		return this.options.uuidExtension === 'pgcrypto' ? 'gen_random_uuid()' : 'uuid_generate_v4()';
	}

	/**
	 * Creates an escaped parameter.
	 */
	createParameter(parameterName: string, index: number): string {
		return this.parametersPrefix + (index + 1);
	}

	// -------------------------------------------------------------------------
	// Public Methods
	// -------------------------------------------------------------------------

	/**
	 * Loads postgres query stream package.
	 */
	loadStreamDependency() {
		try {
			return require('pg-query-stream');
		} catch (e) {
			// todo: better error for browser env
			throw new TypeORMError(
				`To use streams you should install pg-query-stream package. Please run npm i pg-query-stream --save command.`,
			);
		}
	}

	// -------------------------------------------------------------------------
	// Protected Methods
	// -------------------------------------------------------------------------

	/**
	 * If driver dependency is not given explicitly, then try to load it via "require".
	 */
	protected loadDependencies(): void {
		try {
			const postgres = this.options.driver || require('pg');
			this.postgres = postgres;
		} catch (e) {
			// todo: better error for browser env
			throw new DriverPackageNotInstalledError('Postgres', 'pg');
		}
	}

	/**
	 * Creates a new connection pool for a given database credentials.
	 */
	protected async createPool(
		options: PostgresConnectionOptions,
		credentials: PostgresConnectionCredentialsOptions,
	): Promise<any> {
		const { logger } = this.connection;
		credentials = Object.assign({}, credentials);

		// build connection options for the driver
		// See: https://github.com/brianc/node-postgres/tree/master/packages/pg-pool#create
		const connectionOptions: pg.PoolConfig = {
			connectionString: credentials.url,
			host: credentials.host,
			user: credentials.username,
			password: credentials.password,
			database: credentials.database,
			port: credentials.port,
			ssl: credentials.ssl,
			connectionTimeoutMillis: options.connectTimeoutMS,
			application_name: options.applicationName ?? credentials.applicationName,
			max: options.poolSize,
			query_timeout: options.queryTimeout,
			...options.extra,
		};

		if (options.parseInt8 !== undefined) {
			if (
				this.postgres.defaults &&
				Object.getOwnPropertyDescriptor(this.postgres.defaults, 'parseInt8')?.set
			) {
				this.postgres.defaults.parseInt8 = options.parseInt8;
			} else {
				logger.log(
					'warn',
					'Attempted to set parseInt8 option, but the postgres driver does not support setting defaults.parseInt8. This option will be ignored.',
				);
			}
		}

		// create a connection pool
		const pool = new this.postgres.Pool(connectionOptions);

		const poolErrorHandler =
			options.poolErrorHandler ||
			((error: any) => logger.log('warn', `Postgres pool raised an error. ${error}`));

		/*
          Attaching an error handler to pool errors is essential, as, otherwise, errors raised will go unhandled and
          cause the hosting app to crash.
         */
		pool.on('error', poolErrorHandler);

		return new Promise((ok, fail) => {
			pool.connect((err: any, connection: any, release: Function) => {
				if (err) return fail(err);

				if (options.logNotifications) {
					connection.on('notice', (msg: any) => {
						msg && this.connection.logger.log('info', msg.message);
					});
					connection.on('notification', (msg: any) => {
						msg &&
							this.connection.logger.log(
								'info',
								`Received NOTIFY on channel ${msg.channel}: ${msg.payload}.`,
							);
					});
				}
				release();
				ok(pool);
			});
		});
	}

	/**
	 * Closes connection pool.
	 */
	protected async closePool(pool: any): Promise<void> {
		while (this.connectedQueryRunners.length) {
			await this.connectedQueryRunners[0].release();
		}

		return new Promise<void>((ok, fail) => {
			pool.end((err: any) => (err ? fail(err) : ok()));
		});
	}

	/**
	 * Executes given query.
	 */
	protected executeQuery(connection: any, query: string) {
		this.connection.logger.logQuery(query);

		return new Promise((ok, fail) => {
			connection.query(query, (err: any, result: any) => (err ? fail(err) : ok(result)));
		});
	}

	/**
	 * If parameter is a datetime function, e.g. "CURRENT_TIMESTAMP", normalizes it.
	 * Otherwise returns original input.
	 */
	protected normalizeDatetimeFunction(value: string) {
		// check if input is datetime function
		const upperCaseValue = value.toUpperCase();
		const isDatetimeFunction =
			upperCaseValue.indexOf('CURRENT_TIMESTAMP') !== -1 ||
			upperCaseValue.indexOf('CURRENT_DATE') !== -1 ||
			upperCaseValue.indexOf('CURRENT_TIME') !== -1 ||
			upperCaseValue.indexOf('LOCALTIMESTAMP') !== -1 ||
			upperCaseValue.indexOf('LOCALTIME') !== -1;

		if (isDatetimeFunction) {
			// extract precision, e.g. "(3)"
			const precision = value.match(/\(\d+\)/);

			if (upperCaseValue.indexOf('CURRENT_TIMESTAMP') !== -1) {
				return precision ? `('now'::text)::timestamp${precision[0]} with time zone` : 'now()';
			} else if (upperCaseValue === 'CURRENT_DATE') {
				return "('now'::text)::date";
			} else if (upperCaseValue.indexOf('CURRENT_TIME') !== -1) {
				return precision
					? `('now'::text)::time${precision[0]} with time zone`
					: "('now'::text)::time with time zone";
			} else if (upperCaseValue.indexOf('LOCALTIMESTAMP') !== -1) {
				return precision
					? `('now'::text)::timestamp${precision[0]} without time zone`
					: "('now'::text)::timestamp without time zone";
			} else if (upperCaseValue.indexOf('LOCALTIME') !== -1) {
				return precision
					? `('now'::text)::time${precision[0]} without time zone`
					: "('now'::text)::time without time zone";
			}
		}

		return value;
	}

	/**
	 * Escapes a given comment.
	 */
	protected escapeComment(comment?: string) {
		if (!comment) return comment;

		comment = comment.replace(/\u0000/g, ''); // Null bytes aren't allowed in comments

		return comment;
	}
}
