import Null from './data-types/null';
import TinyInt from './data-types/tinyint';
import Bit from './data-types/bit';
import SmallInt from './data-types/smallint';
import Int from './data-types/int';
import SmallDateTime from './data-types/smalldatetime';
import Real from './data-types/real';
import Money from './data-types/money';
import DateTime from './data-types/datetime';
import Float from './data-types/float';
import Decimal from './data-types/decimal';
import Numeric from './data-types/numeric';
import SmallMoney from './data-types/smallmoney';
import BigInt from './data-types/bigint';
import Image from './data-types/image';
import Text from './data-types/text';
import UniqueIdentifier from './data-types/uniqueidentifier';
import IntN from './data-types/intn';
import NText from './data-types/ntext';
import BitN from './data-types/bitn';
import DecimalN from './data-types/decimaln';
import NumericN from './data-types/numericn';
import FloatN from './data-types/floatn';
import MoneyN from './data-types/moneyn';
import DateTimeN from './data-types/datetimen';
import VarBinary from './data-types/varbinary';
import VarChar from './data-types/varchar';
import Binary from './data-types/binary';
import Char from './data-types/char';
import NVarChar from './data-types/nvarchar';
import NChar from './data-types/nchar';
import Xml from './data-types/xml';
import Time from './data-types/time';
import Date from './data-types/date';
import DateTime2 from './data-types/datetime2';
import DateTimeOffset from './data-types/datetimeoffset';
import UDT from './data-types/udt';
import TVP from './data-types/tvp';
import Variant from './data-types/sql-variant';
import { type CryptoMetadata } from './always-encrypted/types';
import { type InternalConnectionOptions } from './connection';
import { Collation } from './collation';
export interface Parameter {
    type: DataType;
    name: string;
    value: unknown;
    output: boolean;
    length?: number | undefined;
    precision?: number | undefined;
    scale?: number | undefined;
    nullable?: boolean | undefined;
    forceEncrypt?: boolean | undefined;
    cryptoMetadata?: CryptoMetadata | undefined;
    encryptedVal?: Buffer | undefined;
}
export interface ParameterData<T = any> {
    length?: number | undefined;
    scale?: number | undefined;
    precision?: number | undefined;
    collation?: Collation | undefined;
    value: T;
}
export interface DataType {
    id: number;
    type: string;
    name: string;
    declaration(parameter: Parameter): string;
    generateTypeInfo(parameter: ParameterData, options: InternalConnectionOptions): Buffer;
    generateParameterLength(parameter: ParameterData, options: InternalConnectionOptions): Buffer;
    generateParameterData(parameter: ParameterData, options: InternalConnectionOptions): Generator<Buffer, void>;
    validate(value: any, collation: Collation | undefined, options?: InternalConnectionOptions): any;
    hasTableName?: boolean;
    resolveLength?: (parameter: Parameter) => number;
    resolvePrecision?: (parameter: Parameter) => number;
    resolveScale?: (parameter: Parameter) => number;
}
export declare const TYPE: {
    [Null.id]: DataType;
    [TinyInt.id]: DataType;
    [Bit.id]: DataType;
    [SmallInt.id]: DataType;
    [Int.id]: DataType;
    [SmallDateTime.id]: DataType;
    [Real.id]: DataType;
    [Money.id]: DataType;
    [DateTime.id]: DataType;
    [Float.id]: DataType;
    [Decimal.id]: DataType & {
        resolvePrecision: NonNullable<DataType["resolvePrecision"]>;
        resolveScale: NonNullable<DataType["resolveScale"]>;
    };
    [Numeric.id]: DataType & {
        resolveScale: NonNullable<DataType["resolveScale"]>;
        resolvePrecision: NonNullable<DataType["resolvePrecision"]>;
    };
    [SmallMoney.id]: DataType;
    [BigInt.id]: DataType;
    [Image.id]: DataType;
    [Text.id]: DataType;
    [UniqueIdentifier.id]: DataType;
    [IntN.id]: DataType;
    [NText.id]: DataType;
    [BitN.id]: DataType;
    [DecimalN.id]: DataType;
    [NumericN.id]: DataType;
    [FloatN.id]: DataType;
    [MoneyN.id]: DataType;
    [DateTimeN.id]: DataType;
    [VarBinary.id]: {
        maximumLength: number;
    } & DataType;
    [VarChar.id]: {
        maximumLength: number;
    } & DataType;
    [Binary.id]: {
        maximumLength: number;
    } & DataType;
    [Char.id]: {
        maximumLength: number;
    } & DataType;
    [NVarChar.id]: {
        maximumLength: number;
    } & DataType;
    [NChar.id]: DataType & {
        maximumLength: number;
    };
    [Xml.id]: DataType;
    [Time.id]: DataType;
    [Date.id]: DataType;
    [DateTime2.id]: DataType & {
        resolveScale: NonNullable<DataType["resolveScale"]>;
    };
    [DateTimeOffset.id]: DataType & {
        resolveScale: NonNullable<DataType["resolveScale"]>;
    };
    [UDT.id]: DataType;
    [TVP.id]: DataType;
    [Variant.id]: DataType;
};
/**
 * <table>
 * <thead>
 *   <tr>
 *     <th>Type</th>
 *     <th>Constant</th>
 *     <th>JavaScript</th>
 *     <th>Result set</th>
 *     <th>Parameter</th>
 *   </tr>
 * </thead>
 *
 * <tbody>
 *   <tr class="group-heading">
 *     <th colspan="5">Exact numerics</th>
 *   </tr>
 *   <tr>
 *     <td><code>bit</code></td>
 *     <td><code>[[TYPES.Bit]]</code></td>
 *     <td><code>boolean</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>tinyint</code></td>
 *     <td><code>[[TYPES.TinyInt]]</code></td>
 *     <td><code>number</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>smallint</code></td>
 *     <td><code>[[TYPES.SmallInt]]</code></td>
 *     <td><code>number</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>int</code></td>
 *     <td><code>[[TYPES.Int]]</code></td>
 *     <td><code>number</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>bigint</code><sup>1</sup></td>
 *     <td><code>[[TYPES.BigInt]]</code></td>
 *     <td><code>string</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>numeric</code><sup>2</sup></td>
 *     <td><code>[[TYPES.Numeric]]</code></td>
 *     <td><code>number</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>decimal</code><sup>2</sup></td>
 *     <td><code>[[TYPES.Decimal]]</code></td>
 *     <td><code>number</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>smallmoney</code></td>
 *     <td><code>[[TYPES.SmallMoney]]</code></td>
 *     <td><code>number</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>money</code></td>
 *     <td><code>[[TYPES.Money]]</code></td>
 *     <td><code>number</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 * </tbody>
 *
 * <tbody>
 *   <tr class="group-heading">
 *     <th colspan="5">Approximate numerics</th>
 *   </tr>
 *   <tr>
 *     <td><code>float</code></td>
 *     <td><code>[[TYPES.Float]]</code></td>
 *     <td><code>number</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>real</code></td>
 *     <td><code>[[TYPES.Real]]</code></td>
 *     <td><code>number</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 * </tbody>
 *
 * <tbody>
 *   <tr class="group-heading">
 *     <th colspan="4">Date and Time</th>
 *   </tr>
 *   <tr>
 *     <td><code>smalldatetime</code></td>
 *     <td><code>[[TYPES.SmallDateTime]]</code></td>
 *     <td><code>Date</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>datetime</code></td>
 *     <td><code>[[TYPES.DateTime]]</code></td>
 *     <td><code>Date</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>datetime2</code></td>
 *     <td><code>[[TYPES.DateTime2]]</code></td>
 *     <td><code>Date</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>datetimeoffset</code></td>
 *     <td><code>[[TYPES.DateTimeOffset]]</code></td>
 *     <td><code>Date</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>time</code></td>
 *     <td><code>[[TYPES.Time]]</code></td>
 *     <td><code>Date</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>date</code></td>
 *     <td><code>[[TYPES.Date]]</code></td>
 *     <td><code>Date</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 * </tbody>
 *
 * <tbody>
 *   <tr class="group-heading">
 *     <th colspan="4">Character Strings</th>
 *   </tr>
 *   <tr>
 *     <td><code>char</code></td>
 *     <td><code>[[TYPES.Char]]</code></td>
 *     <td><code>string</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>varchar</code><sup>3</sup></td>
 *     <td><code>[[TYPES.VarChar]]</code></td>
 *     <td><code>string</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>text</code></td>
 *     <td><code>[[TYPES.Text]]</code></td>
 *     <td><code>string</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 * </tbody>
 *
 * <tbody>
 *   <tr class="group-heading">
 *     <th colspan="4">Unicode Strings</th>
 *   </tr>
 *   <tr>
 *     <td><code>nchar</code></td>
 *     <td><code>[[TYPES.NChar]]</code></td>
 *     <td><code>string</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>nvarchar</code><sup>3</sup></td>
 *     <td><code>[[TYPES.NVarChar]]</code></td>
 *     <td><code>string</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>ntext</code></td>
 *     <td><code>[[TYPES.NText]]</code></td>
 *     <td><code>string</code></td>
 *     <td>✓</td>
 *     <td>-</td>
 *   </tr>
 * </tbody>
 *
 * <tbody>
 *   <tr class="group-heading">
 *     <th colspan="5">Binary Strings<sup>4</sup></th>
 *   </tr>
 *   <tr>
 *     <td><code>binary</code></td>
 *     <td><code>[[TYPES.Binary]]</code></td>
 *     <td><code>Buffer</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>varbinary</code></td>
 *     <td><code>[[TYPES.VarBinary]]</code></td>
 *     <td><code>Buffer</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>image</code></td>
 *     <td><code>[[TYPES.Image]]</code></td>
 *     <td><code>Buffer</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 * </tbody>
 *
 * <tbody>
 *   <tr class="group-heading">
 *     <th colspan="5">Other Data Types</th>
 *   </tr>
 *   <tr>
 *     <td><code>TVP</code></td>
 *     <td><code>[[TYPES.TVP]]</code></td>
 *     <td><code>Object</code></td>
 *     <td>-</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>UDT</code></td>
 *     <td><code>[[TYPES.UDT]]</code></td>
 *     <td><code>Buffer</code></td>
 *     <td>✓</td>
 *     <td>-</td>
 *   </tr>
 *   <tr>
 *     <td><code>uniqueidentifier</code><sup>4</sup></td>
 *     <td><code>[[TYPES.UniqueIdentifier]]</code></td>
 *     <td><code>string</code></td>
 *     <td>✓</td>
 *     <td>✓</td>
 *   </tr>
 *   <tr>
 *     <td><code>variant</code></td>
 *     <td><code>[[TYPES.Variant]]</code></td>
 *     <td><code>any</code></td>
 *     <td>✓</td>
 *     <td>-</td>
 *   </tr>
 *   <tr>
 *     <td><code>xml</code></td>
 *     <td><code>[[TYPES.Xml]]</code></td>
 *     <td><code>string</code></td>
 *     <td>✓</td>
 *     <td>-</td>
 *   </tr>
 * </tbody>
 * </table>
 *
 * <ol>
 *   <li>
 *     <h4>BigInt</h4>
 *     <p>
 *       Values are returned as a string. This is because values can exceed 53 bits of significant data, which is greater than a
 *       Javascript <code>number</code> type can represent as an integer.
 *     </p>
 *   </li>
 *   <li>
 *     <h4>Numerical, Decimal</h4>
 *     <p>
 *       For input parameters, default precision is 18 and default scale is 0. Maximum supported precision is 19.
 *     </p>
 *   </li>
 *   <li>
 *     <h4>VarChar, NVarChar</h4>
 *     <p>
 *       <code>varchar(max)</code> and <code>nvarchar(max)</code> are also supported.
 *     </p>
 *   </li>
 *   <li>
 *     <h4>UniqueIdentifier</h4>
 *     <p>
 *       Values are returned as a 16 byte hexadecimal string.
 *     </p>
 *     <p>
 *       Note that the order of bytes is not the same as the character representation. See
 *       <a href="http://msdn.microsoft.com/en-us/library/ms190215.aspx">Using uniqueidentifier Data</a>
 *       for an example of the different ordering of bytes.
 *     </p>
 *   </li>
 * </ol>
 */
