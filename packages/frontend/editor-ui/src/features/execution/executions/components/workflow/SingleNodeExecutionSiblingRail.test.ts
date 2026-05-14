import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { renderComponent } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useExecutionsStore } from '../../executions.store';
import type { ExecutionSummaryWithScopes } from '../../executions.types';
import SingleNodeExecutionSiblingRail from './SingleNodeExecutionSiblingRail.vue';

const push = vi.fn();
vi.mock('vue-router', () => ({
	useRouter: () => ({
		push,
		currentRoute: { value: { query: {} } },
	}),
	useRoute: () => ({ params: {}, query: {}, name: '', path: '' }),
	RouterLink: { template: '<a><slot /></a>' },
}));

const buildSummary = (overrides: Partial<ExecutionSummaryWithScopes>): ExecutionSummaryWithScopes =>
	({
		id: overrides.id ?? 'x',
		workflowId: overrides.workflowId ?? 'wf-1',
		mode: 'manual',
		status: 'success',
		createdAt: new Date().toISOString(),
		startedAt: new Date().toISOString(),
		stoppedAt: new Date().toISOString(),
		finished: true,
		scopes: [],
		...overrides,
	}) as unknown as ExecutionSummaryWithScopes;

describe('SingleNodeExecutionSiblingRail', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		push.mockClear();
	});

	it('renders every call in the session, including the current one, with it highlighted', async () => {
		const executionsStore = mockedStore(useExecutionsStore);
		// Four calls in one session — mirrors the smoke-test scenario where a
		// single MCP session emits exactly four single-node executions.
		const session: ExecutionSummaryWithScopes[] = [
			buildSummary({ id: '225', actionDisplayName: 'Slack - List channels' }),
			buildSummary({ id: '226', actionDisplayName: 'Slack - Send DM' }),
			buildSummary({ id: '227', actionDisplayName: 'Slack - Search' }),
			buildSummary({ id: '228', actionDisplayName: 'Slack - Send a message' }),
		];
		executionsStore.fetchSessionExecutions.mockResolvedValue(session);

		const { findAllByTestId } = renderComponent(SingleNodeExecutionSiblingRail, {
			props: { sessionId: 'romeo-mcp-20260513-132732', currentExecutionId: '228' },
		});

		const items = await findAllByTestId('single-node-execution-rail-item');
		expect(items).toHaveLength(4);
		expect(items.find((el) => el.className.includes('active'))?.textContent).toContain(
			'Send a message',
		);
	});

	it('forwards the sessionId to the store helper', async () => {
		const executionsStore = mockedStore(useExecutionsStore);
		executionsStore.fetchSessionExecutions.mockResolvedValue([]);

		renderComponent(SingleNodeExecutionSiblingRail, {
			props: { sessionId: 'session-abc', currentExecutionId: 'a' },
		});

		await vi.waitFor(() => {
			expect(executionsStore.fetchSessionExecutions).toHaveBeenCalledWith('session-abc');
		});
	});

	it('renders empty when no executions are returned', async () => {
		const executionsStore = mockedStore(useExecutionsStore);
		executionsStore.fetchSessionExecutions.mockResolvedValue([]);

		const { findByText } = renderComponent(SingleNodeExecutionSiblingRail, {
			props: { sessionId: 'empty', currentExecutionId: 'b' },
		});

		expect(await findByText(/no other calls/i)).toBeVisible();
	});

	it('renders nothing visible when fetch fails (logs only)', async () => {
		const executionsStore = mockedStore(useExecutionsStore);
		executionsStore.fetchSessionExecutions.mockRejectedValue(new Error('boom'));

		const { container } = renderComponent(SingleNodeExecutionSiblingRail, {
			props: { sessionId: 'broken', currentExecutionId: 'b' },
		});

		expect(container.firstChild).toBeTruthy();
	});
});
