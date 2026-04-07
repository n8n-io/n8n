import { Tool } from '@n8n/agents';
import { z } from 'zod';

/**
 * Tool that returns the agent's current TypeScript source code.
 * The agent reads this before modifying itself so it has full context.
 */
export function createGetMyCodeTool(getCode: () => Promise<string>) {
	return new Tool('get_my_code')
		.description(
			"Return this agent's current TypeScript source code. " +
				'Call this before modifying yourself so you have the full context.',
		)
		.input(z.object({}))
		.handler(async () => {
			const code = await getCode();
			return { code };
		});
}

/**
 * Tool that compiles and validates proposed TypeScript agent code.
 * Mirrors the builder agent's typecheck tool — call this before set_code.
 */
export function createTypecheckTool(
	validate: (code: string) => Promise<{ ok: boolean; error: string | null }>,
) {
	return new Tool('typecheck')
		.description(
			'Compile and validate TypeScript agent code. ' +
				'Returns { ok: true } if the code is valid, or { ok: false, error: string } with the error. ' +
				'Always call this before set_code.',
		)
		.input(
			z.object({
				code: z.string().describe('The full TypeScript source code to validate'),
			}),
		)
		.handler(async ({ code }: { code: string }) => await validate(code));
}

/**
 * Tool that saves the agent's new TypeScript source code.
 * Only call this after typecheck passes.
 */
export function createSetCodeTool(setCode: (code: string) => Promise<void>) {
	return new Tool('set_code')
		.description(
			'Save the new TypeScript source code for this agent. ' +
				'Call this with the COMPLETE, final code only after typecheck passes. ' +
				'The change takes effect on the next conversation turn.',
		)
		.input(
			z.object({
				code: z.string().describe('The complete TypeScript agent source code'),
			}),
		)
		.handler(async ({ code }: { code: string }) => {
			await setCode(code);
			return { ok: true };
		});
}
