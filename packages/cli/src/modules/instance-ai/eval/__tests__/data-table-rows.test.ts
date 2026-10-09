vi.mock('@n8n/instance-ai', () => ({
	createEvalAgent: vi.fn(),
	extractText: vi.fn(),
}));

import { createEvalAgent, extractText } from '@n8n/instance-ai';
import type { INode } from 'n8n-workflow';

import { generateDataTableRows, type ScenarioDataTable } from '../data-table-rows';

const createEvalAgentMock = vi.mocked(createEvalAgent);
const extractTextMock = vi.mocked(extractText);
const generateMock = vi.fn();

const readNode = {
	name: 'Get Sent Posts',
	type: 'n8n-nodes-base.dataTable',
	parameters: { resource: 'row', operation: 'get' },
} as unknown as INode;

const tables: ScenarioDataTable[] = [
	{
		name: 'Sent Posts',
		columns: [
			{ name: 'title', type: 'string' },
			{ name: 'sent', type: 'boolean' },
		],
		nodes: [readNode],
	},
	{ name: 'Log', columns: [{ name: 'line', type: 'string' }], nodes: [] },
];

beforeEach(() => {
	vi.clearAllMocks();
	generateMock.mockResolvedValue({});
	createEvalAgentMock.mockReturnValue({ generate: generateMock } as unknown as ReturnType<
		typeof createEvalAgent
	>);
});

describe('generateDataTableRows', () => {
	it('puts the scenario, the columns and the node hints in the prompt', async () => {
		extractTextMock.mockReturnValue('{}');

		await generateDataTableRows({
			tables,
			globalContext: 'Blog: harborcafe.example',
			nodeHints: { 'Get Sent Posts': 'Post A was sent before' },
			scenarioHints: 'Post A is already sent; post B is new',
		});

		const prompt = generateMock.mock.calls[0][0] as string;
		expect(prompt).toContain('Post A is already sent; post B is new');
		expect(prompt).toContain('Blog: harborcafe.example');
		expect(prompt).toContain('Columns: title (string), sent (boolean)');
		expect(prompt).toContain('Expected data: Post A was sent before');
	});

	it('keeps only known columns and object rows, and leaves a missing table out', async () => {
		extractTextMock.mockReturnValue(
			'```json\n{ "Sent Posts": [{ "title": "Post A", "sent": true, "id": 7, "tags": ["x"] }, "junk"] }\n```',
		);

		const result = await generateDataTableRows({ tables, globalContext: '', nodeHints: {} });

		expect(result.rowsByTable).toEqual({ 'Sent Posts': [{ title: 'Post A', sent: true }] });
		expect(result.warnings).toEqual([
			'Data table rows for "Sent Posts" named unknown columns, dropped: id, tags',
		]);
	});

	it('sets a non-scalar value of a known column to null', async () => {
		extractTextMock.mockReturnValue('{ "Sent Posts": [{ "title": { "text": "Post A" } }] }');

		const result = await generateDataTableRows({ tables, globalContext: '', nodeHints: {} });

		expect(result.rowsByTable['Sent Posts']).toEqual([{ title: null }]);
	});

	it('retries once on an unreadable answer, then throws', async () => {
		extractTextMock.mockReturnValueOnce('no json here').mockReturnValueOnce('{ "Log": [] }');

		const result = await generateDataTableRows({ tables, globalContext: '', nodeHints: {} });

		expect(result.rowsByTable).toEqual({ Log: [] });
		expect(generateMock).toHaveBeenCalledTimes(2);

		extractTextMock.mockReturnValue('{ "Log": "not rows" }');
		await expect(
			generateDataTableRows({ tables, globalContext: '', nodeHints: {} }),
		).rejects.toThrow('Data table rows for "Log" are not an array');
	});

	it('does not call the model without tables', async () => {
		const result = await generateDataTableRows({ tables: [], globalContext: '', nodeHints: {} });

		expect(result).toEqual({ rowsByTable: {}, warnings: [] });
		expect(createEvalAgentMock).not.toHaveBeenCalled();
	});
});
