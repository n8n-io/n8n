import type { AgentSchema, MemorySchema } from '@n8n/agents';
import type prettier from 'prettier';

// All supported memory backends should be declared here
export const MemoryImportMap: Record<
	string,
	'no-import' | { importName: string; source: '@n8n/agents' | '@n8n/agents-utils' }
> = {
	n8n: { importName: 'N8nMemory', source: '@n8n/agents-utils' },
	sqlite: { importName: 'SqliteMemory', source: '@n8n/agents' },
	postgres: { importName: 'PostgresMemory', source: '@n8n/agents' },
	memory: 'no-import',
};

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

/**
 * Serialize a connection param value to a TypeScript object literal source string.
 * Handles primitives, nested objects and CredentialConfig refs.
 */
function serializeParam(value: unknown): string {
	if (value === null || value === undefined) return 'null';
	if (typeof value === 'string') return `'${escapeSingleQuote(value)}'`;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (typeof value === 'object' && value !== null) {
		const entries = Object.entries(value).filter(([, v]) => v !== undefined);
		if (entries.length === 0) return '{}';
		const props = entries.map(([k, v]) => `${k}: ${serializeParam(v)}`);
		return `{ ${props.join(', ')} }`;
	}
	throw new Error(`Invalid param value: ${JSON.stringify(value)}`);
}

/**
 * Build the storage backend expression (e.g. `new N8nMemory()`) from the
 * memory schema descriptor. Returns null for in-process / unknown backends.
 */
function storageExpression(memory: MemorySchema): {
	expr: string | null;
	constructorName: string;
} {
	const constructorParams = memory.connectionParams ? serializeParam(memory.connectionParams) : '';
	const result: {
		expr: string | null;
		constructorName: string;
	} = {
		expr: `new ${memory.constructorName}(${constructorParams})`,
		constructorName: memory.constructorName,
	};
	if (memory.name === 'memory') {
		// in-process memory by default, don't need to construct it
		result.expr = null;
	}
	return result;
}

/** Build the full `.memory(new Memory()...)` chain from the memory schema. */
function buildMemoryChain(memory: MemorySchema): {
	chain: string;
	constructorName: string;
} {
	const storage = storageExpression(memory);
	const memParts: string[] = ['new Memory()'];

	if (storage.expr) {
		memParts.push(`.storage(${storage.expr})`);
	}

	memParts.push(`.lastMessages(${memory.lastMessages ?? 10})`);

	if (memory.semanticRecall) {
		const sr = memory.semanticRecall as {
			topK: number;
			scope: 'thread' | 'resource' | null;
			messageRange: { before: number; after: number } | null;
			embedder: string | null;
		};
		const props: string[] = [`topK: ${sr.topK}`];
		if (sr.embedder) props.push(`embedder: '${escapeSingleQuote(sr.embedder)}'`);
		if (sr.messageRange)
			props.push(
				`messageRange: { before: ${sr.messageRange.before}, after: ${sr.messageRange.after} }`,
			);
		if (sr.scope) props.push(`scope: '${sr.scope}'`);
		memParts.push(`.semanticRecall({ ${props.join(', ')} })`);
	}

	if (memory.workingMemory) {
		const wm = memory.workingMemory as {
			type: 'structured' | 'freeform';
			scope: 'resource' | 'thread';
			schemaSource: string | null;
			template?: string;
		};
		if (wm.type === 'freeform' && wm.template) {
			memParts.push(`.freeform(\`${escapeTemplateLiteral(wm.template)}\`)`);
		} else if (wm.type === 'structured') {
			if (wm.schemaSource) {
				memParts.push(`.structured(${wm.schemaSource})`);
			} else {
				// Schema source not available — emit a placeholder the user can fill in
				memParts.push('.structured(/* z.object({ ... }) */)');
			}
		}
		if (wm.scope !== 'resource') {
			// 'resource' is the default — only emit .scope() when it differs
			memParts.push(`.scope('${wm.scope}')`);
		}
	}

	if (memory.titleGeneration !== null) {
		const tg = memory.titleGeneration as { model?: string; instructions?: string } | null;
		const hasProps = tg && (tg.model !== undefined || tg.instructions !== undefined);
		if (hasProps && tg) {
			const props: string[] = [];
			if (tg.model) props.push(`model: '${escapeSingleQuote(tg.model)}'`);
			if (tg.instructions)
				props.push(`instructions: \`${escapeTemplateLiteral(tg.instructions)}\``);
			memParts.push(`.titleGeneration({ ${props.join(', ')} })`);
		} else {
			memParts.push('.titleGeneration(true)');
		}
	}

	return { chain: memParts.join(''), ...storage };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

interface GenerateAgentCodeOptions {
	formatCode?: boolean;
}

export async function generateAgentCode(
	schema: AgentSchema,
	agentName: string,
	options?: GenerateAgentCodeOptions,
): Promise<string> {
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
		const mc = buildMemoryChain(memory);
		parts.push(`.memory(${mc.chain})`);
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
	const agentsUtilsImports: Set<string> = new Set();
	if (tools.some((t) => t.editable)) agentImports.add('Tool');
	if (memory) agentImports.add('Memory');

	if (memory?.name) {
		const memoryImport = MemoryImportMap[memory.name];
		if (!memoryImport) {
			throw new Error(`Unknown memory name: ${memory.name}`);
		}
		if (memoryImport !== 'no-import') {
			if (memoryImport.source === '@n8n/agents') {
				agentImports.add(memoryImport.importName);
			} else if (memoryImport.source === '@n8n/agents-utils') {
				agentsUtilsImports.add(memoryImport.importName);
			}
		}
	}
	if (mcp && mcp.length > 0) agentImports.add('McpClient');
	if (evaluations.length > 0) agentImports.add('Eval');

	const toolsNeedZod = tools.some((t) => {
		const inputHasZod = t.inputSchemaSource?.includes('z.') === true;
		const outputHasZod = t.outputSchemaSource?.includes('z.') === true;
		return inputHasZod || outputHasZod;
	});
	const structuredOutputNeedsZod = structuredOutput.schemaSource?.includes('z.') ?? false;
	const structuredWorkingMemoryNeedsZod =
		memory?.workingMemory?.type === 'structured' &&
		!!(memory.workingMemory as { schemaSource?: string | null }).schemaSource;
	const needsZod = toolsNeedZod || structuredOutputNeedsZod || structuredWorkingMemoryNeedsZod;

	let imports = `import { ${Array.from(agentImports).sort().join(', ')} } from '@n8n/agents';`;

	if (needsWorkflowTool) agentsUtilsImports.add('WorkflowTool');
	if (agentsUtilsImports.size > 0) {
		imports += `\nimport { ${Array.from(agentsUtilsImports).sort().join(', ')} } from '@n8n/agents-utils';`;
	}
	if (needsZod) imports += "\nimport { z } from 'zod';";

	const raw = `${imports}\n\n${parts.join('')};\n`;
	return options?.formatCode ? await formatCode(raw) : raw;
}
