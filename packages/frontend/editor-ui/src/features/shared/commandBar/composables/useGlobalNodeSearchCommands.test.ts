import { ref } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { NodeSearchHit } from '@n8n/api-types';
import { VIEWS } from '@/app/constants';
import { useGlobalNodeSearchCommands } from './useGlobalNodeSearchCommands';
import * as workflowsApi from '@/app/api/workflows';

const routerPushMock = vi.fn();
vi.mock('vue-router', () => ({
	useRouter: () => ({ push: routerPushMock, resolve: vi.fn(() => ({ fullPath: '/resolved' })) }),
	useRoute: () => ({ name: VIEWS.WORKFLOWS, params: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/app/api/workflows', () => ({ searchWorkflowNodes: vi.fn() }));

const hit = (overrides: Partial<NodeSearchHit> = {}): NodeSearchHit => ({
	workflowId: 'wf-1',
	workflowName: 'Alerting',
	projectName: 'Team',
	isArchived: false,
	nodeId: 'node-1',
	nodeName: 'Send Slack Alert',
	nodeType: 'n8n-nodes-base.noOp',
	disabled: false,
	isSticky: false,
	...overrides,
});

/** Lets the debounce (300ms) and any pending promises settle. */
async function flush(ms = 400) {
	await vi.advanceTimersByTimeAsync(ms);
}

describe('useGlobalNodeSearchCommands', () => {
	const searchMock = vi.mocked(workflowsApi.searchWorkflowNodes);

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		setActivePinia(createTestingPinia());
	});

	const setup = () => useGlobalNodeSearchCommands({ lastQuery: ref(''), activeNodeId: ref(null) });

	it('navigates via the router rather than a full page load', async () => {
		searchMock.mockResolvedValue({ results: [hit()] });
		const options = { lastQuery: ref('slack'), activeNodeId: ref<string | null>(null) };
		const { commands, handlers } = useGlobalNodeSearchCommands(options);

		handlers!.onCommandBarChange!('slack');
		await flush();

		expect(commands.value).toHaveLength(1);
		commands.value[0].handler?.();

		expect(routerPushMock).toHaveBeenCalledWith({
			name: VIEWS.WORKFLOW,
			params: { workflowId: 'wf-1', nodeId: 'node-1' },
		});
	});

	it('does not query below the minimum query length', async () => {
		const { handlers } = setup();

		handlers!.onCommandBarChange!('sl');
		await flush();

		expect(searchMock).not.toHaveBeenCalled();
	});

	it('ignores a slow response that is superseded by a newer query', async () => {
		const options = { lastQuery: ref('second'), activeNodeId: ref<string | null>(null) };
		const { commands, handlers } = useGlobalNodeSearchCommands(options);

		// First call resolves *after* the second one, simulating out-of-order responses.
		let resolveFirst: (v: { results: NodeSearchHit[] }) => void = () => {};
		searchMock.mockImplementationOnce(async () => await new Promise((res) => (resolveFirst = res)));
		searchMock.mockResolvedValueOnce({
			results: [hit({ nodeId: 'node-2', nodeName: 'Second result' })],
		});

		handlers!.onCommandBarChange!('first');
		await flush();
		handlers!.onCommandBarChange!('second');
		await flush();

		resolveFirst({ results: [hit({ nodeId: 'node-stale', nodeName: 'Stale result' })] });
		await flush(0);

		const names = commands.value.map((c) => c.id);
		expect(names).toEqual(['global-node-wf-1-node-2']);
		expect(names.some((n) => n.includes('stale'))).toBe(false);
	});

	it('clears results and ignores in-flight responses after navigating away', async () => {
		const options = { lastQuery: ref('slack'), activeNodeId: ref<string | null>(null) };
		const { commands, handlers } = useGlobalNodeSearchCommands(options);

		let resolvePending: (v: { results: NodeSearchHit[] }) => void = () => {};
		searchMock.mockImplementationOnce(
			async () => await new Promise((res) => (resolvePending = res)),
		);

		handlers!.onCommandBarChange!('slack');
		await flush();

		handlers!.onCommandBarNavigateTo!('some-page');
		resolvePending({ results: [hit()] });
		await flush(0);

		expect(commands.value).toEqual([]);
	});
});
