#!/usr/bin/env node
import {readFile} from 'fs/promises';
import {JSONPath as jsonpath} from '../dist/index-node-esm.js';

const file = process.argv[2];
const path = process.argv[3];

try {
    const json = JSON.parse(await readFile(file, 'utf8'));
    runQuery(json, path);
} catch (e) {
    /* eslint-disable no-console -- CLI */
    console.error(`usage: ${process.argv[1]} <file> <path>\n`);
    console.error(e);
    /* eslint-enable no-console -- CLI */
    process.exit(1);
}

/**
 * @typedef {any} JSON
 */

/**
 * @param {JSON} json
 * @param {string} pth
 * @returns {void}
 */
function runQuery (json, pth) {
    const result = jsonpath({
        json,
        path: pth
    });

    // eslint-disable-next-line no-console -- CLI
    console.log(result);
}
