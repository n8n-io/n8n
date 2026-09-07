import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AgentConfigValidationResponse } from '@n8n/api-types';
import { useAgentConfigValidation } from './useAgentConfigValidation';

const { getAgentConfigValidation } = vi.hoisted(() => ({
	getAgentConfigValidation: vi.fn(),
}));

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	getAgentConfigValidation,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));

function makeValid(): AgentConfigValidationResponse {
	return { status: 'valid', issues: [] };
}

function makeInvalid(): AgentConfigValidationResponse {
	return {
		status: 'invalid',
		issues: [{ code: 'missing_credential', path: 'credential', capability: { kind: 'agent' } }],
	};
}

describe('useAgentConfigValidation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches and exposes the validation result, and invalidate clears it without fetching again', async () => {
		getAgentConfigValidation.mockResolvedValue(makeValid());
		const { validation, loading, invalidate, refresh } = useAgentConfigValidation();

		const promise = refresh('proj-1', 'agent-1');
		expect(loading.value).toBe(true);
		await promise;

		expect(getAgentConfigValidation).toHaveBeenCalledWith(expect.anything(), 'proj-1', 'agent-1');
		expect(validation.value).toEqual(makeValid());
		expect(loading.value).toBe(false);

		invalidate();

		expect(validation.value).toBeNull();
		expect(getAgentConfigValidation).toHaveBeenCalledTimes(1);
	});

	it('drops a stale in-flight response after repoint, then applies a fresh fetch for the new pair', async () => {
		let resolveFirst!: (value: AgentConfigValidationResponse) => void;
		const firstPromise = new Promise<AgentConfigValidationResponse>((resolve) => {
			resolveFirst = resolve;
		});
		getAgentConfigValidation.mockReturnValueOnce(firstPromise).mockResolvedValueOnce(makeInvalid());

		const { validation, loading, refresh, repoint } = useAgentConfigValidation();
		const first = refresh('proj-1', 'agent-1');

		repoint('proj-1', 'agent-2');
		expect(validation.value).toBeNull();
		expect(loading.value).toBe(false);

		resolveFirst(makeValid());
		await first;
		expect(validation.value).toBeNull();

		await refresh('proj-1', 'agent-2');
		expect(validation.value).toEqual(makeInvalid());
	});

	it('clears the result and stops loading when the fetch fails, without throwing', async () => {
		getAgentConfigValidation.mockResolvedValueOnce(makeValid());
		const { validation, loading, refresh } = useAgentConfigValidation();
		await refresh('proj-1', 'agent-1');
		expect(validation.value).toEqual(makeValid());

		getAgentConfigValidation.mockRejectedValueOnce(new Error('network down'));
		await expect(refresh('proj-1', 'agent-1')).resolves.toBeUndefined();

		expect(validation.value).toBeNull();
		expect(loading.value).toBe(false);
	});
});
