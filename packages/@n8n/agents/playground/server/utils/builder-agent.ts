import { Agent, Tool, providerTools } from '@n8n/agents';
import { z } from 'zod';
import { compileSource } from './compile';
import { listCredentials } from './credentials-db';
import { getSdkTypeDeclarations } from './sdk-types';

let cachedAgent: Agent | undefined;

// Holds the last code set by the set_code tool, read by the build endpoint.
let lastSetCode: string | undefined;

export function getLastSetCode(): string | undefined {
	return lastSetCode;
}

export function clearLastSetCode(): void {
	lastSetCode = undefined;
}

/**
 * Creates (and caches) the builder agent — an AI agent that generates
 * @n8n/agents code from natural language descriptions.
 */
export function getBuilderAgent() {
	if (cachedAgent) return cachedAgent;

	const sdkTypes = getSdkTypeDeclarations();

	const typecheckTool = new Tool('typecheck')
		.description(
			'Compile and validate TypeScript agent code. Returns { ok: true } if the code compiles and produces a valid agent, or { ok: false, error: string } with the error message.',
		)
		.input(
			z.object({
				code: z.string().describe('The full TypeScript source code to validate'),
			}),
		)
		.handler(async ({ code }) => {
			const result = await compileSource(code);
			return { ok: result.ok, error: result.error ?? null };
		})
		.build();

	const setCodeTool = new Tool('set_code')
		.description(
			'Set the code in the editor. Call this with the COMPLETE, final TypeScript source code after it passes typecheck. This replaces the entire editor content.',
		)
		.input(
			z.object({
				code: z.string().describe('The complete TypeScript agent source code'),
			}),
		)
		.handler(async ({ code }) => {
			lastSetCode = code;
			return { ok: true };
		})
		.build();

	const listCredentialsTool = new Tool('list-credentials')
		.description(
			'List the credentials available in the playground. Returns an array of credential names. ' +
				'Call this BEFORE generating code to know which .credential() value to use.',
		)
		.input(z.object({}))
		.handler(async () => {
			const creds = listCredentials();
			const names = creds.map((c) => c.name);
			return { credentials: names };
		})
		.build();

	const model = process.env.BUILDER_MODEL ?? 'anthropic/claude-sonnet-4-5';

	cachedAgent = new Agent('agent-builder')
		.model(model)
		.instructions(
			`You are an expert @n8n/agents SDK developer. Your job is to generate TypeScript code that creates AI agents using the @n8n/agents SDK.

## Workflow

1. FIRST call the list-credentials tool to see available credentials
2. Generate COMPLETE, working TypeScript code
3. Use the typecheck tool to validate your code
4. If typecheck fails, fix the errors and typecheck again
5. Once typecheck passes, call set_code to put the code in the editor
6. Write a brief explanation of what you built or changed

## Code rules

- Always import from '@n8n/agents' and 'zod' — these are the only available modules
- The code MUST export the agent as the default export: \`export default agent;\`
- Do NOT call .build() on tools or agents — the engine handles that automatically
- Every agent MUST have .credential() — it will not compile without one

## Modifying existing code

When modifying existing code:
- The current editor code is provided above
- Make targeted changes based on the user's request
- Always pass the COMPLETE modified code to typecheck and set_code, not just the changed parts

## SDK Type Definitions

${sdkTypes}

## Available models

Use '${model}' as the default model unless the user specifies otherwise.

## Credentials

Every agent MUST declare which credential it uses via .credential('name').
Always call the list-credentials tool FIRST to see which credentials are available.
Use the credential name that matches the model provider (e.g. 'anthropic' for Anthropic models, 'openai' for OpenAI models).
The execution engine resolves the credential to an API key at build time — never hardcode API keys.

## Important

- Do NOT call .build() on tools or agents — the engine handles this automatically
- Tool handlers are async functions that receive the validated input object
- Tool .input() and .output() use Zod schemas
- Agent .instructions() sets the system prompt
- The only imports available at runtime are '@n8n/agents' and 'zod'
- Do NOT import anything else — it will fail at runtime`,
		)
		.tool(typecheckTool)
		.tool(setCodeTool)
		.tool(listCredentialsTool)
		.providerTool(providerTools.anthropicWebSearch({ maxUses: 3 }));

	return cachedAgent;
}
