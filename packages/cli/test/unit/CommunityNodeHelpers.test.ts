import { checkPackageStatus, matchPackagesWithUpdates, executeCommand, parsePackageName, matchMissingPackages, hasPackageLoadedSuccessfully, removePackageFromMissingList } from '../../src/CommunityNodes/helpers';
import { NODE_PACKAGE_PREFIX, NPM_COMMAND_TOKENS, NPM_PACKAGE_STATUS_GOOD, RESPONSE_ERROR_MESSAGES } from '../../src/constants';

jest.mock('fs/promises');
import { access as fsAccess, mkdir as fsMkdir } from 'fs/promises';

jest.mock('child_process');
import { exec } from 'child_process';
import { InstalledPackages } from '../../src/databases/entities/InstalledPackages';
import { installedNodePayload, installedPackagePayload } from '../integration/shared/utils';
import { InstalledNodes } from '../../src/databases/entities/InstalledNodes';
import { NpmUpdatesAvailable } from '../../src/Interfaces';
import { randomName } from '../integration/shared/random';

import config from '../../config';

jest.mock('axios');
import axios from 'axios';

describe('CommunityNodesHelper', () => {

	describe('parsePackageName', () => {
		it('Should fail with empty package name', () => {
			expect(() => parsePackageName('')).toThrowError()
		});

		it('Should fail with invalid package prefix name', () => {
			expect(() => parsePackageName('INVALID_PREFIX@123')).toThrowError()
		});

		it('Should parse valid package name', () => {
			const validPackageName = NODE_PACKAGE_PREFIX + 'cool-package-name';
			const parsedPackageName = parsePackageName(validPackageName);

			expect(parsedPackageName.originalString).toBe(validPackageName);
			expect(parsedPackageName.packageName).toBe(validPackageName);
			expect(parsedPackageName.scope).toBeUndefined();
			expect(parsedPackageName.version).toBeUndefined();
		});

		it('Should parse valid package name and version', () => {
			const validPackageName = NODE_PACKAGE_PREFIX + 'cool-package-name';
			const validPackageVersion = '0.1.1';
			const fullPackageName = `${validPackageName}@${validPackageVersion}`;
			const parsedPackageName = parsePackageName(fullPackageName);

			expect(parsedPackageName.originalString).toBe(fullPackageName);
			expect(parsedPackageName.packageName).toBe(validPackageName);
			expect(parsedPackageName.scope).toBeUndefined();
			expect(parsedPackageName.version).toBe(validPackageVersion);
		});

		it('Should parse valid package name, scope and version', () => {
			const validPackageScope = '@n8n';
			const validPackageName = NODE_PACKAGE_PREFIX + 'cool-package-name';
			const validPackageVersion = '0.1.1';
			const fullPackageName = `${validPackageScope}/${validPackageName}@${validPackageVersion}`;
			const parsedPackageName = parsePackageName(fullPackageName);

			expect(parsedPackageName.originalString).toBe(fullPackageName);
			expect(parsedPackageName.packageName).toBe(`${validPackageScope}/${validPackageName}`);
			expect(parsedPackageName.scope).toBe(validPackageScope);
			expect(parsedPackageName.version).toBe(validPackageVersion);
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

		it('Should call command with valid options', async () => {
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

		it ('Should make sure folder exists', async () => {
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

		it ('Should try to create folder if it does not exist', async () => {
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

		it('Should throw especial error when package is not found', async() => {
			// @ts-ignore
			exec.mockImplementation((...args) => {
				const callbackFunction = args[args.length - 1];
				callbackFunction(new Error('Something went wrong - ' + NPM_COMMAND_TOKENS.NPM_PACKAGE_NOT_FOUND_ERROR + '. Aborting.'));
			});

			await expect(async () => await executeCommand('ls')).rejects.toThrow(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND);

			expect(fsAccess).toHaveBeenCalled();
			expect(exec).toHaveBeenCalled();
			expect(fsMkdir).toHaveBeenCalledTimes(0);
		});
	});


	describe('crossInformationPackage', () => {

		it('Should return same list if availableUpdates is undefined', () => {
			const fakePackages = generateListOfFakeInstalledPackages();
			const crossedData = matchPackagesWithUpdates(fakePackages);
			expect(crossedData).toEqual(fakePackages);
		});

		it ('Should correctly match update versions for packages', () => {
			const fakePackages = generateListOfFakeInstalledPackages();

			const updates: NpmUpdatesAvailable = {
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
				}
			};

			const crossedData = matchPackagesWithUpdates(fakePackages, updates);

			// @ts-ignore
			expect(crossedData[0].updateAvailable).toBe('0.2.0');
			// @ts-ignore
			expect(crossedData[1].updateAvailable).toBe('0.3.0');

		});

		it ('Should correctly match update versions for single package', () => {
			const fakePackages = generateListOfFakeInstalledPackages();

			const updates: NpmUpdatesAvailable = {
				[fakePackages[1].packageName]: {
					current: fakePackages[0].installedVersion,
					wanted: fakePackages[0].installedVersion,
					latest: '0.3.0',
					location: fakePackages[0].packageName,
				}
			};

			const crossedData = matchPackagesWithUpdates(fakePackages, updates);

			// @ts-ignore
			expect(crossedData[0].updateAvailable).toBeUndefined();
			// @ts-ignore
			expect(crossedData[1].updateAvailable).toBe('0.3.0');

		});

	});

	describe('matchMissingPackages', () => {
		it('Should not match failed packages that do not exist', () => {
			const fakePackages = generateListOfFakeInstalledPackages();
			const notFoundPackageList = `${NODE_PACKAGE_PREFIX}very-long-name-that-should-never-be-generated@1.0.0 ${NODE_PACKAGE_PREFIX}another-very-long-name-that-never-is-seen`;
			const matchedPackages = matchMissingPackages(fakePackages, notFoundPackageList);

			expect(matchedPackages).toEqual(fakePackages);
			expect(matchedPackages[0].failedLoading).toBeUndefined();
			expect(matchedPackages[1].failedLoading).toBeUndefined();
		});

		it('Should match failed packages that should be present', () => {
			const fakePackages = generateListOfFakeInstalledPackages();
			const notFoundPackageList = `${NODE_PACKAGE_PREFIX}very-long-name-that-should-never-be-generated@1.0.0 ${fakePackages[0].packageName}@${fakePackages[0].installedVersion}`;
			const matchedPackages = matchMissingPackages(fakePackages, notFoundPackageList);

			expect(matchedPackages[0].failedLoading).toBe(true);
			expect(matchedPackages[1].failedLoading).toBeUndefined();
		});

		it('Should match failed packages even if version is wrong', () => {
			const fakePackages = generateListOfFakeInstalledPackages();
			const notFoundPackageList = `${NODE_PACKAGE_PREFIX}very-long-name-that-should-never-be-generated@1.0.0 ${fakePackages[0].packageName}@123.456.789`;
			const matchedPackages = matchMissingPackages(fakePackages, notFoundPackageList);

			expect(matchedPackages[0].failedLoading).toBe(true);
			expect(matchedPackages[1].failedLoading).toBeUndefined();
		});
	});

	describe('checkPackageStatus', () => {
		it('Should call axios.post', async () => {
			const packageName = NODE_PACKAGE_PREFIX + randomName();
			await checkPackageStatus(packageName);
			expect(axios.post).toHaveBeenCalled();
		});

		it('Should not fail if request fails', async () => {
			const packageName = NODE_PACKAGE_PREFIX + randomName();
			axios.post = jest.fn(() => {
				throw new Error('Something went wrong');
			});
			const result = await checkPackageStatus(packageName);
			expect(result.status).toBe(NPM_PACKAGE_STATUS_GOOD);
		});

		it('Should warn if package is banned', async () => {
			const packageName = NODE_PACKAGE_PREFIX + randomName();
			// @ts-ignore
			axios.post = jest.fn(() => {
				return { data: { status: 'Banned', reason: 'Not good' } };
			});
			const result = await checkPackageStatus(packageName);
			expect(result.status).toBe('Banned');
			expect(result.reason).toBe('Not good');
		});
	});

	describe('hasPackageLoadedSuccessfully', () => {
		it('Should return true when failed package list does not exist', () => {
			config.set('nodes.packagesMissing', undefined);
			const result = hasPackageLoadedSuccessfully('package');
			expect(result).toBe(true);
		});

		it('Should return true when package is not in the list of missing packages', () => {
			config.set('nodes.packagesMissing', 'packageA@0.1.0 packgeB@0.1.0');
			const result = hasPackageLoadedSuccessfully('packageC');
			expect(result).toBe(true);
		});

		it('Should return false when package is in the list of missing packages', () => {
			config.set('nodes.packagesMissing', 'packageA@0.1.0 packgeB@0.1.0');
			const result = hasPackageLoadedSuccessfully('packageA');
			expect(result).toBe(false);
		});
	});

	describe('removePackageFromMissingList', () => {
		it('Should do nothing if key does not exist', () => {
			config.set('nodes.packagesMissing', undefined);

			removePackageFromMissingList('packageA');

			const packageList = config.get('nodes.packagesMissing');
			expect(packageList).toBeUndefined();
		});

		it('Should remove only correct package from list', () => {
			config.set('nodes.packagesMissing', 'packageA@0.1.0 packageB@0.2.0 packageBB@0.2.0');

			removePackageFromMissingList('packageB');

			const packageList = config.get('nodes.packagesMissing');
			expect(packageList).toBe('packageA@0.1.0 packageBB@0.2.0');
		});


		it('Should not remove if package is not in the list', () => {
			const failedToLoadList = 'packageA@0.1.0 packageB@0.2.0 packageBB@0.2.0';
			config.set('nodes.packagesMissing', failedToLoadList);

			removePackageFromMissingList('packageC');

			const packageList = config.get('nodes.packagesMissing');
			expect(packageList).toBe(failedToLoadList);
		});

	});
});

/**
 * Generates a list with 2 packages, one with a single node and
 * another with 2 nodes
 * @returns
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
