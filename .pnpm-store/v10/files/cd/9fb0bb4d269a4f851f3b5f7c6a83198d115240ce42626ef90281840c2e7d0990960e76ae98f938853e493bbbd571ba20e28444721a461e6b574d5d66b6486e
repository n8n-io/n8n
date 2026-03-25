'use strict';

const fs = require('fs');
const url = require('url');
const pathe = require('pathe');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
/**
 * This file is part of the iconify.design libraries.
 *
 * (c) Vjacheslav Trushkin <cyberalien@gmail.com>
 *
 * @license MIT
 *
 * For the full copyright and license information, please view the license.txt
 * file that is available in this file's directory.
 */
const _dirname = typeof __dirname !== "undefined" ? __dirname : pathe.dirname(url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href))));
const dir = pathe.join(_dirname, "/..");
const locate = (name) => pathe.join(dir, `./json/${name}.json`);
const loadCollection = async (path) => {
  return JSON.parse(await fs.promises.readFile(path, "utf8"));
};
const lookupCollection = async (name) => {
  return await loadCollection(locate(name));
};
const lookupCollections = async () => {
  return JSON.parse(
    await fs.promises.readFile(pathe.join(dir, "./collections.json"), "utf8")
  );
};

exports.dir = dir;
exports.loadCollection = loadCollection;
exports.locate = locate;
exports.lookupCollection = lookupCollection;
exports.lookupCollections = lookupCollections;
