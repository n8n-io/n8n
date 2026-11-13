import { RunSkillTrialDto } from '@n8n/api-types';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { AgentSkillTrialController } from '../agent-skill-trial.controller';

describe('Skill trial routes', () => {
	it('requires project execution access and limits every request', () => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			AgentSkillTrialController as never,
		);
		expect([...metadata.routes.keys()].sort()).toEqual(['prepare', 'run']);
		for (const route of metadata.routes.values()) {
			expect(route.skipAuth).toBe(false);
			expect(route.accessScope).toEqual({ scope: 'agent:execute', globalOnly: false });
			expect(route.keyedRateLimit).toMatchObject({ source: 'user', windowMs: 60_000 });
		}
	});

	it('rejects invalid catalog identities and oversized prompts', () => {
		const valid = {
			catalogId: 'acme/skills/writing',
			contentHash: 'a'.repeat(64),
			message: 'Hello',
			model: 'openai/gpt-5-mini',
			credential: 'credential-1',
		};
		expect(RunSkillTrialDto.safeParse(valid).success).toBe(true);
		expect(RunSkillTrialDto.safeParse({ ...valid, catalogId: 'acme/../writing' }).success).toBe(
			false,
		);
		expect(RunSkillTrialDto.safeParse({ ...valid, message: 'x'.repeat(10_001) }).success).toBe(
			false,
		);
	});

	it('accepts complete text turns and bounds the conversation history', () => {
		const valid = {
			catalogId: 'acme/skills/writing',
			contentHash: 'a'.repeat(64),
			message: 'Shorter',
			model: 'openai/gpt-5-mini',
			credential: 'credential-1',
		};
		const pair = [
			{ role: 'user', content: 'Hello' },
			{ role: 'assistant', content: 'Hi there' },
		];
		expect(RunSkillTrialDto.safeParse({ ...valid, history: pair }).success).toBe(true);
		for (const history of [
			[{ role: 'system', content: 'Instructions' }],
			[{ role: 'user', content: 'Unanswered' }],
			[...pair].reverse(),
			Array.from({ length: 21 }, () => pair).flat(),
			Array.from({ length: 4 }, () =>
				pair.map((message) => ({ ...message, content: 'x'.repeat(8_000) })),
			).flat(),
		]) {
			expect(RunSkillTrialDto.safeParse({ ...valid, history }).success).toBe(false);
		}
	});
});
