import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const AGENT_IMPROVEMENT_PROMPT = readFileSync(
	resolve(__dirname, '..', '..', 'prompts', 'agent-improvement', 'agent-improvement.md'),
	'utf-8',
).trim();
