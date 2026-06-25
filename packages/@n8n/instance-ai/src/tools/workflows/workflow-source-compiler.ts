import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import { isRecord } from '@n8n/utils';
import { validateWorkflow, type WorkflowJSON } from '@n8n/workflow-sdk';

import { detectArrayInputCollapse } from './detect-array-input-collapse';
import { collectValidationIssues, type ValidationWarning } from './workflow-validation-warnings';
import type { InstanceAiContext } from '../../types';
import { escapeSingleQuotes, runInSandbox } from '../../workspace/sandbox-fs';
import { joinWorkspacePath } from '../../workspace/workspace-paths';

export type WorkflowSourceCompiler = 'workflow-json' | 'sandbox-tsx';

export type WorkflowSourceCompileFailureReason =
	| 'workflow_json_parse_failed'
	| 'workflow_json_invalid'
	| 'workflow_source_unsupported_extension'
	| 'workflow_source_sandbox_unavailable'
	| 'workflow_source_sandbox_failed'
	| 'workflow_source_build_failed';

export type WorkflowSourceCompileResult =
	| {
			success: true;
			workflow: WorkflowJSON;
			declaredOutputFixtures?: NonNullable<WorkflowJSON['pinData']>;
			warnings: ValidationWarning[];
			compiler: WorkflowSourceCompiler;
	  }
	| {
			success: false;
			errors: string[];
			reason: WorkflowSourceCompileFailureReason;
			editable: boolean;
			summary: string;
	  };

interface SandboxWorkflowBuildOutput {
	success: boolean;
	workflow?: WorkflowJSON;
	declaredOutputFixtures?: NonNullable<WorkflowJSON['pinData']>;
	warnings?: ValidationWarning[];
	errors?: string[];
}

function isWorkflowJson(value: unknown): value is WorkflowJSON {
	return (
		isRecord(value) &&
		typeof value.name === 'string' &&
		Array.isArray(value.nodes) &&
		isRecord(value.connections)
	);
}

function isTypeScriptWorkflowSource(filePath: string): boolean {
	const normalized = filePath.toLowerCase();
	return normalized.endsWith('.ts') || normalized.endsWith('.tsx');
}

export function isWorkflowJsonSourceFile(filePath: string): boolean {
	return filePath.toLowerCase().endsWith('.json');
}

function normalizeWorkflowNodeParameters(json: WorkflowJSON): void {
	for (const node of json.nodes ?? []) {
		if (!isRecord(node.parameters)) {
			node.parameters = {};
		}
	}
}

function validateCompiledWorkflow(
	json: WorkflowJSON,
	context: InstanceAiContext,
	compilerWarnings: ValidationWarning[] = [],
): ValidationWarning[] {
	normalizeWorkflowNodeParameters(json);

	const schemaValidation = validateWorkflow(json, {
		nodeTypesProvider: context.nodeTypesProvider,
		strictMode: true,
	});

	const warnings = [...compilerWarnings];
	collectValidationIssues(schemaValidation.errors, warnings);
	collectValidationIssues(schemaValidation.warnings, warnings);
	warnings.push(...detectArrayInputCollapse(json));
	return warnings;
}

function parseWorkflowJsonSource(source: string): WorkflowSourceCompileResult {
	let parsed: unknown;
	try {
		parsed = JSON.parse(source);
	} catch (error) {
		return {
			success: false,
			reason: 'workflow_json_parse_failed',
			editable: true,
			errors: [
				`Failed to parse workflow JSON: ${error instanceof Error ? error.message : 'Invalid JSON'}`,
			],
			summary: 'Workflow JSON source did not parse.',
		};
	}

	if (!isWorkflowJson(parsed)) {
		return {
			success: false,
			reason: 'workflow_json_invalid',
			editable: true,
			errors: ['Workflow JSON must include name, nodes, and connections.'],
			summary: 'Workflow JSON source is missing required workflow fields.',
		};
	}

	return { success: true, workflow: parsed, warnings: [], compiler: 'workflow-json' };
}

function parseSandboxWarnings(value: unknown): ValidationWarning[] {
	if (!Array.isArray(value)) return [];

	const warnings: ValidationWarning[] = [];
	for (const warning of value) {
		if (!isRecord(warning)) continue;
		if (typeof warning.code !== 'string' || typeof warning.message !== 'string') continue;

		warnings.push({
			code: warning.code,
			message: warning.message,
			nodeName: typeof warning.nodeName === 'string' ? warning.nodeName : undefined,
		});
	}

	return warnings;
}

function parseSandboxErrors(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((error): error is string => typeof error === 'string');
}

function isPinDataItem(
	value: unknown,
): value is NonNullable<WorkflowJSON['pinData']>[string][number] {
	return isRecord(value);
}

function isPinDataItems(value: unknown): value is NonNullable<WorkflowJSON['pinData']>[string] {
	return Array.isArray(value) && value.every(isPinDataItem);
}

