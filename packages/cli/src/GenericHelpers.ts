import type express from 'express';
import type {
	ExecutionError,
	INode,
	IRunExecutionData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { validate } from 'class-validator';
import { Container } from 'typedi';
import config from '@/config';
import type { ExecutionPayload, IWorkflowDb } from '@/Interfaces';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import type { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { TagEntity } from '@db/entities/TagEntity';
import type { User } from '@db/entities/User';
import type { UserUpdatePayload } from '@/requests';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { BadRequestError } from './errors/response-errors/bad-request.error';

/**
 * Returns the base URL n8n is reachable from
 */
export function getBaseUrl(): string {
	const protocol = config.getEnv('protocol');
	const host = config.getEnv('host');
	const port = config.getEnv('port');
	const path = config.getEnv('path');

	if ((protocol === 'http' && port === 80) || (protocol === 'https' && port === 443)) {
		return `${protocol}://${host}${path}`;
	}
	return `${protocol}://${host}:${port}${path}`;
}

/**
 * Returns the session id if one is set
 */
export function getSessionId(req: express.Request): string | undefined {
	return req.headers.sessionid as string | undefined;
}

export async function validateEntity(
	entity: WorkflowEntity | CredentialsEntity | TagEntity | User | UserUpdatePayload,
): Promise<void> {
	const errors = await validate(entity);

	const errorMessages = errors
		.reduce<string[]>((acc, cur) => {
			if (!cur.constraints) return acc;
			acc.push(...Object.values(cur.constraints));
			return acc;
		}, [])
		.join(' | ');

	if (errorMessages) {
		throw new BadRequestError(errorMessages);
	}
}

/**
 * Create an error execution
 *
 * @param {INode} node
 * @param {IWorkflowDb} workflowData
 * @param {Workflow} workflow
 * @param {WorkflowExecuteMode} mode
 * @returns
 * @memberof ActiveWorkflowRunner
 */

export async function createErrorExecution(
	error: ExecutionError,
	node: INode,
	workflowData: IWorkflowDb,
	workflow: Workflow,
	mode: WorkflowExecuteMode,
): Promise<void> {
	const saveDataErrorExecutionDisabled = workflowData?.settings?.saveDataErrorExecution === 'none';

	if (saveDataErrorExecutionDisabled) return;

	const executionData: IRunExecutionData = {
		startData: {
			destinationNode: node.name,
			runNodeFilter: [node.name],
		},
		executionData: {
			contextData: {},
			metadata: {},
			nodeExecutionStack: [
				{
					node,
					data: {
						main: [
							[
								{
									json: {},
									pairedItem: {
										item: 0,
									},
								},
							],
						],
					},
					source: null,
				},
			],
			waitingExecution: {},
			waitingExecutionSource: {},
		},
		resultData: {
			runData: {
				[node.name]: [
					{
						startTime: 0,
						executionTime: 0,
						error,
						source: [],
					},
				],
			},
			error,
			lastNodeExecuted: node.name,
		},
	};

	const fullExecutionData: ExecutionPayload = {
		data: executionData,
		mode,
		finished: false,
		startedAt: new Date(),
		workflowData,
		workflowId: workflow.id,
		stoppedAt: new Date(),
		status: 'error',
	};

	await Container.get(ExecutionRepository).createNewExecution(fullExecutionData);
}

export const DEFAULT_EXECUTIONS_GET_ALL_LIMIT = 20;
