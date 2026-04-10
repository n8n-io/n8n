#!/usr/bin/env tsx

/**
 * Annotates every example in a LangSmith dataset with tags selected by an LLM
 * from a fixed, predefined tag dictionary.
 *
 * Usage:
 *   LANGSMITH_API_KEY=... N8N_AI_ANTHROPIC_KEY=... \
 *     pnpm tsx scripts/annotate-dataset-tags.ts --dataset "my-dataset" [--concurrency 5] [--dry-run]
 */
import { Client } from 'langsmith/client';
import type { Example } from 'langsmith/schemas';
import * as readline from 'node:readline';
import pLimit from 'p-limit';
import pc from 'picocolors';
import { z } from 'zod';

import { DEFAULT_MODEL, getApiKeyEnvVar, MODEL_FACTORIES } from '../src/llm-config';

// the dictionary of possible tags, with their definition
const TAG_DEFINITIONS: Record<string, string> = {
	requires_changes_in_workflow:
		'The user request implies modifying an existing workflow, and will significantly change the current workflow (i.e. not simply changing the name of the workflow or the relative coordinates of the nodes)',
	// uses_agentic_nodes:
	// 	'The request requires AI agent nodes (e.g. LangChain agent, tool agent, AI chain nodes).',
};

const VALID_TAGS = Object.keys(TAG_DEFINITIONS);
const CONCURRENCY = 5;

function getArgValueFromParams(args: string[], arg: string): string | undefined {
	const argIndex = args.indexOf(arg);
	if (argIndex === -1) return undefined;
	return args[argIndex + 1];
}

function parseArgs(): { dataset: string; dryRun: boolean } {
	const args = process.argv.slice(2);
	const dryRun = args.includes('--dry-run');
	const dataset = getArgValueFromParams(args, '--dataset');

	if (!dataset) {
		console.error(
			pc.red('Usage: pnpm tsx scripts/annotate-dataset-tags.ts --dataset <name> [--dry-run]'),
		);
		process.exit(1);
	}

	return { dataset, dryRun };
}

async function confirm(question: string): Promise<boolean> {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	const promise = new Promise<boolean>((resolve) => {
		rl.question(`${question} [y/N] `, (answer) => {
			rl.close();
			resolve(answer.trim().toLowerCase() === 'y');
		});
	});
	return await promise;
}

const tagsSchema = z.object({
	tags: z
		.array(z.enum(VALID_TAGS as [string, ...string[]]))
		.describe(
			'Tags from the provided dictionary that apply to this user request. Return an empty array if none apply.',
		),
});

type Tags = z.infer<typeof tagsSchema>;

function buildSystemPrompt(): string {
	const tagList = Object.entries(TAG_DEFINITIONS)
		.map(([tag, description]) => `- "${tag}": ${description}`)
		.join('\n');

	return `You are a labelling assistant. Given a user's workflow automation request, decide which tags from the dictionary below apply.

Tag dictionary:
${tagList}

Rules:
- Only use tags from the dictionary above. Never invent new tags.
- A tag applies only when the request clearly matches the definition.
- Return an empty list if no tags apply.`;
}

async function generateTags(
	llm: {
		withStructuredOutput: <T>(schema: z.ZodType<T>) => { invoke: (input: unknown) => Promise<T> };
	},
	prompt: string,
): Promise<string[]> {
	const structured = llm.withStructuredOutput(tagsSchema);
	const result: Tags = await structured.invoke([
		{ role: 'system', content: buildSystemPrompt() },
		{ role: 'user', content: prompt },
	]);
	return result.tags;
}

function extractPrompt(inputs: Record<string, unknown>): string {
	if (typeof inputs.prompt === 'string' && inputs.prompt) {
		return inputs.prompt;
	}

	if (Array.isArray(inputs.messages) && inputs.messages.length > 0) {
		const first = inputs.messages[0] as Record<string, unknown>;
		const kwargs = first?.kwargs as Record<string, unknown> | undefined;
		const content = kwargs?.content ?? first?.content;
		if (typeof content === 'string') return content;
	}

	throw new Error('No prompt found in example inputs');
}

