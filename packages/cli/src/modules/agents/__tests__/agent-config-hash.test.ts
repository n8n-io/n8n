import type { AgentJsonConfig } from '@n8n/api-types';
import { getAgentRuntimeDefinitionHash } from '../utils/agent-config-hash';

const config: AgentJsonConfig = {
	name: 'Reviewer',
	model: 'anthropic/test',
	instructions: 'Review changes',
};

describe('Agent runtime definition hash', () => {
	it('ignores object key order', () => {
		expect(getAgentRuntimeDefinitionHash(config, { first: 'a', second: 'b' })).toBe(
			getAgentRuntimeDefinitionHash(
				{ instructions: config.instructions, model: config.model, name: config.name },
				{ second: 'b', first: 'a' },
			),
		);
	});

	it('includes tool implementations and connected destinations', () => {
		const hash = getAgentRuntimeDefinitionHash(config);
		expect(getAgentRuntimeDefinitionHash(config, { write: 'changed' })).not.toBe(hash);
		expect(
			getAgentRuntimeDefinitionHash(config, {}, [{ type: 'slack', credentialId: 'credential' }]),
		).not.toBe(hash);
	});
});
