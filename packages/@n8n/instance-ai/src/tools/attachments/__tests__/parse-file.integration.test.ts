import { createHash } from 'node:crypto';
import { crc32 } from 'node:zlib';

import { Agent, Workspace, type BuiltTool, type WorkspaceFilesystem } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';
import { MockLanguageModelV3 } from 'ai/test';
import { mock } from 'vitest-mock-extended';

import { createInstanceAgent } from '../../../agent/instance-agent';
import { McpClientManager } from '../../../mcp/mcp-client-manager';
import {
	buildAttachmentManifest,
	classifyAttachments,
	MAX_CELL_STRING_LENGTH,
	MAX_RESULT_CHARS,
} from '../../../parsers/structured-file-parser';
import type { InstanceAiContext, InstanceAiStoredFile } from '../../../types';
import { createOrchestratorDomainTools } from '../../index';
import { DOMAIN_TOOL_IDS } from '../../tool-ids';
import { parseFileOutputSchema } from '../parse-file.tool';

type GeneratePrompt = Parameters<MockLanguageModelV3['doGenerate']>[0]['prompt'];

const USAGE = {
	inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 5, text: 5, reasoning: 0 },
};

function sha256(content: string): string {
	return createHash('sha256').update(content, 'utf-8').digest('hex');
}

function toBase64(content: string | Buffer): string {
	const buf = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
	return buf.toString('base64');
}

function createMockContext(overrides?: Partial<InstanceAiContext>): InstanceAiContext {
	return {
		userId: 'integration-user',
		workflowService: mock<InstanceAiContext['workflowService']>(),
		executionService: mock<InstanceAiContext['executionService']>(),
		credentialService: mock<InstanceAiContext['credentialService']>(),
		nodeService: mock<InstanceAiContext['nodeService']>(),
		dataTableService: mock<InstanceAiContext['dataTableService']>(),
		workflowTemplateService: mock<InstanceAiContext['workflowTemplateService']>(),
		logger: mock<InstanceAiContext['logger']>(),
		...overrides,
	};
}

function createStoredFile(
	fileName: string,
	mimeType: string,
	content: Buffer | string,
): InstanceAiStoredFile {
	const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
	return {
		fileName,
		mimeType,
		sizeBytes: buffer.byteLength,
		hasContent: vi.fn(async () => await Promise.resolve(true)),
		readContent: vi.fn(async () => await Promise.resolve(buffer)),
	};
}

interface HandoverFile {
	path: string;
	sha256: string;
	content: string;
}

interface SourceHandoverPayload {
	version: number;
	repo: string;
	generatedAt: string;
	files: HandoverFile[];
}

/**
 * Builds a ~300 KB non-array JSON handover containing 14 source files with
 * quotes, newlines, indentation, and emoji surrogate pairs placed across
 * MAX_RESULT_CHARS boundaries so pagination is exercised thoroughly.
 */
function buildLargeHandoverJson(): { payload: SourceHandoverPayload; rawJson: string } {
	const files: HandoverFile[] = Array.from({ length: 14 }, (_, index) => {
		const header = `// File ${index + 1} of 14 — marker 🚀😀\n`;
		const bodyLine = `export const line_${index} = "quoted \\"value\\" with 🚀 and newline";\n`;
		const content = `${header}${bodyLine.repeat(320)}// end-of-file-${index}\n`;
		return {
			path: `src/modules/part-${String(index + 1).padStart(2, '0')}.ts`,
			sha256: sha256(content),
			content,
		};
	});

	const payload: SourceHandoverPayload = {
		version: 2,
		repo: 'acme/handover-demo',
		generatedAt: '2026-11-27T00:00:00.000Z',
		files,
	};

	const rawJson = `${JSON.stringify(payload, null, 2)}\n`;
	return { payload, rawJson };
}

/**
 * Builds a minimal uncompressed (STORE) ZIP archive for real mammoth DOCX parsing.
 */
