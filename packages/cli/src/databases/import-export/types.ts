import type { z } from 'zod';

import type { manifestSchema } from './manifest.schema';

export type Row = Record<string, unknown>;

export type SequenceRow = { name: string; value: number };

export type Sequence = { [tableName: string]: number };

export type Manifest = z.infer<typeof manifestSchema>;

export type DatabaseExportConfig = {
	/** Path of the backup file.
	 * @default generated from the current UTC date. written in the current working directory. */
	output: string;

	/** Whether to export all data or only a smaller subset of data.
	 * @default 'full' */
	mode: 'full' | 'lightweight';
};

export type DatabaseImportConfig = {
	/** Absolute path to the backup file to import from. */
	input: string;

	/** Whether to delete data in all tables in the destination DB.
	 * @default false  */
	deleteExistingData: boolean;
};
