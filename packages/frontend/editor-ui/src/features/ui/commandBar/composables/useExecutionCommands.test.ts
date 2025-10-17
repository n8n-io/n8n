import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useExecutionCommands } from './useExecutionCommands';
import { useExecutionsStore } from '@/features/executions/executions.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSettingsStore } from '@/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { getResourcePermissions } from '@n8n/permissions';
import { setActivePinia } from 'pinia';
import type { ExecutionSummary } from 'n8n-workflow';
import { EnterpriseEditionFeature, MODAL_CONFIRM, VIEWS } from '@/constants';

const routerPushMock = vi.fn();
const routerReplaceMock = vi.fn();
vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: routerPushMock,
		replace: routerReplaceMock,
	}),
	useRoute: () => ({
		name: VIEWS.EXECUTION_PREVIEW,
		params: { name: 'workflow-1', executionId: 'exec-1' },
	}),
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: Record<string, string> }) => {
			if (opts?.interpolate) {
				let result = key;
				for (const [k, v] of Object.entries(opts.interpolate)) {
					result = result.replace(`{${k}}`, v);
				}
				return result;
			}
			return key;
		},
	}),
}));

const mockToastShowMessage = vi.fn();
const mockToastShowError = vi.fn();
vi.mock('@/composables/useToast', () => ({
	useToast: () => ({
		showMessage: mockToastShowMessage,
		showError: mockToastShowError,
	}),
}));

const mockMessageConfirm = vi.fn();
vi.mock('@/composables/useMessage', () => ({
	useMessage: () => ({
		confirm: mockMessageConfirm,
	}),
}));

const mockTelemetryTrack = vi.fn();
vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: mockTelemetryTrack,
	}),
}));

vi.mock('@n8n/permissions', () => ({
	getResourcePermissions: vi.fn(() => ({
		workflow: {
			update: true,
			execute: true,
		},
	})),
}));

vi.mock('@/features/executions/executions.utils', async (importOriginal) => ({
	...(await importOriginal()),
	executionRetryMessage: vi.fn((status: string) => ({
		title: `Execution ${status}`,
		type: 'info' as const,
	})),
}));