function buildStoreZip(entries: Array<{ name: string; content: string }>): Buffer {
	const localParts: Buffer[] = [];
	const centralParts: Buffer[] = [];
	let offset = 0;

	for (const entry of entries) {
		const nameBuf = Buffer.from(entry.name, 'utf-8');
		const dataBuf = Buffer.from(entry.content, 'utf-8');
		const checksum = crc32(dataBuf) >>> 0;

		const localHeader = Buffer.alloc(30 + nameBuf.length);
		localHeader.writeUInt32LE(0x04034b50, 0);
		localHeader.writeUInt16LE(20, 4);
		localHeader.writeUInt16LE(0, 6);
		localHeader.writeUInt16LE(0, 8);
		localHeader.writeUInt32LE(checksum, 14);
		localHeader.writeUInt32LE(dataBuf.length, 18);
		localHeader.writeUInt32LE(dataBuf.length, 22);
		localHeader.writeUInt16LE(nameBuf.length, 26);
		nameBuf.copy(localHeader, 30);

		localParts.push(localHeader, dataBuf);

		const centralHeader = Buffer.alloc(46 + nameBuf.length);
		centralHeader.writeUInt32LE(0x02014b50, 0);
		centralHeader.writeUInt16LE(20, 4);
		centralHeader.writeUInt16LE(20, 6);
		centralHeader.writeUInt16LE(0, 8);
		centralHeader.writeUInt16LE(0, 10);
		centralHeader.writeUInt32LE(checksum, 16);
		centralHeader.writeUInt32LE(dataBuf.length, 20);
		centralHeader.writeUInt32LE(dataBuf.length, 24);
		centralHeader.writeUInt16LE(nameBuf.length, 28);
		centralHeader.writeUInt32LE(offset, 42);
		nameBuf.copy(centralHeader, 46);

		centralParts.push(centralHeader);
		offset += localHeader.length + dataBuf.length;
	}

	const centralDir = Buffer.concat(centralParts);
	const eocd = Buffer.alloc(22);
	eocd.writeUInt32LE(0x06054b50, 0);
	eocd.writeUInt16LE(entries.length, 8);
	eocd.writeUInt16LE(entries.length, 10);
	eocd.writeUInt32LE(centralDir.length, 12);
	eocd.writeUInt32LE(offset, 16);

	return Buffer.concat([...localParts, centralDir, eocd]);
}

function buildMinimalDocx(paragraphs: string[]): Buffer {
	const bodyXml = paragraphs.map((text) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`).join('');

	return buildStoreZip([
		{
			name: '[Content_Types].xml',
			content:
				'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
				'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
				'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
				'<Default Extension="xml" ContentType="application/xml"/>' +
				'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
				'</Types>',
		},
		{
			name: '_rels/.rels',
			content:
				'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
				'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
				'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
				'</Relationships>',
		},
		{
			name: 'word/document.xml',
			content:
				'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
				'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
				`<w:body>${bodyXml}</w:body>` +
				'</w:document>',
		},
	]);
}

/**
 * Builds a minimal valid multi-page PDF 1.4 document with ASCII text for real pdf-parse extraction.
 */
function buildMinimalPdf(pages: string[]): Buffer {
	const escapePdfText = (value: string) =>
		value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');

	// Objects: 1=Catalog, 2=Pages, 3=Font, then pairs of (Page, Content) per page.
	const objects: string[] = [];
	const pageObjIds: number[] = [];

	for (let i = 0; i < pages.length; i++) {
		pageObjIds.push(4 + i * 2);
	}

	objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
	objects.push(
		`2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`,
	);
	objects.push('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

	for (let i = 0; i < pages.length; i++) {
		const pageId = 4 + i * 2;
		const contentId = pageId + 1;
		const stream = `BT\n/F1 12 Tf\n72 720 Td\n(${escapePdfText(pages[i])}) Tj\nET\n`;
		objects.push(
			`${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
		);
		objects.push(
			`${contentId} 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf-8')} >>\nstream\n${stream}endstream\nendobj\n`,
		);
	}

	let pdf = '%PDF-1.4\n';
	const offsets: number[] = [0];
	for (const obj of objects) {
		offsets.push(Buffer.byteLength(pdf, 'utf-8'));
		pdf += obj;
	}

	const xrefOffset = Buffer.byteLength(pdf, 'utf-8');
	pdf += `xref\n0 ${objects.length + 1}\n`;
	pdf += '0000000000 65535 f \n';
	for (let i = 1; i < offsets.length; i++) {
		pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
	}
	pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

	return Buffer.from(pdf, 'utf-8');
}

