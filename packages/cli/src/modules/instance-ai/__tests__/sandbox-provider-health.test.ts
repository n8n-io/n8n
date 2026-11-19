import { SandboxProviderHealth } from '@n8n/agents/sandbox';
import { Container } from '@n8n/di';

import { InstanceAiSandboxProviderHealth } from '../sandbox';

describe('InstanceAiSandboxProviderHealth', () => {
	it('is one circuit breaker for the whole process', () => {
		const health = Container.get(InstanceAiSandboxProviderHealth);

		expect(health).toBeInstanceOf(SandboxProviderHealth);
		expect(Container.get(InstanceAiSandboxProviderHealth)).toBe(health);
	});
});
