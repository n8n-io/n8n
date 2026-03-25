import { AvroSchema, Schema, SchemaType } from './@types';
type CacheEntry = {
    type: SchemaType;
    schema: Schema | AvroSchema;
};
export default class Cache {
    registryIdBySubject: {
        [key: string]: number;
    };
    schemasByRegistryId: {
        [key: string]: CacheEntry;
    };
    constructor();
    getLatestRegistryId: (subject: string) => number | undefined;
    setLatestRegistryId: (subject: string, id: number) => number;
    getSchema: (registryId: number) => CacheEntry | undefined;
    setSchema: (registryId: number, type: SchemaType, schema: Schema) => CacheEntry;
    clear: () => void;
}
export {};
