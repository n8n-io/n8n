import { Service } from '@n8n/di';
import { Buffer } from 'node:buffer';
import { OperationalError } from 'n8n-workflow';

import type { KnowledgeSandboxWorkspace } from './agent-knowledge-sandbox-workspace.service';
import {
	KNOWLEDGE_CSV_RUNNER_MISSING_MESSAGE,
	KNOWLEDGE_CSV_RUNNER_PATH,
	KNOWLEDGE_CSV_RUNNER_TIMEOUT_MS,
	KNOWLEDGE_CSV_RUNNER_VERSION,
	MAX_CSV_RUNNER_OUTPUT_BYTES,
} from './agent-knowledge-sandbox-runtime';
import type { WorkspaceFiles } from './tools/knowledge/file-references';
import type {
	CsvAggregateInput,
	CsvAggregateResult,
	CsvDistinctInput,
	CsvDistinctResult,
	CsvProfileInput,
	CsvProfileResult,
	CsvQueryInput,
	CsvQueryResult,
} from './tools/knowledge/schemas';

type CsvOperationInput = CsvQueryInput | CsvProfileInput | CsvDistinctInput | CsvAggregateInput;

interface CsvRunnerResponse {
	ok: boolean;
	result?: unknown;
}

@Service()
export class AgentKnowledgeSandboxCsvService {
	private readonly runnerCapabilityByWorkspace = new Map<string, boolean>();

	async queryCsv(
		workspace: KnowledgeSandboxWorkspace,
		files: WorkspaceFiles,
		input: CsvQueryInput,
	): Promise<CsvQueryResult> {
		return (await this.runCsvOperation(workspace, files, input)) as CsvQueryResult;
	}

	async profileCsv(
		workspace: KnowledgeSandboxWorkspace,
		files: WorkspaceFiles,
		input: CsvProfileInput,
	): Promise<CsvProfileResult> {
		return (await this.runCsvOperation(workspace, files, input)) as CsvProfileResult;
	}

	async distinctCsv(
		workspace: KnowledgeSandboxWorkspace,
		files: WorkspaceFiles,
		input: CsvDistinctInput,
	): Promise<CsvDistinctResult> {
		return (await this.runCsvOperation(workspace, files, input)) as CsvDistinctResult;
	}

	async aggregateCsv(
		workspace: KnowledgeSandboxWorkspace,
		files: WorkspaceFiles,
		input: CsvAggregateInput,
	): Promise<CsvAggregateResult> {
		return (await this.runCsvOperation(workspace, files, input)) as CsvAggregateResult;
	}

	private getCapabilityCacheKey(workspace: KnowledgeSandboxWorkspace): string {
		return `${workspace.provider}:${workspace.sandbox.id}`;
	}

	private async ensureCsvRunnerCapability(workspace: KnowledgeSandboxWorkspace): Promise<void> {
		const cacheKey = this.getCapabilityCacheKey(workspace);
		if (this.runnerCapabilityByWorkspace.get(cacheKey)) return;

		if (!workspace.sandbox.executeCommand) {
			throw new Error('Agent knowledge sandbox does not support command execution');
		}

		const result = await workspace.sandbox.executeCommand(
			'node',
			[KNOWLEDGE_CSV_RUNNER_PATH, '--version'],
			{
				cwd: workspace.knowledgeRoot,
				timeout: KNOWLEDGE_CSV_RUNNER_TIMEOUT_MS,
			},
		);

		const version = result.stdout.trim();
		if (result.exitCode !== 0 || version !== String(KNOWLEDGE_CSV_RUNNER_VERSION)) {
			throw new OperationalError(KNOWLEDGE_CSV_RUNNER_MISSING_MESSAGE);
		}

		this.runnerCapabilityByWorkspace.set(cacheKey, true);
	}

	private async runCsvOperation(
		workspace: KnowledgeSandboxWorkspace,
		files: WorkspaceFiles,
		input: CsvOperationInput,
	): Promise<unknown> {
		if (!workspace.sandbox.executeCommand) {
			throw new Error('Agent knowledge sandbox does not support command execution');
		}

		await this.ensureCsvRunnerCapability(workspace);

		const payload = {
			version: KNOWLEDGE_CSV_RUNNER_VERSION,
			operation: input.operation,
			input,
			files,
			knowledgeRoot: workspace.knowledgeRoot,
		};
		const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');

		let stdout = '';
		let stderr = '';
		let stdoutFromCallback = false;
		let stderrFromCallback = false;

		const append = (current: string, chunk: string) => {
			const next = Buffer.concat([Buffer.from(current, 'utf8'), Buffer.from(chunk, 'utf8')]);
			if (next.length > MAX_CSV_RUNNER_OUTPUT_BYTES) {
				return truncateBufferToUtf8String(next, MAX_CSV_RUNNER_OUTPUT_BYTES);
			}
			return next.toString('utf8');
		};

		const result = await workspace.sandbox.executeCommand('node', [KNOWLEDGE_CSV_RUNNER_PATH], {
			cwd: workspace.knowledgeRoot,
			timeout: KNOWLEDGE_CSV_RUNNER_TIMEOUT_MS,
			env: {
				N8N_KNOWLEDGE_CSV_INPUT_B64: encodedPayload,
			},
			onStdout: (chunk: string) => {
				stdoutFromCallback = true;
				stdout = append(stdout, chunk);
			},
			onStderr: (chunk: string) => {
				stderrFromCallback = true;
				stderr = append(stderr, chunk);
			},
		});

		if (!stdoutFromCallback && result.stdout) {
			stdout = append('', result.stdout);
		}
		if (!stderrFromCallback && result.stderr) {
			stderr = append('', result.stderr);
		}

		if (result.exitCode !== 0) {
			throw new Error(stderr.trim() || stdout.trim() || 'CSV sandbox runner failed');
		}

		let parsed: CsvRunnerResponse;
		try {
			parsed = JSON.parse(stdout) as CsvRunnerResponse;
		} catch {
			throw new Error('CSV sandbox runner returned invalid JSON');
		}

		if (!parsed.ok || parsed.result === undefined) {
			throw new Error('CSV sandbox runner returned invalid JSON');
		}

		return parsed.result;
	}
}

function truncateBufferToUtf8String(buffer: Buffer, maxBytes: number): string {
	for (let end = maxBytes; end >= 0; end--) {
		const output = buffer.subarray(0, end).toString('utf8');
		if (Buffer.byteLength(output) <= maxBytes) return output;
	}

	return '';
}
