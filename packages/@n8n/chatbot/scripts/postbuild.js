const path = require('path');
const shelljs = require('shelljs');

const rootDirPath = path.resolve(__dirname, '..');
const distDirPath = path.resolve(rootDirPath, 'dist');

const packageJsonFilePath = path.resolve(rootDirPath, 'package.json');

shelljs.cp(packageJsonFilePath, distDirPath);
shelljs.mv(
	path.resolve(distDirPath, 'n8n-chatbot.es.js'),
	path.resolve(distDirPath, 'n8n-chatbot.js'),
);
shelljs.mv(path.resolve(distDirPath, 'src'), path.resolve(distDirPath, 'types'));
shelljs.mv(path.resolve(distDirPath, 'style.css'), path.resolve(distDirPath, 'n8n-chatbot.css'));
