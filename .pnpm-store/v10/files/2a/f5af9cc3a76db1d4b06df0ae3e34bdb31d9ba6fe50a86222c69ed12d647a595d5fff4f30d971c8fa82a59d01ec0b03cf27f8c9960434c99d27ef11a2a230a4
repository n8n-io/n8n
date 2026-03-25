import type { OpenAPIExternalDocumentation, OpenAPISchema, Referenced } from '../../types';
import type { OpenAPIParser } from '../OpenAPIParser';
import type { RedocNormalizedOptions } from '../RedocNormalizedOptions';
import { FieldModel } from './Field';
import { MergedOpenAPISchema } from '../types';
export declare class SchemaModel {
    private options;
    private refsStack;
    pointer: string;
    type: string | string[];
    displayType: string;
    typePrefix: string;
    title: string;
    description: string;
    externalDocs?: OpenAPIExternalDocumentation;
    isPrimitive: boolean;
    isCircular: boolean;
    format?: string;
    displayFormat?: string;
    nullable: boolean;
    deprecated: boolean;
    pattern?: string;
    example?: any;
    examples?: any[];
    enum: any[];
    default?: any;
    readOnly: boolean;
    writeOnly: boolean;
    constraints: string[];
    fields?: FieldModel[];
    items?: SchemaModel;
    oneOf?: SchemaModel[];
    oneOfType: string;
    discriminatorProp: string;
    activeOneOf: number;
    rawSchema: OpenAPISchema;
    schema: MergedOpenAPISchema;
    extensions?: Record<string, any>;
    'x-enumDescriptions': {
        [name: string]: string;
    };
    const: any;
    contentEncoding?: string;
    contentMediaType?: string;
    minItems?: number;
    maxItems?: number;
    /**
     * @param isChild if schema discriminator Child
     * When true forces dereferencing in allOfs even if circular
     */
    constructor(parser: OpenAPIParser, schemaOrRef: Referenced<OpenAPISchema>, pointer: string, options: RedocNormalizedOptions, isChild?: boolean, refsStack?: string[]);
    /**
     * Set specified alternative schema as active
     * @param idx oneOf index
     */
    activateOneOf(idx: number): void;
    hasType(type: string): boolean;
    init(parser: OpenAPIParser, isChild: boolean): void;
    private initOneOf;
    private initDiscriminator;
    private initConditionalOperators;
}
