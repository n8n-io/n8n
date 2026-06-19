import { mock } from 'jest-mock-extended';

import type { AgentKnowledgeSandboxService } from '../agent-knowledge-sandbox.service';
import type {
	AgentKnowledgeFileReference,
	GlobKnowledgeFilesResult,
	ReadKnowledgeResult,
	SearchKnowledgeResult,
} from '../agent-knowledge-retrieval';
import { createKnowledgeRetrievalTools } from '../tools/knowledge/search-knowledge.tool';

const file: AgentKnowledgeFileReference = {
	file: 'moby-dick.txt',
	fileId: 'file-1',
	displayName: 'moby-dick.txt',
	mimeType: 'text/plain',
	fileSizeBytes: 123,
	createdAt: '2026-01-01T00:00:00.000Z',
};

function getSearchTool() {
	return getKnowledgeTool('search_text');
}

function getKnowledgeTool(name: string) {
	const tools = createKnowledgeRetrievalTools({
		projectId: 'project-1',
		agentId: 'agent-1',
		userId: 'user-1',
		sandboxService: mock<AgentKnowledgeSandboxService>(),
	});
	const tool = tools.find((candidate) => candidate.describe().name === name);
	if (!tool) throw new Error(`${name} tool not found`);
	return tool;
}

function getToolDescriptors() {
	return createKnowledgeRetrievalTools({
		projectId: 'project-1',
		agentId: 'agent-1',
		userId: 'user-1',
		sandboxService: mock<AgentKnowledgeSandboxService>(),
	}).map((tool) => tool.describe());
}

describe('search knowledge tool', () => {
	it('describes the rg-like search_text contract', () => {
		const descriptor = getSearchTool().describe();
		const contractText = descriptor.description;

		expect(descriptor.systemInstruction).toBeNull();
		expect(descriptor.description).toContain('`pattern`');
		expect(descriptor.description).toContain('`path`');
		expect(descriptor.description).toContain('`output_mode`');
		expect(descriptor.description).toContain('`head_limit`');
		expect(descriptor.description).toContain('`-C`');
		expect(descriptor.description).toContain('ripgrep regex `pattern`');
		expect(descriptor.description).toContain('Requires `path`');
		expect(descriptor.description).toContain('array of exact file values');
		expect(descriptor.description).toContain('Does not perform global search');
		expect(descriptor.description).toContain('files_with_matches');
		expect(descriptor.description).toContain('count for per-file match counts');
		expect(contractText).not.toContain('Pass file to search_text');
		expect(contractText).not.toContain('when `file` is copied');
		expect(contractText).not.toContain('`-A`');
		expect(contractText).not.toContain('`-B`');
		expect(contractText).not.toContain('contextLines');
		expect(contractText).not.toContain('"query"');
		expect(contractText).not.toContain('"mode"');
	});

	it('keeps knowledge guidance in descriptions without placeholder examples', () => {
		const descriptors = getToolDescriptors();
		const descriptions = descriptors.map((descriptor) => descriptor.description).join('\n');

		for (const descriptor of descriptors) {
			expect(descriptor.systemInstruction).toBeNull();
		}
		expect(descriptions).not.toContain('BAD:');
		expect(descriptions).not.toContain('BAD AND GOOD PATTERNS');
		expect(descriptions).not.toContain('__omit__');
		expect(descriptions).not.toContain('/dev/null');
		expect(descriptions).not.toContain('NOFILE');
		expect(descriptions).not.toContain('"none"');
		expect(descriptions).not.toContain('"null"');
		expect(descriptions).toContain('Use first for knowledge lookup');
		expect(descriptions).toContain(
			'then copy returned file values into search_text path or read_file',
		);
		expect(descriptions).toContain('Read one uploaded knowledge file');
	});

	it('formats search outputs compactly without instructions', () => {
		const builtTool = getSearchTool().build();
		const filesOutput: SearchKnowledgeResult = {
			outputMode: 'files_with_matches',
			files: [file],
			limit: 20,
			hasMore: false,
			truncated: false,
		};
		const countOutput: SearchKnowledgeResult = {
			outputMode: 'count',
			counts: [{ file: file.file, fileId: file.fileId, displayName: file.displayName, count: 12 }],
			limit: 20,
			hasMore: false,
			truncated: false,
		};
		const contentOutput: SearchKnowledgeResult = {
			outputMode: 'content',
			matches: [
				{
					file: file.file,
					fileId: file.fileId,
					displayName: file.displayName,
					lineNumber: 1,
					text: 'Call me Ishmael',
					textTruncated: false,
				},
			],
			limit: 20,
			hasMore: false,
			truncated: false,
		};
		const errorOutput = { error: 'failed', errorType: 'Error' };

		const transformedFiles = builtTool.toModelOutput?.(filesOutput);
		expect(transformedFiles).toEqual(
			expect.objectContaining({
				outputMode: 'files_with_matches',
				files: [{ file: file.file, fileId: file.fileId, displayName: file.displayName }],
				returnedFiles: 1,
			}),
		);
		expect(transformedFiles).not.toHaveProperty('instruction');

		const transformedCounts = builtTool.toModelOutput?.(countOutput);
		expect(transformedCounts).toEqual(
			expect.objectContaining({
				outputMode: 'count',
				counts: [
					{ file: file.file, fileId: file.fileId, displayName: file.displayName, count: 12 },
				],
				returnedCounts: 1,
			}),
		);
		expect(transformedCounts).not.toHaveProperty('instruction');

		const transformedContent = builtTool.toModelOutput?.(contentOutput);
		expect(transformedContent).toEqual(
			expect.objectContaining({
				outputMode: 'content',
				matches: [
					expect.objectContaining({
						file: file.file,
						fileId: file.fileId,
						text: 'Call me Ishmael',
					}),
				],
				returnedMatches: 1,
			}),
		);
		expect(transformedContent).not.toHaveProperty('instruction');

		expect(builtTool.toModelOutput?.(errorOutput)).toEqual(errorOutput);
		expect(builtTool.toModelOutput?.(errorOutput)).not.toHaveProperty('instruction');
	});

	it('formats find_file and read_file outputs without instructions', () => {
		const globTool = getKnowledgeTool('find_file').build();
		const readTool = getKnowledgeTool('read_file').build();
		const globOutput: GlobKnowledgeFilesResult = {
			files: [file],
			limit: 20,
			hasMore: false,
		};
		const readOutput: ReadKnowledgeResult = {
			file: file.file,
			fileId: file.fileId,
			displayName: file.displayName,
			ranges: [
				{
					startLine: 1,
					endLine: 3,
					citation: {
						file: file.file,
						fileId: file.fileId,
						displayName: file.displayName,
						startLine: 1,
						endLine: 3,
					},
					text: '1|Call me Ishmael',
				},
			],
			truncated: false,
		};

		const transformedGlob = globTool.toModelOutput?.(globOutput);
		expect(transformedGlob).toEqual(
			expect.objectContaining({
				files: [{ file: file.file, fileId: file.fileId, displayName: file.displayName }],
				returnedFiles: 1,
			}),
		);
		expect(transformedGlob).not.toHaveProperty('instruction');

		const transformedRead = readTool.toModelOutput?.(readOutput);
		expect(transformedRead).toEqual(
			expect.objectContaining({
				file: file.file,
				fileId: file.fileId,
				returnedRanges: 1,
			}),
		);
		expect(transformedRead).not.toHaveProperty('instruction');
	});
});
