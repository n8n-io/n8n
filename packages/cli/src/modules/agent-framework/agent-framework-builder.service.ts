import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Agent, Tool } from '@n8n/agents';
import type { CredentialProvider, CredentialListItem, StreamChunk } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { WorkflowRepository } from '@n8n/db';
import { z } from 'zod';

import { AgentFrameworkService } from './agent-framework.service';
import { AgentSecureRuntime } from './agent-secure-runtime';

let cachedSdkTypes: string | undefined;

/**
 * Read the @n8n/agents .d.ts files and bundle them into a single
 * declaration string for the builder agent's system prompt.
 */
function getSdkTypeDeclarations(): string {
	if (cachedSdkTypes) return cachedSdkTypes;

	try {
		const distDir = join(require.resolve('@n8n/agents/package.json'), '..', 'dist');

		const strip = (src: string) =>
			src
				.replace(/^import\s+.*;\s*$/gm, '')
				.replace(/^export\s*\{\s*\}\s*;\s*$/gm, '')
				.replace(/^export declare/gm, 'export')
				.trim();

		const fileNames = [
			'types/agent.d.ts',
			'types/tool.d.ts',
			'types/eval.d.ts',
			'types/memory.d.ts',
			'agent.d.ts',
			'eval.d.ts',
			'memory.d.ts',
			'tool.d.ts',
			'message.d.ts',
		];

		const sections = fileNames.map((name) => {
			try {
				const content = readFileSync(join(distDir, name), 'utf-8');
				return `  // --- ${name} ---\n  ${strip(content).split('\n').join('\n  ')}`;
			} catch {
				return '';
			}
		});

		const evalsNamespace = `  // --- evals namespace ---
  export namespace evals {
    function correctness(): Eval;
    function helpfulness(): Eval;
    function stringSimilarity(): Eval;
    function categorization(): Eval;
    function containsKeywords(): Eval;
    function jsonValidity(): Eval;
    function toolCallAccuracy(): Eval;
  }`;

		cachedSdkTypes = `declare module '@n8n/agents' {\n  import type { z } from 'zod';\n\n${sections.filter(Boolean).join('\n\n')}\n\n${evalsNamespace}\n}`;
	} catch {
		cachedSdkTypes = '(SDK type declarations unavailable)';
	}

	return cachedSdkTypes;
}

@Service()
export class AgentFrameworkBuilderService {
	constructor(
		private readonly logger: Logger,
		private readonly agentsService: AgentFrameworkService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly secureRuntime: AgentSecureRuntime,
	) {}