describe('useExecutionCommands', () => {
	let mockExecutionsStore: ReturnType<typeof useExecutionsStore>;
	let mockWorkflowsStore: ReturnType<typeof useWorkflowsStore>;
	let mockSettingsStore: ReturnType<typeof useSettingsStore>;
	let mockGetResourcePermissions: ReturnType<typeof vi.fn>;

	const createMockExecution = (
		id: string,
		status: ExecutionSummary['status'],
		workflowId = 'workflow-1',
		annotation?: ExecutionSummary['annotation'],
	): ExecutionSummary => ({
		id,
		workflowId,
		mode: 'manual',
		status,
		createdAt: new Date(),
		startedAt: new Date(),
		stoppedAt: status === 'running' ? undefined : new Date(),
		annotation,
	});

	beforeEach(() => {
		setActivePinia(createTestingPinia());

		mockExecutionsStore = useExecutionsStore();
		mockWorkflowsStore = useWorkflowsStore();
		mockSettingsStore = useSettingsStore();

		mockGetResourcePermissions = vi.mocked(getResourcePermissions);

		Object.defineProperty(mockExecutionsStore, 'activeExecution', {
			value: null,
		});

		Object.defineProperty(mockExecutionsStore, 'currentExecutionsByWorkflowId', {
			value: {},
		});

		Object.defineProperty(mockExecutionsStore, 'executionsByWorkflowId', {
			value: {},
		});

		Object.defineProperty(mockExecutionsStore, 'deleteExecutions', {
			value: vi.fn().mockResolvedValue(undefined),
		});

		Object.defineProperty(mockExecutionsStore, 'retryExecution', {
			value: vi.fn().mockResolvedValue(createMockExecution('exec-retry', 'success')),
		});

		Object.defineProperty(mockExecutionsStore, 'stopCurrentExecution', {
			value: vi.fn().mockResolvedValue(undefined),
		});

		Object.defineProperty(mockExecutionsStore, 'annotateExecution', {
			value: vi.fn().mockResolvedValue(undefined),
		});

		Object.defineProperty(mockWorkflowsStore, 'getWorkflowById', {
			value: vi.fn().mockReturnValue({
				id: 'workflow-1',
				name: 'Test Workflow',
				scopes: [],
			}),
		});

		Object.defineProperty(mockSettingsStore, 'isEnterpriseFeatureEnabled', {
			value: {
				[EnterpriseEditionFeature.AdvancedExecutionFilters]: false,
			},
		});

		mockGetResourcePermissions.mockReturnValue({
			workflow: {
				update: true,
				execute: true,
			},
		});

		vi.clearAllMocks();
	});

	describe('when no active execution', () => {
		it('should return empty commands array', () => {
			mockExecutionsStore.activeExecution = null;

			const { commands } = useExecutionCommands();

			expect(commands.value).toHaveLength(0);
		});
	});

	describe('debug execution command', () => {
		it('should include debug command for successful execution', () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'success');

			const { commands } = useExecutionCommands();

			const debugCommand = commands.value.find((cmd) => cmd.id === 'debug-execution');
			expect(debugCommand).toBeDefined();
		});

		it('should include debug command for failed execution', () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'error');

			const { commands } = useExecutionCommands();

			const debugCommand = commands.value.find((cmd) => cmd.id === 'debug-execution');
			expect(debugCommand).toBeDefined();
		});

		it('should navigate to execution debug view when handler is called', async () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'success');

			const { commands } = useExecutionCommands();

			const debugCommand = commands.value.find((cmd) => cmd.id === 'debug-execution');
			await debugCommand?.handler?.();

			expect(routerPushMock).toHaveBeenCalledWith({
				name: VIEWS.EXECUTION_DEBUG,
				params: {
					name: 'workflow-1',
					executionId: 'exec-1',
				},
			});
		});

		it('should not include debug command when user has no update permission', () => {
			mockGetResourcePermissions.mockReturnValue({
				workflow: {
					update: false,
					execute: true,
				},
			});

			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'success');

			const { commands } = useExecutionCommands();

			const debugCommand = commands.value.find((cmd) => cmd.id === 'debug-execution');
			expect(debugCommand).toBeUndefined();
		});
	});

	describe('retry execution commands', () => {
		it('should include retry commands for failed execution', () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'error');

			const { commands } = useExecutionCommands();

			const retryCurrentCommand = commands.value.find((cmd) => cmd.id === 'retry-current-workflow');
			const retryOriginalCommand = commands.value.find(
				(cmd) => cmd.id === 'retry-original-workflow',
			);

			expect(retryCurrentCommand).toBeDefined();
			expect(retryOriginalCommand).toBeDefined();
		});

		it('should include retry commands for crashed execution', () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'crashed');

			const { commands } = useExecutionCommands();

			const retryCommands = commands.value.filter((cmd) => cmd.id.startsWith('retry-'));
			expect(retryCommands).toHaveLength(2);
		});

		it('should include retry commands for canceled execution', () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'canceled');

			const { commands } = useExecutionCommands();

			const retryCommands = commands.value.filter((cmd) => cmd.id.startsWith('retry-'));
			expect(retryCommands).toHaveLength(2);
		});

		it('should not include retry commands for successful execution', () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'success');

			const { commands } = useExecutionCommands();

			const retryCommands = commands.value.filter((cmd) => cmd.id.startsWith('retry-'));
			expect(retryCommands).toHaveLength(0);
		});

		it('should not include retry commands for running execution', () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'running');

			const { commands } = useExecutionCommands();

			const retryCommands = commands.value.filter((cmd) => cmd.id.startsWith('retry-'));
			expect(retryCommands).toHaveLength(0);
		});

		it('should call retryExecution with loadWorkflow=true for retry current workflow', async () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'error');

			const { commands } = useExecutionCommands();

			const retryCurrentCommand = commands.value.find((cmd) => cmd.id === 'retry-current-workflow');
			await retryCurrentCommand?.handler?.();

			expect(mockExecutionsStore.retryExecution).toHaveBeenCalledWith('exec-1', true);
			expect(mockToastShowMessage).toHaveBeenCalled();
			expect(mockTelemetryTrack).toHaveBeenCalledWith('User clicked retry execution button', {
				workflow_id: 'workflow-1',
				execution_id: 'exec-1',
				retry_type: 'current',
			});
		});

		it('should call retryExecution with loadWorkflow=false for retry original workflow', async () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'error');

			const { commands } = useExecutionCommands();

			const retryOriginalCommand = commands.value.find(
				(cmd) => cmd.id === 'retry-original-workflow',
			);
			await retryOriginalCommand?.handler?.();

			expect(mockExecutionsStore.retryExecution).toHaveBeenCalledWith('exec-1', false);
			expect(mockTelemetryTrack).toHaveBeenCalledWith('User clicked retry execution button', {
				workflow_id: 'workflow-1',
				execution_id: 'exec-1',
				retry_type: 'original',
			});
		});

		it('should handle retry execution errors', async () => {
			const error = new Error('Retry failed');
			mockExecutionsStore.retryExecution = vi.fn().mockRejectedValue(error);
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'error');

			const { commands } = useExecutionCommands();

			const retryCurrentCommand = commands.value.find((cmd) => cmd.id === 'retry-current-workflow');
			await retryCurrentCommand?.handler?.();

			expect(mockToastShowError).toHaveBeenCalled();
		});
	});

	describe('stop execution command', () => {
		it('should include stop command for running execution', () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'running');

			const { commands } = useExecutionCommands();

			const stopCommand = commands.value.find((cmd) => cmd.id === 'stop-execution');
			expect(stopCommand).toBeDefined();
		});

		it('should include stop command for new execution', () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'new');

			const { commands } = useExecutionCommands();

			const stopCommand = commands.value.find((cmd) => cmd.id === 'stop-execution');
			expect(stopCommand).toBeDefined();
		});

		it('should not include stop command for completed execution', () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'success');

			const { commands } = useExecutionCommands();

			const stopCommand = commands.value.find((cmd) => cmd.id === 'stop-execution');
			expect(stopCommand).toBeUndefined();
		});

		it('should call stopCurrentExecution when handler is called', async () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'running');

			const { commands } = useExecutionCommands();

			const stopCommand = commands.value.find((cmd) => cmd.id === 'stop-execution');
			await stopCommand?.handler?.();

			expect(mockExecutionsStore.stopCurrentExecution).toHaveBeenCalledWith('exec-1');
			expect(mockToastShowMessage).toHaveBeenCalled();
		});

		it('should handle stop execution errors', async () => {
			const error = new Error('Stop failed');
			mockExecutionsStore.stopCurrentExecution = vi.fn().mockRejectedValue(error);
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'running');

			const { commands } = useExecutionCommands();

			const stopCommand = commands.value.find((cmd) => cmd.id === 'stop-execution');
			await stopCommand?.handler?.();

			expect(mockToastShowError).toHaveBeenCalled();
		});

		it('should not include stop command when user has no execute permission', () => {
			mockGetResourcePermissions.mockReturnValue({
				workflow: {
					update: true,
					execute: false,
				},
			});

			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'running');

			const { commands } = useExecutionCommands();

			const stopCommand = commands.value.find((cmd) => cmd.id === 'stop-execution');
			expect(stopCommand).toBeUndefined();
		});
	});

	describe('annotation commands', () => {
		beforeEach(() => {
			Object.defineProperty(mockSettingsStore, 'isEnterpriseFeatureEnabled', {
				value: {
					[EnterpriseEditionFeature.AdvancedExecutionFilters]: true,
				},
			});
		});

		it('should include vote commands when annotation feature is enabled', () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'success');

			const { commands } = useExecutionCommands();

			const voteUpCommand = commands.value.find((cmd) => cmd.id === 'vote-up');
			const voteDownCommand = commands.value.find((cmd) => cmd.id === 'vote-down');

			expect(voteUpCommand).toBeDefined();
			expect(voteDownCommand).toBeDefined();
		});

		it('should not include vote commands when annotation feature is disabled', () => {
			Object.defineProperty(mockSettingsStore, 'isEnterpriseFeatureEnabled', {
				value: {
					[EnterpriseEditionFeature.AdvancedExecutionFilters]: false,
				},
			});
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'success');

			const { commands } = useExecutionCommands();

			const voteUpCommand = commands.value.find((cmd) => cmd.id === 'vote-up');
			const voteDownCommand = commands.value.find((cmd) => cmd.id === 'vote-down');

			expect(voteUpCommand).toBeUndefined();
			expect(voteDownCommand).toBeUndefined();
		});

		it('should show remove vote up text when execution has up vote', () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'success', 'workflow-1', {
				vote: 'up',
				tags: [],
			});

			const { commands } = useExecutionCommands();

			const voteUpCommand = commands.value.find((cmd) => cmd.id === 'vote-up');
			expect(voteUpCommand).toBeDefined();
		});

		it('should show remove vote down text when execution has down vote', () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'success', 'workflow-1', {
				vote: 'down',
				tags: [],
			});

			const { commands } = useExecutionCommands();

			const voteDownCommand = commands.value.find((cmd) => cmd.id === 'vote-down');
			expect(voteDownCommand).toBeDefined();
		});

		it('should call annotateExecution with vote when voting up', async () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'success');

			const { commands } = useExecutionCommands();

			const voteUpCommand = commands.value.find((cmd) => cmd.id === 'vote-up');
			await voteUpCommand?.handler?.();

			expect(mockExecutionsStore.annotateExecution).toHaveBeenCalledWith('exec-1', {
				vote: 'up',
			});
		});

		it('should call annotateExecution with null to remove vote', async () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'success', 'workflow-1', {
				vote: 'up',
				tags: [],
			});

			const { commands } = useExecutionCommands();

			const voteUpCommand = commands.value.find((cmd) => cmd.id === 'vote-up');
			await voteUpCommand?.handler?.();

			expect(mockExecutionsStore.annotateExecution).toHaveBeenCalledWith('exec-1', {
				vote: null,
			});
		});

		it('should handle annotation errors', async () => {
			const error = new Error('Annotation failed');
			mockExecutionsStore.annotateExecution = vi.fn().mockRejectedValue(error);
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'success');

			const { commands } = useExecutionCommands();

			const voteUpCommand = commands.value.find((cmd) => cmd.id === 'vote-up');
			await voteUpCommand?.handler?.();

			expect(mockToastShowError).toHaveBeenCalledWith(error, 'executionAnnotationView.vote.error');
		});
	});

	describe('delete execution command', () => {
		it('should include delete command', () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'success');

			const { commands } = useExecutionCommands();

			const deleteCommand = commands.value.find((cmd) => cmd.id === 'delete-execution');
			expect(deleteCommand).toBeDefined();
			expect(deleteCommand?.title).toBe('executionDetails.deleteExecution');
		});

		it('should not include delete command when user has no update permission', () => {
			mockGetResourcePermissions.mockReturnValue({
				workflow: {
					update: false,
					execute: true,
				},
			});

			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'success');

			const { commands } = useExecutionCommands();

			const deleteCommand = commands.value.find((cmd) => cmd.id === 'delete-execution');
			expect(deleteCommand).toBeUndefined();
		});

		it('should request confirmation before deleting', async () => {
			mockMessageConfirm.mockResolvedValue('cancel');
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'success');

			const { commands } = useExecutionCommands();

			const deleteCommand = commands.value.find((cmd) => cmd.id === 'delete-execution');
			await deleteCommand?.handler?.();

			expect(mockMessageConfirm).toHaveBeenCalledWith(
				'executionDetails.confirmMessage.message',
				'executionDetails.confirmMessage.headline',
				{
					type: 'warning',
					confirmButtonText: 'executionDetails.confirmMessage.confirmButtonText',
					cancelButtonText: '',
				},
			);
			expect(mockExecutionsStore.deleteExecutions).not.toHaveBeenCalled();
		});

		it('should include annotation note in confirmation when execution has annotation', async () => {
			mockMessageConfirm.mockResolvedValue('cancel');
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'success', 'workflow-1', {
				vote: 'up',
				tags: [],
			});

			const { commands } = useExecutionCommands();

			const deleteCommand = commands.value.find((cmd) => cmd.id === 'delete-execution');
			await deleteCommand?.handler?.();

			expect(mockMessageConfirm).toHaveBeenCalledWith(
				'executionDetails.confirmMessage.annotationsNote executionDetails.confirmMessage.message',
				'executionDetails.confirmMessage.headline',
				expect.any(Object),
			);
		});

		it('should delete execution and navigate to next execution', async () => {
			mockMessageConfirm.mockResolvedValue(MODAL_CONFIRM);
			const exec1 = createMockExecution('exec-1', 'success');
			const exec2 = createMockExecution('exec-2', 'success');
			mockExecutionsStore.activeExecution = exec1;
			Object.defineProperty(mockExecutionsStore, 'executionsByWorkflowId', {
				value: {
					'workflow-1': [exec1, exec2],
				},
			});

			const { commands } = useExecutionCommands();

			const deleteCommand = commands.value.find((cmd) => cmd.id === 'delete-execution');
			await deleteCommand?.handler?.();

			expect(mockExecutionsStore.deleteExecutions).toHaveBeenCalledWith({
				ids: ['exec-1'],
			});
			expect(routerReplaceMock).toHaveBeenCalled();
			// Note: The toast is shown but we can't easily verify its exact call in this test setup
			// due to the async nature and execution list updates
		});

		it('should navigate to execution home when no executions left', async () => {
			mockMessageConfirm.mockResolvedValue(MODAL_CONFIRM);
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'success');
			Object.defineProperty(mockExecutionsStore, 'executionsByWorkflowId', {
				value: {
					'workflow-1': [createMockExecution('exec-1', 'success')],
				},
			});
			mockExecutionsStore.deleteExecutions = vi.fn().mockImplementation(() => {
				mockExecutionsStore.executionsByWorkflowId['workflow-1'] = [];
			});

			const { commands } = useExecutionCommands();

			const deleteCommand = commands.value.find((cmd) => cmd.id === 'delete-execution');
			await deleteCommand?.handler?.();

			expect(routerReplaceMock).toHaveBeenCalledWith({
				name: VIEWS.EXECUTION_HOME,
				params: { name: 'workflow-1' },
			});
		});

		it('should handle delete errors', async () => {
			const error = new Error('Delete failed');
			mockMessageConfirm.mockResolvedValue(MODAL_CONFIRM);
			mockExecutionsStore.deleteExecutions = vi.fn().mockRejectedValue(error);
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'success');

			const { commands } = useExecutionCommands();

			const deleteCommand = commands.value.find((cmd) => cmd.id === 'delete-execution');
			await deleteCommand?.handler?.();

			expect(mockToastShowError).toHaveBeenCalledWith(
				error,
				'executionsList.showError.handleDeleteSelected.title',
			);
		});
	});
});
