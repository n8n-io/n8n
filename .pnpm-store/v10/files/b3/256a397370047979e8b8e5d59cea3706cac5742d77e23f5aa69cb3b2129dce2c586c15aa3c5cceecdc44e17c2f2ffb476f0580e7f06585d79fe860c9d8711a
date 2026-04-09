import { type Metadata } from '../metadata-parser';
import Parser from './stream-parser';
import { ColMetadataToken } from './token';
export interface ColumnMetadata extends Metadata {
    /**
     * The column's name。
     */
    colName: string;
    tableName?: string | string[] | undefined;
}
declare function colMetadataParser(parser: Parser): Promise<ColMetadataToken>;
export default colMetadataParser;
