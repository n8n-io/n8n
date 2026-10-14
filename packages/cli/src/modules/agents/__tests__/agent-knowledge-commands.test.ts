import {
	buildMirrorDeleteListBody,
	buildMirrorFinalizeCommand,
	buildMirrorManifestBody,
	buildReadKnowledgeCommand,
	buildSearchKnowledgeCommand,
	getSearchContextWindow,
	MIRROR_SYNC_TIMEOUT_SECONDS,
	parseReadKnowledgeOutput,
	parseRipgrepCountOutput,
	parseRipgrepOutput,
} from '../agent-knowledge-commands';
import { getAgentKnowledgePaths, getMirrorStagingPaths } from '../agent-knowledge-storage';
import {
	searchKnowledgeInputSchema,
	type AgentKnowledgeFileReference,
} from '../agent-knowledge-retrieval';

const mobyDickFile: AgentKnowledgeFileReference = {
	file: 'moby-dick.txt',
	fileId: 'file-1',
	storedAt: 'fs',
	storageKey: 'agents/agent-1/knowledge-files/file-1/content',
	displayName: 'moby-dick.txt',
	mimeType: 'text/plain',
	fileSizeBytes: 123,
	createdAt: '2026-01-01T00:00:00.000Z',
};

const filesByPath = new Map([[mobyDickFile.file, mobyDickFile]]);
const bearerSecret = 'Authorization: Bearer abc.def-ghi_jkl/mno=012345678901234567890123456789';
const knowledgePaths = getAgentKnowledgePaths('daytona');

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

	describe('buildMirrorFinalizeCommand', () => {
		const staging = getMirrorStagingPaths(knowledgePaths, 'sync-1');

		/** Unwraps the `bash -c '<script>'` payload so assertions read as shell. */
		function innerScript(command: string): string {
			const marker = "bash -o pipefail -c '";
			const start = command.indexOf(marker);
			expect(start).toBeGreaterThan(-1);
			return command.slice(start + marker.length, -1).replaceAll("'\\''", "'");
		}

		it('moves the staged files and manifest into place atomically', () => {
			const command = buildMirrorFinalizeCommand(knowledgePaths, 'sync-1', false);
			const script = innerScript(command);

			expect(script).toContain(`mkdir -p '${knowledgePaths.filesDir}'`);
			expect(script).toContain(`for staged in '${staging.filesDir}'/*`);
			expect(script).toContain(`mv -- "$staged" '${knowledgePaths.filesDir}/'`);
			expect(script).toContain(`mv '${staging.manifest}' '${knowledgePaths.manifest}'`);
			expect(command).toContain(`timeout ${MIRROR_SYNC_TIMEOUT_SECONDS}`);
		});

		it('mirrors dotfiles and tolerates an empty staging directory', () => {
			const script = innerScript(buildMirrorFinalizeCommand(knowledgePaths, 'sync-1', false));

			expect(script).toContain('shopt -s dotglob nullglob');
		});

		it('removes deleted names from the staged delete list, not from the command', () => {
			const script = innerScript(buildMirrorFinalizeCommand(knowledgePaths, 'sync-1', true));

			expect(script).toContain(`xargs -0 -r rm -f -- < '${staging.deleteList}'`);
		});

		it('omits the delete step when nothing is deleted', () => {
			const command = buildMirrorFinalizeCommand(knowledgePaths, 'sync-1', false);

			expect(command).not.toContain('rm -f');
		});

		it('rejects a staging ID that looks like path traversal', () => {
			expect(() => buildMirrorFinalizeCommand(knowledgePaths, '../secret', false)).toThrow();
		});

		/**
		 * Linux caps a single argv entry at 128 KiB, and the whole command is one
		 * argument to `bash -c`. Naming each file inline used to blow that cap at a
		 * few hundred files, which surfaced as "argument list too long".
		 */
		it('stays the same size however many files the sync touches', () => {
			const command = buildMirrorFinalizeCommand(knowledgePaths, 'sync-1', true);

			expect(command.length).toBeLessThan(1024);
		});
	});

	describe('buildMirrorManifestBody', () => {
		it('writes one fileId/name line per mirrored file', () => {
			const body = buildMirrorManifestBody([
				{ file: 'doc1.txt', fileId: 'file-1' },
				{ file: 'doc2.txt', fileId: 'file-2' },
			]);

			expect(body).toBe('file-1\tdoc1.txt\nfile-2\tdoc2.txt\n');
		});

		it('is empty when nothing is mirrored', () => {
			expect(buildMirrorManifestBody([])).toBe('');
		});

		it('rejects names that look like path traversal', () => {
			expect(() => buildMirrorManifestBody([{ file: '../secret', fileId: 'file-1' }])).toThrow();
			expect(() =>
				buildMirrorManifestBody([{ file: 'nested/name.txt', fileId: 'file-1' }]),
			).toThrow();
		});

		it('rejects a file ID that would split one manifest entry into two', () => {
			expect(() =>
				buildMirrorManifestBody([{ file: 'doc1.txt', fileId: 'file\t1\nfile-2' }]),
			).toThrow();
		});
	});

	describe('buildMirrorDeleteListBody', () => {
		it('NUL-separates the full path of each removed file', () => {
			const body = buildMirrorDeleteListBody(['stale.txt', 'old.md'], knowledgePaths);

			expect(body).toBe(
				`${knowledgePaths.filesDir}/stale.txt\0${knowledgePaths.filesDir}/old.md\0`,
			);
		});

		it('is empty when nothing is deleted', () => {
			expect(buildMirrorDeleteListBody([], knowledgePaths)).toBe('');
		});

		it('rejects names that look like path traversal', () => {
			expect(() => buildMirrorDeleteListBody(['../secret'], knowledgePaths)).toThrow();
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
