import { readFileSync, readdirSync } from 'fs';
import { basename, join } from 'path';
import { z } from 'zod';

import type { LocalGatewayStatus } from '../../../src/types';
import type { DiscoveryTestCase } from '../../discovery/types';

const forbiddenToolCallSchema = z
	.object({
		toolName: z.string().min(1),
		argsContainAny: z.array(z.string().min(1)).optional(),
	})
	.strict();

/** Strict authoring schema for discovery cases — a typo'd key or an empty
 *  expectation must fail at load time, not pass vacuously at run time (the
 *  workflow-case loader has had this guarantee for a while; discovery cases
 *  were a blind JSON.parse cast until TRUST-261's cleanup). */
export const discoveryTestCaseSchema = z
	.object({
		id: z.string().min(1),
		userMessage: z.string().min(1),
		instanceState: z
			.object({
				// Opaque here (mirrors SystemPromptOptions); consumers validate usage.
				localGateway: z.custom<LocalGatewayStatus>().optional(),
				browserAvailable: z.boolean().optional(),
			})
			.strict()
			.optional(),
		expectedToolInvocations: z
			.object({
				anyOf: z.array(z.string().min(1)).optional(),
				noneOf: z.array(z.string().min(1)).optional(),
				anyOfToolCalls: z.array(forbiddenToolCallSchema).optional(),
				allOfToolCalls: z.array(forbiddenToolCallSchema).optional(),
				noneOfToolCalls: z.array(forbiddenToolCallSchema).optional(),
			})
			.strict()
			.refine((expectations) => Object.values(expectations).some((v) => v !== undefined), {
				message: 'expectedToolInvocations needs at least one expectation key',
			}),
		rationale: z.string().optional(),
		maxSteps: z.number().int().positive().optional(),
	})
	.strict();

export interface DiscoveryTestCaseWithFile {
	testCase: DiscoveryTestCase;
	/** Filename without extension, e.g. "slack-oauth-credential-setup" */
	fileSlug: string;
}

function parseTestCaseFile(filePath: string): DiscoveryTestCase {
	const content = readFileSync(filePath, 'utf-8');
	let raw: unknown;
	try {
		raw = JSON.parse(content);
	} catch (error) {
		throw new Error(
			`Failed to parse discovery test case ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	const parsed = discoveryTestCaseSchema.safeParse(raw);
	if (!parsed.success) {
		const issues = parsed.error.issues
			.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
			.join('; ');
		throw new Error(`Invalid discovery test case ${filePath}: ${issues}`);
	}
	return parsed.data;
}

function parseSubstringList(value: string | undefined): string[] {
	if (!value) return [];
	return value
		.split(',')
		.map((s) => s.trim().toLowerCase())
		.filter((s) => s.length > 0);
}

function getJsonFiles(filter?: string, exclude?: string): string[] {
	const dir = __dirname;
	let files = readdirSync(dir).filter((f) => f.endsWith('.json'));

	const includeTokens = parseSubstringList(filter);
	if (includeTokens.length > 0) {
		files = files.filter((f) => {
			const lower = f.toLowerCase();
			return includeTokens.some((t) => lower.includes(t));
		});
	}

	const excludeTokens = parseSubstringList(exclude);
	if (excludeTokens.length > 0) {
		files = files.filter((f) => {
			const lower = f.toLowerCase();
			return !excludeTokens.some((t) => lower.includes(t));
		});
	}

	return files.map((f) => join(dir, f));
}

export function loadDiscoveryTestCasesWithFiles(
	filter?: string,
	exclude?: string,
): DiscoveryTestCaseWithFile[] {
	return getJsonFiles(filter, exclude).map((f) => ({
		testCase: parseTestCaseFile(f),
		fileSlug: basename(f, '.json'),
	}));
}
