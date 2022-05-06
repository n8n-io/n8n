/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/naming-convention */
import { promisify } from 'util';
import { exec } from 'child_process';
import { access as fsAccess, mkdir as fsMkdir } from 'fs/promises';

import { UserSettings } from 'n8n-core';
import { PublicInstalledPackage } from 'n8n-workflow';
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

export function matchPackagesWithUpdates(
	installedPackages: InstalledPackages[],
	availableUpdates?: NpmUpdatesAvailable,
): PublicInstalledPackage[] {
	if (!availableUpdates) {
		return installedPackages;
	}
	const hydratedPackageList = [] as PublicInstalledPackage[];

	for (let i = 0; i < installedPackages.length; i++) {
		const installedPackage = installedPackages[i];
		const publicPackage = { ...installedPackage } as PublicInstalledPackage;

		if (availableUpdates[installedPackage.packageName]) {
			publicPackage.updateAvailable = availableUpdates[installedPackage.packageName].latest;
		}
		hydratedPackageList.push(publicPackage);
	}

	return hydratedPackageList;
}

export function matchMissingPackages(
	installedPackages: PublicInstalledPackage[],
	missingPackages: string,
): PublicInstalledPackage[] {
	const missingPackageNames = missingPackages.split(' ');

	const missingPackagesList = missingPackageNames.map((missingPackageName: string) => {
		// Strip away versions but maintain scope and package name
		try {
			const parsedPackageData = parsePackageName(missingPackageName);
			return parsedPackageData.packageName;

			// eslint-disable-next-line no-empty
		} catch (_) {}
		return undefined;
	});

	const hydratedPackageList = [] as PublicInstalledPackage[];
	installedPackages.forEach((installedPackage) => {
		const hydratedInstalledPackage = { ...installedPackage };
		if (missingPackagesList.includes(hydratedInstalledPackage.packageName)) {
			hydratedInstalledPackage.failedLoading = true;
		}
		hydratedPackageList.push(hydratedInstalledPackage);
	});

	return hydratedPackageList;
}
