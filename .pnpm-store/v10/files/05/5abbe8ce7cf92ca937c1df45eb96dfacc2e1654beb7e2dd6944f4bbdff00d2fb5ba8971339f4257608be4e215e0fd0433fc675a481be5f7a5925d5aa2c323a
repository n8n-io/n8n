export interface QueryBuilderCteOptions {
    /**
     * Supported only by Postgres currently
     * Oracle users should use query with undocumented materialize hint
     */
    materialized?: boolean;
    /**
     * Supported by Postgres, SQLite, MySQL and MariaDB
     * SQL Server automatically detects recursive queries
     */
    recursive?: boolean;
    /**
     * Overwrite column names
     * If number of columns returned doesn't work, it throws
     */
    columnNames?: string[];
}