	async *buildAgent(
		agentId: string,
		projectId: string,
		message: string,
		credentialProvider: CredentialProvider,
		_userId?: string,
	): AsyncGenerator<StreamChunk> {
		const agent = await this.agentsService.findById(agentId, projectId);

		if (!agent) {
			throw new Error(`Agent "${agentId}" not found`);
		}

		const currentCode = agent.code ?? '';
		const sdkTypes = getSdkTypeDeclarations();

		// Tool: typecheck — validates code compiles
		const typecheckTool = new Tool('typecheck')
			.description(
				'Compile and validate TypeScript agent code. Returns { ok: true } if the code compiles and produces a valid agent, or { ok: false, error: string } with the error message.',
			)
			.input(
				z.object({
					code: z.string().describe('The full TypeScript source code to validate'),
				}),
			)
			.handler(async ({ code }: { code: string }) => {
				try {
					await this.secureRuntime.describeSecurely(code);
					return { ok: true, error: null };
				} catch (e) {
					return { ok: false, error: e instanceof Error ? e.message : String(e) };
				}
			})
			.build();

		// Tool: set_code — updates the agent's code in the database
		const setCodeTool = new Tool('set_code')
			.description(
				'Set the code in the editor. Call this with the COMPLETE, final TypeScript source code after it passes typecheck. This replaces the entire editor content.',
			)
			.input(
				z.object({
					code: z.string().describe('The complete TypeScript agent source code'),
				}),
			)
			.handler(async ({ code }: { code: string }) => {
				await this.agentsService.updateCode(agentId, projectId, code);
				this.logger.debug('Builder agent set code', { agentId });
				return { ok: true };
			})
			.build();

		// Tool: list_credentials — lists credentials accessible to the user
		const listCredentialsTool = new Tool('list_credentials')
			.description(
				'List the credentials available to the user. Returns an array of credential names and types. ' +
					'Call this BEFORE generating code to know which .credential() value to use.',
			)
			.input(z.object({}))
			.handler(async () => {
				const creds = await credentialProvider.list();
				return { credentials: creds };
			})
			.build();

		// Tool: list_workflows — lists workflows that can be used as tools (pre-filtered)
		const listWorkflowsTool = new Tool('list_workflows')
			.description(
				'List the n8n workflows that can be attached as tools via .tool(new WorkflowTool(name)). ' +
					'ALWAYS call this at the start — workflows are the preferred way to give agents real capabilities ' +
					'(sending emails, creating calendar events, querying databases, calling APIs, etc.). ' +
					'Only returns workflows with supported trigger types.',
			)
			.input(z.object({}))
			.handler(async () => {
				const workflows = await this.workflowRepository.find({
					select: ['id', 'name', 'nodes', 'active', 'updatedAt'],
					where: {
						shared: { projectId },
					},
					relations: ['shared'],
					order: { updatedAt: 'DESC' },
					take: 100,
				});

				const SUPPORTED_TRIGGERS: Record<string, string> = {
					'n8n-nodes-base.manualTrigger': 'manual',
					'n8n-nodes-base.executeWorkflowTrigger': 'executeWorkflow',
					'n8n-nodes-base.chatTrigger': 'chat',
					'n8n-nodes-base.scheduleTrigger': 'schedule',
					'n8n-nodes-base.formTrigger': 'form',
				};

				const compatible = workflows
					.map((w) => {
						const triggerNode = (w.nodes ?? []).find(
							(n: { type: string }) => SUPPORTED_TRIGGERS[n.type],
						);
						if (!triggerNode) return null;
						return {
							name: w.name,
							active: w.active,
							triggerType: SUPPORTED_TRIGGERS[triggerNode.type],
						};
					})
					.filter(Boolean);

				return { workflows: compatible };
			})
			.build();

		// Pick credential for the builder agent itself
		const availableCredentials = await credentialProvider.list();
		const LLM_CREDENTIAL_TYPES = ['anthropicApi', 'openAiApi'];
		const builderCredential =
			availableCredentials.find((c: CredentialListItem) => c.type === 'anthropicApi') ??
			availableCredentials.find((c: CredentialListItem) => LLM_CREDENTIAL_TYPES.includes(c.type));

		if (!builderCredential) {
			throw new Error(
				'No LLM credentials available. Add an Anthropic or OpenAI credential in n8n to use the builder agent.',
			);
		}

		let builderModel: string;
		switch (builderCredential.type) {
			case 'openAiApi':
				builderModel = 'openai/gpt-4o';
				break;
			case 'anthropicApi':
			default:
				builderModel = 'anthropic/claude-sonnet-4-5';
				break;
		}

		const builder = new Agent('agent-builder')
			.model(builderModel)
			.credential(builderCredential.name)
			.credentialProvider(credentialProvider)
			.instructions(
				`You are an expert @n8n/agents SDK developer. Your job is to generate TypeScript code that creates AI agents using the @n8n/agents SDK.

## Current agent code

\`\`\`typescript
${currentCode}
\`\`\`

## Workflow

1. FIRST call list_credentials AND list_workflows to see what's available
2. When the user describes what they want the agent to do, PREFER attaching existing workflows as tools over writing custom tool handlers — workflows can actually interact with external services (email, calendar, databases, APIs, etc.) while custom tools can only do in-memory computation
3. Generate COMPLETE, working TypeScript code
4. Use the typecheck tool to validate your code
5. If typecheck fails, fix the errors and typecheck again
6. Once typecheck passes, call set_code to put the code in the editor
7. Write a brief explanation of what you built or changed, noting which workflows were attached and why

## Code rules

- Always import from '@n8n/agents' and 'zod' — these are the only available modules
- The code MUST export the agent as the default export: \`export default agent;\`
- Do NOT call .build() on tools or agents — the engine handles that automatically
- Every agent MUST have .credential() — it will not compile without one
- When using .suspend()/.resume() on a tool, the handler MUST use \`return await ctx.suspend(payload)\` — the \`return\` is mandatory

## Modifying existing code

When modifying existing code:
- The current editor code is provided above
- Make targeted changes based on the user's request
- Always pass the COMPLETE modified code to typecheck and set_code, not just the changed parts

## SDK Type Definitions

${sdkTypes}

## Available models

Use '${builderModel}' as the default model unless the user specifies otherwise.

## Credentials

Every agent MUST declare which credential it uses via .credential('name').
Always call the list_credentials tool FIRST to see which credentials are available.
Use the credential name that matches the model provider (e.g. 'anthropic' for Anthropic models, 'openai' for OpenAI models).
The execution engine resolves the credential to an API key at build time — never hardcode API keys.

## Rich Tool Messages (.toMessage)

Tools can define how their results are displayed in rich chat interfaces (like Slack) using \`.toMessage()\`.
This converts the tool's output into a structured message with visual components — sections, dividers, images, etc.
The agent doesn't need to know about Slack or any platform — the integration layer handles rendering.

\`\`\`typescript
const myTool = new Tool('my_tool')
  .input(z.object({ name: z.string() }))
  .output(z.object({ name: z.string(), score: z.number(), details: z.string() }))
  .toMessage((output) => ({
    type: 'custom',
    components: [
      { type: 'section', text: \`*\${output.name}*\` },
      { type: 'divider' },
      { type: 'section', text: \`Score: \${output.score}\\n\${output.details}\` },
    ],
  }))
  .handler(async ({ name }) => {
    return { name, score: 42, details: 'Some details here' };
  });
\`\`\`

**Available component types for .toMessage():**
- \`{ type: 'section', text: string }\` — A text block (supports markdown: *bold*, _italic_, \\\`code\\\`)
- \`{ type: 'divider' }\` — A horizontal line separator
- \`{ type: 'image', url: string, alt: string }\` — An image

The \`toMessage\` function receives the tool's output (matching the .output() schema) and returns an object with \`type: 'custom'\` and a \`components\` array. This is for DISPLAY ONLY — it does not affect what the LLM sees (the LLM still gets the raw output).

Use .toMessage() when:
- Tool results have structured data that benefits from visual formatting (stats, tables, summaries)
- You want to show the user a nicely formatted result alongside the agent's text response

Do NOT use .toMessage() for:
- Interactive elements (buttons, inputs) — use .suspend()/.resume() for HITL instead
- Simple text responses — the agent's natural text is sufficient

## Suspend/Resume (HITL — Human in the Loop)

Tools can pause and wait for human input using \`.suspend()\` and \`.resume()\`.

**CRITICAL: The handler MUST check ctx.resumeData to distinguish first call vs resume:**
\`\`\`typescript
const approveTool = new Tool('approve_action')
  .input(z.object({ action: z.string() }))
  .suspend(z.object({ message: z.string() }))
  .resume(z.object({ approved: z.boolean() }))
  .handler(async (input, ctx) => {
    // FIRST CALL: ctx.resumeData is undefined — suspend here
    if (!ctx.resumeData) {
      return await ctx.suspend({ message: \`Approve: \${input.action}?\` });
    }
    // SECOND CALL (after user responds): ctx.resumeData has the response
    if (!ctx.resumeData.approved) {
      return { result: 'denied' };
    }
    return { result: 'approved' };
  });
\`\`\`

**WRONG pattern (do NOT do this):**
\`\`\`typescript
// ❌ WRONG — code after ctx.suspend() runs immediately, it does NOT wait
const result = await ctx.suspend({ message: 'Approve?' });
if (!result.approved) { ... } // This runs before user responds!
\`\`\`

**Rules:**
- \`.suspend(schema)\` and \`.resume(schema)\` must both be set (they're paired)
- The handler is called TWICE: once to suspend, once after resume
- Check \`ctx.resumeData\` to know which call you're in
- Agent MUST have \`.checkpoint('memory')\` for suspend/resume to work
- Use \`return await ctx.suspend(payload)\` — the \`return\` is mandatory

## Workflows as Tools

Agents can use existing n8n workflows as tools via \`new WorkflowTool('Workflow Name')\`.
This executes the workflow when the agent calls the tool and returns the result.

**Simple — attach by name:**
\`\`\`typescript
import { Agent, WorkflowTool } from '@n8n/agents';

const agent = new Agent('my-agent')
  .model('anthropic/claude-sonnet-4-5')
  .credential('anthropic')
  .tool(new WorkflowTool('Send Welcome Email'))
  .tool(new WorkflowTool('Generate Report'))
  .instructions('You help onboard new users.');
\`\`\`

**Advanced — with custom options:**
\`\`\`typescript
import { Agent, WorkflowTool } from '@n8n/agents';

const agent = new Agent('my-agent')
  .tool(new WorkflowTool('Send Email', {
    name: 'send-email',
    description: 'Send an onboarding email to a user',
  }))
  .instructions('...');
\`\`\`

**How it works:**
- The workflow name is resolved to a real workflow at compile time
- The workflow's trigger type determines the tool's input schema automatically
- When the agent calls the tool, the workflow executes and the result is returned
- Supported triggers: Manual Trigger, Execute Workflow Trigger, Chat Trigger, Schedule Trigger

**Rules:**
- Use the EXACT workflow name as it appears in n8n
- Call the list_workflows tool to see available workflows and their trigger types
- Only workflows with \`canUseAsTool: true\` can be attached
- The workflow runs with the agent owner's permissions

## Memory Configuration

Agents can have conversation memory configured using the \`Memory\` builder class.

**In-process memory (default, lost on restart):**
\`\`\`typescript
import { Agent, Memory } from '@n8n/agents';

const agent = new Agent('my-agent')
  .model('anthropic/claude-sonnet-4-5')
  .credential('anthropic')
  .memory(new Memory().lastMessages(50))
  .instructions('You are a helpful assistant.');
\`\`\`

**Persistent memory with SQLite:**
\`\`\`typescript
import { Agent, Memory, SqliteMemory } from '@n8n/agents';

const agent = new Agent('my-agent')
  .model('anthropic/claude-sonnet-4-5')
  .credential('anthropic')
  .memory(
    new Memory()
      .storage(new SqliteMemory('./memory.db'))
      .lastMessages(50)
      .semanticRecall({ topK: 5, embedder: 'openai/text-embedding-3-small' })
  )
  .instructions('You are a helpful assistant.');
\`\`\`

**Memory builder methods:**
- \`.lastMessages(N)\` — how many recent messages to include in context (default: 10)
- \`.storage('memory')\` — in-process storage (default)
- \`.storage(new SqliteMemory(path))\` or \`.storage(new PostgresMemory(url))\` — persistent storage
- \`.semanticRecall({ topK, embedder })\` — RAG-based recall (requires persistent storage)
- \`.freeform(template)\` — free-form working memory with markdown template
- \`.structured(zodSchema)\` — structured working memory with Zod schema

**WRONG patterns:**
\`\`\`typescript
// ❌ WRONG — plain objects are NOT valid memory config
.memory({ type: 'buffer', maxMessages: 50 })

// ❌ WRONG — strings are NOT valid
.memory('memory')

// ✅ CORRECT — always use the Memory builder class
.memory(new Memory().lastMessages(50))
\`\`\`

**Rules:**
- Always use \`new Memory()\` — never pass a plain object
- \`.semanticRecall()\` only works with persistent storage (SqliteMemory/PostgresMemory), NOT in-process memory
- \`.freeform()\` and \`.structured()\` are mutually exclusive

## Important

- Do NOT call .build() on tools or agents — the engine handles this automatically
- Do NOT use process.env — it is not available in the sandbox. For API keys use .credential()
- Tool handlers are async functions that receive the validated input object
- Tool .input() and .output() use Zod schemas
- Agent .instructions() sets the system prompt
- The only imports available at runtime are '@n8n/agents' and 'zod'
- Do NOT import anything else — it will fail at runtime`,
			)
			.tool(typecheckTool)
			.tool(setCodeTool)
			.tool(listCredentialsTool)
			.tool(listWorkflowsTool);

		this.logger.debug('Starting builder agent stream', { agentId, projectId });

		const resultStream = await builder.stream(message);
		const reader = resultStream.stream.getReader();

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				yield value;
			}
		} finally {
			reader.releaseLock();
		}
	}
}
