import { executeCommand, parsePackageName } from '../../src/CommunityNodes/helpers';
import { NODE_PACKAGE_PREFIX, NPM_PACKAGE_NOT_FOUND_ERROR, RESPONSE_ERROR_MESSAGES } from '../../src/constants';

jest.mock('fs/promises');
import { access as fsAccess, mkdir as fsMkdir } from 'fs/promises';

jest.mock('child_process');
import { exec } from 'child_process';

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
				callbackFunction(new Error('Something went wrong - ' + NPM_PACKAGE_NOT_FOUND_ERROR + '. Aborting.'));
			});

			await expect(async () => await executeCommand('ls')).rejects.toThrow(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND);

			expect(fsAccess).toHaveBeenCalled();
			expect(exec).toHaveBeenCalled();
			expect(fsMkdir).toHaveBeenCalledTimes(0);
		});
	});
});
