"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRefsPath = exports.buildObjectsPath = void 0;
function buildObjectsPath(queryParams) {
    const path = '/batch/objects';
    return buildPath(path, queryParams);
}
exports.buildObjectsPath = buildObjectsPath;
function buildRefsPath(queryParams) {
    const path = '/batch/references';
    return buildPath(path, queryParams);
}
exports.buildRefsPath = buildRefsPath;
function buildPath(path, queryParams) {
    if (queryParams && queryParams.toString() != '') {
        path = `${path}?${queryParams.toString()}`;
    }
    return path;
}
