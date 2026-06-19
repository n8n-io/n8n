import {
	buildSearchKnowledgeCommand,
	getSearchContextWindow,
	parseRipgrepOutput,
} from '../agent-knowledge-commands';
import {
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
		it('accepts rg-like searches scoped to exact file paths', () => {
			const parsed = searchKnowledgeInputSchema.safeParse({
				pattern: 'Moby Dick',
				path: ['moby-dick.txt', 'extracts.txt'],
				output_mode: 'content',
				head_limit: 5,
				'-C': 3,
				'-i': true,
			});

			expect(parsed.success).toBe(true);
			if (!parsed.success) throw new Error('Expected search input to parse');
			expect(parsed.data.path).toEqual(['moby-dick.txt', 'extracts.txt']);
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

	describe('buildSearchKnowledgeCommand', () => {
		it('builds scoped rg commands with regex pattern and context', () => {
			const command = buildSearchKnowledgeCommand(
				{
					pattern: 'Moby Dick|white whale',
					path: ['moby-dick.txt', 'extracts.txt'],
					head_limit: 5,
					'-C': 3,
				},
				['moby-dick.txt', 'extracts.txt'],
			);

			expect(command).toContain('rg --ignore-case --color=never --hidden --json');
			expect(command).toContain('--context 3');
			expect(command).toContain("-e 'Moby Dick|white whale' -- './moby-dick.txt' './extracts.txt'");
			expect(command).not.toContain('-- .');
			expect(command).not.toContain('--fixed-strings');
			expect(command).not.toContain('--text');
		});

		it('quotes scoped filenames safely', () => {
			const command = buildSearchKnowledgeCommand(
				{ pattern: 'clock', path: ["o'clock notes.txt"] },
				["o'clock notes.txt"],
			);

			expect(command).toContain("'./o'\\''clock notes.txt'");
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
});
