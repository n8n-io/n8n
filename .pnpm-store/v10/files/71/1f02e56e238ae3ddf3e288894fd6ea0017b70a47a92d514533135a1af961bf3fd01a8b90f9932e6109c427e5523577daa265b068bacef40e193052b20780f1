import { Client } from './client-builder.mjs';
import { GlobalConfigs, ResourceTypeConstraint, ManifestOptions } from './manifest.mjs';
import { C as Context } from './index-Dky6y1YD.mjs';
export { b as Response } from './index-Dky6y1YD.mjs';
export { version } from './version.mjs';
import './gateway/gateway.mjs';
import './gateway/types.mjs';
import './types.mjs';

declare const configs: GlobalConfigs;
/**
 * @deprecated Shouldn't be used, not safe for concurrent use.
 * @param {Object} context
 */
declare const setContext: (context: Context) => void;
declare function forge<Resources extends ResourceTypeConstraint>(manifest: ManifestOptions<Resources>): Client<Resources>;

export { configs, forge as default, forge, setContext };
