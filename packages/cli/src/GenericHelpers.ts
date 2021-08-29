/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as express from 'express';
import { join as pathJoin } from 'path';
import { readFile as fsReadFile } from 'fs/promises';
import { readFileSync as fsReadFileSync } from 'fs';
import { IDataObject } from 'n8n-workflow';
import * as config from '../config';

// eslint-disable-next-line import/no-cycle
import { IPackageVersions } from '.';

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
 * Gets value from config with support for "_FILE" environment variables synchronously
 *
 * @export
 * @param {string} configKey The key of the config data to get
 * @returns {(string | boolean | number | undefined)}
 */
export function getConfigValueSync(configKey: string): string | boolean | number | undefined {
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
		data = fsReadFileSync(fileEnvironmentVariable, 'utf8');
	} catch (error) {
		if (error.code === 'ENOENT') {
			throw new Error(`The file "${fileEnvironmentVariable}" could not be found.`);
		}

		throw error;
	}

	return data;
}
