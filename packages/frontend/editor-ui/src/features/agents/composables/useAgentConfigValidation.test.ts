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

	it('fetches and exposes the validation result', async () => {
		getAgentConfigValidation.mockResolvedValue(makeValid());
		const { validation, loading, refresh } = useAgentConfigValidation();

		const promise = refresh('proj-1', 'agent-1');
		expect(loading.value).toBe(true);
		await promise;

		expect(getAgentConfigValidation).toHaveBeenCalledWith(expect.anything(), 'proj-1', 'agent-1');
		expect(validation.value).toEqual(makeValid());
		expect(loading.value).toBe(false);
	});

	it('drops a stale response when the pair changed before it resolved', async () => {
		let resolveFirst!: (value: AgentConfigValidationResponse) => void;
		const firstPromise = new Promise<AgentConfigValidationResponse>((resolve) => {
			resolveFirst = resolve;
		});
		getAgentConfigValidation.mockReturnValueOnce(firstPromise).mockResolvedValueOnce(makeInvalid());

		const { validation, refresh } = useAgentConfigValidation();
		const first = refresh('proj-1', 'agent-1');
		await refresh('proj-1', 'agent-2');
		expect(validation.value).toEqual(makeInvalid());

		resolveFirst(makeValid());
		await first;
		expect(validation.value).toEqual(makeInvalid());
	});

	it('invalidate clears the current result without fetching', async () => {
		getAgentConfigValidation.mockResolvedValue(makeValid());
		const { validation, invalidate, refresh } = useAgentConfigValidation();
		await refresh('proj-1', 'agent-1');
		expect(validation.value).not.toBeNull();

		invalidate();

		expect(validation.value).toBeNull();
		expect(getAgentConfigValidation).toHaveBeenCalledTimes(1);
	});

	it('repoint clears the result and prevents an in-flight fetch for the previous pair from landing', async () => {
		let resolveFirst!: (value: AgentConfigValidationResponse) => void;
		const firstPromise = new Promise<AgentConfigValidationResponse>((resolve) => {
			resolveFirst = resolve;
		});
		getAgentConfigValidation.mockReturnValueOnce(firstPromise);

		const { validation, loading, refresh, repoint } = useAgentConfigValidation();
		const first = refresh('proj-1', 'agent-1');

		repoint('proj-1', 'agent-2');
		expect(validation.value).toBeNull();
		expect(loading.value).toBe(false);

		resolveFirst(makeInvalid());
		await first;
		expect(validation.value).toBeNull();
	});
});
