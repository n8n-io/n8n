import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MAIN_HEADER_TABS } from '@/app/constants';
import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { useHistoryHelper } from './useHistoryHelper';
import { defineComponent, type PropType } from 'vue';
import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { mock } from 'vitest-mock-extended';
import { Command, BulkCommand } from '@/app/models/history';

// Create mock functions
const popUndoableToUndoMock = vi.fn();
const popUndoableToRedoMock = vi.fn();
const pushUndoableToRedoMock = vi.fn();
const pushCommandToUndoMock = vi.fn();
const pushBulkCommandToUndoMock = vi.fn();
const historyStoreMock = {
	popUndoableToUndo: popUndoableToUndoMock,
	popUndoableToRedo: popUndoableToRedoMock,
	pushUndoableToRedo: pushUndoableToRedoMock,
	pushCommandToUndo: pushCommandToUndoMock,
	pushBulkCommandToUndo: pushBulkCommandToUndoMock,
	bulkInProgress: false,
};
const markStateDirtyMock = vi.fn();

const uiStoreMock = {
	isAnyModalOpen: false,
	markStateDirty: markStateDirtyMock,
};

const telemetryTrackMock = vi.fn();

vi.mock('@/features/ndv/shared/ndv.store', () => ({
	useNDVStore: () => ({
		activeNodeName: null,
		activeNode: {},
		isNDVOpen: false,
	}),
}));

vi.mock('@/app/stores/history.store', () => ({
	useHistoryStore: () => historyStoreMock,
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => uiStoreMock,
}));

vi.mock('./useTelemetry', () => ({
	useTelemetry: () => ({
		track: telemetryTrackMock,
	}),
}));

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

const workflowRoute = mock<RouteLocationNormalizedLoaded>({
	name: MAIN_HEADER_TABS.WORKFLOW,
	meta: { nodeView: true },
});

describe('useHistoryHelper', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		historyStoreMock.bulkInProgress = false;
		markStateDirtyMock.mockClear();
	});

	describe('keyboard shortcuts', () => {
		it('should call undo when Ctrl+Z is pressed', async () => {
			render(TestComponent, { props: { route: workflowRoute } });

			await userEvent.keyboard('{Control>}z');
			await userEvent.keyboard('{Control>}z');

			expect(popUndoableToUndoMock).toHaveBeenCalledTimes(2);
		});

		it('should call redo when Ctrl+Shift+Z is pressed', async () => {
			render(TestComponent, { props: { route: workflowRoute } });

			await userEvent.keyboard('{Control>}{Shift>}z');
			await userEvent.keyboard('{Control>}{Shift>}z');

			expect(popUndoableToRedoMock).toHaveBeenCalledTimes(2);
		});

		it('should not call undo when Ctrl+Z if not on NodeView', async () => {
			render(TestComponent, { props: { route: {} as RouteLocationNormalizedLoaded } });

			await userEvent.keyboard('{Control>}z');
			await userEvent.keyboard('{Control>}z');

			expect(popUndoableToUndoMock).toHaveBeenCalledTimes(0);
		});
	});

	describe('undo', () => {
		it('should do nothing when no command is available', async () => {
			popUndoableToUndoMock.mockReturnValue(undefined);
			render(TestComponent, { props: { route: workflowRoute } });

			await userEvent.keyboard('{Control>}z');

			expect(pushUndoableToRedoMock).not.toHaveBeenCalled();
			expect(telemetryTrackMock).not.toHaveBeenCalled();
		});

		it('should revert a Command and push to redo stack', async () => {
			const mockCommand = mock<Command>();
			mockCommand.revert.mockResolvedValue(undefined);
			mockCommand.getReverseCommand.mockReturnValue(mock<Command>());
			// Make instanceof Command return true
			Object.setPrototypeOf(mockCommand, Command.prototype);

			popUndoableToUndoMock.mockReturnValue(mockCommand);
			render(TestComponent, { props: { route: workflowRoute } });

			await userEvent.keyboard('{Control>}z');

			expect(mockCommand.revert).toHaveBeenCalled();
			expect(mockCommand.getReverseCommand).toHaveBeenCalled();
			expect(pushUndoableToRedoMock).toHaveBeenCalled();
			expect(markStateDirtyMock).toHaveBeenCalled();
			expect(telemetryTrackMock).toHaveBeenCalledWith('User hit undo', expect.any(Object));
		});

		it('should revert a BulkCommand and push to redo stack', async () => {
			const mockSubCommand = mock<Command>();
			mockSubCommand.revert.mockResolvedValue(undefined);
			mockSubCommand.getReverseCommand.mockReturnValue(mock<Command>());

			const mockBulkCommand = new BulkCommand([mockSubCommand]);

			popUndoableToUndoMock.mockReturnValue(mockBulkCommand);
			render(TestComponent, { props: { route: workflowRoute } });

			await userEvent.keyboard('{Control>}z');

			expect(mockSubCommand.revert).toHaveBeenCalled();
			expect(mockSubCommand.getReverseCommand).toHaveBeenCalled();
			expect(pushUndoableToRedoMock).toHaveBeenCalled();
			expect(telemetryTrackMock).toHaveBeenCalledWith('User hit undo', expect.any(Object));
		});
	});

	describe('redo', () => {
		it('should do nothing when no command is available', async () => {
			popUndoableToRedoMock.mockReturnValue(undefined);
			render(TestComponent, { props: { route: workflowRoute } });

			await userEvent.keyboard('{Control>}{Shift>}z');

			expect(pushCommandToUndoMock).not.toHaveBeenCalled();
			expect(telemetryTrackMock).not.toHaveBeenCalled();
		});

		it('should revert a Command and push to undo stack', async () => {
			const mockCommand = mock<Command>();
			mockCommand.revert.mockResolvedValue(undefined);
			mockCommand.getReverseCommand.mockReturnValue(mock<Command>());
			// Make instanceof Command return true
			Object.setPrototypeOf(mockCommand, Command.prototype);

			popUndoableToRedoMock.mockReturnValue(mockCommand);
			render(TestComponent, { props: { route: workflowRoute } });

			await userEvent.keyboard('{Control>}{Shift>}z');

			expect(mockCommand.revert).toHaveBeenCalled();
			expect(mockCommand.getReverseCommand).toHaveBeenCalled();
			expect(pushCommandToUndoMock).toHaveBeenCalledWith(expect.any(Object), false);
			expect(markStateDirtyMock).toHaveBeenCalled();
			expect(telemetryTrackMock).toHaveBeenCalledWith('User hit redo', expect.any(Object));
		});

		it('should revert a BulkCommand and push to undo stack', async () => {
			const mockSubCommand = mock<Command>();
			mockSubCommand.revert.mockResolvedValue(undefined);
			mockSubCommand.getReverseCommand.mockReturnValue(mock<Command>());

			const mockBulkCommand = new BulkCommand([mockSubCommand]);

			popUndoableToRedoMock.mockReturnValue(mockBulkCommand);
			render(TestComponent, { props: { route: workflowRoute } });

			await userEvent.keyboard('{Control>}{Shift>}z');

			expect(mockSubCommand.revert).toHaveBeenCalled();
			expect(mockSubCommand.getReverseCommand).toHaveBeenCalled();
			expect(pushBulkCommandToUndoMock).toHaveBeenCalledWith(expect.any(BulkCommand), false);
			expect(telemetryTrackMock).toHaveBeenCalledWith('User hit redo', expect.any(Object));
		});
	});
});
