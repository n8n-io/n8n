const path = require('path');
const shelljs = require('shelljs');

const rootDirPath = path.resolve(__dirname, '..');
const n8nRootDirPath = path.resolve(rootDirPath, '..', '..', '..');
const distDirPath = path.resolve(rootDirPath, 'dist');

const packageJsonFilePath = path.resolve(rootDirPath, 'package.json');
const readmeFilePath = path.resolve(rootDirPath, 'README.md');
const licenseFilePath = path.resolve(n8nRootDirPath, 'LICENSE.md');

shelljs.cp(packageJsonFilePath, distDirPath);
shelljs.cp(readmeFilePath, distDirPath);
shelljs.cp(licenseFilePath, distDirPath);

shelljs.mv(path.resolve(distDirPath, 'src'), path.resolve(distDirPath, 'types'));
