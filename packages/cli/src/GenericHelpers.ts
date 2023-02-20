/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type express from 'express';
import type {
	ExecutionError,
	INode,
	IRunExecutionData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { validate } from 'class-validator';
import { Like } from 'typeorm';
import config from '@/config';
import * as Db from '@/Db';
import type { ICredentialsDb, IExecutionDb, IExecutionFlattedDb, IWorkflowDb } from '@/Interfaces';
import * as ResponseHelper from '@/ResponseHelper';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import type { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { TagEntity } from '@db/entities/TagEntity';
import type { User } from '@db/entities/User';

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

/**
 * Generate a unique name for a workflow or credentials entity.
 *
 * - If the name does not yet exist, it returns the requested name.
 * - If the name already exists once, it returns the requested name suffixed with 2.
 * - If the name already exists more than once with suffixes, it looks for the max suffix
 * and returns the requested name with max suffix + 1.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function generateUniqueName(
	requestedName: string,
	entityType: 'workflow' | 'credentials',
) {
	const findConditions = {
		select: ['name' as const],
		where: {
			name: Like(`${requestedName}%`),
		},
	};

	const found: Array<WorkflowEntity | ICredentialsDb> =
		entityType === 'workflow'
			? await Db.collections.Workflow.find(findConditions)
			: await Db.collections.Credentials.find(findConditions);

	// name is unique
	if (found.length === 0) {
		return requestedName;
	}

	const maxSuffix = found.reduce((acc, { name }) => {
		const parts = name.split(`${requestedName} `);

		if (parts.length > 2) return acc;

		const suffix = Number(parts[1]);

		// eslint-disable-next-line no-restricted-globals
		if (!isNaN(suffix) && Math.ceil(suffix) > acc) {
			acc = Math.ceil(suffix);
		}

		return acc;
	}, 0);

	// name is duplicate but no numeric suffixes exist yet
	if (maxSuffix === 0) {
		return `${requestedName} 2`;
	}

	return `${requestedName} ${maxSuffix + 1}`;
}

export async function validateEntity(
	entity: WorkflowEntity | CredentialsEntity | TagEntity | User,
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
		throw new ResponseHelper.BadRequestError(errorMessages);
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
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
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

	const fullExecutionData: IExecutionDb = {
		data: executionData,
		mode,
		finished: false,
		startedAt: new Date(),
		workflowData,
		workflowId: workflow.id,
		stoppedAt: new Date(),
		status: 'new',
	};

	const execution = ResponseHelper.flattenExecutionData(fullExecutionData);

	await Db.collections.Execution.save(execution as IExecutionFlattedDb);
}

export const DEFAULT_EXECUTIONS_GET_ALL_LIMIT = 20;
