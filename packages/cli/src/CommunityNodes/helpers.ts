/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/naming-convention */
import { promisify } from 'util';
import { exec } from 'child_process';
import { access as fsAccess, mkdir as fsMkdir } from 'fs/promises';
import axios from 'axios';
import { UserSettings } from 'n8n-core';
import type { PublicInstalledPackage } from 'n8n-workflow';
import { LoggerProxy } from 'n8n-workflow';

import {
	NODE_PACKAGE_PREFIX,
	NPM_COMMAND_TOKENS,
	NPM_PACKAGE_STATUS_GOOD,
	RESPONSE_ERROR_MESSAGES,
	UNKNOWN_FAILURE_REASON,
} from '@/constants';
import type { InstalledPackages } from '@db/entities/InstalledPackages';
import config from '@/config';

import type { CommunityPackages } from '@/Interfaces';

const {
	PACKAGE_NAME_NOT_PROVIDED,
	DISK_IS_FULL,
	PACKAGE_FAILED_TO_INSTALL,
	PACKAGE_VERSION_NOT_FOUND,
	PACKAGE_DOES_NOT_CONTAIN_NODES,
	PACKAGE_NOT_FOUND,
} = RESPONSE_ERROR_MESSAGES;

const {
	NPM_PACKAGE_NOT_FOUND_ERROR,
	NPM_NO_VERSION_AVAILABLE,
	NPM_DISK_NO_SPACE,
	NPM_DISK_INSUFFICIENT_SPACE,
	NPM_PACKAGE_VERSION_NOT_FOUND_ERROR,
} = NPM_COMMAND_TOKENS;

const execAsync = promisify(exec);

const INVALID_OR_SUSPICIOUS_PACKAGE_NAME = /[^0-9a-z@\-./]/;

export const parseNpmPackageName = (rawString?: string): CommunityPackages.ParsedPackageName => {
	if (!rawString) throw new Error(PACKAGE_NAME_NOT_PROVIDED);

	if (INVALID_OR_SUSPICIOUS_PACKAGE_NAME.test(rawString))
		throw new Error('Package name must be a single word');

	const scope = rawString.includes('/') ? rawString.split('/')[0] : undefined;

	const packageNameWithoutScope = scope ? rawString.replace(`${scope}/`, '') : rawString;

	if (!packageNameWithoutScope.startsWith(NODE_PACKAGE_PREFIX)) {
		throw new Error(`Package name must start with ${NODE_PACKAGE_PREFIX}`);
	}

	const version = packageNameWithoutScope.includes('@')
		? packageNameWithoutScope.split('@')[1]
		: undefined;

	const packageName = version ? rawString.replace(`@${version}`, '') : rawString;

	return {
		packageName,
		scope,
		version,
		rawString,
	};
};

export const sanitizeNpmPackageName = parseNpmPackageName;

export const executeCommand = async (
	command: string,
	options?: { doNotHandleError?: boolean },
): Promise<string> => {
	const downloadFolder = UserSettings.getUserN8nFolderDownloadedNodesPath();

	const execOptions = {
		cwd: downloadFolder,
		env: {
			NODE_PATH: process.env.NODE_PATH,
			PATH: process.env.PATH,
			APPDATA: process.env.APPDATA,
		},
	};

	try {
		await fsAccess(downloadFolder);
	} catch {
		await fsMkdir(downloadFolder);
		// Also init the folder since some versions
		// of npm complain if the folder is empty
		await execAsync('npm init -y', execOptions);
	}

	try {
		const commandResult = await execAsync(command, execOptions);

		return commandResult.stdout;
	} catch (error) {
		if (options?.doNotHandleError) throw error;

		const errorMessage = error instanceof Error ? error.message : UNKNOWN_FAILURE_REASON;

		const map = {
			[NPM_PACKAGE_NOT_FOUND_ERROR]: PACKAGE_NOT_FOUND,
			[NPM_NO_VERSION_AVAILABLE]: PACKAGE_NOT_FOUND,
			[NPM_PACKAGE_VERSION_NOT_FOUND_ERROR]: PACKAGE_VERSION_NOT_FOUND,
			[NPM_DISK_NO_SPACE]: DISK_IS_FULL,
			[NPM_DISK_INSUFFICIENT_SPACE]: DISK_IS_FULL,
		};

		Object.entries(map).forEach(([npmMessage, n8nMessage]) => {
			if (errorMessage.includes(npmMessage)) throw new Error(n8nMessage);
		});

		LoggerProxy.warn('npm command failed', { errorMessage });

		throw new Error(PACKAGE_FAILED_TO_INSTALL);
	}
};

export function matchPackagesWithUpdates(
	packages: InstalledPackages[],
	updates?: CommunityPackages.AvailableUpdates,
): PublicInstalledPackage[] {
	if (!updates) return packages;

	return packages.reduce<PublicInstalledPackage[]>((acc, cur) => {
		const publicPackage: PublicInstalledPackage = { ...cur };

		const update = updates[cur.packageName];

		if (update) publicPackage.updateAvailable = update.latest;

		acc.push(publicPackage);

		return acc;
	}, []);
}

export function matchMissingPackages(
	installedPackages: PublicInstalledPackage[],
	missingPackages: string,
): PublicInstalledPackage[] {
	const missingPackageNames = missingPackages.split(' ');

	const missingPackagesList = missingPackageNames.map((missingPackageName: string) => {
		// Strip away versions but maintain scope and package name
		try {
			const parsedPackageData = parseNpmPackageName(missingPackageName);
			return parsedPackageData.packageName;

			// eslint-disable-next-line no-empty
		} catch {}
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

export async function checkNpmPackageStatus(
	packageName: string,
): Promise<CommunityPackages.PackageStatusCheck> {
	const N8N_BACKEND_SERVICE_URL = 'https://api.n8n.io/api/package';

	try {
		const response = await axios.post<CommunityPackages.PackageStatusCheck>(
			N8N_BACKEND_SERVICE_URL,
			{ name: packageName },
			{ method: 'POST' },
		);

		if (response.data.status !== NPM_PACKAGE_STATUS_GOOD) return response.data;
	} catch (error) {
		// Do nothing if service is unreachable
	}

	return { status: NPM_PACKAGE_STATUS_GOOD };
}

export function hasPackageLoaded(packageName: string): boolean {
	const missingPackages = config.get('nodes.packagesMissing') as string | undefined;

	if (!missingPackages) return true;

	return !missingPackages
		.split(' ')
		.some(
			(packageNameAndVersion) =>
				packageNameAndVersion.startsWith(packageName) &&
				packageNameAndVersion.replace(packageName, '').startsWith('@'),
		);
}

export function removePackageFromMissingList(packageName: string): void {
	try {
		const failedPackages = config.get('nodes.packagesMissing').split(' ');

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

export const isClientError = (error: Error): boolean => {
	const clientErrors = [
		PACKAGE_VERSION_NOT_FOUND,
		PACKAGE_DOES_NOT_CONTAIN_NODES,
		PACKAGE_NOT_FOUND,
	];

	return clientErrors.some((message) => error.message.includes(message));
};

export function isNpmError(error: unknown): error is { code: number; stdout: string } {
	return typeof error === 'object' && error !== null && 'code' in error && 'stdout' in error;
}
