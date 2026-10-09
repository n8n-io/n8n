import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { ResponseError } from '@n8n/rest-api-client';

import { agentsEventBus } from '../../agents.eventBus';
import { MAX_APPLY_SUGGESTIONS } from '../../agentEvals.types';
import {
	AGENT_CONFIG_WRITE_KEY,
	type AgentConfigWrite,
} from '../../components/agentBuilderInjectionKeys';
import { useApplyAgentEvalSuggestions } from '../useApplyAgentEvalSuggestions';

const showError = vi.hoisted(() => vi.fn());
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));
vi.mock('@n8n/i18n', () => ({ useI18n: () => ({ baseText: (key: string) => key }) }));

const store = vi.hoisted(() => ({
	applySuggestions: vi.fn(),
	applyPreviewSuggestion: vi.fn(),
}));
vi.mock('../../agentEvals.store', () => ({ useAgentEvalsStore: () => store }));

const ids = (count: number) => Array.from({ length: count }, (_, i) => `r${i}`);

function setup(runWrite?: AgentConfigWrite) {
	const target = ref({ projectId: 'project-1', agentId: 'agent-1' });
	let api!: ReturnType<typeof useApplyAgentEvalSuggestions>;
	mount(
		defineComponent({
			setup() {
				api = useApplyAgentEvalSuggestions(() => target.value);
				return () => null;
			},
		}),
		{ global: { provide: runWrite ? { [AGENT_CONFIG_WRITE_KEY as symbol]: runWrite } : {} } },
	);
	return { api, target };
}

