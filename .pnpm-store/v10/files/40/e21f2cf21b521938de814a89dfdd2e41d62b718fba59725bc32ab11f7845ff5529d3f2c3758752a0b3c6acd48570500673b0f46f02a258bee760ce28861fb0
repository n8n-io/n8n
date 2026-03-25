var Module = require('module').Module;
var nodePath = require('path');

var appModulePaths = [];
var old_nodeModulePaths = Module._nodeModulePaths;
var allowedDirs = {};

function checkIfDirAllowed(from) {
    var currentDir = from;

    while (currentDir) {
        if (allowedDirs[currentDir]) {
            return true;
        }

        var basename = nodePath.basename(currentDir);
        if (basename === 'node_modules') {
            return false;
        }

        var parentDir = nodePath.dirname(currentDir);
        if (parentDir === currentDir) {
            break;
        }
        currentDir = parentDir;
    }

    return true;
}

Module._nodeModulePaths = function(from) {
    var paths = old_nodeModulePaths.call(this, from);

    // Only include the app module path for top-level modules
    // that were not installed or that were explicitly allowed
    if (checkIfDirAllowed(from)) {
        paths = paths.concat(appModulePaths);
    }

    return paths;
};

function enableForDir(dir) {
    allowedDirs[dir] = true;
}

function addPath(path, parent) {
    // Anable app-module-path to work under any directories that are explicitly added
    enableForDir(path);

    function addPathHelper(targetArray) {
        path = nodePath.normalize(path);
        if (targetArray && targetArray.indexOf(path) === -1) {
            targetArray.push(path);
        }
    }

    path = nodePath.normalize(path);

    if (appModulePaths.indexOf(path) === -1) {
        appModulePaths.push(path);
        // Enable the search path for the current top-level module
        if (require.main) {
            addPathHelper(require.main.paths);
        }

        parent = parent || module.parent;

        // Also modify the paths of the module that was used to load the app-module-paths module
        // and all of it's parents
        while(parent && parent !== require.main) {
            addPathHelper(parent.paths);
            parent = parent.parent;
        }
    }
}

function removePath(path) {
    function removePathHelper(targetArray) {
        path = nodePath.normalize(path);
        if (!targetArray) return;
        var index = targetArray.indexOf(path);
        if (index === -1) return;
        targetArray.splice(index, 1);
    }

    var parent;
    path = nodePath.normalize(path);
    var index = appModulePaths.indexOf(path);

    if (index > -1) {
        appModulePaths.splice(index, 1);
        // Enable the search path for the current top-level module
        if (require.main) removePathHelper(require.main.paths);
        parent = module.parent;

        // Also modify the paths of the module that was used to load the app-module-paths module
        // and all of it's parents
        while(parent && parent !== require.main) {
            removePathHelper(parent.paths);
            parent = parent.parent;
        }
    }
}

exports.addPath = addPath;
exports.removePath = removePath;
exports.enableForDir = enableForDir;
