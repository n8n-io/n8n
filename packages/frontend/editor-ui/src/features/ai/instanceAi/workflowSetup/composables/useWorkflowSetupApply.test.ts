import { defineComponent, nextTick, ref, type Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { useInstanceAiStore } from '../../instanceAi.store';
import { useWorkflowSetupApply } from './useWorkflowSetupApply';

const toast = vi.hoisted(() => ({
	showError: vi.fn(),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => toast,
}));

interface Harness {
	requestId: Ref<string>;
	result: Ref<unknown>;
	store: {
		confirmAction: ReturnType<typeof vi.fn>;
		resolveConfirmation: ReturnType<typeof vi.fn>;
		findToolCallByRequestId: ReturnType<typeof vi.fn>;
	};
	applyMachine: ReturnType<typeof useWorkflowSetupApply>;
}

function setupHarness(initialResult?: unknown): Harness {
	const requestId = ref('req-1');
	const result = ref<unknown>(initialResult);
	const store = {
		confirmAction: vi.fn().mockResolvedValue(true),
		resolveConfirmation: vi.fn(),
		findToolCallByRequestId: vi.fn(() => ({ result: result.value })),
	};

	const applyMachine = useWorkflowSetupApply({
		requestId,
		store: store as unknown as ReturnType<typeof useInstanceAiStore>,
	});

	return { requestId, result, store, applyMachine };
}

function setupMountedHarness(initialResult?: unknown): Harness & { unmount: () => void } {
	let harness!: Harness;
	const Component = defineComponent({
		setup() {
			harness = setupHarness(initialResult);
			return () => null;
		},
	});
	const wrapper = mount(Component);

	return { ...harness, unmount: () => wrapper.unmount() };
}

describe('useWorkflowSetupApply', () => {
	beforeEach(() => {
		toast.showError.mockClear();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('ignores concurrent apply calls while already applying', async () => {
		const h = setupHarness();
		let resolveConfirm: (success: boolean) => void = () => {};
		h.store.confirmAction.mockReturnValueOnce(
			new Promise<boolean>((resolve) => {
				resolveConfirm = resolve;
			}),
		);

		const first = h.applyMachine.apply({});
		await h.applyMachine.apply({});

		expect(h.applyMachine.terminalState.value).toBe('applying');
		expect(h.store.confirmAction).toHaveBeenCalledTimes(1);

		resolveConfirm(false);
		await first;
	});

	it('posts apply confirmation with node credentials', async () => {
		const h = setupHarness({ success: true });
		const nodeCredentials = { 'HTTP Request': { httpBasicAuth: 'cred-1' } };

		await h.applyMachine.apply(nodeCredentials);

		expect(h.store.confirmAction).toHaveBeenCalledWith(
			'req-1',
			true,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			{
				action: 'apply',
				nodeCredentials,
			},
		);
	});

	it('resets state when posting apply confirmation fails', async () => {
		const h = setupHarness();
		h.store.confirmAction.mockResolvedValueOnce(false);

		await h.applyMachine.apply({});

		expect(h.applyMachine.terminalState.value).toBeNull();
		expect(toast.showError).not.toHaveBeenCalled();
		expect(h.store.resolveConfirmation).not.toHaveBeenCalled();
	});

	it('sets applied terminal state and resolves confirmation on success', async () => {
		const h = setupHarness({ success: true });

		await h.applyMachine.apply({});

		expect(h.applyMachine.terminalState.value).toBe('applied');
		expect(h.store.resolveConfirmation).toHaveBeenCalledWith('req-1', 'approved');
	});

	it('sets partial terminal state when the result is partial', async () => {
		const h = setupHarness({ success: true, partial: true });

		await h.applyMachine.apply({});

		expect(h.applyMachine.terminalState.value).toBe('partial');
		expect(h.store.resolveConfirmation).toHaveBeenCalledWith('req-1', 'approved');
	});

	it('shows an error and resets state when apply result fails', async () => {
		const h = setupHarness({ success: false, error: 'Could not apply credentials' });

		await h.applyMachine.apply({});

		expect(h.applyMachine.terminalState.value).toBeNull();
		expect(toast.showError).toHaveBeenCalledWith(expect.any(Error), 'Setup failed');
		expect(toast.showError.mock.calls[0][0].message).toBe('Could not apply credentials');
		expect(h.store.resolveConfirmation).not.toHaveBeenCalled();
	});

	it('uses the latest request id when applying', async () => {
		const h = setupHarness({ success: true });
		h.requestId.value = 'req-2';

		await h.applyMachine.apply({});

		expect(h.store.confirmAction).toHaveBeenCalledWith(
			'req-2',
			true,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			expect.any(Object),
		);
		expect(h.store.resolveConfirmation).toHaveBeenCalledWith('req-2', 'approved');
	});

	it('waits for an async tool result after posting apply confirmation', async () => {
		const h = setupHarness();

		const pendingApply = h.applyMachine.apply({});
		await nextTick();
		expect(h.applyMachine.terminalState.value).toBe('applying');

		h.result.value = { success: true };
		await pendingApply;

		expect(h.applyMachine.terminalState.value).toBe('applied');
	});

	it('times out waiting for an apply result', async () => {
		vi.useFakeTimers();
		const h = setupHarness();

		const pendingApply = h.applyMachine.apply({});
		await vi.advanceTimersByTimeAsync(60_000);
		await pendingApply;

		expect(h.applyMachine.terminalState.value).toBeNull();
		expect(toast.showError).toHaveBeenCalledWith(expect.any(Error), 'Setup failed');
		expect(toast.showError.mock.calls[0][0].message).toBe('Apply timed out — please try again.');
	});

	it('settles a pending apply when unmounted', async () => {
		const h = setupMountedHarness();

		const pendingApply = h.applyMachine.apply({});
		await nextTick();
		expect(h.applyMachine.terminalState.value).toBe('applying');

		h.unmount();
		await pendingApply;

		expect(h.applyMachine.terminalState.value).toBeNull();
		expect(toast.showError).not.toHaveBeenCalled();
		expect(h.store.resolveConfirmation).not.toHaveBeenCalled();
	});

	it('ignores defer calls while already applying', async () => {
		const h = setupHarness();
		let resolveConfirm: (success: boolean) => void = () => {};
		h.store.confirmAction.mockReturnValueOnce(
			new Promise<boolean>((resolve) => {
				resolveConfirm = resolve;
			}),
		);

		const first = h.applyMachine.defer();
		await h.applyMachine.defer();

		expect(h.applyMachine.terminalState.value).toBe('applying');
		expect(h.store.confirmAction).toHaveBeenCalledTimes(1);

		resolveConfirm(false);
		await first;
	});

	it('sets deferred terminal state and resolves confirmation on defer success', async () => {
		const h = setupHarness();

		await h.applyMachine.defer();

		expect(h.store.confirmAction).toHaveBeenCalledWith('req-1', false);
		expect(h.applyMachine.terminalState.value).toBe('deferred');
		expect(h.store.resolveConfirmation).toHaveBeenCalledWith('req-1', 'deferred');
	});

	it('resets state when defer confirmation fails', async () => {
		const h = setupHarness();
		h.store.confirmAction.mockResolvedValueOnce(false);

		await h.applyMachine.defer();

		expect(h.applyMachine.terminalState.value).toBeNull();
		expect(h.store.resolveConfirmation).not.toHaveBeenCalled();
	});
});