function hasExistingTagAnnotations(examples: Example[]): number {
	let count = 0;
	for (const example of examples) {
		const inputs = example.inputs as Record<string, unknown>;
		const annotations = inputs.annotations as Record<string, unknown> | undefined;
		if (annotations && typeof annotations === 'object' && 'tags' in annotations) {
			count++;
		}
	}
	return count;
}

async function main() {
	const { dataset: datasetName, dryRun } = parseArgs();

	const langsmithKey = process.env.LANGSMITH_API_KEY;
	if (!langsmithKey) {
		console.error('LANGSMITH_API_KEY is required');
		process.exit(1);
	}
	const lsClient = new Client({ apiKey: langsmithKey });

	// --- Setup LLM ---
	const modelId = DEFAULT_MODEL;
	const apiKeyEnv = getApiKeyEnvVar(modelId);
	const apiKey = process.env[apiKeyEnv];
	if (!apiKey) {
		console.error(`${apiKeyEnv} is required for model ${modelId}`);
		process.exit(1);
	}
	const llm = await MODEL_FACTORIES[modelId]({ apiKey });

	// --- Load dataset examples ---
	console.log(pc.blue(`\nLoading examples from dataset "${datasetName}"...\n`));

	const datasetInfo = await lsClient.readDataset({ datasetName });
	const examples: Example[] = [];
	for await (const example of lsClient.listExamples({ datasetId: datasetInfo.id })) {
		examples.push(example);
	}

	console.log(pc.blue(`Found ${examples.length} examples.\n`));

	// --- Check for existing annotations ---

	const alreadyAnnotated = hasExistingTagAnnotations(examples);
	if (alreadyAnnotated > 0) {
		console.log(
			pc.yellow(`${alreadyAnnotated}/${examples.length} examples already have tag annotations.`),
		);
		const proceed = await confirm('Overwrite existing tag annotations?');
		if (!proceed) {
			console.log('Aborted.');
			process.exit(0);
		}
		console.log();
	}

	// --- Process each example ---
	const limit = pLimit(CONCURRENCY);
	let completed = 0;
	let errors = 0;
	const startTime = Date.now();

	const tasks = examples.map((example) =>
		limit(async () => {
			const index = ++completed;
			try {
				const inputs = example.inputs as Record<string, unknown>;
				const prompt = extractPrompt(inputs);
				const tags = await generateTags(llm, prompt);

				const existingAnnotations =
					typeof inputs.annotations === 'object' &&
					inputs.annotations !== null &&
					!Array.isArray(inputs.annotations)
						? (inputs.annotations as Record<string, unknown>)
						: {};

				const updatedInputs = {
					...inputs,
					annotations: {
						...existingAnnotations,
						tags,
					},
				};

				const tagsDisplay = tags.length > 0 ? tags.join(', ') : '(none)';

				if (dryRun) {
					console.log(
						pc.yellow(`[DRY-RUN ${index}/${examples.length}]`) +
							` ${prompt}\n  Tags: ${tagsDisplay}\n`,
					);
				} else {
					await lsClient.updateExample({ id: example.id, inputs: updatedInputs });
					console.log(
						pc.green(`[${index}/${examples.length}]`) + ` ${prompt}\n  Tags: ${tagsDisplay}\n`,
					);
				}
			} catch (error) {
				errors++;
				const msg = error instanceof Error ? error.message : String(error);
				console.error(pc.red(`[${index}/${examples.length}] Error: ${msg}\n`));
			}
		}),
	);

	await Promise.all(tasks);

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	console.log(
		pc.green(
			`\nDone. ${examples.length - errors}/${examples.length} examples annotated in ${elapsed}s.`,
		),
	);
	if (errors > 0) {
		console.log(pc.red(`${errors} errors encountered.`));
	}
	if (dryRun) {
		console.log(pc.yellow('(dry-run mode — no changes were written to LangSmith)\n'));
	}
}

main().catch((error) => {
	console.error(pc.red('\nFatal error:'), error);
	process.exit(1);
});
