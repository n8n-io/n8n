import { AvroSchema, RawAvroSchema, AvroOptions, ConfluentSchema, SchemaHelper, ConfluentSubject, ProtocolOptions, AvroConfluentSchema } from './@types';
import avro from 'avsc';
import { SchemaResponse } from './@types';
export default class AvroHelper implements SchemaHelper {
    private getRawAvroSchema;
    getAvroSchema(schema: ConfluentSchema | RawAvroSchema, opts?: AvroOptions): avro.Type;
    validate(avroSchema: AvroSchema): void;
    getSubject(schema: AvroConfluentSchema, _avroSchema: AvroSchema, separator: string): ConfluentSubject;
    private isRawAvroSchema;
    toConfluentSchema(data: SchemaResponse): AvroConfluentSchema;
    updateOptionsFromSchemaReferences(referencedSchemas: AvroConfluentSchema[], options?: ProtocolOptions): ProtocolOptions;
}
