export function buildObjectsPath(queryParams) {
    const path = '/batch/objects';
    return buildPath(path, queryParams);
}
export function buildRefsPath(queryParams) {
    const path = '/batch/references';
    return buildPath(path, queryParams);
}
function buildPath(path, queryParams) {
    if (queryParams && queryParams.toString() != '') {
        path = `${path}?${queryParams.toString()}`;
    }
    return path;
}
