import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import { isRecord } from '@n8n/utils/is-record';
import { AgentSourceArtifactV1Schema, type AgentSourceArtifactV1 } from '@n8n/workflow-sdk/agent';

import type { InstanceAiContext } from '../../types';
import { escapeSingleQuotes, runInSandbox } from '../../workspace/sandbox-fs';
import { joinWorkspacePath } from '../../workspace/workspace-paths';

export type AgentSourceCompiler = 'agent-json' | 'agent-source-tsx';

export type AgentSourceCompileFailureReason =
	| 'agent_json_parse_failed'
	| 'agent_source_unsupported_extension'
	| 'agent_source_sandbox_unavailable'
	| 'agent_source_sandbox_failed'
	| 'agent_source_build_failed'
	| 'agent_source_artifact_invalid';

export type AgentSourceCompileResult =
	| {
			success: true;
			compiler: 'agent-source-tsx';
			artifact: AgentSourceArtifactV1;
	  }
	| {
			success: true;
			compiler: 'agent-json';
			json: unknown;
	  }
	| {
			success: false;
			reason: AgentSourceCompileFailureReason;
			stage: 'source' | 'compile' | 'artifact';
			editable: boolean;
			errors: string[];
			summary: string;
	  };

interface SandboxAgentBuildOutput {
	success: boolean;
	artifact?: unknown;
	errors: string[];
}

function isTypeScriptAgentSource(filePath: string): boolean {
	const normalized = filePath.toLowerCase();
	return normalized.endsWith('.ts') || normalized.endsWith('.tsx');
}

function isJsonAgentSource(filePath: string): boolean {
	return filePath.toLowerCase().endsWith('.json');
}

function parseErrors(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((error): error is string => typeof error === 'string');
}

function parseSandboxOutput(stdout: string): SandboxAgentBuildOutput | undefined {
	const lastJsonLine = stdout
		.trim()
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.pop();
	if (!lastJsonLine) return undefined;

	let parsed: unknown;
	try {
		parsed = JSON.parse(lastJsonLine);
	} catch {
		return undefined;
	}

	if (!isRecord(parsed) || typeof parsed.success !== 'boolean') return undefined;
	return {
		success: parsed.success,
		artifact: parsed.artifact,
		errors: parseErrors(parsed.errors),
	};
}

function parseJsonSource(source: string): AgentSourceCompileResult {
	try {
		return { success: true, compiler: 'agent-json', json: JSON.parse(source) };
	} catch (error) {
		return {
			success: false,
			reason: 'agent_json_parse_failed',
			stage: 'source',
			editable: true,
			errors: [
				`Failed to parse agent JSON: ${error instanceof Error ? error.message : 'Invalid JSON'}`,
			],
			summary: 'Agent JSON source did not parse.',
		};
	}
}

async function compileTypeScriptAgentSource(
	context: InstanceAiContext,
	filePath: string,
): Promise<AgentSourceCompileResult> {
	if (!context.workspace) {
		return {
			success: false,
			reason: 'agent_source_sandbox_unavailable',
			stage: 'source',
			editable: false,
			errors: ['Runtime workspace with sandbox support is required for TypeScript agent builds.'],
			summary: 'Agent source could not be built because the sandbox is unavailable.',
		};
	}

	let buildResult: Awaited<ReturnType<typeof runInSandbox>>;
	try {
		const root = await getWorkspaceRoot(context.workspace);
		const sandboxFilePath = joinWorkspacePath(root, filePath);
		buildResult = await runInSandbox(
			context.workspace,
			`node --import tsx build-agent.mjs '${escapeSingleQuotes(sandboxFilePath)}'`,
			root,
		);
	} catch (error) {
		return {
			success: false,
			reason: 'agent_source_sandbox_unavailable',
			stage: 'source',
			editable: false,
			errors: [error instanceof Error ? error.message : String(error)],
			summary: 'Agent source could not be built because the sandbox is unavailable.',
		};
	}

	const output = parseSandboxOutput(buildResult.stdout);
	if (!output) {
		const detail = buildResult.stderr.trim() || buildResult.stdout.trim() || 'No output';
		return {
			success: false,
			reason: 'agent_source_sandbox_failed',
			stage: 'compile',
			editable: true,
			errors: [
				`Failed to execute agent file in sandbox (exit code ${buildResult.exitCode}).`,
				detail,
			],
			summary: 'Agent source did not produce parseable sandbox output.',
		};
	}

	if (!output.success) {
		return {
			success: false,
			reason: 'agent_source_build_failed',
			stage: 'compile',
			editable: true,
			errors: output.errors.length > 0 ? output.errors : ['Unknown agent source build error'],
			summary: 'Agent source failed during sandbox execution.',
		};
	}

	const artifact = AgentSourceArtifactV1Schema.safeParse(output.artifact);
	if (!artifact.success) {
		return {
			success: false,
			reason: 'agent_source_artifact_invalid',
			stage: 'artifact',
			editable: true,
			errors: artifact.error.issues.map((issue) => {
				const path = issue.path.join('.') || '(root)';
				return `${path}: ${issue.message}`;
			}),
			summary: 'Agent source emitted an invalid or unsupported artifact.',
		};
	}

	return { success: true, compiler: 'agent-source-tsx', artifact: artifact.data };
}

export async function compileAgentSource(
	context: InstanceAiContext,
	filePath: string,
	source: string,
): Promise<AgentSourceCompileResult> {
	if (isJsonAgentSource(filePath)) return parseJsonSource(source);
	if (isTypeScriptAgentSource(filePath))
		return await compileTypeScriptAgentSource(context, filePath);

	return {
		success: false,
		reason: 'agent_source_unsupported_extension',
		stage: 'source',
		editable: true,
		errors: [
			'Agent source must be a TypeScript SDK file (.ts or .tsx) or Agent JSON file (.json).',
		],
		summary: 'Agent source file extension is unsupported.',
	};
}
