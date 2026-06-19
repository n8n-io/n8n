import {
	buildSearchKnowledgeCommand,
	estimateSearchOutputLimit,
	getSearchContextWindow,
	parseRipgrepCountOutput,
	parseRipgrepFilesOutput,
	parseRipgrepOutput,
} from '../agent-knowledge-commands';
import {
	readKnowledgeInputSchema,
	searchKnowledgeInputSchema,
	type AgentKnowledgeFileReference,
} from '../agent-knowledge-retrieval';

const mobyDickFile: AgentKnowledgeFileReference = {
	file: 'moby-dick.txt',
	fileId: 'file-1',
	displayName: 'moby-dick.txt',
	mimeType: 'text/plain',
	fileSizeBytes: 123,
	createdAt: '2026-01-01T00:00:00.000Z',
};

const filesByPath = new Map([[mobyDickFile.file, mobyDickFile]]);

function rgEvent(
	type: 'match' | 'context',
	lineNumber: number,
	text: string,
	filePath = `./${mobyDickFile.file}`,
) {
	return JSON.stringify({
		type,
		data: {
			path: { text: filePath },
			lines: { text: `${text}\n` },
			line_number: lineNumber,
		},
	});
}

describe('agent knowledge commands', () => {
	describe('searchKnowledgeInputSchema', () => {
		it('accepts rg-like search fields', () => {
			const singlePath = searchKnowledgeInputSchema.safeParse({
				pattern: 'Moby Dick',
				path: 'moby-dick.txt',
				output_mode: 'content',
				head_limit: 5,
				'-C': 3,
				'-i': true,
			});
			expect(singlePath.success).toBe(true);
			if (!singlePath.success) throw new Error('Expected single path to parse');
			expect(singlePath.data.path).toEqual(['moby-dick.txt']);

			const multiPath = searchKnowledgeInputSchema.safeParse({
				pattern: 'white whale',
				path: ['moby-dick.txt', 'extracts.txt'],
				output_mode: 'files_with_matches',
			});
			expect(multiPath.success).toBe(true);
			if (!multiPath.success) throw new Error('Expected multiple paths to parse');
			expect(multiPath.data.path).toEqual(['moby-dick.txt', 'extracts.txt']);
		});

		it('rejects global search path sentinels', () => {
			for (const input of [
				{},
				{ path: '' },
				{ path: ' ' },
				{ path: '*' },
				{ path: ' * ' },
				{ path: [] },
			]) {
				expect(
					searchKnowledgeInputSchema.safeParse({
						pattern: 'Kubernetes Pod',
						...input,
					}).success,
				).toBe(false);
			}
		});

		it('rejects stale search fields and removed context flags', () => {
			expect(
				searchKnowledgeInputSchema.safeParse({
					query: 'Moby Dick',
					mode: 'literal',
					limit: 5,
					contextLines: 3,
				}).success,
			).toBe(false);

			expect(
				searchKnowledgeInputSchema.safeParse({
					pattern: 'Moby Dick',
					file: 'moby-dick.txt',
				}).success,
			).toBe(false);

			expect(
				searchKnowledgeInputSchema.safeParse({
					pattern: 'Moby Dick',
					fileId: 'file-1',
				}).success,
			).toBe(false);

			expect(
				searchKnowledgeInputSchema.safeParse({
					pattern: 'Moby Dick',
					'-A': 1,
				}).success,
			).toBe(false);
		});
	});

	describe('readKnowledgeInputSchema', () => {
		it('accepts read ranges larger than 200 lines', () => {
			expect(
				readKnowledgeInputSchema.safeParse({
					file: 'moby-dick.txt',
					ranges: [{ startLine: 5900, endLine: 6100 }],
				}).success,
			).toBe(true);
		});
	});

	describe('buildSearchKnowledgeCommand', () => {
		it('builds content rg commands with regex pattern and context', () => {
			const command = buildSearchKnowledgeCommand(
				{ pattern: 'Moby Dick|white whale', path: ['moby-dick.txt'], head_limit: 5, '-C': 3 },
				['moby-dick.txt'],
			);

			expect(command).toContain('timeout 20 rg');
			expect(command).toContain('rg --ignore-case --color=never --hidden --json');
			expect(command).toContain('--context 3');
			expect(command).toContain("-e 'Moby Dick|white whale' -- './moby-dick.txt'");
			expect(command).not.toContain('--fixed-strings');
			expect(command).not.toContain('--text');
		});

		it('builds files_with_matches rg commands without snippets', () => {
			const command = buildSearchKnowledgeCommand(
				{
					pattern: 'white whale',
					path: ['moby-dick.txt'],
					output_mode: 'files_with_matches',
				},
				['moby-dick.txt'],
			);

			expect(command).toContain('--files-with-matches');
			expect(command).not.toContain('--json');
			expect(command).toContain("-e 'white whale' -- './moby-dick.txt'");
			expect(command).not.toContain('-- .');
		});

		it('builds count rg commands with a tab field separator', () => {
			const command = buildSearchKnowledgeCommand(
				{ pattern: 'Ahab', path: ['moby-dick.txt'], output_mode: 'count' },
				['moby-dick.txt'],
			);

			expect(command).toContain('--count-matches');
			expect(command).toContain('--with-filename');
			expect(command).toContain('--field-match-separator');
		});

		it('builds multi-target rg commands', () => {
			const command = buildSearchKnowledgeCommand(
				{ pattern: 'whale', path: ['moby-dick.txt', 'extracts.txt'] },
				['moby-dick.txt', 'extracts.txt'],
			);

			expect(command).toContain("-e 'whale' -- './moby-dick.txt' './extracts.txt'");
			expect(command).not.toContain('-- .');
		});

		it('quotes scoped filenames safely', () => {
			const command = buildSearchKnowledgeCommand(
				{ pattern: 'clock', path: ["o'clock notes.txt"] },
				["o'clock notes.txt"],
			);

			expect(command).toContain("'./o'\\''clock notes.txt'");
		});

		it('scales output budget when context lines are requested', () => {
			const matchLimit = 10;
			const withoutContext = estimateSearchOutputLimit({}, matchLimit);
			const withContext = estimateSearchOutputLimit({ '-C': 3 }, matchLimit);

			expect(withContext).toBeGreaterThan(withoutContext);
		});
	});

	describe('parseRipgrepOutput', () => {
		it('groups match and context events into compact match context', () => {
			const output = [
				rgEvent('context', 9, 'before the white whale'),
				rgEvent('match', 10, 'Moby Dick appeared'),
				rgEvent('context', 11, 'after the white whale'),
			].join('\n');

			const parsed = parseRipgrepOutput(output, filesByPath, getSearchContextWindow({ '-C': 1 }));

			expect(parsed.incomplete).toBe(false);
			expect(parsed.matches).toEqual([
				{
					file: 'moby-dick.txt',
					fileId: 'file-1',
					displayName: 'moby-dick.txt',
					lineNumber: 10,
					text: 'Moby Dick appeared',
					textTruncated: false,
					context: [
						{ lineNumber: 9, text: 'before the white whale', matched: false },
						{ lineNumber: 10, text: 'Moby Dick appeared', matched: true },
						{ lineNumber: 11, text: 'after the white whale', matched: false },
					],
				},
			]);
		});

		it('omits context when -C is zero', () => {
			const parsed = parseRipgrepOutput(
				rgEvent('match', 10, 'match'),
				filesByPath,
				getSearchContextWindow({ '-C': 0 }),
			);

			expect(parsed.matches[0].context).toBeUndefined();
		});
	});

	describe('parseRipgrepFilesOutput', () => {
		it('maps matched paths to uploaded files', () => {
			const parsed = parseRipgrepFilesOutput(
				['./moby-dick.txt', './unknown.txt'].join('\n'),
				filesByPath,
			);

			expect(parsed.incomplete).toBe(false);
			expect(parsed.files).toEqual([mobyDickFile]);
		});
	});

	describe('parseRipgrepCountOutput', () => {
		it('maps count rows to uploaded files', () => {
			const parsed = parseRipgrepCountOutput(
				['./moby-dick.txt\t12', './unknown.txt\t3'].join('\n'),
				filesByPath,
			);

			expect(parsed.incomplete).toBe(false);
			expect(parsed.counts).toEqual([
				{
					file: 'moby-dick.txt',
					fileId: 'file-1',
					displayName: 'moby-dick.txt',
					count: 12,
				},
			]);
		});
	});
});
