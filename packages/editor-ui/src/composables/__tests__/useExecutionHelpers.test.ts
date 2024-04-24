import { useExecutionHelpers } from '@/composables/useExecutionHelpers';
import type { ExecutionSummary } from 'n8n-workflow';
import { i18n } from '@/plugins/i18n';
import { convertToDisplayDate } from '@/utils/formatters/dateFormatter';

describe('useExecutionHelpers()', () => {
	describe('getUIDetails()', () => {
		it.each([
			['waiting', 'waiting', i18n.baseText('executionsList.waiting')],
			['canceled', 'unknown', i18n.baseText('executionsList.canceled')],
			['running', 'running', i18n.baseText('executionsList.running')],
			['new', 'running', i18n.baseText('executionsList.running')],
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
});
