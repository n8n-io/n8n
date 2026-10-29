import { UnexpectedError } from '@n8n/errors';

import { SkillSourceClientRegistry } from '../sources/skill-source-client-registry.service';
import { InMemoryPagesStore } from './test-utils/in-memory-pages-store';
import { InMemorySkillSourceClient } from './test-utils/in-memory-skill-source-client';

describe('SkillSourceClientRegistry', () => {
	it('finds a registered client by its source type', () => {
		const registry = new SkillSourceClientRegistry();
		const client = new InMemorySkillSourceClient(new InMemoryPagesStore());

		registry.register(client);

		expect(registry.get('pages')).toBe(client);
		expect(registry.types()).toEqual(['pages']);
	});

	it('answers undefined for a source type with no client', () => {
		expect(new SkillSourceClientRegistry().get('gitlab')).toBeUndefined();
	});

	it('refuses a second client for the same source type', () => {
		const registry = new SkillSourceClientRegistry();
		registry.register(new InMemorySkillSourceClient(new InMemoryPagesStore()));

		expect(() =>
			registry.register(new InMemorySkillSourceClient(new InMemoryPagesStore())),
		).toThrow(UnexpectedError);
	});
});
