import * as XLSX from 'xlsx';

import { MAX_DECODED_SIZE_BYTES } from '../structured-file-parser';
import { extractXlsxAsRows } from '../xlsx-parser';

function makeXlsxAttachment(
	rows: Array<Record<string, string | number | boolean>>,
	fileName = 'sheet.xlsx',
) {
	const sheet = XLSX.utils.json_to_sheet(rows);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1');
	const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
	return {
		data: buffer.toString('base64'),
		mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		fileName,
	};
}

describe('extractXlsxAsRows', () => {
	it('returns rows + columns from a simple workbook', async () => {
		const att = makeXlsxAttachment([
			{ name: 'Alice', age: 30 },
			{ name: 'Bob', age: 25 },
		]);

		const result = await extractXlsxAsRows(att, 0, {});

		expect(result.format).toBe('xlsx');
		expect(result.totalRows).toBe(2);
		expect(result.returnedRows).toBe(2);
		expect(result.columns.map((c) => c.name)).toEqual(['name', 'age']);
		expect(result.rows).toEqual([
			{ name: 'Alice', age: 30 },
			{ name: 'Bob', age: 25 },
		]);
	});

	it('infers column types', async () => {
		const att = makeXlsxAttachment([
			{ count: 1, active: true },
			{ count: 2, active: false },
		]);

		const result = await extractXlsxAsRows(att, 0, {});
		const countCol = result.columns.find((c) => c.name === 'count');
		const activeCol = result.columns.find((c) => c.name === 'active');

		expect(countCol?.inferredType).toBe('number');
		expect(activeCol?.inferredType).toBe('boolean');
	});

	it('honors maxRows and reports nextStartRow', async () => {
		const att = makeXlsxAttachment(
			Array.from({ length: 50 }, (_, i) => ({ id: i, value: `v${i}` })),
		);

		const result = await extractXlsxAsRows(att, 0, { maxRows: 10 });

		expect(result.totalRows).toBe(50);
		expect(result.returnedRows).toBe(10);
		expect(result.truncated).toBe(true);
		expect(result.nextStartRow).toBe(10);
	});

	it('throws when the sheet is empty', async () => {
		const sheet = XLSX.utils.aoa_to_sheet([[]]);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, sheet, 'Empty');
		const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
		await expect(
			extractXlsxAsRows(
				{
					data: buffer.toString('base64'),
					mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
					fileName: 'empty.xlsx',
				},
				0,
				{},
			),
		).rejects.toThrow(/empty/);
	});

	it('rejects oversized attachments before parsing', async () => {
		const huge = Buffer.alloc(MAX_DECODED_SIZE_BYTES + 1).toString('base64');
		await expect(
			extractXlsxAsRows(
				{
					data: huge,
					mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
					fileName: 'big.xlsx',
				},
				0,
				{},
			),
		).rejects.toThrow(/exceeds maximum size/);
	});

	it('rejects workbook with too many columns', async () => {
		const wide: Record<string, number> = {};
		for (let i = 0; i < 60; i++) wide[`c${i}`] = i;
		const att = makeXlsxAttachment([wide]);

		await expect(extractXlsxAsRows(att, 0, {})).rejects.toThrow(/Too many columns/);
	});
});
