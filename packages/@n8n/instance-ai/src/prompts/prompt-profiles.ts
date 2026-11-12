import type { RuntimeSkillSource } from '@n8n/agents';
import type { InstanceAiPromptConfiguration } from '@n8n/api-types';
import { UnexpectedError, UserError } from 'n8n-workflow';

import { CONCISE_COMMUNICATION_STYLE_SECTION } from '../agent/communication-style.prompt';
import { createSystemPromptRenderer, getSystemPrompt } from '../agent/system-prompt';
import type { SkillVariant } from '../skills/skill-variants';

export interface PromptProfile {
	version: string;
	systemPromptVersion: string;
	variants: readonly SkillVariant[];
}

export const DEFAULT_PROMPT_VERSION = 'default@1';
export const CONCISE_PROMPT_VERSION = 'concise@1';

const SYSTEM_PROMPT_VERSION = 'instance-agent@1';
const CONCISE_SYSTEM_PROMPT_VERSION = 'instance-agent-concise@1';

/** Published versions are immutable. Add a new entry to change a profile. */
export const INSTANCE_AI_PROMPT_PROFILES: readonly PromptProfile[] = [
	{
		version: DEFAULT_PROMPT_VERSION,
		systemPromptVersion: SYSTEM_PROMPT_VERSION,
		variants: [],
	},
	{
		version: CONCISE_PROMPT_VERSION,
		systemPromptVersion: CONCISE_SYSTEM_PROMPT_VERSION,
		variants: [],
	},
];

export const PROMPT_FRAGMENT_SKILLS = [
	...new Set(
		INSTANCE_AI_PROMPT_PROFILES.flatMap((profile) =>
			profile.variants.flatMap((variant) => variant.changes.map((change) => change.appendFrom)),
		),
	),
];

export function assertInstanceAiPromptVersion(version: string): void {
	if (!INSTANCE_AI_PROMPT_PROFILES.some((profile) => profile.version === version)) {
		throw new UserError(`Unknown Instance AI prompt version "${version}"`);
	}
}

/** Explicit versions take precedence. Retired persisted versions recover with the default profile. */
export function resolvePromptProfile(
	selection: { version?: string },
	profiles: readonly PromptProfile[] = INSTANCE_AI_PROMPT_PROFILES,
): { profile: PromptProfile; fallbackFrom?: string } {
	if (new Set(profiles.map((profile) => profile.version)).size !== profiles.length) {
		throw new UnexpectedError('Prompt profile versions must be unique');
	}
	const version = selection.version ?? DEFAULT_PROMPT_VERSION;
	const selected = profiles.find((profile) => profile.version === version);
	if (selected) return { profile: selected };
	const fallback = profiles.find((profile) => profile.version === DEFAULT_PROMPT_VERSION);
	if (!fallback) throw new UnexpectedError('The default prompt profile is missing');
	return { profile: fallback, fallbackFrom: version };
}

export function describePromptProfile(
	selection: ReturnType<typeof resolvePromptProfile>,
	source: RuntimeSkillSource,
): InstanceAiPromptConfiguration {
	return {
		version: selection.profile.version,
		systemPromptVersion: selection.profile.systemPromptVersion,
		skillVariants: selection.profile.variants.map((variant) => variant.id),
		skillsHash: source.registry.skillsHash,
		...(selection.fallbackFrom ? { fallbackFrom: selection.fallbackFrom } : {}),
	};
}

const systemPrompts = new Map<string, typeof getSystemPrompt>([
	[SYSTEM_PROMPT_VERSION, getSystemPrompt],
	[CONCISE_SYSTEM_PROMPT_VERSION, createSystemPromptRenderer(CONCISE_COMMUNICATION_STYLE_SECTION)],
]);

export function getVersionedSystemPrompt(
	version: string,
	options: Parameters<typeof getSystemPrompt>[0],
): string {
	const render = systemPrompts.get(version);
	if (!render) throw new UnexpectedError(`Unknown system prompt version "${version}"`);
	return render(options);
}
