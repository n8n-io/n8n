/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern: @vue/test-utils is a transitive devDep */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { computed, defineComponent, h, ref } from 'vue';
import { useSubAgentNames } from '../composables/useSubAgentNames';
import { AGENT_SUB_AGENT_NAMES_KEY } from '../components/agentChatInjectionKeys';
import { __clearProjectAgentsListCacheForTests } from '../composables/useProjectAgentsList';

const listAgents = vi.fn();

vi.mock('../composables/useAgentApi', () => ({
	listAgents: (...args: unknown[]) => listAgents(...args),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

function mountHarness(
	projectId: string,
	isNeeded: () => boolean,
	providedNames?: Map<string, string>,
) {
	let exposed!: ReturnType<typeof useSubAgentNames>;
	const Harness = defineComponent({
		setup() {
			exposed = useSubAgentNames(ref(projectId), isNeeded);
			return () => h('div');
		},
	});
	mount(Harness, {
		global: {
			provide: providedNames
				? { [AGENT_SUB_AGENT_NAMES_KEY as symbol]: computed(() => providedNames) }
				: {},
		},
	});
	return exposed;
}

describe('useSubAgentNames', () => {
	beforeEach(() => {
		__clearProjectAgentsListCacheForTests();
		listAgents.mockReset();
	});

	it('returns the provided map and never fetches the project agents list', async () => {
		const provided = new Map([['sub-1', 'Research Agent']]);
		const { subAgentNameById } = mountHarness('project-1', () => true, provided);

		expect(subAgentNameById.value).toBe(provided);
		await Promise.resolve();
		expect(listAgents).not.toHaveBeenCalled();
	});

	it('without a provided map, skips the fetch until needed, then resolves names', async () => {
		listAgents.mockResolvedValueOnce([{ id: 'sub-1', name: 'Research Agent' }]);
		const { subAgentNameById } = mountHarness('project-1', () => false);

		await Promise.resolve();
		expect(listAgents).not.toHaveBeenCalled();
		expect(subAgentNameById.value).toEqual(new Map());

		const { subAgentNameById: namesOnceNeeded } = mountHarness('project-1', () => true);
		await Promise.resolve();
		await Promise.resolve();
		expect(listAgents).toHaveBeenCalledTimes(1);
		expect(namesOnceNeeded.value).toEqual(new Map([['sub-1', 'Research Agent']]));
	});
});
