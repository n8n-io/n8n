'use strict';

const internalPreloadModule = require('../internal-preload-module.js');
const preloadList = require('../preload-list.js');

require('../hook-spawn.js');

preloadList.forEach(file => {
	internalPreloadModule.require(file);
});