function getLatestToolResultPayload(prompt: GeneratePrompt): unknown {
	const toolMessages = prompt.filter((message) => message.role === 'tool');
	const latest = toolMessages.at(-1);
	if (!latest) return undefined;

	const part = latest.content.find((entry) => entry.type === 'tool-result');
	if (!part) return undefined;

	const output = part.output;
	if (output.type === 'json' || output.type === 'error-json') {
		return output.value;
	}
	if (output.type === 'text' || output.type === 'error-text') {
		try {
			return JSON.parse(output.value);
		} catch {
			return output.value;
		}
	}
	return output;
}

function getParseFileTool(context: InstanceAiContext): BuiltTool {
	const tool = createOrchestratorDomainTools(context).get(DOMAIN_TOOL_IDS.PARSE_FILE);
	if (!tool) throw new Error('Expected parse-file to be registered');
	return tool;
}

function createRuntimeAgent(
	model: MockLanguageModelV3,
	parseFileTool: BuiltTool,
	workspace?: Workspace,
): Agent {
	const agent = new Agent('parse-file-integration-agent')
		.model(model)
		.modelFetch(async () => Response.json({}))
		.instructions('Use parse-file to inspect user attachments completely.')
		.checkpoint('memory')
		.tool([parseFileTool]);

	if (workspace) {
		agent.workspace(workspace);
	}
	return agent;
}

