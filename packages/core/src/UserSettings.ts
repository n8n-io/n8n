/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import fs from 'fs';
import path from 'path';
import { createHash, randomBytes } from 'crypto';
// eslint-disable-next-line import/no-cycle
import {
	ENCRYPTION_KEY_ENV_OVERWRITE,
	EXTENSIONS_SUBDIRECTORY,
	DOWNLOADED_NODES_SUBDIRECTORY,
	IUserSettings,
	RESPONSE_ERROR_MESSAGES,
	USER_FOLDER_ENV_OVERWRITE,
	USER_SETTINGS_FILE_NAME,
	USER_SETTINGS_SUBFOLDER,
} from '.';
import { deepCopy } from 'n8n-workflow';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { promisify } = require('util');

const fsAccess = promisify(fs.access);
const fsReadFile = promisify(fs.readFile);
const fsMkdir = promisify(fs.mkdir);
const fsWriteFile = promisify(fs.writeFile);

let settingsCache: IUserSettings | undefined;

/**
 * Creates the user settings if they do not exist yet
 *
 */
export async function prepareUserSettings(): Promise<IUserSettings> {
	const settingsPath = getUserSettingsPath();

	let userSettings = await getUserSettings(settingsPath);
	if (userSettings !== undefined) {
		// Settings already exist, check if they contain the encryptionKey
		if (userSettings.encryptionKey !== undefined) {
			// Key already exists
			if (userSettings.instanceId === undefined) {
				userSettings.instanceId = await generateInstanceId(userSettings.encryptionKey);
				settingsCache = userSettings;
			}

			return userSettings;
		}
	} else {
		userSettings = {};
	}

	if (process.env[ENCRYPTION_KEY_ENV_OVERWRITE] !== undefined) {
		// Use the encryption key which got set via environment
		userSettings.encryptionKey = process.env[ENCRYPTION_KEY_ENV_OVERWRITE];
	} else {
		// Generate a new encryption key
		userSettings.encryptionKey = randomBytes(24).toString('base64');
	}

	userSettings.instanceId = await generateInstanceId(userSettings.encryptionKey);

	// eslint-disable-next-line no-console
	console.log(`UserSettings were generated and saved to: ${settingsPath}`);

	return writeUserSettings(userSettings, settingsPath);
}

/**
 * Returns the encryption key which is used to encrypt
 * the credentials.
 *
 */

export async function getEncryptionKey(): Promise<string> {
	if (process.env[ENCRYPTION_KEY_ENV_OVERWRITE] !== undefined) {
		return process.env[ENCRYPTION_KEY_ENV_OVERWRITE];
	}

	const userSettings = await getUserSettings();

	if (userSettings === undefined || userSettings.encryptionKey === undefined) {
		throw new Error(RESPONSE_ERROR_MESSAGES.NO_ENCRYPTION_KEY);
	}

	return userSettings.encryptionKey;
}

/**
 * Returns the instance ID
 *
 */
export async function getInstanceId(): Promise<string> {
	const userSettings = await getUserSettings();

	if (userSettings === undefined) {
		return '';
	}

	if (userSettings.instanceId === undefined) {
		return '';
	}

	return userSettings.instanceId;
}

async function generateInstanceId(key?: string) {
	const hash = key
		? createHash('sha256')
				.update(key.slice(Math.round(key.length / 2)))
				.digest('hex')
		: undefined;

	return hash;
}

/**
 * Adds/Overwrite the given settings in the currently
 * saved user settings
 *
 * @param {IUserSettings} addSettings  The settings to add/overwrite
 * @param {string} [settingsPath] Optional settings file path
 */
export async function addToUserSettings(
	addSettings: IUserSettings,
	settingsPath?: string,
): Promise<IUserSettings> {
	if (settingsPath === undefined) {
		settingsPath = getUserSettingsPath();
	}

	let userSettings = await getUserSettings(settingsPath);

	if (userSettings === undefined) {
		userSettings = {};
	}

	// Add the settings
	Object.assign(userSettings, addSettings);

	return writeUserSettings(userSettings, settingsPath);
}

/**
 * Writes a user settings file
 *
 * @param {IUserSettings} userSettings The settings to write
 * @param {string} [settingsPath] Optional settings file path
 */
export async function writeUserSettings(
	userSettings: IUserSettings,
	settingsPath?: string,
): Promise<IUserSettings> {
	if (settingsPath === undefined) {
		settingsPath = getUserSettingsPath();
	}

	if (userSettings === undefined) {
		userSettings = {};
	}

	// Check if parent folder exists if not create it.
	try {
		await fsAccess(path.dirname(settingsPath));
	} catch (error) {
		// Parent folder does not exist so create
		await fsMkdir(path.dirname(settingsPath));
	}

	const settingsToWrite = { ...userSettings };
	if (settingsToWrite.instanceId !== undefined) {
		delete settingsToWrite.instanceId;
	}

	await fsWriteFile(settingsPath, JSON.stringify(settingsToWrite, null, '\t'));
	settingsCache = deepCopy(userSettings);

	return userSettings;
}

/**
 * Returns the content of the user settings
 *
 */
export async function getUserSettings(
	settingsPath?: string,
	ignoreCache?: boolean,
): Promise<IUserSettings | undefined> {
	if (settingsCache !== undefined && ignoreCache !== true) {
		return settingsCache;
	}

	if (settingsPath === undefined) {
		settingsPath = getUserSettingsPath();
	}

	try {
		await fsAccess(settingsPath);
	} catch (error) {
		// The file does not exist
		return undefined;
	}

	const settingsFile = await fsReadFile(settingsPath, 'utf8');

	try {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		settingsCache = JSON.parse(settingsFile);
	} catch (error) {
		throw new Error(
			`Error parsing n8n-config file "${settingsPath}". It does not seem to be valid JSON.`,
		);
	}

	return settingsCache as IUserSettings;
}

/**
 * Returns the path to the user settings
 *
 */
export function getUserSettingsPath(): string {
	const n8nFolder = getUserN8nFolderPath();

	return path.join(n8nFolder, USER_SETTINGS_FILE_NAME);
}

/**
 * Returns the path to the n8n folder in which all n8n
 * related data gets saved
 *
 */
export function getUserN8nFolderPath(): string {
	let userFolder;
	if (process.env[USER_FOLDER_ENV_OVERWRITE] !== undefined) {
		userFolder = process.env[USER_FOLDER_ENV_OVERWRITE];
	} else {
		userFolder = getUserHome();
	}

	return path.join(userFolder, USER_SETTINGS_SUBFOLDER);
}

/**
 * Returns the path to the n8n user folder with the custom
 * extensions like nodes and credentials
 *
 */
export function getUserN8nFolderCustomExtensionPath(): string {
	return path.join(getUserN8nFolderPath(), EXTENSIONS_SUBDIRECTORY);
}

/**
 * Returns the path to the n8n user folder with the nodes that
 * have been downloaded
 *
 */
export function getUserN8nFolderDowloadedNodesPath(): string {
	return path.join(getUserN8nFolderPath(), DOWNLOADED_NODES_SUBDIRECTORY);
}

/**
 * Returns the home folder path of the user if
 * none can be found it falls back to the current
 * working directory
 *
 */
export function getUserHome(): string {
	let variableName = 'HOME';
	if (process.platform === 'win32') {
		variableName = 'USERPROFILE';
	}

	if (process.env[variableName] === undefined) {
		// If for some reason the variable does not exist
		// fall back to current folder
		return process.cwd();
	}

	return process.env[variableName] as string;
}
