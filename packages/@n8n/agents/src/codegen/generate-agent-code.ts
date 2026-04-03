import type prettier from 'prettier';

import type { AgentSchema } from '../types/sdk/schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeTemplateLiteral(str: string): string {
	return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

function escapeSingleQuote(str: string): string {
	return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
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

	// No manual indentation — Prettier formats at the end.
	const parts: string[] = [];
	let needsWorkflowTool = false;
	parts.push(`export default new Agent('${escapeSingleQuote(agentName)}')`);

	if (model.provider && model.name) {
		parts.push(
			`.model('${escapeSingleQuote(model.provider)}', '${escapeSingleQuote(model.name)}')`,
		);
	} else if (model.name) {
		parts.push(`.model('${escapeSingleQuote(model.name)}')`);
	}

	if (credential) {
		parts.push(`.credential('${escapeSingleQuote(credential)}')`);
	}

	if (instructions) {
		parts.push(`.instructions(\`${escapeTemplateLiteral(instructions)}\`)`);
	}

	for (const tool of tools) {
		if (!tool.editable) {
			needsWorkflowTool = true;
			parts.push(`.tool(new WorkflowTool('${escapeSingleQuote(tool.name)}'))`);
			continue;
		}
		const toolParts = [`new Tool('${escapeSingleQuote(tool.name)}')`];
		toolParts.push(`.description('${escapeSingleQuote(tool.description)}')`);
		if (tool.inputSchemaSource) toolParts.push(`.input(${tool.inputSchemaSource})`);
		if (tool.outputSchemaSource) toolParts.push(`.output(${tool.outputSchemaSource})`);
		if (tool.suspendSchemaSource) toolParts.push(`.suspend(${tool.suspendSchemaSource})`);
		if (tool.resumeSchemaSource) toolParts.push(`.resume(${tool.resumeSchemaSource})`);
		if (tool.handlerSource) toolParts.push(`.handler(${tool.handlerSource})`);
		if (tool.toMessageSource) toolParts.push(`.toMessage(${tool.toMessageSource})`);
		if (tool.requireApproval) toolParts.push('.requireApproval()');
		if (tool.needsApprovalFnSource)
			toolParts.push(`.needsApprovalFn(${tool.needsApprovalFnSource})`);
		parts.push(`.tool(${toolParts.join('')})`);
	}

	for (const pt of providerTools) {
		parts.push(`.providerTool(${pt.source})`);
	}

	if (memory) {
		if (memory.source) {
			parts.push(`.memory(${memory.source})`);
		} else {
			parts.push(`.memory(new Memory().lastMessages(${memory.lastMessages ?? 10}))`);
		}
	}

	for (const ev of evaluations) {
		const evalParts = [`new Eval('${escapeSingleQuote(ev.name)}')`];
		if (ev.description) evalParts.push(`.description('${escapeSingleQuote(ev.description)}')`);
		if (ev.modelId) evalParts.push(`.model('${escapeSingleQuote(ev.modelId)}')`);
		if (ev.credentialName) evalParts.push(`.credential('${escapeSingleQuote(ev.credentialName)}')`);
		if (ev.handlerSource) {
			evalParts.push(
				ev.type === 'check' ? `.check(${ev.handlerSource})` : `.judge(${ev.handlerSource})`,
			);
		}
		parts.push(`.eval(${evalParts.join('')})`);
	}

	for (const g of guardrails) {
		const method = g.position === 'input' ? 'inputGuardrail' : 'outputGuardrail';
		parts.push(`.${method}(${g.source})`);
	}

	if (mcp && mcp.length > 0) {
		const configs = mcp.map((s) => s.configSource).join(', ');
		parts.push(`.mcp(new McpClient([${configs}]))`);
	}

	if (telemetry) {
		parts.push(`.telemetry(${telemetry.source})`);
	}

	if (checkpoint) {
		parts.push(`.checkpoint('${escapeSingleQuote(checkpoint)}')`);
	}

	const { thinking, toolCallConcurrency, requireToolApproval, structuredOutput, ...configRest } =
		config;
	assertAllHandled(configRest);

	if (thinking) {
		const props: string[] = [];
		if (thinking.budgetTokens !== undefined) props.push(`budgetTokens: ${thinking.budgetTokens}`);
		if (thinking.reasoningEffort) props.push(`reasoningEffort: '${thinking.reasoningEffort}'`);
		if (props.length > 0) {
			parts.push(`.thinking('${thinking.provider}', { ${props.join(', ')} })`);
		} else {
			parts.push(`.thinking('${thinking.provider}')`);
		}
	}

	if (toolCallConcurrency) {
		parts.push(`.toolCallConcurrency(${toolCallConcurrency})`);
	}

	if (requireToolApproval) {
		parts.push('.requireToolApproval()');
	}

	if (structuredOutput.enabled && structuredOutput.schemaSource) {
		parts.push(`.structuredOutput(${structuredOutput.schemaSource})`);
	}

	// Build imports
	const agentImports = new Set<string>(['Agent']);
	if (tools.some((t) => t.editable)) agentImports.add('Tool');
	if (needsWorkflowTool) agentImports.add('WorkflowTool');
	if (memory) agentImports.add('Memory');
	if (mcp && mcp.length > 0) agentImports.add('McpClient');
	if (evaluations.length > 0) agentImports.add('Eval');

	const toolsNeedZod = tools.some((t) => {
		const inputHasZod = t.inputSchemaSource?.includes('z.') === true;
		const outputHasZod = t.outputSchemaSource?.includes('z.') === true;
		return inputHasZod || outputHasZod;
	});
	const structuredOutputNeedsZod = structuredOutput.schemaSource?.includes('z.') ?? false;
	const needsZod = toolsNeedZod || structuredOutputNeedsZod;

	let imports = `import { ${Array.from(agentImports).sort().join(', ')} } from '@n8n/agents';`;
	if (needsZod) imports += "\nimport { z } from 'zod';";

	const raw = `${imports}\n\n${parts.join('')};\n`;
	return await formatCode(raw);
}