describe('parse-file end-to-end integration with @n8n/agents runtime', () => {
	it('paginates a ~300 KB 14-file JSON handover via current-message parse-file without tool-result offloading', async () => {
		const { payload, rawJson } = buildLargeHandoverJson();
		expect(rawJson.length).toBeGreaterThan(280_000);

		const attachment = {
			type: 'file' as const,
			data: toBase64(rawJson),
			mimeType: 'application/json',
			fileName: 'source-handover.json',
		};
		const classified = classifyAttachments([attachment]);
		expect(classified[0].parseable).toBe(true);
		expect(classified[0].format).toBe('json');
		expect(buildAttachmentManifest(classified)).toContain(
			'parseable via parse-file (format: json)',
		);

		const context = createMockContext({ currentUserAttachments: [attachment] });
		const parseFileTool = getParseFileTool(context);

		const writeFile = vi.fn();
		const filesystem = mock<WorkspaceFilesystem>({
			status: 'ready',
			basePath: '/workspace',
			readOnly: false,
			writeFile,
		});
		const workspace = new Workspace({ filesystem });

		const observedPages: Array<ReturnType<typeof parseFileOutputSchema.parse>> = [];
		let callIndex = 0;

		const model = new MockLanguageModelV3({
			doGenerate: async ({ prompt }) => {
				if (callIndex === 0) {
					callIndex++;
					// Omit optional fields so Zod defaults apply inside the real agent runtime.
					return {
						content: [
							{
								type: 'tool-call',
								toolCallId: 'parse-page-0',
								toolName: DOMAIN_TOOL_IDS.PARSE_FILE,
								input: '{}',
							},
						],
						finishReason: { unified: 'tool-calls', raw: 'tool_use' },
						usage: USAGE,
						warnings: [],
					};
				}

				const rawResult = getLatestToolResultPayload(prompt);
				expect(isRecord(rawResult)).toBe(true);
				expect(rawResult).not.toHaveProperty('_offloaded');
				expect(rawResult).not.toHaveProperty('_truncated');

				const page = parseFileOutputSchema.parse(rawResult);
				observedPages.push(page);
				expect(page.error).toBeUndefined();
				expect(page.format).toBe('json');
				expect(page.totalRows).toBe(0);
				expect(page.totalChars).toBe(rawJson.length);

				if (page.truncated) {
					expect(page.nextStartChar).toBeDefined();
					const id = `parse-page-${callIndex++}`;
					return {
						content: [
							{
								type: 'tool-call',
								toolCallId: id,
								toolName: DOMAIN_TOOL_IDS.PARSE_FILE,
								input: JSON.stringify({ startChar: page.nextStartChar }),
							},
						],
						finishReason: { unified: 'tool-calls', raw: 'tool_use' },
						usage: USAGE,
						warnings: [],
					};
				}

				return {
					content: [{ type: 'text', text: 'Reconstructed all 14 files.' }],
					finishReason: { unified: 'stop', raw: 'end_turn' },
					usage: USAGE,
					warnings: [],
				};
			},
		});

		const agent = createRuntimeAgent(model, parseFileTool, workspace);
		const result = await agent.generate(
			'Read the attached handover JSON and verify all 14 files.',
			{
				maxIterations: 20,
			},
		);

		expect(result.error).toBeUndefined();
		expect(result.finishReason).toBe('stop');
		expect(writeFile).not.toHaveBeenCalled();
		expect(observedPages.length).toBeGreaterThanOrEqual(7);
		expect(observedPages.at(-1)?.truncated).toBe(false);
		expect(observedPages.at(-1)?.nextStartChar).toBeUndefined();

		const reconstructed = observedPages.map((page) => page.content ?? '').join('');
		expect(reconstructed).toBe(rawJson);
		expect(sha256(reconstructed)).toBe(sha256(rawJson));

		const parsed = JSON.parse(reconstructed) as SourceHandoverPayload;
		expect(parsed.files).toHaveLength(14);
		for (let i = 0; i < payload.files.length; i++) {
			expect(parsed.files[i].path).toBe(payload.files[i].path);
			expect(parsed.files[i].content).toBe(payload.files[i].content);
			expect(sha256(parsed.files[i].content)).toBe(payload.files[i].sha256);
		}
	});

	it('paginates interleaved stored files by fileId through createOrchestratorDomainTools and Agent', async () => {
		const { payload, rawJson } = buildLargeHandoverJson();
		const largeMarkdown = `  # Handover Notes\r\n\r\n${'Section 🚀 details.\n'.repeat(3_000)}  `;

		const files: Record<string, InstanceAiStoredFile> = {
			'file-handover': createStoredFile('handover.json', 'application/json', rawJson),
			'file-notes': createStoredFile('notes.md', 'text/markdown', largeMarkdown),
		};

		const context = createMockContext({
			storedFiles: {
				read: vi.fn(async (fileId: string) => await Promise.resolve(files[fileId])),
			},
		});
		const parseFileTool = getParseFileTool(context);

		const chunksByFile: Record<string, string[]> = {
			'file-handover': [],
			'file-notes': [],
		};
		const nextOffsetByFile: Record<string, number | undefined> = {
			'file-handover': 0,
			'file-notes': 0,
		};
		let activeFileId: 'file-handover' | 'file-notes' = 'file-handover';
		let step = 0;

		const model = new MockLanguageModelV3({
			doGenerate: async ({ prompt }) => {
				if (step > 0) {
					const page = parseFileOutputSchema.parse(getLatestToolResultPayload(prompt));
					expect(page.error).toBeUndefined();
					expect(page.fileId).toBe(activeFileId);
					chunksByFile[activeFileId].push(page.content ?? '');
					nextOffsetByFile[activeFileId] = page.truncated ? page.nextStartChar : undefined;
				}

				// Alternate between files whenever both still have remaining pages.
				const nextOrder: Array<'file-handover' | 'file-notes'> =
					activeFileId === 'file-handover'
						? ['file-notes', 'file-handover']
						: ['file-handover', 'file-notes'];
				const nextFile = nextOrder.find((id) => nextOffsetByFile[id] !== undefined);

				if (nextFile) {
					activeFileId = nextFile;
					const startChar = nextOffsetByFile[nextFile];
					const input = startChar === 0 ? { fileId: nextFile } : { fileId: nextFile, startChar };
					return {
						content: [
							{
								type: 'tool-call',
								toolCallId: `stored-page-${step++}`,
								toolName: DOMAIN_TOOL_IDS.PARSE_FILE,
								input: JSON.stringify(input),
							},
						],
						finishReason: { unified: 'tool-calls', raw: 'tool_use' },
						usage: USAGE,
						warnings: [],
					};
				}

				return {
					content: [{ type: 'text', text: 'Read both stored files.' }],
					finishReason: { unified: 'stop', raw: 'end_turn' },
					usage: USAGE,
					warnings: [],
				};
			},
		});

		const agent = createRuntimeAgent(model, parseFileTool);
		const result = await agent.generate('Read both stored files completely.', {
			maxIterations: 25,
		});

		expect(result.error).toBeUndefined();
		expect(result.finishReason).toBe('stop');

		const restoredJson = chunksByFile['file-handover'].join('');
		expect(restoredJson).toBe(rawJson);
		expect(sha256(restoredJson)).toBe(sha256(rawJson));
		const parsed = JSON.parse(restoredJson) as SourceHandoverPayload;
		expect(parsed.files).toHaveLength(payload.files.length);

		const restoredMarkdown = chunksByFile['file-notes'].join('');
		expect(restoredMarkdown).toBe(largeMarkdown);
		expect(sha256(restoredMarkdown)).toBe(sha256(largeMarkdown));
	});

	it('paginates real HTML, DOCX, and PDF attachments end-to-end without mocking parsers', async () => {
		const htmlParagraph = 'HTML content block with visible text. '.repeat(1_300);
		const htmlDoc = `<!doctype html><html><head><title>Spec Doc</title></head><body><script>ignoreMe()</script><p>${htmlParagraph}</p></body></html>`;

		const docxParagraphs = Array.from(
			{ length: 200 },
			(_, i) => `DOCX paragraph ${i}: ${'alpha beta gamma '.repeat(14)}`,
		);
		const docxBuffer = buildMinimalDocx(docxParagraphs);

		const pdfPages = ['Page one marker: amber-otter-01', 'Page two marker: cobalt-falcon-02'];
		const pdfBuffer = buildMinimalPdf(pdfPages);

		const context = createMockContext({
			currentUserAttachments: [
				{ type: 'file', data: toBase64(htmlDoc), mimeType: 'text/html', fileName: 'spec.html' },
				{
					type: 'file',
					data: toBase64(docxBuffer),
					mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
					fileName: 'memo.docx',
				},
				{
					type: 'file',
					data: toBase64(pdfBuffer),
					mimeType: 'application/pdf',
					fileName: 'brief.pdf',
				},
			],
		});
		const parseFileTool = getParseFileTool(context);

		const queue: Array<{ attachmentIndex: number; maxChars?: number }> = [
			{ attachmentIndex: 0 },
			{ attachmentIndex: 1 },
			{ attachmentIndex: 2, maxChars: 24 },
		];
		const collectedByIndex: Record<
			number,
			Array<ReturnType<typeof parseFileOutputSchema.parse>>
		> = {
			0: [],
			1: [],
			2: [],
		};

		let current: { attachmentIndex: number; startChar?: number; maxChars?: number } | undefined;
		let callCount = 0;

		const model = new MockLanguageModelV3({
			doGenerate: async ({ prompt }) => {
				if (current) {
					const page = parseFileOutputSchema.parse(getLatestToolResultPayload(prompt));
					expect(page.error).toBeUndefined();
					collectedByIndex[current.attachmentIndex].push(page);
					if (page.truncated && page.nextStartChar !== undefined) {
						current = { ...current, startChar: page.nextStartChar };
					} else {
						current = queue.shift();
					}
				} else {
					current = queue.shift();
				}

				if (current) {
					return {
						content: [
							{
								type: 'tool-call',
								toolCallId: `rich-doc-${callCount++}`,
								toolName: DOMAIN_TOOL_IDS.PARSE_FILE,
								input: JSON.stringify(current),
							},
						],
						finishReason: { unified: 'tool-calls', raw: 'tool_use' },
						usage: USAGE,
						warnings: [],
					};
				}

				return {
					content: [{ type: 'text', text: 'Parsed HTML, DOCX, and PDF.' }],
					finishReason: { unified: 'stop', raw: 'end_turn' },
					usage: USAGE,
					warnings: [],
				};
			},
		});

		const agent = createRuntimeAgent(model, parseFileTool);
		const result = await agent.generate('Parse all three rich documents completely.', {
			maxIterations: 20,
		});

		expect(result.error).toBeUndefined();
		expect(result.finishReason).toBe('stop');

		// HTML: real linkedom + turndown, > MAX_RESULT_CHARS -> at least 2 pages
		expect(collectedByIndex[0].length).toBeGreaterThanOrEqual(2);
		expect(collectedByIndex[0].every((p) => p.format === 'html' && p.title === 'Spec Doc')).toBe(
			true,
		);
		const fullHtmlText = collectedByIndex[0].map((p) => p.content ?? '').join('');
		expect(fullHtmlText.length).toBe(collectedByIndex[0][0].totalChars);
		expect(fullHtmlText).toContain('HTML content block with visible text.');
		expect(fullHtmlText).not.toContain('ignoreMe');

		// DOCX: real OOXML guard + real mammoth extraction, > MAX_RESULT_CHARS -> at least 2 pages
		expect(collectedByIndex[1].length).toBeGreaterThanOrEqual(2);
		expect(collectedByIndex[1].every((p) => p.format === 'docx')).toBe(true);
		const fullDocxText = collectedByIndex[1].map((p) => p.content ?? '').join('');
		expect(fullDocxText.length).toBe(collectedByIndex[1][0].totalChars);
		expect(fullDocxText).toContain('DOCX paragraph 0:');
		expect(fullDocxText).toContain('DOCX paragraph 199:');

		// PDF: real DOMMatrix polyfill + real pdf-parse extraction, paginated with maxChars=24
		expect(collectedByIndex[2].length).toBeGreaterThanOrEqual(2);
		expect(collectedByIndex[2].every((p) => p.format === 'pdf' && p.pages === 2)).toBe(true);
		const fullPdfText = collectedByIndex[2].map((p) => p.content ?? '').join('');
		expect(fullPdfText.length).toBe(collectedByIndex[2][0].totalChars);
		expect(fullPdfText).toContain('amber-otter-01');
		expect(fullPdfText).toContain('cobalt-falcon-02');
	});

	it('handles tabular JSON row pagination, explicit char-pagination switch, oversized-cell fallback, and format overrides', async () => {
		const tabularRows = Array.from({ length: 5 }, (_, i) => ({ name: `user-${i}`, score: i * 10 }));
		const tabularJson = JSON.stringify(tabularRows);
		const oversizedCellJson = JSON.stringify([
			{ path: 'large.ts', content: `// header\n${'x'.repeat(MAX_CELL_STRING_LENGTH + 200)}` },
		]);
		const genericJsonPayload = JSON.stringify({ handover: true, count: 14 });

		const context = createMockContext({
			currentUserAttachments: [
				{
					type: 'file',
					data: toBase64(tabularJson),
					mimeType: 'application/json',
					fileName: 'rows.json',
				},
				{
					type: 'file',
					data: toBase64(oversizedCellJson),
					mimeType: 'application/json',
					fileName: 'wide-cell.json',
				},
				{
					type: 'file',
					data: toBase64(genericJsonPayload),
					mimeType: 'application/octet-stream',
					fileName: 'payload.dat',
				},
			],
		});
		const parseFileTool = getParseFileTool(context);

		const plannedCalls = [
			// 0: flat tabular JSON array -> tabular rows with pagination
			{ attachmentIndex: 0, maxRows: 2 },
			// 1: next page of tabular rows
			{ attachmentIndex: 0, startRow: 2, maxRows: 10 },
			// 2: same flat JSON array with explicit maxChars -> raw JSON text pagination
			{ attachmentIndex: 0, maxChars: 25 },
			// 3: flat JSON array whose cell exceeds MAX_CELL_STRING_LENGTH -> raw JSON fallback with warning
			{ attachmentIndex: 1 },
			// 4: unknown extension/MIME parsed with explicit format override
			{ attachmentIndex: 2, format: 'json' },
		];
		const outputs: Array<ReturnType<typeof parseFileOutputSchema.parse>> = [];
		let step = 0;

		const model = new MockLanguageModelV3({
			doGenerate: async ({ prompt }) => {
				if (step > 0) {
					outputs.push(parseFileOutputSchema.parse(getLatestToolResultPayload(prompt)));
				}
				if (step < plannedCalls.length) {
					const callInput = plannedCalls[step];
					return {
						content: [
							{
								type: 'tool-call',
								toolCallId: `json-mode-${step++}`,
								toolName: DOMAIN_TOOL_IDS.PARSE_FILE,
								input: JSON.stringify(callInput),
							},
						],
						finishReason: { unified: 'tool-calls', raw: 'tool_use' },
						usage: USAGE,
						warnings: [],
					};
				}

				return {
					content: [{ type: 'text', text: 'Completed JSON mode checks.' }],
					finishReason: { unified: 'stop', raw: 'end_turn' },
					usage: USAGE,
					warnings: [],
				};
			},
		});

		const agent = createRuntimeAgent(model, parseFileTool);
		const result = await agent.generate('Exercise JSON parsing modes.', { maxIterations: 10 });

		expect(result.error).toBeUndefined();
		expect(outputs).toHaveLength(plannedCalls.length);

		// 0 & 1: tabular JSON pagination
		expect(outputs[0]).toMatchObject({
			format: 'json',
			totalRows: 5,
			returnedRows: 2,
			truncated: true,
			nextStartRow: 2,
		});
		expect(outputs[0].content).toBeUndefined();
		expect(outputs[1]).toMatchObject({
			format: 'json',
			totalRows: 5,
			returnedRows: 3,
			truncated: false,
		});
		expect(outputs[1].nextStartRow).toBeUndefined();

		// 2: explicit char pagination switches flat array to raw JSON text
		expect(outputs[2]).toMatchObject({
			format: 'json',
			totalRows: 0,
			content: tabularJson.slice(0, 25),
			totalChars: tabularJson.length,
			truncated: true,
			nextStartChar: 25,
		});

		// 3: oversized cell falls back to raw JSON with a warning
		expect(outputs[3].content).toBe(oversizedCellJson);
		expect(outputs[3].totalChars).toBe(oversizedCellJson.length);
		expect(outputs[3].warnings?.[0]).toContain(`${MAX_CELL_STRING_LENGTH}-character tabular limit`);

		// 4: explicit format override works for generic MIME/extension
		expect(outputs[4]).toMatchObject({
			format: 'json',
			content: genericJsonPayload,
			totalChars: genericJsonPayload.length,
			truncated: false,
		});
	});

	it('surfaces Zod pagination validation errors to the model and allows recovery on the next call', async () => {
		const rawJson = JSON.stringify({ status: 'ok', items: [1, 2, 3] });
		const context = createMockContext({
			storedFiles: {
				read: vi.fn(async (fileId: string) =>
					fileId === 'file-1'
						? createStoredFile('status.json', 'application/json', rawJson)
						: undefined,
				),
			},
		});
		const parseFileTool = getParseFileTool(context);

		const invalidCalls = [
			{ fileId: 'file-1', startChar: -5 },
			{ fileId: 'file-1', maxChars: MAX_RESULT_CHARS + 1 },
			{ fileId: '   ' },
		];
		const observedResults: unknown[] = [];
		let step = 0;

		const model = new MockLanguageModelV3({
			doGenerate: async ({ prompt }) => {
				if (step > 0) {
					observedResults.push(getLatestToolResultPayload(prompt));
				}
				if (step < invalidCalls.length) {
					return {
						content: [
							{
								type: 'tool-call',
								toolCallId: `invalid-${step}`,
								toolName: DOMAIN_TOOL_IDS.PARSE_FILE,
								input: JSON.stringify(invalidCalls[step++]),
							},
						],
						finishReason: { unified: 'tool-calls', raw: 'tool_use' },
						usage: USAGE,
						warnings: [],
					};
				}
				if (step === invalidCalls.length) {
					step++;
					return {
						content: [
							{
								type: 'tool-call',
								toolCallId: 'valid-recovery',
								toolName: DOMAIN_TOOL_IDS.PARSE_FILE,
								input: JSON.stringify({ fileId: 'file-1', startChar: 0, maxChars: 100 }),
							},
						],
						finishReason: { unified: 'tool-calls', raw: 'tool_use' },
						usage: USAGE,
						warnings: [],
					};
				}

				return {
					content: [{ type: 'text', text: 'Recovered and parsed status.json.' }],
					finishReason: { unified: 'stop', raw: 'end_turn' },
					usage: USAGE,
					warnings: [],
				};
			},
		});

		const agent = createRuntimeAgent(model, parseFileTool);
		const result = await agent.generate('Parse status.json.', { maxIterations: 8 });

		expect(result.error).toBeUndefined();
		expect(result.finishReason).toBe('stop');
		expect(observedResults).toHaveLength(invalidCalls.length + 1);

		// First three calls fail Zod validation inside @n8n/agents without invoking the handler.
		for (let i = 0; i < invalidCalls.length; i++) {
			expect(JSON.stringify(observedResults[i])).toMatch(/invalid|too_small|too_big|validation/i);
		}
		expect(context.storedFiles?.read).toHaveBeenCalledTimes(1);

		const recovered = parseFileOutputSchema.parse(observedResults.at(-1));
		expect(recovered.error).toBeUndefined();
		expect(recovered.fileId).toBe('file-1');
		expect(recovered.content).toBe(rawJson);
	});

	it('exposes parse-file eagerly with startChar/maxChars on the full createInstanceAgent orchestrator', async () => {
		const handover = {
			version: 1,
			files: [
				{ path: 'a.ts', content: 'export const a = 1;\n'.repeat(1_500) },
				{ path: 'b.ts', content: 'export const b = 2;\n'.repeat(1_500) },
			],
		};
		const rawJson = `${JSON.stringify(handover, null, 2)}\n`;
		expect(rawJson.length).toBeGreaterThan(MAX_RESULT_CHARS);

		const context = createMockContext({
			storedFiles: {
				read: vi.fn(async (fileId: string) =>
					fileId === 'file-orch'
						? createStoredFile('handover.json', 'application/json', rawJson)
						: undefined,
				),
			},
		});

		const chunks: string[] = [];
		let step = 0;

		const model = new MockLanguageModelV3({
			doGenerate: async ({ prompt }) => {
				if (step === 0) {
					step++;
					return {
						content: [
							{
								type: 'tool-call',
								toolCallId: 'orch-page-0',
								toolName: DOMAIN_TOOL_IDS.PARSE_FILE,
								input: JSON.stringify({ fileId: 'file-orch' }),
							},
						],
						finishReason: { unified: 'tool-calls', raw: 'tool_use' },
						usage: USAGE,
						warnings: [],
					};
				}

				const page = parseFileOutputSchema.parse(getLatestToolResultPayload(prompt));
				expect(page.error).toBeUndefined();
				expect(page.fileId).toBe('file-orch');
				chunks.push(page.content ?? '');

				if (page.truncated && page.nextStartChar !== undefined) {
					return {
						content: [
							{
								type: 'tool-call',
								toolCallId: `orch-page-${step++}`,
								toolName: DOMAIN_TOOL_IDS.PARSE_FILE,
								input: JSON.stringify({ fileId: 'file-orch', startChar: page.nextStartChar }),
							},
						],
						finishReason: { unified: 'tool-calls', raw: 'tool_use' },
						usage: USAGE,
						warnings: [],
					};
				}

				return {
					content: [{ type: 'text', text: 'Orchestrator read full handover.' }],
					finishReason: { unified: 'stop', raw: 'end_turn' },
					usage: USAGE,
					warnings: [],
				};
			},
		});

		const { agent } = await createInstanceAgent({
			modelId: model,
			context,
			mcpManager: new McpClientManager(),
			memoryConfig: {},
			thinkingEnabled: false,
			modelFetch: async () => Response.json({}),
		});

		const result = await agent.generate('Read handover.json (fileId: file-orch).', {
			maxIterations: 10,
		});

		expect(result.error).toBeUndefined();
		expect(result.finishReason).toBe('stop');

		// Verify parse-file was exposed directly on turn 1 (not deferred behind find_tools).
		const firstCallTools = model.doGenerateCalls[0]?.tools ?? [];
		const advertisedParseFile = firstCallTools.find(
			(tool) => tool.name === DOMAIN_TOOL_IDS.PARSE_FILE,
		);
		expect(advertisedParseFile).toBeDefined();
		expect(advertisedParseFile?.type).toBe('function');
		if (advertisedParseFile?.type === 'function') {
			expect(advertisedParseFile.inputSchema).toMatchObject({
				type: 'object',
				properties: expect.objectContaining({
					fileId: expect.anything(),
					startChar: expect.anything(),
					maxChars: expect.anything(),
				}),
			});
		}

		expect(chunks.length).toBeGreaterThanOrEqual(2);
		expect(chunks.join('')).toBe(rawJson);
	});
});
