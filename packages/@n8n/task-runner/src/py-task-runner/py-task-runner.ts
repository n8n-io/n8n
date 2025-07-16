import { Workflow, ObservableObject } from 'n8n-workflow';
import type { INodeExecutionData } from 'n8n-workflow';
import * as a from 'node:assert';

import type { CodeExecSettings, CodeTaskData } from '@/code-task-runner';
import { CodeTaskRunner } from '@/code-task-runner';
import type { MainConfig } from '@/config/main-config';
import type { DataRequestResponse, TaskResultData } from '@/runner-types';
import type { TaskParams } from '@/task-runner';

import { BuiltInsParserState } from '../js-task-runner/built-ins-parser/built-ins-parser-state';

export class PyTaskRunner extends CodeTaskRunner {
	constructor(config: MainConfig, name = 'PY Task Runner') {
		super({
			taskType: 'python',
			name,
			...config.baseRunnerConfig,
		});

		// @TODO: Freeze prototypes
	}

	// @TODO: Once we support fetching only needed built-ins, inherit this method from CodeTaskRunner instead
	async executeTask(
		taskParams: TaskParams<CodeExecSettings>,
		abortSignal: AbortSignal,
	): Promise<TaskResultData> {
		const { taskId, settings } = taskParams;
		a.ok(settings, 'PY Code not sent to runner');

		this.validateTaskSettings(settings);

		// @TODO: Fetch only needed built-ins by parsing Python AST
		const neededBuiltIns = BuiltInsParserState.newNeedsAllDataState();

		const dataResponse = await this.requestData<DataRequestResponse>(
			taskId,
			neededBuiltIns.toDataRequestParams(settings.chunk),
		);

		const data = this.reconstructTaskData(dataResponse, settings.chunk);

		await this.requestNodeTypeIfNeeded(neededBuiltIns, data.workflow, taskId);

		const workflowParams = data.workflow;
		const workflow = new Workflow({
			...workflowParams,
			nodeTypes: this.nodeTypes,
		});

		workflow.staticData = ObservableObject.create(workflow.staticData);

		const result =
			settings.nodeMode === 'runOnceForAllItems'
				? await this.runForAllItems(taskId, settings, data, workflow, abortSignal)
				: await this.runForEachItem(taskId, settings, data, workflow, abortSignal);

		return {
			result,
			customData: data.runExecutionData.resultData.metadata,
			staticData: workflow.staticData.__dataChanged ? workflow.staticData : undefined,
		};
	}

	private async runForAllItems(
		_taskId: string,
		_settings: CodeExecSettings,
		_data: CodeTaskData,
		_workflow: Workflow,
		_signal: AbortSignal,
	): Promise<INodeExecutionData[]> {
		// @TODO: Implement

		return await Promise.resolve([]);
	}

	private async runForEachItem(
		_taskId: string,
		_settings: CodeExecSettings,
		_data: CodeTaskData,
		_workflow: Workflow,
		_signal: AbortSignal,
	): Promise<INodeExecutionData[]> {
		// @TODO: Implement

		return await Promise.resolve([]);
	}
}
