import { Resolver, ForSchemaOptions, Type } from 'avsc';
import { ValidateFunction } from './JsonSchema';
import Ajv from 'ajv';
export declare enum SchemaType {
    AVRO = "AVRO",
    JSON = "JSON",
    PROTOBUF = "PROTOBUF",
    UNKNOWN = "UNKNOWN"
}
export interface SchemaHelper {
    validate(schema: Schema): void;
    getSubject(confluentSchema: ConfluentSchema, schema: Schema, separator: string): ConfluentSubject;
    toConfluentSchema(data: SchemaResponse): ConfluentSchema;
    updateOptionsFromSchemaReferences(referencedSchemas: ConfluentSchema[], options?: ProtocolOptions): ProtocolOptions;
}
export type AvroOptions = Partial<ForSchemaOptions> & {
    referencedSchemas?: AvroConfluentSchema[];
};
export type JsonOptions = ConstructorParameters<typeof Ajv>[0] & {
    ajvInstance?: {
        addSchema: Ajv['addSchema'];
        compile: (schema: any) => ValidateFunction;
    } | Ajv;
    referencedSchemas?: JsonConfluentSchema[];
    detailedErrorPaths?: boolean;
};
export type ProtoOptions = {
    messageName?: string;
    referencedSchemas?: ProtoConfluentSchema[];
};
export interface LegacyOptions {
    forSchemaOptions?: AvroOptions;
}
export interface ProtocolOptions {
    [SchemaType.AVRO]?: AvroOptions;
    [SchemaType.JSON]?: JsonOptions;
    [SchemaType.PROTOBUF]?: ProtoOptions;
}
export type SchemaRegistryAPIClientOptions = ProtocolOptions | LegacyOptions;
export interface Schema {
    toBuffer(payload: object): Buffer;
    fromBuffer(buffer: Buffer, resolver?: Resolver, noCheck?: boolean): any;
    isValid(payload: object, opts?: {
        errorHook: (path: Array<string>, value: any, type?: any) => void;
    }): boolean;
}
export interface RawAvroSchema {
    name: string;
    namespace?: string;
    type: 'record';
    fields: any[];
}
export interface AvroSchema extends Schema, RawAvroSchema, Pick<Type, 'equals' | 'createResolver'> {
}
export interface ConfluentSubject {
    name: string;
}
export interface AvroConfluentSchema {
    type: SchemaType.AVRO;
    schema: string | RawAvroSchema;
    references?: SchemaReference[];
}
export type SchemaReference = {
    name: string;
    subject: string;
    version: number;
};
export interface ProtoConfluentSchema {
    type: SchemaType.PROTOBUF;
    schema: string;
    references?: SchemaReference[];
}
export interface JsonConfluentSchema {
    type: SchemaType.JSON;
    schema: string;
    references?: SchemaReference[];
}
export interface SchemaResponse {
    schema: string;
    schemaType: string;
    references?: SchemaReference[];
}
export type ConfluentSchema = AvroConfluentSchema | ProtoConfluentSchema | JsonConfluentSchema;
