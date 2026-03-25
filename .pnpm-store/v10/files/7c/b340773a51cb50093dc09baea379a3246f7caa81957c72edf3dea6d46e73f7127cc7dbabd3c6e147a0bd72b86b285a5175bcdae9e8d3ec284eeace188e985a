import type { OpenAPIRequestBody, Referenced } from '../../types';
import type { OpenAPIParser } from '../OpenAPIParser';
import type { RedocNormalizedOptions } from '../RedocNormalizedOptions';
import { MediaContentModel } from './MediaContent';
type RequestBodyProps = {
    parser: OpenAPIParser;
    infoOrRef: Referenced<OpenAPIRequestBody>;
    options: RedocNormalizedOptions;
    isEvent: boolean;
};
export declare class RequestBodyModel {
    description: string;
    required?: boolean;
    content?: MediaContentModel;
    constructor({ parser, infoOrRef, options, isEvent }: RequestBodyProps);
}
export {};
