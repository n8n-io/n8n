/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import express from 'express';
import { readFile as fsReadFile } from 'fs/promises';
import {
	ExecutionError,
	IDataObject,
	INode,
	IRunExecutionData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { validate } from 'class-validator';
import config from '@/config';
import * as Db from '@/Db';
import { ICredentialsDb, IExecutionDb, IExecutionFlattedDb, IWorkflowDb } from '@/Interfaces';
import * as ResponseHelper from '@/ResponseHelper';
// eslint-disable-next-line import/order
import { Like } from 'typeorm';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import { TagEntity } from '@db/entities/TagEntity';
import { User } from '@db/entities/User';

/**
 * Returns the base URL n8n is reachable from
 *
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
 *
 */
export function getSessionId(req: express.Request): string | undefined {
	return req.headers.sessionid as string | undefined;
}

/**
 * Extracts configuration schema for key
 */
function extractSchemaForKey(configKey: string, configSchema: IDataObject): IDataObject {
	const configKeyParts = configKey.split('.');

	// eslint-disable-next-line no-restricted-syntax
	for (const key of configKeyParts) {
		if (configSchema[key] === undefined) {
			throw new Error(`Key "${key}" of ConfigKey "${configKey}" does not exist`);
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		} else if ((configSchema[key]! as IDataObject)._cvtProperties === undefined) {
			configSchema = configSchema[key] as IDataObject;
		} else {
			configSchema = (configSchema[key] as IDataObject)._cvtProperties as IDataObject;
		}
	}
	return configSchema;
}

/**
 * Gets value from config with support for "_FILE" environment variables
 *
 * @param {string} configKey The key of the config data to get
 */
export async function getConfigValue(
	configKey: string,
): Promise<string | boolean | number | undefined> {
	// Get the environment variable
	const configSchema = config.getSchema();
	// @ts-ignore
	const currentSchema = extractSchemaForKey(configKey, configSchema._cvtProperties as IDataObject);
	// Check if environment variable is defined for config key
	if (currentSchema.env === undefined) {
		// No environment variable defined, so return value from config
		// @ts-ignore
		return config.getEnv(configKey);
	}

	// Check if special file environment variable exists
	const fileEnvironmentVariable = process.env[`${currentSchema.env}_FILE`];
	if (fileEnvironmentVariable === undefined) {
		// Does not exist, so return value from config
		// @ts-ignore
		return config.getEnv(configKey);
	}

	let data;
	try {
		data = await fsReadFile(fileEnvironmentVariable, 'utf8');
	} catch (error) {
		if (error.code === 'ENOENT') {
			throw new Error(`The file "${fileEnvironmentVariable}" could not be found.`);
		}

		throw error;
	}

	return data;
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
	};

	const execution = ResponseHelper.flattenExecutionData(fullExecutionData);

	await Db.collections.Execution.save(execution as IExecutionFlattedDb);
}

export const DEFAULT_EXECUTIONS_GET_ALL_LIMIT = 20;
