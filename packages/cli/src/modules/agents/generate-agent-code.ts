import type {
	AgentSchema,
	MemorySchema,
	EvalSchema,
	GuardrailSchema,
	ToolSchema,
} from '@n8n/agents';
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

function toolPart(tool: ToolSchema): {
	part: string;
	usesWorkflowTool: boolean;
	usesNodeTool: boolean;
} {
	const parts: string[] = [];
	let usesNodeTool = false;
	let usesWorkflowTool = false;
	if (!tool.editable && tool.metadata?.nodeTool === true) {
		const meta = tool.metadata as {
			nodeType: string;
			nodeTypeVersion: number;
			nodeParameters?: Record<string, unknown>;
			credentials?: Record<string, { id: string; name: string }>;
		};
		const { nodeType, nodeTypeVersion, nodeParameters = {}, credentials = {} } = meta;

		const schemaObj: Record<string, unknown> = { type: nodeType, version: nodeTypeVersion };
		if (Object.keys(nodeParameters).length > 0) schemaObj.parameters = nodeParameters;
		if (Object.keys(credentials).length > 0) schemaObj.credentials = credentials;

		parts.push(
			`new ToolFromNode('${escapeSingleQuote(tool.name)}', ${JSON.stringify(schemaObj, null, 2)})`,
		);
		usesNodeTool = true;
	} else if (!tool.editable && tool.metadata?.workflowTool === true) {
		parts.push(`new WorkflowTool('${escapeSingleQuote(tool.name)}')`);
		usesWorkflowTool = true;
	} else {
		parts.push(`new Tool('${escapeSingleQuote(tool.name)}')`);
	}

	parts.push(`.description('${escapeSingleQuote(tool.description)}')`);
	if (tool.inputSchemaSource) parts.push(`.input(${tool.inputSchemaSource})`);
	if (tool.outputSchemaSource) parts.push(`.output(${tool.outputSchemaSource})`);
	if (tool.suspendSchemaSource) parts.push(`.suspend(${tool.suspendSchemaSource})`);
	if (tool.resumeSchemaSource) parts.push(`.resume(${tool.resumeSchemaSource})`);
	if (tool.handlerSource) parts.push(`.handler(${tool.handlerSource})`);
	if (tool.toMessageSource) parts.push(`.toMessage(${tool.toMessageSource})`);
	if (tool.requireApproval) parts.push('.requireApproval()');
	if (tool.needsApprovalFnSource) parts.push(`.needsApprovalFn(${tool.needsApprovalFnSource})`);
	return { part: `.tool(${parts.join('')})`, usesWorkflowTool, usesNodeTool };
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
	const mc = buildMemoryChain(memory);
	return `.memory(${mc.chain})`;
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

function buildImports(
	schema: AgentSchema,
	needsWorkflowTool: boolean,
	needsNodeTool: boolean,
): string {
	const agentImports = new Set<string>(['Agent']);
	const agentUtilsImports = new Set<string>();
	if (schema.tools.some((t) => t.editable)) agentImports.add('Tool');
	if (needsWorkflowTool) agentUtilsImports.add('WorkflowTool');
	if (needsNodeTool) agentUtilsImports.add('ToolFromNode');
	if (schema.memory) agentImports.add('Memory');

	if (schema.memory?.name) {
		const memoryImport = MemoryImportMap[schema.memory.name];
		if (!memoryImport) {
			throw new Error(`Unknown memory name: ${schema.memory.name}`);
		}
		if (memoryImport !== 'no-import') {
			if (memoryImport.source === '@n8n/agents') {
				agentImports.add(memoryImport.importName);
			} else if (memoryImport.source === '@n8n/agents-utils') {
				agentUtilsImports.add(memoryImport.importName);
			}
		}
	}

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
	if (agentUtilsImports.size > 0)
		imports += `\nimport { ${Array.from(agentUtilsImports).sort().join(', ')} } from '@n8n/agents-utils';`;
	if (toolsNeedZod || structuredOutputNeedsZod) imports += "\nimport { z } from 'zod';";
	return imports;
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

	const { thinking, toolCallConcurrency, requireToolApproval, structuredOutput, ...configRest } =
		config;
	assertAllHandled(configRest);

	// No manual indentation — Prettier formats at the end.
	const parts: string[] = [];
	let needsWorkflowTool = false;
	let needsNodeTool = false;

	parts.push(`export default new Agent('${escapeSingleQuote(agentName)}')`);
	parts.push(...modelParts(model));

	if (credential) parts.push(`.credential('${escapeSingleQuote(credential)}')`);
	if (instructions) parts.push(`.instructions(\`${escapeTemplateLiteral(instructions)}\`)`);

	for (const tool of tools) {
		const { part, usesWorkflowTool, usesNodeTool } = toolPart(tool);
		if (usesWorkflowTool) needsWorkflowTool = true;
		if (usesNodeTool) needsNodeTool = true;
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

	const imports = buildImports(schema, needsWorkflowTool, needsNodeTool);
	const raw = `${imports}\n\n${parts.join('')};\n`;
	return options?.formatCode ? await formatCode(raw) : raw;
}
