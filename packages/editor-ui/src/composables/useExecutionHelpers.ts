import type { ExecutionSummary } from 'n8n-workflow';
import { convertToDisplayDate } from '@/utils/formatters/dateFormatter';
import { useI18n } from '@/composables/useI18n';

export interface IExecutionUIData {
	name: string;
	label: string;
	startTime: string;
	runningTime: string;
}

export function useExecutionHelpers() {
	const i18n = useI18n();

	function getUIDetails(execution: ExecutionSummary): IExecutionUIData {
		const status = {
			name: 'unknown',
			startTime: formatDate(execution.startedAt),
			label: 'Status unknown',
			runningTime: '',
		};

		if (execution.status === 'waiting') {
			status.name = 'waiting';
			status.label = i18n.baseText('executionsList.waiting');
		} else if (execution.status === 'canceled') {
			status.label = i18n.baseText('executionsList.canceled');
		} else if (execution.status === 'running' || execution.status === 'new') {
			status.name = 'running';
			status.label = i18n.baseText('executionsList.running');
		} else if (execution.status === 'success') {
			status.name = 'success';
			status.label = i18n.baseText('executionsList.succeeded');
		} else if (execution.status === 'error' || execution.status === 'crashed') {
			status.name = 'error';
			status.label = i18n.baseText('executionsList.error');
		}

		if (!execution.status) execution.status = 'unknown';

		if (execution.startedAt && execution.stoppedAt) {
			const stoppedAt = execution.stoppedAt ? new Date(execution.stoppedAt).getTime() : Date.now();
			status.runningTime = i18n.displayTimer(
				stoppedAt - new Date(execution.startedAt).getTime(),
				true,
			);
		}

		return status;
	}

	function formatDate(fullDate: Date | string | number) {
		const { date, time } = convertToDisplayDate(fullDate);
		return i18n.baseText('executionsList.started', { interpolate: { time, date } });
	}

	function isExecutionRetriable(execution: ExecutionSummary): boolean {
		return (
			['crashed', 'error'].includes(execution.status ?? '') &&
			!execution.retryOf &&
			!execution.retrySuccessId
		);
	}

	return {
		getUIDetails,
		formatDate,
		isExecutionRetriable,
	};
}
