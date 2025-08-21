import { useExecutionHelpers } from '@/composables/useExecutionHelpers';
import type { ExecutionSummary } from 'n8n-workflow';
import { i18n } from '@n8n/i18n';
import { convertToDisplayDate } from '@/utils/formatters/dateFormatter';
import { mock } from 'vitest-mock-extended';

const { resolve, track } = vi.hoisted(() => ({
	resolve: vi.fn(),
	track: vi.fn(),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({
		resolve,
	}),
	RouterLink: vi.fn(),
}));

vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

describe('useExecutionHelpers()', () => {
	describe('getUIDetails()', () => {
		it.each([
			['waiting', 'waiting', i18n.baseText('executionsList.waiting')],
			['canceled', 'unknown', i18n.baseText('executionsList.canceled')],
			['running', 'running', i18n.baseText('executionsList.running')],
			['new', 'new', i18n.baseText('executionsList.new')],
			['success', 'success', i18n.baseText('executionsList.succeeded')],
			['error', 'error', i18n.baseText('executionsList.error')],
			['crashed', 'error', i18n.baseText('executionsList.error')],
			[undefined, 'unknown', 'Status unknown'],
		])(
			'should return %s status name %s and label %s based on execution status',
			async (status, expectedName, expectedLabel) => {
				const date = new Date();
				const execution = {
					id: '1',
					startedAt: date,
					stoppedAt: date,
					status,
				};
				const { getUIDetails } = useExecutionHelpers();
				const uiDetails = getUIDetails(execution as ExecutionSummary);

				expect(uiDetails.name).toEqual(expectedName);
				expect(uiDetails.label).toEqual(expectedLabel);
				expect(uiDetails.runningTime).toEqual('0s');
			},
		);

		it('use `createdAt` if `startedAt` is null', async () => {
			const date = new Date('2025-01-01T00:00:00.000Z');
			const execution = mock<ExecutionSummary>({
				id: '1',
				startedAt: null,
				createdAt: date,
				stoppedAt: date,
				status: 'error',
			});
			const { getUIDetails } = useExecutionHelpers();
			const uiDetails = getUIDetails(execution);

			expect(uiDetails.startTime).toEqual('Jan 1, 00:00:00');
		});
	});

	describe('formatDate()', () => {
		it('should return formatted date', async () => {
			const { formatDate } = useExecutionHelpers();
			const fullDate = new Date();
			const { date, time } = convertToDisplayDate(fullDate);

			expect(formatDate(fullDate)).toEqual(
				i18n.baseText('executionsList.started', {
					interpolate: { time, date },
				}),
			);
		});
	});

	describe('isExecutionRetriable', () => {
		const { isExecutionRetriable } = useExecutionHelpers();

		it.each(['crashed', 'error'])('returns true when execution status is %s', (status) => {
			expect(isExecutionRetriable({ status } as ExecutionSummary)).toEqual(true);
		});

		it.each(['canceled', 'new', 'running', 'success', 'unknown', 'waiting'])(
			'returns false when execution status is %s',
			(status) => {
				expect(isExecutionRetriable({ status } as ExecutionSummary)).toEqual(false);
			},
		);

		it('should return false if retrySuccessId is set', () => {
			expect(
				isExecutionRetriable({ status: 'crashed', retrySuccessId: '123' } as ExecutionSummary),
			).toEqual(false);
		});
	});

	describe('openExecutionInNewTab', () => {
		const executionId = '123';
		const workflowId = 'xyz';
		const href = 'test.com';
		global.window.open = vi.fn();

		it('opens execution in new tab', () => {
			const { openExecutionInNewTab } = useExecutionHelpers();
			resolve.mockReturnValue({ href });
			openExecutionInNewTab(executionId, workflowId);
			expect(window.open).toHaveBeenCalledWith(href, '_blank');
		});
	});

	describe('trackOpeningRelatedExecution', () => {
		it('tracks sub execution click', () => {
			const { trackOpeningRelatedExecution } = useExecutionHelpers();

			trackOpeningRelatedExecution(
				{ subExecution: { executionId: '123', workflowId: 'xyz' } },
				'table',
			);

			expect(track).toHaveBeenCalledWith('User clicked inspect sub-workflow', { view: 'table' });
		});

		it('tracks parent execution click', () => {
			const { trackOpeningRelatedExecution } = useExecutionHelpers();

			trackOpeningRelatedExecution(
				{ parentExecution: { executionId: '123', workflowId: 'xyz' } },
				'json',
			);

			expect(track).toHaveBeenCalledWith('User clicked parent execution button', { view: 'json' });
		});
	});

	describe('resolveRelatedExecutionUrl', () => {
		it('resolves sub execution url', () => {
			const fullPath = 'test.com';
			resolve.mockReturnValue({ fullPath });
			const { resolveRelatedExecutionUrl } = useExecutionHelpers();

			expect(
				resolveRelatedExecutionUrl({ subExecution: { executionId: '123', workflowId: 'xyz' } }),
			).toEqual(fullPath);
		});

		it('resolves parent execution url', () => {
			const fullPath = 'test.com';
			resolve.mockReturnValue({ fullPath });
			const { resolveRelatedExecutionUrl } = useExecutionHelpers();

			expect(
				resolveRelatedExecutionUrl({ parentExecution: { executionId: '123', workflowId: 'xyz' } }),
			).toEqual(fullPath);
		});

		it('returns empty if no related execution url', () => {
			const { resolveRelatedExecutionUrl } = useExecutionHelpers();

			expect(resolveRelatedExecutionUrl({})).toEqual('');
		});
	});
});
