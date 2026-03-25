'use strict';

const path = require('path');

const processOnSpawn = require('process-on-spawn');
const {needsPathEnv, processNodePath} = require('./generate-require.js');
const processNodeOptions = require('./process-node-options.js');
const preloadList = require('./preload-list.js');
const preloadListEnv = require('./preload-list-env.js');

processOnSpawn.addListener(({env}) => {
	env.NODE_OPTIONS = processNodeOptions(
		env.NODE_OPTIONS || /* istanbul ignore next: impossible under nyc 15 */ ''
	);
	/* istanbul ignore next */
	if (needsPathEnv(__dirname)) {
		env.NODE_PATH = processNodePath(env.NODE_PATH || '');
	}

	env[preloadListEnv] = preloadList.join(path.delimiter);
});
