'use strict';

const { execSync } = require('child_process');
const { version } = require('./package');

execSync('npm run test');
execSync(`git tag v${version}`);
execSync('npm publish');