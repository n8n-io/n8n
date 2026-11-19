import { Logger, safeJoinPath } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { appendFile, readdir, rm } from 'fs/promises';
import { Cipher } from 'n8n-core';

const ROWS_PER_FILE = 500;

/** Rows of one export, written as encrypted JSONL to `<name>.jsonl`, `<name>.2.jsonl`, and so on. */
export class ExportFile {
	private rows = 0;

	private files = 0;

	private rowsInFile = 0;

	constructor(
		private readonly logger: Logger,
		private readonly cipher: Cipher,
		private readonly outputDir: string,
		private readonly name: string,
		private readonly encryptionKey: string | undefined,
	) {}

	/** Starts a new file only once the earlier appends wrote 500 rows, so one file can hold more. */
	async append(rows: unknown[]): Promise<void> {
		const fileIndex = Math.floor(this.rows / ROWS_PER_FILE) + 1;
		if (fileIndex > this.files) {
			this.logCompletedFile();
			this.files = fileIndex;
			this.rowsInFile = 0;
		}

		const fileName = fileIndex === 1 ? `${this.name}.jsonl` : `${this.name}.${fileIndex}.jsonl`;
		const jsonl = rows.map((row) => JSON.stringify(row)).join('\n');
		const block = await this.cipher.encryptV2(jsonl, this.encryptionKey);
		await appendFile(safeJoinPath(this.outputDir, fileName), block + '\n', 'utf8');

		this.rows += rows.length;
		this.rowsInFile += rows.length;
	}

	close(): { rows: number; files: number } {
		this.logCompletedFile();
		return { rows: this.rows, files: this.files };
	}

	private logCompletedFile(): void {
		if (this.rowsInFile > 0) {
			this.logger.info(`   ✅ Completed file ${this.files}: ${this.rowsInFile} rows`);
		}
	}
}

@Service()
export class ExportFileWriter {
	constructor(
		private readonly logger: Logger,
		private readonly cipher: Cipher,
	) {}

	async open(outputDir: string, name: string, encryptionKey?: string): Promise<ExportFile> {
		await this.deleteFiles(outputDir, name);
		return new ExportFile(this.logger, this.cipher, outputDir, name, encryptionKey);
	}

	async deleteFiles(outputDir: string, name: string): Promise<void> {
		const existingFiles = await readdir(outputDir);
		const files = existingFiles.filter(
			(file) => file.startsWith(`${name}.`) && file.endsWith('.jsonl'),
		);

		if (files.length > 0) {
			this.logger.info(`   🗑️  Found ${files.length} existing file(s) for ${name}, deleting...`);
			for (const file of files) {
				await rm(safeJoinPath(outputDir, file));
				this.logger.info(`      Deleted: ${file}`);
			}
		}
	}
}
