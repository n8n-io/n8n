export type Row = Record<string, unknown>;

/** Name and value of incremental ID sequence for column. */
export type Sequence = { name: string; value: number }; // @TODO: Refactor as { [tableName: string]: number }

export type DatabaseExportConfig = {
	/**
	 * Path to the dir to place the export in.
	 * @default '/tmp/backup'
	 */
	storageDirPath: string;

	/**
	 * Base filename for the tarball, to be suffixed with `-{timestamp}.tar.gz`.
	 * @default 'n8n-db-export'
	 */
	tarballBaseFileName: string;

	/**
	 * Number of rows to retrieve from DB and write to a `.jsonl` file at a time.
	 * @default 500
	 */
	batchSize: number;
};

export type DatabaseImportConfig = {
	/**
	 * Path to the file to import. Unset by default.
	 * @example '/tmp/backup/n8n-db-export-2021-01-01.tar.gz'
	 */
	importFilePath: string;

	/**
	 * Path to the directory to extract the tarball into.
	 * @default '/tmp/backup'
	 */
	extractDirPath: string;

	/**
	 * Whether to truncate all tables in the destination DB.
	 * @default true // @TODO: Only for dev, change to `false` later
	 */
	truncateDestination: boolean;
};
