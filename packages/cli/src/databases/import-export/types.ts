import type { z } from 'zod';

import type { manifestSchema } from './manifest.schema';

export type Row = Record<string, unknown>;

export type SequenceRow = { name: string; value: number };

export type Sequence = { [tableName: string]: number };

export type Manifest = z.infer<typeof manifestSchema>;

export type DatabaseExportConfig = {
	/** Dir to place the export in. By default, the current working directory. */
	outDir: string;

	/** Whether to export all data or only a smaller subset of data. */
	mode: 'full' | 'lightweight';
};

export type DatabaseImportConfig = {
	/** Absolute path to the file to import. */
	importFilePath: string;

	// REMOVE
	extractDirPath: string;

	/**
	 * Whether to truncate all tables in the destination DB.
	 * @default true // @TODO: Only for dev, change to `false` later
	 */
	truncateDestination: boolean;
};
