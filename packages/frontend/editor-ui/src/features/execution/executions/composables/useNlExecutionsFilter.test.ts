import { setActivePinia, createPinia } from 'pinia';
import { useNlExecutionsFilter } from './useNlExecutionsFilter';
import { useExecutionsStore } from '../executions.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import * as assistantApi from '@/features/ai/assistant/assistant.api';
import { useRootStore } from '@n8n/stores/useRootStore';

vi.mock('@/features/ai/assistant/assistant.api', () => ({
	generateCodeForPrompt: vi.fn(),
}));

describe('useNlExecutionsFilter', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		const rootStore = useRootStore();
		rootStore.setPushRef('push-ref-test');

		const executionsStore = useExecutionsStore();
		vi.spyOn(executionsStore, 'fetchExecutions').mockResolvedValue({
			count: 0,
			results: [],
			estimated: false,
			concurrentExecutionsCount: 0,
		});
		vi.spyOn(executionsStore, 'resetData').mockImplementation(() => {});
	});

	it('translates "failed runs" into a filter with status=error and writes it to the store', async () => {
		vi.mocked(assistantApi.generateCodeForPrompt).mockResolvedValue({
			code: '{"status":"error"}',
		});

		const { translate } = useNlExecutionsFilter();
		const result = await translate('failed runs');

		expect(result.ok).toBe(true);
		const store = useExecutionsStore();
		expect(store.filters.status).toBe('error');
	});

	it('returns ok=false and does NOT mutate the store when the AI emits invalid JSON', async () => {
		vi.mocked(assistantApi.generateCodeForPrompt).mockResolvedValue({
			code: 'this is not json',
		});

		const store = useExecutionsStore();
		const before = { ...store.filters };

		const { translate } = useNlExecutionsFilter();
		const result = await translate('whatever');

		expect(result.ok).toBe(false);
		expect(store.filters).toEqual(before);
	});

	it('returns ok=false when the AI emits JSON that fails the schema', async () => {
		vi.mocked(assistantApi.generateCodeForPrompt).mockResolvedValue({
			code: '{"status":"explosion"}',
		});

		const { translate } = useNlExecutionsFilter();
		const result = await translate('weird');

		expect(result.ok).toBe(false);
	});

	it('resolves a workflow by name from the workflowsList store', async () => {
		const workflowsList = useWorkflowsListStore();
		workflowsList.$patch({
			workflowsById: {
				'wf-42': { id: 'wf-42', name: 'Daily Report' } as never,
			},
		});

		vi.mocked(assistantApi.generateCodeForPrompt).mockResolvedValue({
			code: '{"workflowName":"Daily Report","status":"success"}',
		});

		const { translate } = useNlExecutionsFilter();
		const result = await translate('successful daily report runs');

		expect(result.ok).toBe(true);
		const store = useExecutionsStore();
		expect(store.filters.workflowId).toBe('wf-42');
		expect(store.filters.status).toBe('success');
	});

	it('triggers a refetch after applying the new filter', async () => {
		vi.mocked(assistantApi.generateCodeForPrompt).mockResolvedValue({
			code: '{"status":"success"}',
		});
		const store = useExecutionsStore();

		const { translate } = useNlExecutionsFilter();
		await translate('successful');

		expect(store.fetchExecutions).toHaveBeenCalled();
	});

	it('returns ok=false with reason=network when the AI call throws, and does not mutate the store or refetch', async () => {
		vi.mocked(assistantApi.generateCodeForPrompt).mockRejectedValue(new Error('boom'));
		const store = useExecutionsStore();
		const before = { ...store.filters };
		vi.mocked(store.fetchExecutions).mockClear();

		const { translate } = useNlExecutionsFilter();
		const result = await translate('anything');

		expect(result).toEqual({ ok: false, reason: 'network' });
		expect(store.filters).toEqual(before);
		expect(store.fetchExecutions).not.toHaveBeenCalled();
	});

	it('returns parse without calling the AI when given whitespace-only input', async () => {
		const { translate } = useNlExecutionsFilter();
		const result = await translate('   ');

		expect(result).toEqual({ ok: false, reason: 'parse' });
		expect(assistantApi.generateCodeForPrompt).not.toHaveBeenCalled();
	});
});
