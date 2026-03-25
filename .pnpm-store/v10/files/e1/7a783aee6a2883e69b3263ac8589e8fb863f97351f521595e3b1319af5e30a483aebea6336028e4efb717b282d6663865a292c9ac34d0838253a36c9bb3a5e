'use strict';

const path = require('path');
const { minimatch } = require('minimatch');

const dot = { dot: true, windowsPathsNoEscape: true };

module.exports = function(dir, filename) {
    return !minimatch(path.resolve(dir, filename), path.join(dir, '**'), dot);
};
