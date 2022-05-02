/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/naming-convention */
import { promisify } from 'util';
import { exec } from 'child_process';
import { access as fsAccess, mkdir as fsMkdir } from 'fs/promises';

import { UserSettings } from 'n8n-core';
import {
	NODE_PACKAGE_PREFIX,
	NPM_PACKAGE_NOT_FOUND_ERROR,
	RESPONSE_ERROR_MESSAGES,
} from '../constants';
import { NpmUpdatesAvailable, ParsedNpmPackageName } from '../Interfaces';
import { InstalledPackages } from '../databases/entities/InstalledPackages';

const execAsync = promisify(exec);

export const parsePackageName = (originalString: string | undefined): ParsedNpmPackageName => {
	if (!originalString) {
		throw new Error('Package name was not provided');
	}

	const scope = originalString.includes('/') ? originalString.split('/')[0] : undefined;

	const packageNameWithoutScope = scope ? originalString.replace(`${scope}/`, '') : originalString;

	if (!packageNameWithoutScope.startsWith(NODE_PACKAGE_PREFIX)) {
		throw new Error('Package name is not valid');
	}

	const version = packageNameWithoutScope.includes('@')
		? packageNameWithoutScope.split('@')[1]
		: undefined;

	const packageName = version ? originalString.replace(`@${version}`, '') : originalString;

	return {
		packageName,
		scope,
		version,
		originalString,
	};
};

export const executeCommand = async (command: string): Promise<string> => {
	const downloadFolder = UserSettings.getUserN8nFolderDowloadedNodesPath();
	// Make sure the node-download folder exists
	try {
		await fsAccess(downloadFolder);
		// eslint-disable-next-line no-empty
	} catch (error) {
		await fsMkdir(downloadFolder);
	}
	const execOptions = {
		cwd: downloadFolder,
		env: {
			NODE_PATH: process.env.NODE_PATH,
			PATH: process.env.PATH,
		},
	};

	try {
		const commandResult = await execAsync(command, execOptions);
		return commandResult.stdout;
	} catch (error) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
		if (error.message.includes(NPM_PACKAGE_NOT_FOUND_ERROR)) {
			throw new Error(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND);
		}
		throw error;
	}
};

export function crossInformationPackages(
	installedPackages: InstalledPackages[],
	availableUpdates?: NpmUpdatesAvailable,
): InstalledPackages[] {
	if (!availableUpdates) {
		return installedPackages;
	}
	const hydratedPackageList = [];

	for (let i = 0; i < installedPackages.length; i++) {
		const installedPackage = installedPackages[i];
		if (availableUpdates[installedPackage.packageName]) {
			// TODO: Check what's the best way to remove this ts-ignore
			// @ts-ignore
			installedPackage.updateAvailable = availableUpdates[installedPackage.packageName].latest;
		}
		hydratedPackageList.push(installedPackage);
	}

	return hydratedPackageList;
}
