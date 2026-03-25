import { Schema, SchemaHelper, ConfluentSubject, SchemaResponse, ProtocolOptions, JsonConfluentSchema } from './@types';
export default class JsonHelper implements SchemaHelper {
    validate(_schema: Schema): void;
    getSubject(_confluentSchema: JsonConfluentSchema, _schema: Schema, _separator: string): ConfluentSubject;
    toConfluentSchema(data: SchemaResponse): JsonConfluentSchema;
    updateOptionsFromSchemaReferences(referencedSchemas: JsonConfluentSchema[], options?: ProtocolOptions): ProtocolOptions;
}
