import { OkPacket } from './OkPacket.js';
import { ResultSetHeader } from './ResultSetHeader.js';
import { RowDataPacket } from './RowDataPacket.js';

declare type ProcedureCallPacket<
  T = [RowDataPacket[], ResultSetHeader] | ResultSetHeader,
> = T extends RowDataPacket[]
  ? [T, ResultSetHeader]
  : T extends ResultSetHeader | OkPacket
    ? ResultSetHeader
    : [RowDataPacket[], ResultSetHeader] | ResultSetHeader;

export { ProcedureCallPacket };
