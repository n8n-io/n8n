import { UserError } from 'n8n-workflow';

export class FileTooLargeError extends UserError {
	constructor({
		fileSizeMb,
		maxFileSizeMb,
		fileId,
		fileName,
	}: {
		fileSizeMb: number;
		maxFileSizeMb: number;
		fileId: string;
		fileName?: string;
	}) {
		const id = fileName ? `"${fileName}" (${fileId})` : fileId;
		const roundedSize = Math.round(fileSizeMb * 100) / 100;
		super(
			`Failed to write binary file ${id} because its size of ${roundedSize} MB exceeds the max size limit of ${maxFileSizeMb} MB set for \`database\` mode. Consider increasing \`N8N_BINARY_DATA_DATABASE_MAX_FILE_SIZE\` up to 1 GB, or using S3 storage mode if you require writes larger than 1 GB.`,
		);
	}
}
