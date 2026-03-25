import { IconifyJSON } from '@iconify/types';
import { AutoInstall } from './types.js';
import '@antfu/utils';
import '../customisations/defaults.js';

/**
 * Asynchronously loads a collection from the file system.
 *
 * @param name {string} the name of the collection, e.g. 'mdi'
 * @param autoInstall {AutoInstall} [autoInstall=false] - whether to automatically install
 * @param scope {string} [scope='@iconify-json'] - the scope of the collection, e.g. '@my-company-json'
 * @return {Promise<IconifyJSON | undefined>} the loaded IconifyJSON or undefined
 */
declare function loadCollectionFromFS(name: string, autoInstall?: AutoInstall, scope?: string, cwd?: string): Promise<IconifyJSON | undefined>;

export { loadCollectionFromFS };
