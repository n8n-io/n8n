import { PathLike } from 'fs';
import { IconifyInfo, IconifyJSON } from '@iconify/types';

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

/**
 * Collection info map
 */
type IconifyMetaDataCollection = {
    [prefix: string]: IconifyInfo;
};
/**
 * Directory of this package
 */
declare const dir: string;
/**
 * Locate JSON file
 *
 * @param {string} name Collection name
 * @returns {string} Path to collection json file
 */
declare const locate: (name: string) => PathLike;
/**
 * Loads a collection.
 *
 * @param {PathLike} path The path to locate the `json` collection file.
 * @return {Promise<IconifyJSON>}
 */
declare const loadCollection: (path: PathLike) => Promise<IconifyJSON>;
/**
 * Get a collection.
 *
 * @param {string} name The name of the collection
 * @return {Promise<IconifyJSON>}
 */
declare const lookupCollection: (name: string) => Promise<IconifyJSON>;
/**
 * Get list of collections info.
 *
 * @return {Promise<IconifyMetaDataCollection>}
 */
declare const lookupCollections: () => Promise<IconifyMetaDataCollection>;

export { type IconifyMetaDataCollection, dir, loadCollection, locate, lookupCollection, lookupCollections };
