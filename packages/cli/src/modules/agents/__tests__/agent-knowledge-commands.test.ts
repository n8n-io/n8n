import {
	buildMirrorFinalizeCommand,
	buildReadKnowledgeCommand,
	buildReadMirrorManifestCommand,
	buildSearchKnowledgeCommand,
	getSearchContextWindow,
	MIRROR_SYNC_TIMEOUT_SECONDS,
	parseReadKnowledgeOutput,
	parseRipgrepCountOutput,
	parseRipgrepOutput,
} from '../agent-knowledge-commands';
import { KNOWLEDGE_MIRROR_FILES_DIR, KNOWLEDGE_MIRROR_MANIFEST } from '../agent-knowledge-storage';
import {
	searchKnowledgeInputSchema,
	type AgentKnowledgeFileReference,
} from '../agent-knowledge-retrieval';

const mobyDickFile: AgentKnowledgeFileReference = {
	file: 'moby-dick.txt',
	fileId: 'file-1',
	binaryDataId: 'filesystem-v2:agents/agent-1/knowledge-files/file-1/binary_data/uuid',
	displayName: 'moby-dick.txt',
	mimeType: 'text/plain',
	fileSizeBytes: 123,
	createdAt: '2026-01-01T00:00:00.000Z',
};

const filesByPath = new Map([[mobyDickFile.file, mobyDickFile]]);
const bearerSecret = 'Authorization: Bearer abc.def-ghi_jkl/mno=012345678901234567890123456789';

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

		it('allows an omitted path for global search', () => {
			const parsed = searchKnowledgeInputSchema.safeParse({ pattern: 'Kubernetes Pod' });

			expect(parsed.success).toBe(true);
			if (!parsed.success) throw new Error('Expected omitted path to parse');
			expect(parsed.data.path).toBeUndefined();
		});

		it('treats catch-all path placeholders as an omitted path', () => {
			for (const path of ['', ' ', '.', '/', '*', ' * ', [], ['.', '/'], ['*']]) {
				const parsed = searchKnowledgeInputSchema.safeParse({
					pattern: 'Kubernetes Pod',
					path,
				});

				expect(parsed.success).toBe(true);
				if (!parsed.success) throw new Error('Expected placeholder path to parse');
				expect(parsed.data.path).toBeUndefined();
			}
		});

		it('keeps exact paths while dropping placeholder entries from a mixed array', () => {
			const parsed = searchKnowledgeInputSchema.safeParse({
				pattern: 'Kubernetes Pod',
				path: ['moby-dick.txt', '*', '.'],
			});

			expect(parsed.success).toBe(true);
			if (!parsed.success) throw new Error('Expected mixed path array to parse');
			expect(parsed.data.path).toEqual(['moby-dick.txt']);
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

			expect(command).toContain('rg --ignore-case --color=never --hidden --text --json');
			expect(command).toContain('--context 3');
			expect(command).toContain("-e 'Moby Dick|white whale' -- './moby-dick.txt' './extracts.txt'");
			expect(command).not.toContain('-- .');
			expect(command).not.toContain('--fixed-strings');
		});

		it('quotes scoped filenames safely', () => {
			const command = buildSearchKnowledgeCommand(
				{ pattern: 'clock', path: ["o'clock notes.txt"] },
				["o'clock notes.txt"],
			);

			expect(command).toContain("'./o'\\''clock notes.txt'");
		});

		it('uses the bounded awk pipeline for all output modes', () => {
			for (const outputMode of ['content', 'files_with_matches', 'count'] as const) {
				const command = buildSearchKnowledgeCommand(
					{ pattern: 'Moby Dick', path: [mobyDickFile.file], output_mode: outputMode },
					[mobyDickFile.file],
				);

				expect(command).toContain('set +o pipefail');
				expect(command).toContain(' | awk ');
				expect(command).toContain('command_status="$' + '{PIPESTATUS[0]}"');
				expect(command).toContain('if [ "$command_status" = 141 ]; then command_status=0; fi');
			}
		});

		it('limits content output by top-level ripgrep match events only', () => {
			const command = buildSearchKnowledgeCommand(
				{ pattern: 'Moby Dick', path: [mobyDickFile.file], '-C': 1 },
				[mobyDickFile.file],
			);

			expect(command).toContain('/^\\{"type":"match"/ { matches += 1;');
			expect(command).not.toContain('/"type":"match"/ { matches += 1;');
		});

		it('targets the current directory for an unscoped global search', () => {
			const command = buildSearchKnowledgeCommand({ pattern: 'Moby Dick' }, []);

			expect(command).toContain("-e 'Moby Dick' -- .");
			expect(command).not.toContain("-- './");
		});
	});

	describe('buildReadKnowledgeCommand', () => {
		it('does not slice line text before parser redaction', () => {
			const command = buildReadKnowledgeCommand(mobyDickFile.file, {
				file: mobyDickFile.file,
				ranges: [{ startLine: 7, endLine: 7 }],
			});

			expect(command).not.toContain('substr($0');
		});
	});

	describe('buildReadMirrorManifestCommand', () => {
		it('reads the manifest and tolerates a missing file', () => {
			const command = buildReadMirrorManifestCommand();

			expect(command).toBe(`cat ${KNOWLEDGE_MIRROR_MANIFEST} 2>/dev/null || true`);
		});
	});

	describe('buildMirrorFinalizeCommand', () => {
		it('moves already-uploaded .tmp- names into place atomically', () => {
			const command = buildMirrorFinalizeCommand(['doc1.txt'], [], ['doc1.txt']);

			expect(command).toContain(`mkdir -p ${KNOWLEDGE_MIRROR_FILES_DIR}`);
			expect(command).toContain(`${KNOWLEDGE_MIRROR_FILES_DIR}/.tmp-doc1.txt`);
			expect(command).toContain(`${KNOWLEDGE_MIRROR_FILES_DIR}/doc1.txt`);
			expect(command).toMatch(/mv\s+.*\.tmp-doc1\.txt.*doc1\.txt/);
			expect(command).toContain(`timeout ${MIRROR_SYNC_TIMEOUT_SECONDS}`);
		});

		it('removes deleted names with rm -f', () => {
			const command = buildMirrorFinalizeCommand([], ['stale.txt'], []);

			expect(command).toContain('rm -f');
			expect(command).toContain(`${KNOWLEDGE_MIRROR_FILES_DIR}/stale.txt`);
		});

		it('writes the full manifest via a temp file and mv', () => {
			const command = buildMirrorFinalizeCommand([], [], ['a.txt', 'b.txt']);

			expect(command).toContain(`> ${KNOWLEDGE_MIRROR_MANIFEST}.tmp`);
			expect(command).toContain(`mv ${KNOWLEDGE_MIRROR_MANIFEST}.tmp ${KNOWLEDGE_MIRROR_MANIFEST}`);
		});

		it('rejects names that look like path traversal', () => {
			expect(() => buildMirrorFinalizeCommand(['../secret'], [], ['../secret'])).toThrow();
			expect(() => buildMirrorFinalizeCommand([], [], ['nested/name.txt'])).toThrow();
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

		it('redacts search match and context lines before truncating', () => {
			const output = [
				rgEvent('context', 9, `${'x'.repeat(450)} ${bearerSecret}`),
				rgEvent('match', 10, `${'x'.repeat(450)} ${bearerSecret}`),
			].join('\n');

			const parsed = parseRipgrepOutput(output, filesByPath, getSearchContextWindow({ '-C': 1 }));
			const match = parsed.matches[0];

			expect(match.text).toContain('[REDACTED]');
			expect(match.text).not.toContain('Bearer');
			expect(match.text).not.toContain('abc.def');
			expect(match.textTruncated).toBe(false);
			expect(match.context?.[0]?.text).toContain('[REDACTED]');
			expect(match.context?.[0]?.text).not.toContain('Bearer');
			expect(match.context?.[0]?.text).not.toContain('abc.def');
		});
	});

	describe('count mode', () => {
		it('builds a count command without a custom field separator', () => {
			const command = buildSearchKnowledgeCommand(
				{ pattern: 'whale', path: ['moby-dick.txt'], output_mode: 'count' },
				['moby-dick.txt'],
			);

			expect(command).toContain('--count-matches --with-filename');
			expect(command).not.toContain('--field-match-separator');
		});

		it('parses the path:count lines rg emits for --count-matches', () => {
			const parsed = parseRipgrepCountOutput('./moby-dick.txt:97\n', filesByPath);

			expect(parsed.incomplete).toBe(false);
			expect(parsed.counts).toEqual([
				expect.objectContaining({ file: 'moby-dick.txt', count: 97 }),
			]);
		});
	});

	describe('parseReadKnowledgeOutput', () => {
		it('redacts read lines before truncating', () => {
			const output = `0\t7\t${'x'.repeat(1950)} ${bearerSecret}\n`;

			const parsed = parseReadKnowledgeOutput(output, mobyDickFile, {
				file: mobyDickFile.file,
				ranges: [{ startLine: 7, endLine: 7 }],
			});

			expect(parsed.ranges[0].text).toContain('[REDACTED]');
			expect(parsed.ranges[0].text).not.toContain('Bearer');
			expect(parsed.ranges[0].text).not.toContain('abc.def');
			expect(parsed.truncated).toBe(false);
		});
	});
});
