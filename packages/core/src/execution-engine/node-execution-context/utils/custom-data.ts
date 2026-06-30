import {
	LoggerProxy,
	type IRunExecutionData,
	type IWorkflowExecutionCustomData,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import {
	getAllWorkflowExecutionMetadata,
	getWorkflowExecutionMetadata,
	setAllWorkflowExecutionMetadata,
	setWorkflowExecutionMetadata,
} from './execution-metadata';

export function createExecutionCustomData({
	runExecutionData,
	mode,
}: {
	runExecutionData: IRunExecutionData;
	mode: WorkflowExecuteMode;
}): IWorkflowExecutionCustomData {
	return {
		set(key: string, value: string): void {
			try {
				setWorkflowExecutionMetadata(runExecutionData, key, value);
			} catch (e) {
				if (mode === 'manual') {
					throw e;
				}
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
				LoggerProxy.debug(e.message);
			}
		},
		setAll(obj: Record<string, string>): void {
			try {
				setAllWorkflowExecutionMetadata(runExecutionData, obj);
			} catch (e) {
				if (mode === 'manual') {
					throw e;
				}
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
				LoggerProxy.debug(e.message);
			}
		},
		get(key: string): string {
			return getWorkflowExecutionMetadata(runExecutionData, key);
		},
		getAll(): Record<string, string> {
			return getAllWorkflowExecutionMetadata(runExecutionData);
		},
	};
}
