import { createAbortError, isAbortError } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import { isRecord } from '@n8n/utils/is-record';
import {
	validateWorkflow,
	workflow as workflowBuilder,
	type WorkflowJSON,
} from '@n8n/workflow-sdk';
import { normalizeNodeShape } from 'n8n-workflow';

import { buildCredentialHostIndex, resolveCredentialByUrl } from './credential-url-resolver';
import { detectArrayInputCollapse } from './detect-array-input-collapse';
import { detectPythonCodeConstraints } from './detect-python-code-constraints';
import { detectSlackBlocksShape } from './detect-slack-blocks-shape';
import { detectUnparseableOpenAiSchema } from './detect-unparseable-openai-schema';
import { detectWrongKindLocatorValues } from './detect-wrong-kind-locator';
import { collectValidationIssues, type ValidationWarning } from './workflow-validation-warnings';
import { traceSandboxOperation, sandboxFileBytes } from '../../tracing/sandbox-tracing';
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

export function isTypeScriptWorkflowSource(filePath: string): boolean {
	const normalized = filePath.toLowerCase();
	return normalized.endsWith('.ts') || normalized.endsWith('.tsx');
}

export function isWorkflowJsonSourceFile(filePath: string): boolean {
	return filePath.toLowerCase().endsWith('.json');
}

/**
 * Normalizes compiled workflow nodes for INode persistence via
 * {@link normalizeNodeShape}. Nested nulls (e.g. credential id) are preserved.
 */
function normalizeWorkflowNodes(json: WorkflowJSON): void {
	if (!json.nodes) return;
	json.nodes = json.nodes.map((node) => normalizeNodeShape(node));
}

function validateCompiledWorkflow(
	json: WorkflowJSON,
	context: InstanceAiContext,
	compilerWarnings: ValidationWarning[] = [],
): ValidationWarning[] {
	normalizeWorkflowNodes(json);

	const schemaValidation = validateWorkflow(json, {
		nodeTypesProvider: context.nodeTypesProvider,
		strictMode: true,
	});

	const warnings = [...compilerWarnings];
	collectValidationIssues(schemaValidation.errors, warnings);
	collectValidationIssues(schemaValidation.warnings, warnings);
	warnings.push(...detectArrayInputCollapse(json));
	warnings.push(...detectWrongKindLocatorValues(json, context.nodeTypesProvider));
	warnings.push(...detectUnparseableOpenAiSchema(json));
	warnings.push(...detectPythonCodeConstraints(json));
	warnings.push(...detectSlackBlocksShape(json));
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

	fillMissingNodePositions(parsed);

	return { success: true, workflow: parsed, warnings: [], compiler: 'workflow-json' };
}

/**
 * The SDK source path lays nodes out when the builder serializes, but hand-written JSON
 * never passes through the builder. A node without a position fails the save, so borrow
 * the builder's layout for the nodes that lack one and leave the rest of the JSON alone.
 * Every such node leaves here with a position, even when the layout has none to lend.
 */
