import type { OpenAPIParameter, OpenAPIParameterLocation, OpenAPIParameterStyle, Referenced } from '../../types';
import type { RedocNormalizedOptions } from '../RedocNormalizedOptions';
import type { OpenAPIParser } from '../OpenAPIParser';
import { SchemaModel } from './Schema';
import { ExampleModel } from './Example';
/**
 * Field or Parameter model ready to be used by components
 */
export declare class FieldModel {
    expanded: boolean | undefined;
    schema: SchemaModel;
    name: string;
    required: boolean;
    description: string;
    example?: string;
    examples?: Record<string, ExampleModel> | any[];
    deprecated: boolean;
    in?: OpenAPIParameterLocation;
    kind: string;
    extensions?: Record<string, any>;
    explode: boolean;
    style?: OpenAPIParameterStyle;
    const?: any;
    serializationMime?: string;
    constructor(parser: OpenAPIParser, infoOrRef: Referenced<OpenAPIParameter> & {
        name?: string;
        kind?: string;
    }, pointer: string, options: RedocNormalizedOptions, refsStack?: string[]);
    toggle(): void;
    collapse(): void;
    expand(): void;
}
