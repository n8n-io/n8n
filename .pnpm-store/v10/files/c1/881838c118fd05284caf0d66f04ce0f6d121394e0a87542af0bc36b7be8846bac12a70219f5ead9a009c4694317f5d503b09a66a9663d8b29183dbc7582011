import { promises } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'pathe';

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
const _dirname = typeof import.meta !== "undefined" && import.meta.url ? dirname(fileURLToPath(import.meta.url)) : __dirname;
const dir = join(_dirname, "/..");
const locate = (name) => join(dir, `./json/${name}.json`);
const loadCollection = async (path) => {
  return JSON.parse(await promises.readFile(path, "utf8"));
};
const lookupCollection = async (name) => {
  return await loadCollection(locate(name));
};
const lookupCollections = async () => {
  return JSON.parse(
    await promises.readFile(join(dir, "./collections.json"), "utf8")
  );
};

export { dir, loadCollection, locate, lookupCollection, lookupCollections };