describe('useApplyAgentEvalSuggestions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('sends a long list as successive batches of at most one request’s worth', async () => {
		store.applySuggestions.mockResolvedValue({ configHash: 'h', results: [] });
		const { api } = setup();

		await expect(api.applySuggestions(ids(MAX_APPLY_SUGGESTIONS + 2))).resolves.toBe(true);

		expect(store.applySuggestions).toHaveBeenCalledTimes(2);
		expect(store.applySuggestions.mock.calls[0][2]).toHaveLength(MAX_APPLY_SUGGESTIONS);
		expect(store.applySuggestions.mock.calls[1][2]).toEqual(['r10', 'r11']);
	});

	it('keeps every batch on the agent it started on, even if the target changes', async () => {
		const { api, target } = setup();
		store.applySuggestions.mockImplementationOnce(async () => {
			target.value = { projectId: 'project-2', agentId: 'agent-2' };
			return { configHash: 'h', results: [] };
		});
		store.applySuggestions.mockResolvedValue({ configHash: 'h', results: [] });

		await api.applySuggestions(ids(MAX_APPLY_SUGGESTIONS + 1));

		expect(
			store.applySuggestions.mock.calls.map(([projectId, agentId]) => [projectId, agentId]),
		).toEqual([
			['project-1', 'agent-1'],
			['project-1', 'agent-1'],
		]);
	});

	it('goes on to the next batch when one has nothing left to send', async () => {
		store.applySuggestions.mockResolvedValueOnce(null);
		store.applySuggestions.mockResolvedValueOnce({ configHash: 'h', results: [] });
		const { api } = setup();

		await expect(api.applySuggestions(ids(MAX_APPLY_SUGGESTIONS + 1))).resolves.toBe(true);

		expect(store.applySuggestions).toHaveBeenCalledTimes(2);
		expect(showError).not.toHaveBeenCalled();
	});

	describe('with the builder’s locked write', () => {
		const lockingWrite = () => {
			const order: string[] = [];
			const write: AgentConfigWrite = async (work) => {
				order.push('lock');
				try {
					return await work();
				} finally {
					order.push('unlock');
				}
			};
			return { order, write };
		};

		it('sends every batch inside one locked write', async () => {
			const { order, write } = lockingWrite();
			store.applySuggestions.mockImplementation(async () => {
				order.push('apply');
				return { configHash: 'h', results: [] };
			});
			const { api } = setup(write);

			await api.applySuggestions(ids(MAX_APPLY_SUGGESTIONS + 1));

			expect(order).toEqual(['lock', 'apply', 'apply', 'unlock']);
		});

		it('leaves the reload to the builder instead of announcing the change itself', async () => {
			const emit = vi.spyOn(agentsEventBus, 'emit');
			store.applySuggestions.mockResolvedValue({ configHash: 'h', results: [] });
			const { api } = setup(lockingWrite().write);

			await api.applySuggestions(['r0']);

			expect(emit).not.toHaveBeenCalled();
		});

		it('still lets the builder finish, and reload, when a request fails', async () => {
			const { order, write } = lockingWrite();
			store.applySuggestions.mockRejectedValue(new Error('rerun failed'));
			const { api } = setup(write);

			await expect(api.applySuggestions(['r0'])).resolves.toBe(false);

			expect(order).toEqual(['lock', 'unlock']);
			expect(showError).toHaveBeenCalledWith(
				expect.any(Error),
				'agents.builder.agentEvals.suggestion.applyError',
			);
		});

		it('sends nothing and toasts when the builder cannot save its pending edits', async () => {
			const { api } = setup(async () => {
				throw new Error('save failed');
			});

			await expect(api.applySuggestions(['r0'])).resolves.toBe(false);
			await expect(
				api.applyPreviewSuggestion({ input: 'a', whatToCheck: 'b', suggestion: 'c' }),
			).resolves.toBeNull();

			expect(store.applySuggestions).not.toHaveBeenCalled();
			expect(store.applyPreviewSuggestion).not.toHaveBeenCalled();
			expect(showError).toHaveBeenCalledTimes(2);
		});

		it('runs a preview suggestion inside the locked write too', async () => {
			const { order, write } = lockingWrite();
			store.applyPreviewSuggestion.mockImplementation(async () => {
				order.push('apply');
				return { configHash: 'h', preview: { status: 'failed' as const } };
			});
			const { api } = setup(write);

			await api.applyPreviewSuggestion({ input: 'a', whatToCheck: 'b', suggestion: 'c' });

			expect(order).toEqual(['lock', 'apply', 'unlock']);
		});
	});

	describe('without a builder', () => {
		it('tells other surfaces to refresh after a write', async () => {
			const emit = vi.spyOn(agentsEventBus, 'emit');
			store.applySuggestions.mockResolvedValue({ configHash: 'h', results: [] });
			const { api } = setup();

			await api.applySuggestions(['r0']);

			expect(emit).toHaveBeenCalledWith('agentUpdated', {
				agentId: 'agent-1',
				source: 'agent-evals',
			});
		});

		it('tells them to refresh when the write failed too, since the server may have saved', async () => {
			const emit = vi.spyOn(agentsEventBus, 'emit');
			store.applySuggestions.mockRejectedValue(new Error('rerun failed'));
			const { api } = setup();

			await api.applySuggestions(['r0']);

			expect(emit).toHaveBeenCalledTimes(1);
		});
	});

	it('stops after the first failed batch and toasts it', async () => {
		store.applySuggestions.mockRejectedValue(new Error('boom'));
		const { api } = setup();

		await expect(api.applySuggestions(ids(MAX_APPLY_SUGGESTIONS + 1))).resolves.toBe(false);

		expect(store.applySuggestions).toHaveBeenCalledTimes(1);
		expect(showError).toHaveBeenCalledWith(
			expect.any(Error),
			'agents.builder.agentEvals.suggestion.applyError',
		);
	});

	it('names a conflict differently from other failures', async () => {
		store.applySuggestions.mockRejectedValue(
			new ResponseError('conflict', { httpStatusCode: 409 }),
		);
		const { api } = setup();

		await api.applySuggestions(['r0']);

		expect(showError).toHaveBeenCalledWith(
			expect.any(ResponseError),
			'agents.builder.agentEvals.suggestion.conflictError',
		);
	});

	it('ignores a second apply, and a preview apply, while one is running', async () => {
		let finish: (value: { configHash: string; results: never[] }) => void = () => {};
		store.applySuggestions.mockImplementation(
			async () => await new Promise((resolve) => (finish = resolve)),
		);
		const { api } = setup();

		const first = api.applySuggestions(['r0']);
		await expect(api.applySuggestions(['r1'])).resolves.toBe(false);
		await expect(
			api.applyPreviewSuggestion({ input: 'a', whatToCheck: 'b', suggestion: 'c' }),
		).resolves.toBeNull();
		finish({ configHash: 'h', results: [] });
		await first;

		expect(store.applySuggestions).toHaveBeenCalledTimes(1);
		expect(store.applyPreviewSuggestion).not.toHaveBeenCalled();
		expect(api.applyingIds.value).toEqual([]);
	});

	it('applies a preview suggestion and returns its result', async () => {
		const result = { configHash: 'h', preview: { status: 'failed' as const } };
		store.applyPreviewSuggestion.mockResolvedValue(result);
		const { api } = setup();
		const options = { input: 'a', whatToCheck: 'b', suggestion: 'c' };

		await expect(api.applyPreviewSuggestion(options)).resolves.toBe(result);

		expect(store.applyPreviewSuggestion).toHaveBeenCalledWith('project-1', 'agent-1', options);
		expect(api.applyingPreview.value).toBe(false);
	});

	it('returns null for a preview suggestion that failed', async () => {
		store.applyPreviewSuggestion.mockRejectedValue(new Error('boom'));
		const { api } = setup();

		await expect(
			api.applyPreviewSuggestion({ input: 'a', whatToCheck: 'b', suggestion: 'c' }),
		).resolves.toBeNull();
		expect(showError).toHaveBeenCalled();
	});
});
