import { describe, expect, it, vi } from 'vitest';
import { useWorkflowSetupApply } from './useWorkflowSetupApply';

describe('useWorkflowSetupApply', () => {
	it('should submit the apply body and stay in the applying state', async () => {
		const submit = vi.fn();
		const machine = useWorkflowSetupApply({ submit });

		await machine.apply({ nodeCredentials: {} });

		expect(submit).toHaveBeenCalledWith({ kind: 'setupWorkflowApply', nodeCredentials: {} });
		expect(machine.terminalState.value).toBe('applying');
	});

	it('should ignore a second apply while one is in flight', async () => {
		const submit = vi.fn();
		const machine = useWorkflowSetupApply({ submit });

		await machine.apply({ nodeCredentials: {} });
		await machine.apply({ nodeCredentials: {} });

		expect(submit).toHaveBeenCalledTimes(1);
	});

	it('should submit a deferral and mark the card deferred', async () => {
		const submit = vi.fn();
		const machine = useWorkflowSetupApply({ submit });

		await machine.defer();

		expect(submit).toHaveBeenCalledWith({ kind: 'approval', approved: false });
		expect(machine.terminalState.value).toBe('deferred');
	});
});
