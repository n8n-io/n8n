import type { AgentJsonConfig } from '@n8n/api-types';

import type { Agent } from '../entities/agent.entity';
import { composeJsonConfig } from '../json-config/agent-config-composition';
import { fromAgentDocument, toAgentDocument } from '../json-config/agent-document';
import { getAgentConfigHash } from '../utils/agent-config-hash';
import { createAgentSkillRefsService, storedAgentConfig } from './test-utils/stored-agent-config';

const document: AgentJsonConfig = {
	name: 'Support agent',
	model: 'anthropic/claude-sonnet-4-5',
	credential: 'cred-1',
	instructions: 'Help the user.',
	tools: [{ type: 'custom', id: 'lookup' }],
	skills: [
		{ type: 'skill', id: 'refunds' },
		{ type: 'skill', id: 'billing', versionId: '0b2c6f1e-7d3a-4c1b-9f2e-5a6b7c8d9e0f' },
		{ type: 'skill', id: 'apology' },
	],
	tasks: [{ type: 'task', id: 'daily', enabled: true }],
	integrations: [{ type: 'n8n_chat', credentialId: '' }],
};

describe('toAgentDocument / fromAgentDocument', () => {
	it('splits the skill refs off the document and puts them back', () => {
		const { config, skillRefs } = fromAgentDocument(document);

		expect(config).not.toHaveProperty('skills');
		expect(skillRefs).toEqual(document.skills);
		expect(toAgentDocument(config, skillRefs)).toEqual(document);
	});

	it('keeps the ref order and the pins', () => {
		const { config, skillRefs } = fromAgentDocument(document);

		expect(toAgentDocument(config, skillRefs).skills).toEqual([
			{ type: 'skill', id: 'refunds' },
			{ type: 'skill', id: 'billing', versionId: '0b2c6f1e-7d3a-4c1b-9f2e-5a6b7c8d9e0f' },
			{ type: 'skill', id: 'apology' },
		]);
	});

	it('keeps a document without a skill list apart from one with an empty list', () => {
		const { skills: _skills, ...withoutSkills } = document;

		expect(fromAgentDocument(withoutSkills).skillRefs).toBeUndefined();
		expect(toAgentDocument(fromAgentDocument(withoutSkills).config, undefined)).not.toHaveProperty(
			'skills',
		);
		expect(toAgentDocument(fromAgentDocument(withoutSkills).config, []).skills).toEqual([]);
	});

	it('replaces a skills key that the stored config still holds', () => {
		const stored = storedAgentConfig(document);

		expect(toAgentDocument(stored, undefined)).not.toHaveProperty('skills');
		expect(toAgentDocument(stored, [{ type: 'skill', id: 'other' }]).skills).toEqual([
			{ type: 'skill', id: 'other' },
		]);
	});

	it('gives the same config hash after a round trip', () => {
		const { config, skillRefs } = fromAgentDocument(document);

		expect(getAgentConfigHash(toAgentDocument(config, skillRefs))).toBe(
			getAgentConfigHash(document),
		);
	});
});

describe('config hash of a stored agent', () => {
	// Clients send this hash back as the base hash of a save, so an accidental change to
	// how skill refs compose must fail here.
	const CONFIG_HASH = '1c29b5f1b9a64d762f735e1c218b23da83416ee305dca842f807019a6b4ba752';

	it('composes the same document and hash from the stored config and its refs', async () => {
		const { integrations, ...schema } = document;
		const agent = { id: 'agent-1', schema: storedAgentConfig(schema), integrations } as Agent;

		const skillRefs = await createAgentSkillRefsService().refsForDraft(agent, {});
		const composed = composeJsonConfig(agent, skillRefs);

		expect(composed).toEqual(document);
		expect(getAgentConfigHash(composed)).toBe(CONFIG_HASH);
	});
});
