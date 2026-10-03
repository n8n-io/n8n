import { createComponentRenderer } from '@n8n/frontend-test-utils';
import AgentsTable from './AgentsTable.vue';

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: () => ({ resolve: () => ({ fullPath: '/agents/agent-1' }) }),
}));

const createComponent = createComponentRenderer(AgentsTable);

describe('AgentsTable loading', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('keeps the skeleton hidden when the initial load finishes before 300 ms', async () => {
		const { container, rerender, getByTestId } = createComponent({
			props: { agents: [], loading: true },
		});
		await vi.advanceTimersByTimeAsync(100);
		expect(container.querySelector('.n8n-loading')).not.toBeVisible();
		await rerender({ loading: false });
		await vi.advanceTimersByTimeAsync(300);
		expect(container.querySelector('.n8n-loading')).not.toBeInTheDocument();
		expect(getByTestId('mcp-agent-table-empty-state')).toBeVisible();
	});

	it('reveals the skeleton after 300 ms during the initial load', async () => {
		const { container } = createComponent({ props: { agents: [], loading: true } });
		await vi.advanceTimersByTimeAsync(299);
		expect(container.querySelector('.n8n-loading')).not.toBeVisible();
		await vi.advanceTimersByTimeAsync(1);
		expect(container.querySelector('.n8n-loading')).toBeVisible();
	});

	it.each([false, true])(
		'retains completed content during a short refresh (has rows: %s)',
		async (hasRows) => {
			const agents = hasRows ? [{ id: 'agent-1', name: 'Test Agent', projectId: 'project-1' }] : [];
			const testId = hasRows ? 'mcp-agent-name' : 'mcp-agent-table-empty-state';
			const { container, rerender, getByTestId } = createComponent({
				props: { agents, loading: false },
			});
			const content = getByTestId(testId);
			await rerender({ loading: true });
			await vi.advanceTimersByTimeAsync(100);
			expect(content).toBeVisible();
			expect(container.querySelector('.n8n-loading')).not.toBeInTheDocument();
			await rerender({ loading: false });
			expect(getByTestId(testId)).toBe(content);
			await rerender({ loading: true });
			await vi.advanceTimersByTimeAsync(300);
			expect(content).not.toBeInTheDocument();
			expect(container.querySelector('.n8n-loading')).toBeVisible();
			await rerender({ loading: false });
			expect(getByTestId(testId)).toBeVisible();
		},
	);
});
