import type { ExecutionSummary, RelatedExecution } from 'n8n-workflow';
import { convertToDisplayDate } from '@/utils/formatters/dateFormatter';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import { useTelemetry } from './useTelemetry';
import type { IRunDataDisplayMode } from '@/Interface';

export interface IExecutionUIData {
	name: string;
	label: string;
	createdAt: string;
	startTime: string;
	runningTime: string;
	showTimestamp: boolean;
	tags: Array<{ id: string; name: string }>;
}

export function useExecutionHelpers() {
	const i18n = useI18n();
	const router = useRouter();
	const telemetry = useTelemetry();

	function getUIDetails(execution: ExecutionSummary): IExecutionUIData {
		const status = {
			name: 'unknown',
			createdAt: execution.createdAt?.toString() ?? '',
			startTime: formatDate(execution.startedAt ?? execution.createdAt),
			label: 'Status unknown',
			runningTime: '',
			showTimestamp: true,
			tags: execution.annotation?.tags ?? [],
		};

		if (execution.status === 'new') {
			status.name = 'new';
			status.label = i18n.baseText('executionsList.new');
			status.showTimestamp = false;
		} else if (execution.status === 'waiting') {
			status.name = 'waiting';
			status.label = i18n.baseText('executionsList.waiting');
			status.showTimestamp = false;
		} else if (execution.status === 'canceled') {
			status.label = i18n.baseText('executionsList.canceled');
		} else if (execution.status === 'running') {
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
		return ['crashed', 'error'].includes(execution.status) && !execution.retrySuccessId;
	}

	function openExecutionInNewTab(executionId: string, workflowId: string): void {
		const route = router.resolve({
			name: VIEWS.EXECUTION_PREVIEW,
			params: { name: workflowId, executionId },
		});

		window.open(route.href, '_blank');
	}

	function resolveRelatedExecutionUrl(metadata: {
		parentExecution?: RelatedExecution;
		subExecution?: RelatedExecution;
	}): string {
		const info = metadata.parentExecution || metadata.subExecution;
		if (!info) {
			return '';
		}

		const { workflowId, executionId } = info;

		return router.resolve({
			name: VIEWS.EXECUTION_PREVIEW,
			params: { name: workflowId, executionId },
		}).fullPath;
	}

	function trackOpeningRelatedExecution(
		metadata: { parentExecution?: RelatedExecution; subExecution?: RelatedExecution },
		view: IRunDataDisplayMode,
	) {
		const info = metadata.parentExecution || metadata.subExecution;
		if (!info) {
			return;
		}

		telemetry.track(
			metadata.parentExecution
				? 'User clicked parent execution button'
				: 'User clicked inspect sub-workflow',
			{
				view,
			},
		);
	}

	return {
		getUIDetails,
		formatDate,
		isExecutionRetriable,
		openExecutionInNewTab,
		trackOpeningRelatedExecution,
		resolveRelatedExecutionUrl,
	};
}