function fillMissingNodePositions(json: WorkflowJSON): void {
	const needsPosition = (node: WorkflowJSON['nodes'][number]) =>
		!Array.isArray(node.position) ||
		node.position.length !== 2 ||
		!node.position.every((coordinate) => typeof coordinate === 'number');

	if (!json.nodes?.some(needsPosition)) return;

	// The builder treats any present position as explicit, so a malformed one such as
	// `[100]` survives the layout and would reach the save as `[100, undefined]`. Drop it
	// first. The declared type says `position` is always a valid pair, but this JSON is
	// written by hand, so it can be absent or malformed.
	const layoutNodes = json.nodes.map((node) => {
		if (!needsPosition(node)) return node;
		const { position: _malformed, ...withoutPosition } = node;
		return withoutPosition as WorkflowJSON['nodes'][number];
	});

	// A layout is a nicety, not the point: fall back to a row so the save never fails on a
	// missing position. The builder can throw on a workflow the save would still accept,
	// and it does not have to emit every node it was given.
	let laidOut: WorkflowJSON | undefined;
	try {
		laidOut = workflowBuilder.fromJSON({ ...json, nodes: layoutNodes }).toJSON();
	} catch {
		laidOut = undefined;
	}

	const positionsById = new Map<string, [number, number]>();
	const positionsByName = new Map<string, [number, number]>();
	for (const node of laidOut?.nodes ?? []) {
		if (needsPosition(node)) continue;
		if (node.id) positionsById.set(node.id, node.position);
		if (node.name) positionsByName.set(node.name, node.position);
	}

	json.nodes.forEach((node, index) => {
		if (!needsPosition(node)) return;
		const position =
			(node.id ? positionsById.get(node.id) : undefined) ??
			(node.name ? positionsByName.get(node.name) : undefined);
		node.position = position ? [position[0], position[1]] : [index * 200, 0];
	});
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
			severity:
				warning.severity === 'informational' ||
				warning.severity === 'warning' ||
				warning.severity === 'error'
					? warning.severity
					: undefined,
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
	abortSignal?: AbortSignal,
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
			{ cwd: root, abortSignal },
		);
	} catch (error) {
		// Preserve Stop/cancel so callers do not record a sandbox build failure.
		if (isAbortError(error)) throw error;
		if (abortSignal?.aborted) throw createAbortError(abortSignal.reason);
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

const HTTP_REQUEST_NODE_TYPE = 'n8n-nodes-base.httpRequest';

/**
 * Flag HTTP Request nodes that use a generic credential while a dedicated
 * predefined credential already exists for the target host. The host->credential
 * index is derived from the credential registry (no hardcoded service list);
 * ambiguous hosts surface the candidates instead of auto-picking.
 */
async function collectCredentialResolutionWarnings(
	json: WorkflowJSON,
	context: InstanceAiContext,
): Promise<ValidationWarning[]> {
	const hosts = await context.credentialService.listHttpCredentialHosts?.();
	if (!hosts?.length) return [];

	const index = buildCredentialHostIndex(hosts);
	const warnings: ValidationWarning[] = [];

	for (const node of json.nodes ?? []) {
		if (node.type !== HTTP_REQUEST_NODE_TYPE) continue;
		const params = node.parameters;
		if (!isRecord(params) || params.authentication !== 'genericCredentialType') continue;
		const url = typeof params.url === 'string' ? params.url : '';
		if (!url) continue;

		const resolution = resolveCredentialByUrl(url, index);
		if (resolution.status === 'match') {
			warnings.push({
				code: 'PREFER_PREDEFINED_CREDENTIAL',
				nodeName: node.name,
				message: `This request targets a service with a dedicated n8n credential ("${resolution.credentialType}"). Use authentication: "predefinedCredentialType" with nodeCredentialType: "${resolution.credentialType}" instead of a generic credential.`,
			});
		} else if (resolution.status === 'ambiguous') {
			warnings.push({
				code: 'PREFER_PREDEFINED_CREDENTIAL',
				nodeName: node.name,
				message: `This request targets a service with dedicated n8n credentials (${resolution.candidates.join(', ')}). Prefer authentication: "predefinedCredentialType" with the matching nodeCredentialType.`,
			});
		}
	}

	return warnings;
}

export async function compileWorkflowSource(
	context: InstanceAiContext,
	filePath: string,
	source: string,
	abortSignal?: AbortSignal,
): Promise<WorkflowSourceCompileResult> {
	return await traceSandboxOperation(
		'compile-workflow',
		{
			inputs: { path: filePath, bytes: sandboxFileBytes(source) },
			processResult: (result) =>
				result.success
					? {
							outputs: {
								success: true,
								compiler: result.compiler,
								warningCount: result.warnings.length,
							},
						}
					: {
							outputs: { success: false, reason: result.reason, errors: result.errors },
							error: result.summary,
						},
		},
		async () => {
			let result: WorkflowSourceCompileResult;
			if (isWorkflowJsonSourceFile(filePath)) {
				result = parseWorkflowJsonSource(source);
			} else if (isTypeScriptWorkflowSource(filePath)) {
				result = await compileTypeScriptWorkflowSource(context, filePath, abortSignal);
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

			const warnings = validateCompiledWorkflow(result.workflow, context, result.warnings);
			const credentialWarnings = await collectCredentialResolutionWarnings(
				result.workflow,
				context,
			);

			return {
				...result,
				warnings: [...warnings, ...credentialWarnings],
			};
		},
	);
}
