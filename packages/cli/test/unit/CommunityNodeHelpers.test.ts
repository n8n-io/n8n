import { exec } from 'child_process';
import { access as fsAccess, mkdir as fsMkdir } from 'fs/promises';

import axios from 'axios';

import {
	checkNpmPackageStatus,
	matchPackagesWithUpdates,
	executeCommand,
	parseNpmPackageName,
	matchMissingPackages,
	hasPackageLoaded,
	removePackageFromMissingList,
} from '@/CommunityNodes/helpers';
import {
	NODE_PACKAGE_PREFIX,
	NPM_COMMAND_TOKENS,
	NPM_PACKAGE_STATUS_GOOD,
	RESPONSE_ERROR_MESSAGES,
} from '@/constants';
import { InstalledPackages } from '@db/entities/InstalledPackages';
import { InstalledNodes } from '@db/entities/InstalledNodes';
import { randomName } from '../integration/shared/random';
import config from '@/config';
import { installedPackagePayload, installedNodePayload } from '../integration/shared/utils';

import type { CommunityPackages } from '@/Interfaces';

jest.mock('fs/promises');
jest.mock('child_process');
jest.mock('axios');

describe('parsePackageName', () => {
	test('Should fail with empty package name', () => {
		expect(() => parseNpmPackageName('')).toThrowError();
	});

	test('Should fail with invalid package prefix name', () => {
		expect(() => parseNpmPackageName('INVALID_PREFIX@123')).toThrowError();
	});

	test('Should parse valid package name', () => {
		const validPackageName = NODE_PACKAGE_PREFIX + 'cool-package-name';
		const parsed = parseNpmPackageName(validPackageName);

		expect(parsed.rawString).toBe(validPackageName);
		expect(parsed.packageName).toBe(validPackageName);
		expect(parsed.scope).toBeUndefined();
		expect(parsed.version).toBeUndefined();
	});

	test('Should parse valid package name and version', () => {
		const validPackageName = NODE_PACKAGE_PREFIX + 'cool-package-name';
		const validPackageVersion = '0.1.1';
		const fullPackageName = `${validPackageName}@${validPackageVersion}`;
		const parsed = parseNpmPackageName(fullPackageName);

		expect(parsed.rawString).toBe(fullPackageName);
		expect(parsed.packageName).toBe(validPackageName);
		expect(parsed.scope).toBeUndefined();
		expect(parsed.version).toBe(validPackageVersion);
	});

	test('Should parse valid package name, scope and version', () => {
		const validPackageScope = '@n8n';
		const validPackageName = NODE_PACKAGE_PREFIX + 'cool-package-name';
		const validPackageVersion = '0.1.1';
		const fullPackageName = `${validPackageScope}/${validPackageName}@${validPackageVersion}`;
		const parsed = parseNpmPackageName(fullPackageName);

		expect(parsed.rawString).toBe(fullPackageName);
		expect(parsed.packageName).toBe(`${validPackageScope}/${validPackageName}`);
		expect(parsed.scope).toBe(validPackageScope);
		expect(parsed.version).toBe(validPackageVersion);
	});
});

describe('executeCommand', () => {
	beforeEach(() => {
		// @ts-ignore
		fsAccess.mockReset();
		// @ts-ignore
		fsMkdir.mockReset();
		// @ts-ignore
		exec.mockReset();
	});

	test('Should call command with valid options', async () => {
		// @ts-ignore
		exec.mockImplementation((...args) => {
			expect(args[1].cwd).toBeDefined();
			expect(args[1].env).toBeDefined();
			// PATH or NODE_PATH may be undefined depending on environment so we don't check for these keys.
			const callbackFunction = args[args.length - 1];
			callbackFunction(null, { stdout: 'Done' });
		});

		await executeCommand('ls');
		expect(fsAccess).toHaveBeenCalled();
		expect(exec).toHaveBeenCalled();
		expect(fsMkdir).toBeCalledTimes(0);
	});

	test('Should make sure folder exists', async () => {
		// @ts-ignore
		exec.mockImplementation((...args) => {
			const callbackFunction = args[args.length - 1];
			callbackFunction(null, { stdout: 'Done' });
		});

		await executeCommand('ls');
		expect(fsAccess).toHaveBeenCalled();
		expect(exec).toHaveBeenCalled();
		expect(fsMkdir).toBeCalledTimes(0);
	});

	test('Should try to create folder if it does not exist', async () => {
		// @ts-ignore
		exec.mockImplementation((...args) => {
			const callbackFunction = args[args.length - 1];
			callbackFunction(null, { stdout: 'Done' });
		});

		// @ts-ignore
		fsAccess.mockImplementation(() => {
			throw new Error('Folder does not exist.');
		});

		await executeCommand('ls');
		expect(fsAccess).toHaveBeenCalled();
		expect(exec).toHaveBeenCalled();
		expect(fsMkdir).toHaveBeenCalled();
	});

	test('Should throw especial error when package is not found', async () => {
		// @ts-ignore
		exec.mockImplementation((...args) => {
			const callbackFunction = args[args.length - 1];
			callbackFunction(
				new Error(
					'Something went wrong - ' +
						NPM_COMMAND_TOKENS.NPM_PACKAGE_NOT_FOUND_ERROR +
						'. Aborting.',
				),
			);
		});

		await expect(async () => await executeCommand('ls')).rejects.toThrow(
			RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND,
		);

		expect(fsAccess).toHaveBeenCalled();
		expect(exec).toHaveBeenCalled();
		expect(fsMkdir).toHaveBeenCalledTimes(0);
	});
});

