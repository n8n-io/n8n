import type prettier from 'prettier';

import type {
	AgentSchema,
	EvalSchema,
	GuardrailSchema,
	MemorySchema,
	ToolSchema,
} from '../types/sdk/schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeTemplateLiteral(str: string): string {
	return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

function escapeSingleQuote(str: string): string {
	return JSON.stringify(str).slice(1, -1).replace(/'/g, "\\'");
}

let prettierInstance: typeof prettier | undefined;

/**
 * Format TypeScript source code using Prettier.
 * Loaded lazily to avoid startup cost when not generating code.
 */
async function formatCode(code: string): Promise<string> {
	prettierInstance ??= await import('prettier');
	return await prettierInstance.format(code, {
		parser: 'typescript',
		singleQuote: true,
		useTabs: true,
		trailingComma: 'all',
		printWidth: 100,
	});
}

/**
 * Compile-time exhaustive check. If a new property is added to AgentSchema
 * but not handled in generateAgentCode(), TypeScript will report an error
 * here because the destructured rest object won't be empty.
 */
function assertAllHandled(_: Record<string, never>): void {
	// intentionally empty — this is a compile-time-only check
}

// ---------------------------------------------------------------------------
// Section builders — each returns `.method(...)` chain fragments
// ---------------------------------------------------------------------------

function modelParts(model: AgentSchema['model']): string[] {
	if (model.provider && model.name) {
		return [`.model('${escapeSingleQuote(model.provider)}', '${escapeSingleQuote(model.name)}')`];
	}
	if (model.name) {
		return [`.model('${escapeSingleQuote(model.name)}')`];
	}
	return [];
}

function toolPart(tool: ToolSchema): { part: string; usesWorkflowTool: boolean } {
	if (!tool.editable) {
		return {
			part: `.tool(new WorkflowTool('${escapeSingleQuote(tool.name)}'))`,
			usesWorkflowTool: true,
		};
	}
	const parts = [`new Tool('${escapeSingleQuote(tool.name)}')`];
	parts.push(`.description('${escapeSingleQuote(tool.description)}')`);
	if (tool.inputSchemaSource) parts.push(`.input(${tool.inputSchemaSource})`);
	if (tool.outputSchemaSource) parts.push(`.output(${tool.outputSchemaSource})`);
	if (tool.suspendSchemaSource) parts.push(`.suspend(${tool.suspendSchemaSource})`);
	if (tool.resumeSchemaSource) parts.push(`.resume(${tool.resumeSchemaSource})`);
	if (tool.handlerSource) parts.push(`.handler(${tool.handlerSource})`);
	if (tool.toMessageSource) parts.push(`.toMessage(${tool.toMessageSource})`);
	if (tool.requireApproval) parts.push('.requireApproval()');
	if (tool.needsApprovalFnSource) parts.push(`.needsApprovalFn(${tool.needsApprovalFnSource})`);
	return { part: `.tool(${parts.join('')})`, usesWorkflowTool: false };
}

function evalPart(ev: EvalSchema): string {
	const parts = [`new Eval('${escapeSingleQuote(ev.name)}')`];
	if (ev.description) parts.push(`.description('${escapeSingleQuote(ev.description)}')`);
	if (ev.modelId) parts.push(`.model('${escapeSingleQuote(ev.modelId)}')`);
	if (ev.credentialName) parts.push(`.credential('${escapeSingleQuote(ev.credentialName)}')`);
	if (ev.handlerSource) {
		parts.push(ev.type === 'check' ? `.check(${ev.handlerSource})` : `.judge(${ev.handlerSource})`);
	}
	return `.eval(${parts.join('')})`;
}

function guardrailPart(g: GuardrailSchema): string {
	const method = g.position === 'input' ? 'inputGuardrail' : 'outputGuardrail';
	return `.${method}(${g.source})`;
}

function memoryPart(memory: MemorySchema): string {
	if (memory.source) {
		return `.memory(${memory.source})`;
	}
	return `.memory(new Memory().lastMessages(${memory.lastMessages ?? 10}))`;
}

function thinkingPart(thinking: NonNullable<AgentSchema['config']['thinking']>): string {
	const props: string[] = [];
	if (thinking.budgetTokens !== undefined) props.push(`budgetTokens: ${thinking.budgetTokens}`);
	if (thinking.reasoningEffort) props.push(`reasoningEffort: '${thinking.reasoningEffort}'`);
	if (props.length > 0) {
		return `.thinking('${thinking.provider}', { ${props.join(', ')} })`;
	}
	return `.thinking('${thinking.provider}')`;
}

function buildImports(schema: AgentSchema, needsWorkflowTool: boolean): string {
	const agentImports = new Set<string>(['Agent']);
	if (schema.tools.some((t) => t.editable)) agentImports.add('Tool');
	if (needsWorkflowTool) agentImports.add('WorkflowTool');
	if (schema.memory) agentImports.add('Memory');
	if (schema.mcp && schema.mcp.length > 0) agentImports.add('McpClient');
	if (schema.evaluations.length > 0) agentImports.add('Eval');

	const toolsNeedZod = schema.tools.some(
		(t) =>
			(t.inputSchemaSource?.includes('z.') ?? false) ||
			(t.outputSchemaSource?.includes('z.') ?? false),
	);
	const structuredOutputNeedsZod =
		schema.config.structuredOutput.schemaSource?.includes('z.') ?? false;

	let imports = `import { ${Array.from(agentImports).sort().join(', ')} } from '@n8n/agents';`;
	if (toolsNeedZod || structuredOutputNeedsZod) imports += "\nimport { z } from 'zod';";
	return imports;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateAgentCode(schema: AgentSchema, agentName: string): Promise<string> {
	// Destructure every top-level property. If a new property is added to
	// AgentSchema, TypeScript will error on assertAllHandled below until
	// you handle it here AND add it to the destructure.
	const {
		model,
		credential,
		instructions,
		description: _description, // entity-level, not in code
		tools,
		providerTools,
		memory,
		evaluations,
		guardrails,
		mcp,
		telemetry,
		checkpoint,
		config,
		...rest
	} = schema;

	// If this errors, you added a property to AgentSchema but didn't
	// destructure it above. Add it to the destructure and handle it below.
	assertAllHandled(rest);

	const { thinking, toolCallConcurrency, requireToolApproval, structuredOutput, ...configRest } =
		config;
	assertAllHandled(configRest);

	// No manual indentation — Prettier formats at the end.
	const parts: string[] = [];
	let needsWorkflowTool = false;

	parts.push(`export default new Agent('${escapeSingleQuote(agentName)}')`);
	parts.push(...modelParts(model));

	if (credential) parts.push(`.credential('${escapeSingleQuote(credential)}')`);
	if (instructions) parts.push(`.instructions(\`${escapeTemplateLiteral(instructions)}\`)`);

	for (const tool of tools) {
		const { part, usesWorkflowTool } = toolPart(tool);
		if (usesWorkflowTool) needsWorkflowTool = true;
		parts.push(part);
	}

	for (const pt of providerTools) {
		parts.push(`.providerTool(${pt.source})`);
	}

	if (memory) parts.push(memoryPart(memory));

	for (const ev of evaluations) {
		parts.push(evalPart(ev));
	}

	for (const g of guardrails) {
		parts.push(guardrailPart(g));
	}

	if (mcp && mcp.length > 0) {
		const configs = mcp.map((s) => s.configSource).join(', ');
		parts.push(`.mcp(new McpClient([${configs}]))`);
	}

	if (telemetry) parts.push(`.telemetry(${telemetry.source})`);
	if (checkpoint) parts.push(`.checkpoint('${escapeSingleQuote(checkpoint)}')`);
	if (thinking) parts.push(thinkingPart(thinking));
	if (toolCallConcurrency) parts.push(`.toolCallConcurrency(${toolCallConcurrency})`);
	if (requireToolApproval) parts.push('.requireToolApproval()');
	if (structuredOutput.enabled && structuredOutput.schemaSource) {
		parts.push(`.structuredOutput(${structuredOutput.schemaSource})`);
	}

	const imports = buildImports(schema, needsWorkflowTool);
	const raw = `${imports}\n\n${parts.join('')};\n`;
	return await formatCode(raw);
}
