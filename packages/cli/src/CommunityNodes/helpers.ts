/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/naming-convention */
import { promisify } from 'util';
import { exec } from 'child_process';
import { access as fsAccess, mkdir as fsMkdir } from 'fs/promises';

import { UserSettings } from 'n8n-core';
import { LoggerProxy, PublicInstalledPackage } from 'n8n-workflow';
import axios from 'axios';
import {
	NODE_PACKAGE_PREFIX,
	NPM_COMMAND_TOKENS,
	NPM_PACKAGE_STATUS_GOOD,
	RESPONSE_ERROR_MESSAGES,
} from '../constants';
import { NpmPackageStatusCheck, NpmUpdatesAvailable, ParsedNpmPackageName } from '../Interfaces';
import { InstalledPackages } from '../databases/entities/InstalledPackages';
import config from '../../config';

const execAsync = promisify(exec);

export const parsePackageName = (originalString: string | undefined): ParsedNpmPackageName => {
	if (!originalString) {
		throw new Error('Package name was not provided');
	}

	if (new RegExp(/[^0-9a-z@\-./]/).test(originalString)) {
		// Prevent any strings that are not valid npm package names or
		// could indicate malicous commands
		throw new Error('Package name must be a single word');
	}

	const scope = originalString.includes('/') ? originalString.split('/')[0] : undefined;

	const packageNameWithoutScope = scope ? originalString.replace(`${scope}/`, '') : originalString;

	if (!packageNameWithoutScope.startsWith(NODE_PACKAGE_PREFIX)) {
		throw new Error('Package name must start with n8n-nodes-');
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

export const executeCommand = async (
	command: string,
	options?: {
		doNotHandleError?: boolean;
	},
): Promise<string> => {
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
		if (options?.doNotHandleError) {
			throw error;
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const errorMessage = error.message as string;

		if (
			errorMessage.includes(NPM_COMMAND_TOKENS.NPM_PACKAGE_NOT_FOUND_ERROR) ||
			errorMessage.includes(NPM_COMMAND_TOKENS.NPM_NO_VERSION_AVAILABLE)
		) {
			throw new Error(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND);
		}
		if (errorMessage.includes(NPM_COMMAND_TOKENS.NPM_PACKAGE_VERSION_NOT_FOUND_ERROR)) {
			throw new Error(RESPONSE_ERROR_MESSAGES.PACKAGE_VERSION_NOT_FOUND);
		}
		if (
			errorMessage.includes(NPM_COMMAND_TOKENS.NPM_DISK_NO_SPACE) ||
			errorMessage.includes(NPM_COMMAND_TOKENS.NPM_DISK_INSUFFICIENT_SPACE)
		) {
			throw new Error(RESPONSE_ERROR_MESSAGES.DISK_IS_FULL);
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		LoggerProxy.warn('npm command failed; see message', { errorMessage });

		throw new Error('Package could not be installed - check logs for details');
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

export async function checkPackageStatus(packageName: string): Promise<NpmPackageStatusCheck> {
	// You can change this URL for testing - the default testing url below
	// is a postman mock service
	const n8nBackendServiceUrl = 'https://api.n8n.io/api/package';

	try {
		const output = await axios.post(
			n8nBackendServiceUrl,
			{ name: packageName },
			{
				method: 'POST',
			},
		);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		if (output.data.status !== NPM_PACKAGE_STATUS_GOOD) {
			return output.data as NpmPackageStatusCheck;
		}
	} catch (error) {
		// Do nothing if service is unreachable
	}
	return { status: NPM_PACKAGE_STATUS_GOOD };
}

export function hasPackageLoadedSuccessfully(packageName: string): boolean {
	try {
		const failedPackages = (config.get('nodes.packagesMissing') as string).split(' ');

		const packageFailedToLoad = failedPackages.find(
			(packageNameAndVersion) =>
				packageNameAndVersion.startsWith(packageName) &&
				packageNameAndVersion.replace(packageName, '').startsWith('@'),
		);
		if (packageFailedToLoad) {
			return false;
		}
		return true;
	} catch (_error) {
		// If key doesn't exist it means all packages loaded fine
		return true;
	}
}

export function removePackageFromMissingList(packageName: string): void {
	try {
		const failedPackages = (config.get('nodes.packagesMissing') as string).split(' ');

		const packageFailedToLoad = failedPackages.filter(
			(packageNameAndVersion) =>
				!packageNameAndVersion.startsWith(packageName) ||
				!packageNameAndVersion.replace(packageName, '').startsWith('@'),
		);

		config.set('nodes.packagesMissing', packageFailedToLoad.join(' '));
	} catch (_error) {
		// Do nothing
	}
}
