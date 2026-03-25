import { pathToFileURL } from 'node:url';
/**
 * Ensure that we import absolute paths correctly in Windows.
 * https://github.com/nodejs/node/issues/31710
 */
export function importAbs(path) {
    const urlHref = pathToFileURL(path).href;
    return import(urlHref);
}
