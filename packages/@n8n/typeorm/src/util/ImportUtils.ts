import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export async function importOrRequireFile(
	filePath: string,
): Promise<[result: any, moduleType: 'esm' | 'commonjs']> {
	const tryToImport = async (): Promise<[any, 'esm']> => {
		// `Function` is required to make sure the `import` statement wil stay `import` after
		// transpilation and won't be converted to `require`
		return [
			await Function('return filePath => import(filePath)')()(
				filePath.startsWith('file://') ? filePath : pathToFileURL(filePath).toString(),
			),
			'esm',
		];
	};
	const tryToRequire = async (): Promise<[any, 'commonjs']> => {
		return [require(filePath), 'commonjs'];
	};

	const extension = filePath.substring(filePath.lastIndexOf('.') + '.'.length);

	if (extension === 'mjs' || extension === 'mts') return tryToImport();
	else if (extension === 'cjs' || extension === 'cts') return tryToRequire();
	else if (extension === 'js' || extension === 'ts') {
		const packageJson = await getNearestPackageJson(filePath);

		if (packageJson != null) {
			const isModule = (packageJson as any)?.type === 'module';

			if (isModule) return tryToImport();
			else return tryToRequire();
		} else return tryToRequire();
	}

	return tryToRequire();
}

function getNearestPackageJson(filePath: string): Promise<object | null> {
	return new Promise((accept) => {
		let currentPath = filePath;

		function searchPackageJson() {
			const nextPath = path.dirname(currentPath);

			if (currentPath === nextPath)
				// the top of the file tree is reached
				accept(null);
			else {
				currentPath = nextPath;
				const potentialPackageJson = path.join(currentPath, 'package.json');

				fs.stat(potentialPackageJson, (err, stats) => {
					if (err != null) searchPackageJson();
					else if (stats.isFile()) {
						fs.readFile(potentialPackageJson, 'utf8', (err, data) => {
							if (err != null) accept(null);
							else {
								try {
									accept(JSON.parse(data));
								} catch (err) {
									accept(null);
								}
							}
						});
					} else searchPackageJson();
				});
			}
		}

		searchPackageJson();
	});
}
