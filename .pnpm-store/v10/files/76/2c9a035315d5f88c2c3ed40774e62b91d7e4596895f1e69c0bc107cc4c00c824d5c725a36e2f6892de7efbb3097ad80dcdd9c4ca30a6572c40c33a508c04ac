'use strict';
const {builtinModules} = require('module');

const ignoreList = [
	'sys'
];

// eslint-disable-next-line node/no-deprecated-api
module.exports = (builtinModules || (process.binding ? Object.keys(process.binding('natives')) : []) || [])
	.filter(x => !/^_|^(internal|v8|node-inspect)\/|\//.test(x) && !ignoreList.includes(x))
	.sort();
