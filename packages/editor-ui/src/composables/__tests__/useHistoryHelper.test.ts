import { vi, describe, it, expect } from 'vitest';
import { MAIN_HEADER_TABS } from '@/constants';
import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { useHistoryHelper } from '../useHistoryHelper';
import { defineComponent, type PropType } from 'vue';
import type { RouteLocationNormalizedLoaded } from 'vue-router';

const undoMock = vi.fn();
const redoMock = vi.fn();
vi.mock('@/stores/ndv.store', () => ({
	useNDVStore: () => ({
		activeNodeName: null,
		activeNode: {},
	}),
}));
vi.mock('@/stores/history.store', () => {
	return {
		useHistoryStore: () => ({
			popUndoableToUndo: undoMock,
			popUndoableToRedo: redoMock,
		}),
	};
});
vi.mock('@/stores/ui.store', () => {
	return {
		useUIStore: () => ({
			isAnyModalOpen: false,
		}),
	};
});
vi.mock('vue-router', () => ({
	useRoute: () => ({}),
	RouterLink: vi.fn(),
}));

const TestComponent = defineComponent({
	props: {
		route: {
			type: Object as PropType<RouteLocationNormalizedLoaded>,
			required: true,
		},
	},
	setup(props) {
		useHistoryHelper(props.route);

		return {};
	},
	template: '<div />',
});

describe('useHistoryHelper', () => {
	beforeEach(() => {
		undoMock.mockClear();
		redoMock.mockClear();
	});
	it('should call undo when Ctrl+Z is pressed', async () => {
		// @ts-ignore
		render(TestComponent, {
			props: {
				route: {
					name: MAIN_HEADER_TABS.WORKFLOW,
					meta: {
						nodeView: true,
					},
				},
			},
		});

		await userEvent.keyboard('{Control>}z');
		await userEvent.keyboard('{Control>}z');

		expect(undoMock).toHaveBeenCalledTimes(2);
	});
	it('should call redo when Ctrl+Shift+Z is pressed', async () => {
		// @ts-ignore
		render(TestComponent, {
			props: {
				route: {
					name: MAIN_HEADER_TABS.WORKFLOW,
					meta: {
						nodeView: true,
					},
				},
			},
		});

		await userEvent.keyboard('{Control>}{Shift>}z');
		await userEvent.keyboard('{Control>}{Shift>}z');

		expect(redoMock).toHaveBeenCalledTimes(2);
	});
	it('should not call undo when Ctrl+Z if not on NodeView', async () => {
		// @ts-ignore
		render(TestComponent, { props: { route: {} } });

		await userEvent.keyboard('{Control>}z');
		await userEvent.keyboard('{Control>}z');

		expect(undoMock).toHaveBeenCalledTimes(0);
	});
});
