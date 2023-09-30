const path = require('path');
const shelljs = require('shelljs');

const rootDirPath = path.resolve(__dirname, '..');
const distDirPath = path.resolve(rootDirPath, 'dist');

shelljs.cd(rootDirPath);
shelljs.exec('npm run build');

shelljs.cd(distDirPath);
shelljs.exec('npm pack');
