import type { OpenAPIEncoding, OpenAPIExample, Referenced } from '../../types';
import type { OpenAPIParser } from '../OpenAPIParser';
export declare class ExampleModel {
    mime: string;
    value: any;
    summary?: string;
    description?: string;
    externalValueUrl?: string;
    constructor(parser: OpenAPIParser, infoOrRef: Referenced<OpenAPIExample>, mime: string, encoding?: {
        [field: string]: OpenAPIEncoding;
    });
    getExternalValue(mimeType: string): Promise<any>;
}
