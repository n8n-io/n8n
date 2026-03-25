import { WhereFilter } from '../openapi/types.js';
export default class GraphQLWhere {
    private operands?;
    private operator?;
    private path?;
    private readonly source;
    private valueContent;
    private valueType?;
    constructor(whereObj: WhereFilter);
    toString(): string;
    marshalValueContent(): string;
    getValueType(): string | undefined;
    marshalValueGeoRange(): string;
    validate(): void;
    parse(): void;
    parseOperator(op: string): void;
    parsePath(path: string[]): void;
    parseValue(key: string, value: any): void;
    parseOperands(ops: any[]): void;
}
