import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, nextTick, ref, shallowRef } from 'vue';
import { mount, enableAutoUnmount } from '@vue/test-utils';

// `vi.hoisted` runs before the imports, so the ref is made inside the mock
// factory, which runs later. The holder only carries the setter.
const state = vi.hoisted(() => ({
	setDirty: (_value: boolean) => {},
}));

const mockWorkflowDocumentStore = vi.hoisted(() => ({
	workflowId: 'wf1',
	allNodes: [{ name: 'Node1' }],
}));

const fetchConfig = vi.hoisted(() => vi.fn());
const maybeShow = vi.hoisted(() => vi.fn());

vi.mock('@/app/stores/ui.store', () => {
	const stateIsDirty = ref(false);
	state.setDirty = (value: boolean) => {
		stateIsDirty.value = value;
	};
	return {
		useUIStore: () => ({
			get stateIsDirty() {
				return stateIsDirty.value;
			},
		}),
	};
});

vi.mock('@/app/composables/useAiGateway', () => ({
	useAiGateway: () => ({ fetchConfig }),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => shallowRef(mockWorkflowDocumentStore),
}));

vi.mock('./useGatewayOpportunityNudge', () => ({
	maybeShowGatewayOpportunityNudge: maybeShow,
}));

import { useGatewayOpportunityNudgeOnEdit } from './useGatewayOpportunityNudgeOnEdit';

const Host = defineComponent({
	setup() {
		useGatewayOpportunityNudgeOnEdit();
		return () => null;
	},
});

// Each mount installs a watcher. Without this the watchers of earlier tests
// stay alive and react to the same flag.
enableAutoUnmount(afterEach);

describe('useGatewayOpportunityNudgeOnEdit', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		state.setDirty(false);
		fetchConfig.mockResolvedValue(undefined);
		maybeShow.mockResolvedValue(undefined);
	});

	it('loads the gateway config when the workflow opens', () => {
		mount(Host);

		expect(fetchConfig).toHaveBeenCalled();
		expect(maybeShow).not.toHaveBeenCalled();
	});

	it('shows the nudge on the first edit of the workflow', async () => {
		mount(Host);

		state.setDirty(true);
		await nextTick();

		expect(maybeShow).toHaveBeenCalledWith([{ name: 'Node1' }], 'wf1');
	});

	it('does not show the nudge when the workflow becomes clean again', async () => {
		mount(Host);

		// A save clears the flag. That edge must not count as an edit.
		state.setDirty(true);
		await nextTick();
		state.setDirty(false);
		await nextTick();

		expect(maybeShow).toHaveBeenCalledTimes(1);
	});

	it('keeps editing usable when the nudge fails', async () => {
		maybeShow.mockRejectedValue(new Error('scan blew up'));
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		mount(Host);

		state.setDirty(true);
		await nextTick();
		await Promise.resolve();

		expect(consoleError).toHaveBeenCalled();
		consoleError.mockRestore();
	});
});