export declare const TYPES: {
    TinyInt: DataType;
    Bit: DataType;
    SmallInt: DataType;
    Int: DataType;
    SmallDateTime: DataType;
    Real: DataType;
    Money: DataType;
    DateTime: DataType;
    Float: DataType;
    Decimal: DataType & {
        resolvePrecision: NonNullable<DataType["resolvePrecision"]>;
        resolveScale: NonNullable<DataType["resolveScale"]>;
    };
    Numeric: DataType & {
        resolveScale: NonNullable<DataType["resolveScale"]>;
        resolvePrecision: NonNullable<DataType["resolvePrecision"]>;
    };
    SmallMoney: DataType;
    BigInt: DataType;
    Image: DataType;
    Text: DataType;
    UniqueIdentifier: DataType;
    NText: DataType;
    VarBinary: {
        maximumLength: number;
    } & DataType;
    VarChar: {
        maximumLength: number;
    } & DataType;
    Binary: {
        maximumLength: number;
    } & DataType;
    Char: {
        maximumLength: number;
    } & DataType;
    NVarChar: {
        maximumLength: number;
    } & DataType;
    NChar: DataType & {
        maximumLength: number;
    };
    Xml: DataType;
    Time: DataType;
    Date: DataType;
    DateTime2: DataType & {
        resolveScale: NonNullable<DataType["resolveScale"]>;
    };
    DateTimeOffset: DataType & {
        resolveScale: NonNullable<DataType["resolveScale"]>;
    };
    UDT: DataType;
    TVP: DataType;
    Variant: DataType;
};
export declare const typeByName: {
    TinyInt: DataType;
    Bit: DataType;
    SmallInt: DataType;
    Int: DataType;
    SmallDateTime: DataType;
    Real: DataType;
    Money: DataType;
    DateTime: DataType;
    Float: DataType;
    Decimal: DataType & {
        resolvePrecision: NonNullable<DataType["resolvePrecision"]>;
        resolveScale: NonNullable<DataType["resolveScale"]>;
    };
    Numeric: DataType & {
        resolveScale: NonNullable<DataType["resolveScale"]>;
        resolvePrecision: NonNullable<DataType["resolvePrecision"]>;
    };
    SmallMoney: DataType;
    BigInt: DataType;
    Image: DataType;
    Text: DataType;
    UniqueIdentifier: DataType;
    NText: DataType;
    VarBinary: {
        maximumLength: number;
    } & DataType;
    VarChar: {
        maximumLength: number;
    } & DataType;
    Binary: {
        maximumLength: number;
    } & DataType;
    Char: {
        maximumLength: number;
    } & DataType;
    NVarChar: {
        maximumLength: number;
    } & DataType;
    NChar: DataType & {
        maximumLength: number;
    };
    Xml: DataType;
    Time: DataType;
    Date: DataType;
    DateTime2: DataType & {
        resolveScale: NonNullable<DataType["resolveScale"]>;
    };
    DateTimeOffset: DataType & {
        resolveScale: NonNullable<DataType["resolveScale"]>;
    };
    UDT: DataType;
    TVP: DataType;
    Variant: DataType;
};