describe('crossInformationPackage', () => {
	test('Should return same list if availableUpdates is undefined', () => {
		const fakePackages = generateListOfFakeInstalledPackages();
		const crossedData = matchPackagesWithUpdates(fakePackages);
		expect(crossedData).toEqual(fakePackages);
	});

	test('Should correctly match update versions for packages', () => {
		const fakePackages = generateListOfFakeInstalledPackages();

		const updates: CommunityPackages.AvailableUpdates = {
			[fakePackages[0].packageName]: {
				current: fakePackages[0].installedVersion,
				wanted: fakePackages[0].installedVersion,
				latest: '0.2.0',
				location: fakePackages[0].packageName,
			},
			[fakePackages[1].packageName]: {
				current: fakePackages[0].installedVersion,
				wanted: fakePackages[0].installedVersion,
				latest: '0.3.0',
				location: fakePackages[0].packageName,
			},
		};

		const crossedData = matchPackagesWithUpdates(fakePackages, updates);

		// @ts-ignore
		expect(crossedData[0].updateAvailable).toBe('0.2.0');
		// @ts-ignore
		expect(crossedData[1].updateAvailable).toBe('0.3.0');
	});

	test('Should correctly match update versions for single package', () => {
		const fakePackages = generateListOfFakeInstalledPackages();

		const updates: CommunityPackages.AvailableUpdates = {
			[fakePackages[1].packageName]: {
				current: fakePackages[0].installedVersion,
				wanted: fakePackages[0].installedVersion,
				latest: '0.3.0',
				location: fakePackages[0].packageName,
			},
		};

		const crossedData = matchPackagesWithUpdates(fakePackages, updates);

		// @ts-ignore
		expect(crossedData[0].updateAvailable).toBeUndefined();
		// @ts-ignore
		expect(crossedData[1].updateAvailable).toBe('0.3.0');
	});
});

describe('matchMissingPackages', () => {
	test('Should not match failed packages that do not exist', () => {
		const fakePackages = generateListOfFakeInstalledPackages();
		const notFoundPackageList = `${NODE_PACKAGE_PREFIX}very-long-name-that-should-never-be-generated@1.0.0 ${NODE_PACKAGE_PREFIX}another-very-long-name-that-never-is-seen`;
		const matchedPackages = matchMissingPackages(fakePackages, notFoundPackageList);

		expect(matchedPackages).toEqual(fakePackages);
		expect(matchedPackages[0].failedLoading).toBeUndefined();
		expect(matchedPackages[1].failedLoading).toBeUndefined();
	});

	test('Should match failed packages that should be present', () => {
		const fakePackages = generateListOfFakeInstalledPackages();
		const notFoundPackageList = `${NODE_PACKAGE_PREFIX}very-long-name-that-should-never-be-generated@1.0.0 ${fakePackages[0].packageName}@${fakePackages[0].installedVersion}`;
		const matchedPackages = matchMissingPackages(fakePackages, notFoundPackageList);

		expect(matchedPackages[0].failedLoading).toBe(true);
		expect(matchedPackages[1].failedLoading).toBeUndefined();
	});

	test('Should match failed packages even if version is wrong', () => {
		const fakePackages = generateListOfFakeInstalledPackages();
		const notFoundPackageList = `${NODE_PACKAGE_PREFIX}very-long-name-that-should-never-be-generated@1.0.0 ${fakePackages[0].packageName}@123.456.789`;
		const matchedPackages = matchMissingPackages(fakePackages, notFoundPackageList);

		expect(matchedPackages[0].failedLoading).toBe(true);
		expect(matchedPackages[1].failedLoading).toBeUndefined();
	});
});

