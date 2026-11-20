import { type Logger, safeJoinPath } from '@n8n/backend-common';
import { appendFile } from 'fs/promises';

const MiB = 1024 * 1024;
const MAX_LINE_CHARS = 32 * MiB;
const MAX_FILE_CHARS = 64 * MiB;
const MAX_ROWS_PER_FILE = 500;

/**
 * Writes rows as encrypted JSONL lines: a line holds one row, or more rows while it stays within
 * 32 MiB of JSON, and a file holds one line, or more lines while it stays within 64 MiB and 500 rows.
 */
export class EntityArchiveWriter {
	private pendingRows: string[] = [];

	private pendingChars = 0;

	private fileIndex = 1;

	private fileChars = 0;

	private fileRows = 0;

	constructor(
		private readonly outputDir: string,
		private readonly baseName: string,
		private readonly encrypt: (text: string) => Promise<string>,
		private readonly logger: Logger,
		private readonly rowLabel: string,
	) {}

	async append(row: string): Promise<void> {
		if (this.pendingRows.length > 0 && this.pendingChars + row.length > MAX_LINE_CHARS) {
			await this.writeLine();
		}
		this.pendingRows.push(row);
		this.pendingChars += row.length + 1;
	}

	async endPage(): Promise<void> {
		if (this.pendingRows.length > 0) await this.writeLine();
	}

	/** Number of files written. */
	endTable(): number {
		if (this.fileRows > 0) this.logFileCompleted();
		return this.fileIndex;
	}

	private async writeLine(): Promise<void> {
		const line = (await this.encrypt(this.pendingRows.join('\n'))) + '\n';
		const fileIsFull =
			this.fileRows > 0 &&
			(this.fileRows + this.pendingRows.length > MAX_ROWS_PER_FILE ||
				this.fileChars + line.length > MAX_FILE_CHARS);
		if (fileIsFull) {
			this.logFileCompleted();
			this.fileIndex++;
			this.fileChars = 0;
			this.fileRows = 0;
		}
		const fileName =
			this.fileIndex === 1 ? `${this.baseName}.jsonl` : `${this.baseName}.${this.fileIndex}.jsonl`;
		await appendFile(safeJoinPath(this.outputDir, fileName), line, 'utf8');
		this.fileChars += line.length;
		this.fileRows += this.pendingRows.length;
		this.pendingRows = [];
		this.pendingChars = 0;
	}

	private logFileCompleted(): void {
		this.logger.info(`   ✅ Completed file ${this.fileIndex}: ${this.fileRows} ${this.rowLabel}`);
	}
}
