import type { OpenAPIMediaType } from '../../types';
import { MediaTypeModel } from './MediaType';
import type { OpenAPIParser } from '../OpenAPIParser';
import type { RedocNormalizedOptions } from '../RedocNormalizedOptions';
/**
 * MediaContent model ready to be sued by React components
 * Contains multiple MediaTypes and keeps track of the currently active one
 */
export declare class MediaContentModel {
    isRequestType: boolean;
    mediaTypes: MediaTypeModel[];
    activeMimeIdx: number;
    /**
     * @param isRequestType needed to know if skipe RO/RW fields in objects
     */
    constructor(parser: OpenAPIParser, info: Record<string, OpenAPIMediaType>, isRequestType: boolean, options: RedocNormalizedOptions);
    /**
     * Set active media type by index
     * @param idx media type index
     */
    activate(idx: number): void;
    get active(): MediaTypeModel;
    get hasSample(): boolean;
}
