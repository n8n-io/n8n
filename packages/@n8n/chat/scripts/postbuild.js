const path = require('path');
const shelljs = require('shelljs');

const rootDirPath = path.resolve(__dirname, '..');
const distDirPath = path.resolve(rootDirPath, 'dist');

const packageJsonFilePath = path.resolve(rootDirPath, 'package.json');

shelljs.cp(packageJsonFilePath, distDirPath);
shelljs.mv(path.resolve(distDirPath, 'chatbot.es.js'), path.resolve(distDirPath, 'chatbot.js'));
shelljs.mv(path.resolve(distDirPath, 'src'), path.resolve(distDirPath, 'types'));
