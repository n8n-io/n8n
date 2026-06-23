import {
	MAX_DECODED_SIZE_BYTES,
	formatSizeLimitMessage,
	parseStructuredFile,
	type AttachmentInfo,
	type ParseFileInput,
	type ParseFileOutput,
} from './structured-file-parser';

/**
 * Extracts the first sheet of an `.xlsx` workbook as tabular rows.
 *
 * Strategy: convert the sheet to CSV text via SheetJS, then route through the
 * existing `parseStructuredFile` so column normalization, type inference, and
 * truncation budgets stay in one place.
 */
export async function extractXlsxAsRows(
	attachment: AttachmentInfo,
	attachmentIndex: number,
	input: ParseFileInput,
): Promise<ParseFileOutput> {
	const decoded = Buffer.from(attachment.data, 'base64');
	if (decoded.length > MAX_DECODED_SIZE_BYTES) {
		throw new Error(formatSizeLimitMessage(decoded.length));
	}

	const XLSX = await import('xlsx');

	let workbook: ReturnType<typeof XLSX.read>;
	try {
		workbook = XLSX.read(decoded, { type: 'buffer' });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'unknown error';
		throw new Error(`Failed to parse xlsx "${attachment.fileName}": ${message}`);
	}

	const firstSheetName = workbook.SheetNames[0];
	if (!firstSheetName) {
		throw new Error(`xlsx "${attachment.fileName}" has no sheets.`);
	}

	const sheet = workbook.Sheets[firstSheetName];
	const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
		blankrows: false,
		defval: null,
	});

	if (json.length === 0) {
		throw new Error(`xlsx "${attachment.fileName}" sheet "${firstSheetName}" is empty.`);
	}

	// Round-trip through the JSON path of parseStructuredFile so types
	// (numbers, booleans) survive and we share row/column budget logic.
	const jsonAttachment: AttachmentInfo = {
		data: Buffer.from(JSON.stringify(json), 'utf-8').toString('base64'),
		mimeType: 'application/json',
		fileName: attachment.fileName,
	};

	const result = parseStructuredFile(jsonAttachment, attachmentIndex, {
		...input,
		format: 'json',
	});

	// Preserve original mime type and report xlsx as the format on output.
	return { ...result, mimeType: attachment.mimeType, format: 'xlsx' };
}
