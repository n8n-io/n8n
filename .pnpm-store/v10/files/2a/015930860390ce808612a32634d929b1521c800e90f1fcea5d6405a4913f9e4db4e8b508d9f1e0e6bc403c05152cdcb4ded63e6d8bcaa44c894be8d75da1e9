import { ResourceDetectionConfig } from './config';
import { SpanAttributes } from '@opentelemetry/api';
import { IResource } from './IResource';
/**
 * Interface for Resource attributes.
 * General `Attributes` interface is added in api v1.1.0.
 * To backward support older api (1.0.x), the deprecated `SpanAttributes` is used here.
 */
export declare type ResourceAttributes = SpanAttributes;
/**
 * @deprecated please use {@link DetectorSync}
 */
export interface Detector {
    detect(config?: ResourceDetectionConfig): Promise<IResource>;
}
/**
 * Interface for a synchronous Resource Detector. In order to detect attributes asynchronously, a detector
 * can pass a Promise as the second parameter to the Resource constructor.
 */
export interface DetectorSync {
    detect(config?: ResourceDetectionConfig): IResource;
}
//# sourceMappingURL=types.d.ts.map