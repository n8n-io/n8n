#!/usr/bin/env node
/**
 * Builds the Claude task prompt and writes it to GITHUB_ENV.
 * Uses a random delimiter to prevent heredoc collision with user input.
 *
 * Usage: node prepare-claude-prompt.mjs
 *
 * Environment variables:
 *   INPUT_TASK     - The task description (required)
 *   USE_RAW_PROMPT - "true" to pass task directly without wrapping
 *   GITHUB_ENV     - Path to GitHub env file (set by Actions)
 */

import { randomUUID } from 'node:crypto';
import { appendFileSync, readdirSync } from 'node:fs';

const task = process.env.INPUT_TASK;
const useRaw = process.env.USE_RAW_PROMPT === 'true';
const envFile = process.env.GITHUB_ENV;

if (!task) {
	console.error('INPUT_TASK environment variable is required');
	process.exit(1);
}

if (!envFile) {
	console.error('GITHUB_ENV environment variable is required');
	process.exit(1);
}

let prompt;

if (useRaw) {
	prompt = task;
} else {
	// List available templates so Claude knows what exists (reads them if needed)
	const templateDir = '.github/claude-templates';
	let templateSection = '';
	try {
		const files = readdirSync(templateDir).filter((f) => f.endsWith('.md'));
		if (files.length > 0) {
			const listing = files.map((f) => `  - ${templateDir}/${f}`).join('\n');
			templateSection = `\n# Templates\nThese guides are available if relevant to your task. Read any that match before starting:\n${listing}`;
		}
	} catch {
		// No templates directory, skip
	}

	prompt = `# Task
${task}
${templateSection}
# Instructions
1. Read any relevant templates listed above before starting
2. Complete the task described above
3. Make commits as you work - the last commit message will be used as the PR title
4. IMPORTANT: End every commit message with: Co-authored-by: Claude <noreply@anthropic.com>
5. Ensure code passes linting and type checks before finishing

# Token Optimization
When running lint/typecheck, suppress verbose output:
  pnpm lint 2>&1 | tail -30
  pnpm typecheck 2>&1 | tail -30`;
}

// Random delimiter guarantees no collision with user content
const delimiter = `CLAUDE_PROMPT_DELIM_${randomUUID().replace(/-/g, '')}`;
appendFileSync(envFile, `CLAUDE_PROMPT<<${delimiter}\n${prompt}\n${delimiter}\n`);

console.log(`Prompt written to GITHUB_ENV (${prompt.length} chars)`);
