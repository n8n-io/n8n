import { Collation } from './collation';
import Parser, { type ParserOptions } from './token/stream-parser';
import { type DataType } from './data-type';
import { type CryptoMetadata } from './always-encrypted/types';
import { Result } from './token/helpers';
interface XmlSchema {
    dbname: string;
    owningSchema: string;
    xmlSchemaCollection: string;
}
interface UdtInfo {
    maxByteSize: number;
    dbname: string;
    owningSchema: string;
    typeName: string;
    assemblyName: string;
}
export type BaseMetadata = {
    userType: number;
    flags: number;
    /**
     * The column's type, such as VarChar, Int or Binary.
     */
    type: DataType;
    collation: Collation | undefined;
    /**
     * The precision. Only applicable to numeric and decimal.
     */
    precision: number | undefined;
    /**
     * The scale. Only applicable to numeric, decimal, time, datetime2 and datetimeoffset.
     */
    scale: number | undefined;
    /**
     * The length, for char, varchar, nvarchar and varbinary.
     */
    dataLength: number | undefined;
    schema: XmlSchema | undefined;
    udtInfo: UdtInfo | undefined;
};
export type Metadata = {
    cryptoMetadata?: CryptoMetadata;
} & BaseMetadata;
declare function readCollation(buf: Buffer, offset: number): Result<Collation>;
declare function readMetadata(buf: Buffer, offset: number, options: ParserOptions): Result<Metadata>;
declare function metadataParse(parser: Parser, options: ParserOptions, callback: (metadata: Metadata) => void): void;
export default metadataParse;
export { readCollation, readMetadata };
