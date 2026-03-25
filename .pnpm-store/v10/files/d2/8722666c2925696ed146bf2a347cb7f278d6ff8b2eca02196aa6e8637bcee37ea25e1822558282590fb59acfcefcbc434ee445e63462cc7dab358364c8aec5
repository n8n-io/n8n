import { Client } from './client-builder';
import { GlobalConfigs, ManifestOptions, ResourceTypeConstraint } from './manifest';
import { Context } from './middleware/index';
/**
 * Can be used to test for `instanceof Response`
 */
export { Response } from './response';
export { version } from './version';
export declare const configs: GlobalConfigs;
/**
 * @deprecated Shouldn't be used, not safe for concurrent use.
 * @param {Object} context
 */
export declare const setContext: (context: Context) => void;
export default function forge<Resources extends ResourceTypeConstraint>(manifest: ManifestOptions<Resources>): Client<Resources>;
export { forge };
