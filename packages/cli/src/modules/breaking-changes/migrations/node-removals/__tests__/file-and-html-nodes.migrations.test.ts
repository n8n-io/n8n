import { createNode } from '../../../__tests__/test-helpers';
import { htmlExtractToHtml } from '../html-extract-to-html.migration';
import { readPdfToExtractFromFile } from '../read-pdf-to-extract-from-file.migration';
import { writeBinaryFileToReadWriteFile } from '../write-binary-file-to-read-write-file.migration';

describe('htmlExtractToHtml migration', () => {
	const extractionValues = {
		values: [{ key: 'title', cssSelector: 'h1', returnValue: 'text', returnArray: false }],
	};

	it('is keyed by the HTML Extract rule id', () => {
		expect(htmlExtractToHtml.ruleId).toBe('html-extract-removed-v3');
	});

	it('targets HTML 1.1 and keeps the extraction settings', () => {
		const node = createNode('Extract', 'n8n-nodes-base.htmlExtract', {
			sourceData: 'binary',
			dataPropertyName: 'file',
			extractionValues,
			options: { trimValues: false },
		});

		const result = htmlExtractToHtml.migrate(node);

		expect(result.node).toEqual({
			type: 'n8n-nodes-base.html',
			typeVersion: 1.1,
			parameters: {
				operation: 'extractHtmlContent',
				sourceData: 'binary',
				dataPropertyName: 'file',
				extractionValues,
				options: { trimValues: false, cleanUpText: false },
			},
		});
	});

	describe('note about the empty text', () => {
		const migrateWith = (values: unknown[]) =>
			htmlExtractToHtml.migrate(
				createNode('Extract', 'n8n-nodes-base.htmlExtract', { extractionValues: { values } }),
			);

		it.each([
			['the text return value', [{ key: 'a', cssSelector: 'h1', returnValue: 'text' }]],
			['no return value, because the default is text', [{ key: 'a', cssSelector: 'h1' }]],
			[
				'an expression for the return value',
				[{ key: 'a', cssSelector: 'h1', returnValue: '={{ $json.kind }}' }],
			],
			[
				'text next to other return values',
				[
					{ key: 'a', cssSelector: 'a', returnValue: 'attribute', attribute: 'href' },
					{ key: 'b', cssSelector: 'h1', returnValue: 'text', returnArray: true },
				],
			],
		])('reports one note for %s', (_name, values) => {
			expect(migrateWith(values).notes).toEqual([expect.stringContaining('no value')]);
		});

		it('reports one note for several text values', () => {
			const { notes } = migrateWith([
				{ key: 'a', cssSelector: 'h1', returnValue: 'text' },
				{ key: 'b', cssSelector: 'h2', returnValue: 'text' },
			]);

			expect(notes).toHaveLength(1);
		});

		it.each([
			['html', { key: 'a', cssSelector: 'h1', returnValue: 'html' }],
			['attribute', { key: 'a', cssSelector: 'a', returnValue: 'attribute', attribute: 'href' }],
			['value', { key: 'a', cssSelector: 'input', returnValue: 'value' }],
		])('reports no note when every value returns %s', (_name, value) => {
			expect(migrateWith([value]).notes).toBeUndefined();
		});

		it('reports no note for a node with no extraction values', () => {
			const { notes } = htmlExtractToHtml.migrate(
				createNode('Extract', 'n8n-nodes-base.htmlExtract', {}),
			);

			expect(notes).toBeUndefined();
		});
	});

	it('writes trimValues explicitly, because the old node trims when it is missing', () => {
		const node = createNode('Extract', 'n8n-nodes-base.htmlExtract', { extractionValues });

		const { node: migrated } = htmlExtractToHtml.migrate(node);

		expect(migrated.parameters.options).toEqual({ trimValues: true, cleanUpText: false });
	});

	it('keeps the old failure for a node with no extraction values', () => {
		const { node } = htmlExtractToHtml.migrate(
			createNode('Extract', 'n8n-nodes-base.htmlExtract', {}),
		);

		expect(node.parameters.extractionValues).toEqual({});
	});

	it('refuses options in an unsupported format', () => {
		const node = createNode('Extract', 'n8n-nodes-base.htmlExtract', { options: 'x' });

		expect(() => htmlExtractToHtml.migrate(node)).toThrow('not in a supported format');
	});

	it('refuses an expression for Trim Values, because the old and new node read falsy values differently', () => {
		const node = createNode('Extract', 'n8n-nodes-base.htmlExtract', {
			extractionValues,
			options: { trimValues: '={{ $json.trim }}' },
		});

		expect(() => htmlExtractToHtml.migrate(node)).toThrow('"Trim Values" is an expression');
	});

	it.each([[true], [false]])('keeps a plain Trim Values value of %s', (trimValues) => {
		const node = createNode('Extract', 'n8n-nodes-base.htmlExtract', {
			extractionValues,
			options: { trimValues },
		});

		const { node: migrated } = htmlExtractToHtml.migrate(node);

		expect(migrated.parameters.options).toEqual({ trimValues, cleanUpText: false });
	});
});

