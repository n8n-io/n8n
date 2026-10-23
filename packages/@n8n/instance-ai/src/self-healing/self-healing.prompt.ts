import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const SELF_HEALING_PROMPT = readFileSync(
	resolve(__dirname, '..', '..', 'prompts', 'self-healing', 'self-healing.md'),
	'utf-8',
).trim();
