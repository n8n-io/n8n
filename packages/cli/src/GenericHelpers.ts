/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as express from 'express';
import { join as pathJoin } from 'path';
import { readFile as fsReadFile } from 'fs/promises';
import { IDataObject } from 'n8n-workflow';
import { validate } from 'class-validator';
import * as config from '../config';

// eslint-disable-next-line import/no-cycle
import { Db, ICredentialsDb, IPackageVersions, ResponseHelper } from '.';
// eslint-disable-next-line import/order
import { Like } from 'typeorm';
// eslint-disable-next-line import/no-cycle
import { WorkflowEntity } from './databases/entities/WorkflowEntity';
import { CredentialsEntity } from './databases/entities/CredentialsEntity';
import { TagEntity } from './databases/entities/TagEntity';
import { User } from './databases/entities/User';

let versionCache: IPackageVersions | undefined;

/**
 * Returns the base URL n8n is reachable from
 *
 * @export
 * @returns {string}
 */
export function getBaseUrl(): string {
	const protocol = config.get('protocol');
	const host = config.get('host');
	const port = config.get('port');
	const path = config.get('path');

	if ((protocol === 'http' && port === 80) || (protocol === 'https' && port === 443)) {
		return `${protocol}://${host}${path}`;
	}
	return `${protocol}://${host}:${port}${path}`;
}

/**
 * Returns the session id if one is set
 *
 * @export
 * @param {express.Request} req
 * @returns {(string | undefined)}
 */
export function getSessionId(req: express.Request): string | undefined {
	return req.headers.sessionid as string | undefined;
}

/**
 * Returns information which version of the packages are installed
 *
 * @export
 * @returns {Promise<IPackageVersions>}
 */
export async function getVersions(): Promise<IPackageVersions> {
	if (versionCache !== undefined) {
		return versionCache;
	}

	const packageFile = await fsReadFile(pathJoin(__dirname, '../../package.json'), 'utf8');
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const packageData = JSON.parse(packageFile);

	versionCache = {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		cli: packageData.version,
	};

	return versionCache;
}

/**
 * Extracts configuration schema for key
 *
 * @param {string} configKey
 * @param {IDataObject} configSchema
 * @returns {IDataObject} schema of the configKey
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
 * @export
 * @param {string} configKey The key of the config data to get
 * @returns {(Promise<string | boolean | number | undefined>)}
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
		return config.get(configKey);
	}

	// Check if special file enviroment variable exists
	const fileEnvironmentVariable = process.env[`${currentSchema.env}_FILE`];
	if (fileEnvironmentVariable === undefined) {
		// Does not exist, so return value from config
		return config.get(configKey);
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
			? await Db.collections.Workflow!.find(findConditions)
			: await Db.collections.Credentials!.find(findConditions);

	// name is unique
	if (found.length === 0) {
		return { name: requestedName };
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
		return { name: `${requestedName} 2` };
	}

	return { name: `${requestedName} ${maxSuffix + 1}` };
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
		throw new ResponseHelper.ResponseError(errorMessages, undefined, 400);
	}
}

export const DEFAULT_EXECUTIONS_GET_ALL_LIMIT = 20;
