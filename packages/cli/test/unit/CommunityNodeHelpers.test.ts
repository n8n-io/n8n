import { executeCommand, parsePackageName } from '../../src/CommunityNodes/helpers';
import { NODE_PACKAGE_PREFIX } from '../../src/constants';

jest.mock('fs/promises');
import { access as fsAccess } from 'fs/promises';

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


		it ('Should make sure folder exists', async () => {
			// @ts-ignore
			exec.mockImplementation((...args) => {
				const callbackFunction = args[args.length - 1];
				callbackFunction(null, { stdout: 'Done' });
			});

			await executeCommand('ls');
			expect(fsAccess).toHaveBeenCalled();
			expect(exec).toHaveBeenCalled();
		});
	});
});