describe('readPdfToExtractFromFile migration', () => {
	it('is keyed by the Read PDF rule id', () => {
		expect(readPdfToExtractFromFile.ruleId).toBe('read-pdf-removed-v3');
	});

	it('keeps the binary and drops the input JSON, as the old node did', () => {
		const result = readPdfToExtractFromFile.migrate(
			createNode('PDF', 'n8n-nodes-base.readPDF', { binaryPropertyName: 'invoice' }),
		);

		expect(result.node).toEqual({
			type: 'n8n-nodes-base.extractFromFile',
			typeVersion: 1.2,
			parameters: {
				operation: 'pdf',
				binaryPropertyName: 'invoice',
				options: { keepSource: 'binary' },
			},
		});
	});

	it('moves the password only for an encrypted PDF', () => {
		const encrypted = readPdfToExtractFromFile.migrate(
			createNode('PDF', 'n8n-nodes-base.readPDF', { encrypted: true, password: 'secret' }),
		);
		const stale = readPdfToExtractFromFile.migrate(
			createNode('PDF', 'n8n-nodes-base.readPDF', { encrypted: false, password: 'secret' }),
		);

		expect(encrypted.node.parameters.options).toEqual({ keepSource: 'binary', password: 'secret' });
		expect(stale.node.parameters.options).toEqual({ keepSource: 'binary' });
	});

	it('passes an empty password for an encrypted PDF with no password, as the old node did', () => {
		const { node } = readPdfToExtractFromFile.migrate(
			createNode('PDF', 'n8n-nodes-base.readPDF', { encrypted: true }),
		);

		expect(node.parameters.options).toEqual({ keepSource: 'binary', password: '' });
	});

	it('does not write maxPages, because 0 reads no pages', () => {
		const { node } = readPdfToExtractFromFile.migrate(
			createNode('PDF', 'n8n-nodes-base.readPDF', {}),
		);

		expect(node.parameters.options).not.toHaveProperty('maxPages');
		expect(node.parameters.options).not.toHaveProperty('joinPages');
	});

	it('refuses an expression for Encrypted', () => {
		const node = createNode('PDF', 'n8n-nodes-base.readPDF', { encrypted: '={{ $json.enc }}' });

		expect(() => readPdfToExtractFromFile.migrate(node)).toThrow('Encrypted');
	});
});

describe('writeBinaryFileToReadWriteFile migration', () => {
	it('is keyed by the Write Binary File rule id', () => {
		expect(writeBinaryFileToReadWriteFile.ruleId).toBe('write-binary-file-removed-v3');
	});

	it('keeps the file name, the binary property and the append option', () => {
		const result = writeBinaryFileToReadWriteFile.migrate(
			createNode('Write', 'n8n-nodes-base.writeBinaryFile', {
				fileName: '/data/out.txt',
				dataPropertyName: 'content',
				options: { append: true },
			}),
		);

		expect(result.node).toEqual({
			type: 'n8n-nodes-base.readWriteFile',
			typeVersion: 1.1,
			parameters: {
				operation: 'write',
				fileName: '/data/out.txt',
				dataPropertyName: 'content',
				options: { append: true },
			},
		});
	});

	it('refuses an append expression, because the old node reads it once', () => {
		const node = createNode('Write', 'n8n-nodes-base.writeBinaryFile', {
			fileName: '/data/out.txt',
			options: { append: '={{ $json.append }}' },
		});

		expect(() => writeBinaryFileToReadWriteFile.migrate(node)).toThrow('Append');
	});
});
