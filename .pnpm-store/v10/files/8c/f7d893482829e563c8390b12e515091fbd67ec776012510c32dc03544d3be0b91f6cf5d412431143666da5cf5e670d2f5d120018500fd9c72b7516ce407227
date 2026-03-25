/// <reference types="node" />

import { frames } from "./frames";

export interface ICompositeType {
  name: string;
  code: number;
  fields: Field[];
}
export interface Field {
  name: string;
  type: string;
  mandatory?: boolean;
  default_value?: any;
  multiple?: boolean;
}
export interface ArrayConstructor {
  typecode: number;
  descriptor?: any;
}
export interface CreateTypeDesc {
  (value?: any, code?: any, descriptor?: any): Typed;
  typecode?: number;
}
export interface BufferOps {
  read: (buffer: Buffer, offset: number) => number;
  write: (buffer: Buffer, value: any, offset: number) => void;
}
export declare enum TypeNames {
  Null = "Null",
  Boolean = "Boolean",
  True = "True",
  False = "False",
  Ubyte = "Ubyte",
  Ushort = "Ushort",
  Uint = "Uint",
  SmallUint = "SmallUint",
  Uint0 = "Uint0",
  Ulong = "Ulong",
  SmallUlong = "SmallUlong",
  Ulong0 = "Ulong0",
  Byte = "Byte",
  Short = "Short",
  Int = "Int",
  SmallInt = "SmallInt",
  Long = "Long",
  SmallLong = "SmallLong",
  Float = "Float",
  Double = "Double",
  Decimal32 = "Decimal32",
  Decimal64 = "Decimal64",
  Decimal128 = "Decimal128",
  CharUTF32 = "CharUTF32",
  Timestamp = "Timestamp",
  Uuid = "Uuid",
  Vbin8 = "Vbin8",
  Vbin32 = "Vbin32",
  Str8 = "Str8",
  Str32 = "Str32",
  Sym8 = "Sym8",
  Sym32 = "Sym32",
  List0 = "List0",
  List8 = "List8",
  List32 = "List32",
  Map8 = "Map8",
  Map32 = "Map32",
  Array8 = "Array8",
  Array32 = "Array32",
}
export declare class Typed {
  type: TypeDesc;
  value: any;
  array_constructor?: ArrayConstructor;
  descriptor?: any;
  constructor(type: TypeDesc, value: any, code?: number, descriptor?: any);
  toString(): string | null;
  toLocaleString(): string | null;
  valueOf?: () => any;
  toJSON?: () => any;
}
export declare class TypeDesc {
  name: string;
  typecode: number;
  width: number;
  category?: number;
  read?: BufferOps["read"];
  write?: BufferOps["write"];
  encoding?: string;
  create: CreateTypeDesc;
  constructor(name: string, typecode: number, props?: any, empty_value?: any);
  toString(): string;
}

export declare class Reader {
  buffer: Buffer;
  position: number;
  constructor(buffer: Buffer);
  read_typecode(): number;
  read_uint(width: number): number;
  read_fixed_width(type: TypeDesc): number | Buffer;
  read_variable_width(type: any): string | Buffer;
  read(): Typed;
  read_constructor(): ArrayConstructor;
  read_value(type: TypeDesc): Typed;
  read_array_items(n: number, type: TypeDesc): Typed[];
  read_n(n: any): any[];
  read_size_count(width: number): {
    'size': number;
    'count': number;
  };
  read_compound(type: TypeDesc): Typed;
  read_array(type: TypeDesc): Typed;
  toString(): string;
  reset(): void;
  skip(bytes: number): void;
  read_bytes(bytes: number): Buffer;
  remaining(): number;
}
export declare class Writer {
  buffer: Buffer;
  position: number;
  constructor(buffer?: Buffer);
  toBuffer(): Buffer;
  ensure(length: number): void;
  write_typecode(code: number): void;
  write_uint(value: number, width: number): number;
  write_fixed_width(type: TypeDesc, value: any): void;
  write_variable_width(type: TypeDesc, value: any): void;
  write_bytes(source: Buffer): void;
  write_constructor(typecode: number, descriptor?: Typed): void;
  write(o: Typed): void;
  write_value(type: TypeDesc, value: any, constructor?: ArrayConstructor): void;
  backfill_size(width: number, saved: number): void;
  write_compound(type: any, value: any): void;
  write_array(type: any, value: any, constructor: ArrayConstructor): void;
  toString(): string;
  skip(bytes: number): void;
  clear(): void;
  remaining(): number;
}

export interface Descriptor {
  numeric: number;
  symbolic: string;
  [x: string]: any;
}

export declare class c {
  value: any[];
  static descriptor: Descriptor;
  constructor(fields: any[]);
  dispatch(target: any, frame: frames): void;
  toJSON(): object;
  described(): any;
  static toString(): string;
  static create(fields: any): c;
  [x: string]: any;
}

export declare interface types {
  wrap_error(e: any): Typed;
  is_ulong(o: Typed): boolean;
  is_string(o: Typed): boolean;
  is_symbol(o: Typed): boolean;
  is_list(o: Typed): boolean;
  is_map(o: Typed): boolean;
  wrap_boolean(v: any): Typed;
  wrap_ulong(l: Buffer | number | Number): any;
  wrap_uint(l: number): Typed;
  wrap_ushort(l: any): Typed;
  wrap_ubyte(l: any): Typed;
  wrap_long(l: Buffer | number): Typed;
  wrap_int(l: number): Typed;
  wrap_short(l: any): Typed;
  wrap_byte(l: any): Typed;
  wrap_float(l: any): Typed;
  wrap_double(l: any): Typed;
  wrap_timestamp(l: any): Typed;
  wrap_char(v: any): Typed;
  wrap_uuid(v: any): Typed;
  wrap_binary(s: any): Typed;
  wrap_string(s: any): Typed;
  wrap_symbol(s: any): Typed;
  wrap_list(l: any): Typed;
  wrap_map(m: object, key_wrapper?: Function): Typed;
  wrap_symbolic_map(m: object): Typed;
  wrap_array(l: any, code: number, descriptors: any): Typed;
  wrap(o: any): Typed;
  wrap_described(value: any, descriptor: string | number | Number): Typed;
  wrap_message_id(o: any): any;
  described_nc(descriptor: any[] | any, o: any): any;
  described(descriptor: any, o: any): any;
  unwrap_map_simple(o: any): {};
  unwrap(o: any, leave_described?: boolean): any;
  define_composite(def: ICompositeType): c;
}
