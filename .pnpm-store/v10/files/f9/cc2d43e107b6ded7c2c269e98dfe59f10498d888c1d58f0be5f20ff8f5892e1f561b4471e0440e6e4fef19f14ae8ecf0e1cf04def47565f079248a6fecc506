import { ResourceDetectionConfig } from './config';
import { IResource } from './IResource';
/**
 * Runs all resource detectors and returns the results merged into a single Resource. Promise
 * does not resolve until all the underlying detectors have resolved, unlike
 * detectResourcesSync.
 *
 * @deprecated use detectResourcesSync() instead.
 * @param config Configuration for resource detection
 */
export declare const detectResources: (config?: ResourceDetectionConfig) => Promise<IResource>;
/**
 * Runs all resource detectors synchronously, merging their results. In case of attribute collision later resources will take precedence.
 *
 * @param config Configuration for resource detection
 */
export declare const detectResourcesSync: (config?: ResourceDetectionConfig) => IResource;
//# sourceMappingURL=detect-resources.d.ts.map