import { Schema, SchemaHelper, ConfluentSubject, SchemaResponse, ProtocolOptions, ProtoConfluentSchema } from './@types';
export default class ProtoHelper implements SchemaHelper {
    validate(_schema: Schema): void;
    getSubject(_confluentSchema: ProtoConfluentSchema, _schema: Schema, _separator: string): ConfluentSubject;
    toConfluentSchema(data: SchemaResponse): ProtoConfluentSchema;
    updateOptionsFromSchemaReferences(referencedSchemas: ProtoConfluentSchema[], options?: ProtocolOptions): ProtocolOptions;
}