describe('checkNpmPackageStatus', () => {
	test('Should call axios.post', async () => {
		const packageName = NODE_PACKAGE_PREFIX + randomName();
		await checkNpmPackageStatus(packageName);
		expect(axios.post).toHaveBeenCalled();
	});

	test('Should not fail if request fails', async () => {
		const packageName = NODE_PACKAGE_PREFIX + randomName();
		axios.post = jest.fn(() => {
			throw new Error('Something went wrong');
		});
		const result = await checkNpmPackageStatus(packageName);
		expect(result.status).toBe(NPM_PACKAGE_STATUS_GOOD);
	});

	test('Should warn if package is banned', async () => {
		const packageName = NODE_PACKAGE_PREFIX + randomName();
		// @ts-ignore
		axios.post = jest.fn(() => {
			return { data: { status: 'Banned', reason: 'Not good' } };
		});
		const result = await checkNpmPackageStatus(packageName);
		expect(result.status).toBe('Banned');
		expect(result.reason).toBe('Not good');
	});
});

describe('hasPackageLoadedSuccessfully', () => {
	test('Should return true when failed package list does not exist', () => {
		config.set('nodes.packagesMissing', undefined);
		const result = hasPackageLoaded('package');
		expect(result).toBe(true);
	});

	test('Should return true when package is not in the list of missing packages', () => {
		config.set('nodes.packagesMissing', 'packageA@0.1.0 packgeB@0.1.0');
		const result = hasPackageLoaded('packageC');
		expect(result).toBe(true);
	});

	test('Should return false when package is in the list of missing packages', () => {
		config.set('nodes.packagesMissing', 'packageA@0.1.0 packgeB@0.1.0');
		const result = hasPackageLoaded('packageA');
		expect(result).toBe(false);
	});
});

describe('removePackageFromMissingList', () => {
	test('Should do nothing if key does not exist', () => {
		config.set('nodes.packagesMissing', undefined);

		removePackageFromMissingList('packageA');

		const packageList = config.get('nodes.packagesMissing');
		expect(packageList).toBeUndefined();
	});

	test('Should remove only correct package from list', () => {
		config.set('nodes.packagesMissing', 'packageA@0.1.0 packageB@0.2.0 packageBB@0.2.0');

		removePackageFromMissingList('packageB');

		const packageList = config.get('nodes.packagesMissing');
		expect(packageList).toBe('packageA@0.1.0 packageBB@0.2.0');
	});

	test('Should not remove if package is not in the list', () => {
		const failedToLoadList = 'packageA@0.1.0 packageB@0.2.0 packageBB@0.2.0';
		config.set('nodes.packagesMissing', failedToLoadList);

		removePackageFromMissingList('packageC');

		const packageList = config.get('nodes.packagesMissing');
		expect(packageList).toBe(failedToLoadList);
	});
});

/**
 * Generate a list with 2 packages, one with a single node and another with 2 nodes
 */
function generateListOfFakeInstalledPackages(): InstalledPackages[] {
	const fakeInstalledPackage1 = new InstalledPackages();
	Object.assign(fakeInstalledPackage1, installedPackagePayload());

	const fakeInstalledNode1 = new InstalledNodes();
	Object.assign(fakeInstalledNode1, installedNodePayload(fakeInstalledPackage1.packageName));

	fakeInstalledPackage1.installedNodes = [fakeInstalledNode1];

	const fakeInstalledPackage2 = new InstalledPackages();
	Object.assign(fakeInstalledPackage2, installedPackagePayload());

	const fakeInstalledNode2 = new InstalledNodes();
	Object.assign(fakeInstalledNode2, installedNodePayload(fakeInstalledPackage2.packageName));

	const fakeInstalledNode3 = new InstalledNodes();
	Object.assign(fakeInstalledNode3, installedNodePayload(fakeInstalledPackage2.packageName));

	fakeInstalledPackage2.installedNodes = [fakeInstalledNode2, fakeInstalledNode3];

	return [fakeInstalledPackage1, fakeInstalledPackage2];
}
