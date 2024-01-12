const path = require('path');
const shelljs = require('shelljs');
const glob = require('fast-glob');

const rootDirPath = path.resolve(__dirname, '..');
const n8nRootDirPath = path.resolve(rootDirPath, '..', '..', '..');
const distDirPath = path.resolve(rootDirPath, 'dist');
const srcDirPath = path.resolve(rootDirPath, 'src');
const libDirPath = path.resolve(rootDirPath, 'tmp', 'lib');
const cjsDirPath = path.resolve(rootDirPath, 'tmp', 'cjs');

const packageJsonFilePath = path.resolve(rootDirPath, 'package.json');
const readmeFilePath = path.resolve(rootDirPath, 'README.md');
const licenseFilePath = path.resolve(n8nRootDirPath, 'LICENSE.md');

shelljs.cp(packageJsonFilePath, distDirPath);
shelljs.cp(readmeFilePath, distDirPath);
shelljs.cp(licenseFilePath, distDirPath);

shelljs.mv(path.resolve(distDirPath, 'src'), path.resolve(distDirPath, 'types'));

function moveFiles(files, from, to) {
	files.forEach((file) => {
		const toFile = file.replace(from, to);
		shelljs.mkdir('-p', path.dirname(toFile));
		shelljs.mv(file, toFile);
	});
}

const cjsFiles = glob.sync(path.resolve(cjsDirPath, '**', '*'));
moveFiles(cjsFiles, 'tmp/cjs', 'dist');
shelljs.rm('-rf', cjsDirPath);

const libFiles = glob.sync(path.resolve(libDirPath, '**/*'));
moveFiles(libFiles, 'tmp/lib', 'dist');
shelljs.rm('-rf', libDirPath);
