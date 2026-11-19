import { InMemoryPagesStore } from './test-utils/in-memory-pages-store';
import { InMemorySkillSourceClient } from './test-utils/in-memory-skill-source-client';
import { describeSkillSourceClientContract } from './test-utils/skill-source-client.contract';

describe('InMemorySkillSourceClient', () => {
	let store: InMemoryPagesStore;
	let client: InMemorySkillSourceClient;

	beforeEach(() => {
		store = new InMemoryPagesStore();
		client = new InMemorySkillSourceClient(store);
	});

	describeSkillSourceClientContract(() => ({
		client,
		publish: async (skills) => store.publishDatabase(skills),
		edit: async (link, name, content) => store.editPage(link, name, content),
		remove: async (link, name) => store.removePage(link, name),
		invalidLinks: ['https://example.com/acme/skills', 'https://pages.test/only-workspace'],
		missingLink: 'https://pages.test/acme/no-such-database',
	}));
});
