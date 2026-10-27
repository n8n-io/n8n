import { PostgresConnectionOptions } from '../driver/postgres/PostgresConnectionOptions';
import { SqliteConnectionOptions } from '../driver/sqlite/SqliteConnectionOptions';
import { SqlitePooledConnectionOptions } from '../driver/sqlite-pooled/SqlitePooledConnectionOptions';

/**
 * DataSourceOptions is an interface with settings and options for specific DataSource.
 */
export type DataSourceOptions =
	| PostgresConnectionOptions
	| SqliteConnectionOptions
	| SqlitePooledConnectionOptions;