function parseSandboxDeclaredOutputFixtures(
	value: unknown,
): NonNullable<WorkflowJSON['pinData']> | undefined {
	if (!isRecord(value)) return undefined;

	const fixtures: NonNullable<WorkflowJSON['pinData']> = {};
	for (const [nodeName, items] of Object.entries(value)) {
		if (isPinDataItems(items)) {
			fixtures[nodeName] = items;
		}
	}

	return Object.keys(fixtures).length > 0 ? fixtures : undefined;
}

function parseSandboxBuildOutput(stdout: string): SandboxWorkflowBuildOutput | undefined {
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
		workflow: isWorkflowJson(parsed.workflow) ? parsed.workflow : undefined,
		declaredOutputFixtures: parseSandboxDeclaredOutputFixtures(parsed.declaredOutputFixtures),
		warnings: parseSandboxWarnings(parsed.warnings),
		errors: parseSandboxErrors(parsed.errors),
	};
}

function enhanceBuildErrors(errors: string[]): string[] {
	const needsTemplateGuidance = errors.some((error) => {
		const normalized = error.toLowerCase();
		return (
			normalized.includes('unterminated template') ||
			normalized.includes('unexpected end of input') ||
			normalized.includes('unexpected identifier') ||
			normalized.includes('unexpected token') ||
			normalized.includes('expected unicode escape') ||
			normalized.includes('missing ) after argument list')
		);
	});

	if (!needsTemplateGuidance) return errors;

	return [
		...errors,
		'Code node guidance: for large HTML, write it to a separate file (e.g., chunks/page.html), then in your SDK TypeScript use readFileSync + JSON.stringify to safely embed it. NEVER embed large HTML directly in jsCode. See the web_app_pattern in your instructions.',
	];
}

async function compileTypeScriptWorkflowSource(
	context: InstanceAiContext,
	filePath: string,
): Promise<WorkflowSourceCompileResult> {
	if (!context.workspace) {
		return {
			success: false,
			reason: 'workflow_source_sandbox_unavailable',
			editable: false,
			errors: [
				'Runtime workspace with sandbox support is required for TypeScript workflow builds.',
			],
			summary: 'Workflow source could not be built because the sandbox is unavailable.',
		};
	}

	let root: string;
	let buildResult: Awaited<ReturnType<typeof runInSandbox>>;
	try {
		root = await getWorkspaceRoot(context.workspace);
		const sandboxFilePath = joinWorkspacePath(root, filePath);
		buildResult = await runInSandbox(
			context.workspace,
			`node --import tsx build.mjs '${escapeSingleQuotes(sandboxFilePath)}'`,
			root,
		);
	} catch (error) {
		return {
			success: false,
			reason: 'workflow_source_sandbox_unavailable',
			editable: false,
			errors: [error instanceof Error ? error.message : String(error)],
			summary: 'Workflow source could not be built because the sandbox is unavailable.',
		};
	}

	const buildOutput = parseSandboxBuildOutput(buildResult.stdout);
	if (!buildOutput) {
		const detail = buildResult.stderr.trim() || buildResult.stdout.trim() || 'No output';
		return {
			success: false,
			reason: 'workflow_source_sandbox_failed',
			editable: true,
			errors: [
				`Failed to execute workflow file in sandbox (exit code ${buildResult.exitCode}).`,
				detail,
			],
			summary: 'Workflow source did not produce parseable sandbox output.',
		};
	}

	if (!buildOutput.success || !buildOutput.workflow) {
		return {
			success: false,
			reason: 'workflow_source_build_failed',
			editable: true,
			errors: enhanceBuildErrors(buildOutput.errors ?? ['Unknown workflow build error']),
			summary: 'Workflow source failed during sandbox execution.',
		};
	}

	return {
		success: true,
		workflow: buildOutput.workflow,
		declaredOutputFixtures: buildOutput.declaredOutputFixtures,
		warnings: buildOutput.warnings ?? [],
		compiler: 'sandbox-tsx',
	};
}

export async function compileWorkflowSource(
	context: InstanceAiContext,
	filePath: string,
	source: string,
): Promise<WorkflowSourceCompileResult> {
	let result: WorkflowSourceCompileResult;
	if (isWorkflowJsonSourceFile(filePath)) {
		result = parseWorkflowJsonSource(source);
	} else if (isTypeScriptWorkflowSource(filePath)) {
		result = await compileTypeScriptWorkflowSource(context, filePath);
	} else {
		result = {
			success: false,
			reason: 'workflow_source_unsupported_extension',
			editable: true,
			errors: [
				'Workflow source file must be a TypeScript SDK file (.ts or .tsx) or WorkflowJSON file (.json).',
			],
			summary: 'Workflow source file extension is unsupported.',
		};
	}

	if (!result.success) return result;

	return {
		...result,
		warnings: validateCompiledWorkflow(result.workflow, context, result.warnings),
	};
}
