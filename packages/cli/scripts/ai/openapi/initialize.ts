import childProcess from 'child_process';
import path from 'path';

const targetPath = path.join(__dirname, 'openapi-directory');

childProcess.execSync(`git clone git@github.com:APIs-guru/openapi-directory.git ${targetPath}`);
