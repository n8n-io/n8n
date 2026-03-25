import type * as ts from 'typescript';
export type ComponentMetaChecker = ReturnType<typeof import('./base')['createCheckerBase']>;
export interface Declaration {
    file: string;
    range: [number, number];
}
export interface ComponentMeta {
    type: TypeMeta;
    props: PropertyMeta[];
    events: EventMeta[];
    slots: SlotMeta[];
    exposed: ExposeMeta[];
}
export declare enum TypeMeta {
    Unknown = 0,
    Class = 1,
    Function = 2
}
export interface PropertyMeta {
    name: string;
    default?: string;
    description: string;
    global: boolean;
    required: boolean;
    type: string;
    rawType?: ts.Type;
    tags: {
        name: string;
        text?: string;
    }[];
    declarations: Declaration[];
    schema: PropertyMetaSchema;
}
export interface EventMeta {
    name: string;
    description: string;
    type: string;
    rawType?: ts.Type;
    signature: string;
    tags: {
        name: string;
        text?: string;
    }[];
    declarations: Declaration[];
    schema: PropertyMetaSchema[];
}
export interface SlotMeta {
    name: string;
    type: string;
    rawType?: ts.Type;
    description: string;
    declarations: Declaration[];
    schema: PropertyMetaSchema;
}
export interface ExposeMeta {
    name: string;
    description: string;
    type: string;
    rawType?: ts.Type;
    declarations: Declaration[];
    schema: PropertyMetaSchema;
}
export type PropertyMetaSchema = string | {
    kind: 'enum';
    type: string;
    schema?: PropertyMetaSchema[];
} | {
    kind: 'array';
    type: string;
    schema?: PropertyMetaSchema[];
} | {
    kind: 'event';
    type: string;
    schema?: PropertyMetaSchema[];
} | {
    kind: 'object';
    type: string;
    schema?: Record<string, PropertyMeta>;
};
export type MetaCheckerSchemaOptions = boolean | {
    /**
     * A list of type names to be ignored in expending in schema.
     * Can be functions to ignore types dynamically.
     */
    ignore?: (string | ((name: string, type: ts.Type, typeChecker: ts.TypeChecker) => boolean | void | undefined | null))[];
};
export interface MetaCheckerOptions {
    schema?: MetaCheckerSchemaOptions;
    forceUseTs?: boolean;
    printer?: ts.PrinterOptions;
    rawType?: boolean;
    noDeclarations?: boolean;
}
