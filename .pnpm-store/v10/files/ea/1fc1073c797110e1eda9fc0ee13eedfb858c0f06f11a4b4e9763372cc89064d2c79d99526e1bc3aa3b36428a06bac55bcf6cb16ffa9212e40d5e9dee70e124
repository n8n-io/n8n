import { OkPacket } from './OkPacket.js';
import { RowDataPacket } from './RowDataPacket.js';
import { FieldPacket } from './FieldPacket.js';
import { Field } from './Field.js';
import { ProcedureCallPacket } from './ProcedurePacket.js';
import { ResultSetHeader } from './ResultSetHeader.js';
import { OkPacketParams } from './params/OkPacketParams.js';
import { ErrorPacketParams } from './params/ErrorPacketParams.js';

export type QueryResult =
  | OkPacket
  | ResultSetHeader
  | ResultSetHeader[]
  | RowDataPacket[]
  | RowDataPacket[][]
  | OkPacket[]
  | ProcedureCallPacket;

export {
  OkPacket,
  RowDataPacket,
  FieldPacket,
  Field,
  ProcedureCallPacket,
  ResultSetHeader,
  OkPacketParams,
  ErrorPacketParams,
};
