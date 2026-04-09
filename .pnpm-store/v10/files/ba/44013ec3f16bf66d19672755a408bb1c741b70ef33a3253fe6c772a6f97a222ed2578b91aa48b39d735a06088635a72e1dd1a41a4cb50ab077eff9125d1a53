/// <reference types="node" />

export class BerReader {
    readonly buffer: Buffer;
    readonly offset: number;
    readonly length: number;
    readonly remain: number;
    readonly _buf: Buffer;
    _size: number;
    _offset: number;

    constructor(data: Buffer);

    peek(): number | null;
    readBoolean(): boolean | null;
    readByte(peek: boolean): number | null;
    readEnumeration(): number | null;
    readInt(): number | null;
    readLength(offset?: number): number | null;
    readOID(tag?: number): string | null;
    readSequence(tag?: number): number | null;
    readString(tag?: number): string | null;
    readString(tag: number, retbuf: boolean): Buffer | null;
    _readTag(tag?: number): number | null;
}

export class BerWriter {
    readonly buffer: Buffer;
    readonly _buf: Buffer;
    readonly _size: number;
    _offset: number;

    constructor(options?: { size: number; growthFactor: number });

    endSequence(): void;
    startSequence(tag?: number): void;
    writeBoolean(b: boolean, tag?: number): void;
    writeBuffer(buf: Buffer, tag: number): void;
    writeByte(b: number): void;
    writeEnumeration(i: number, tag?: number): void;
    writeInt(i: number, tag?: number): void;
    writeLength(len: number): void;
    writeNull(): void;
    writeOID(s: string, tag: number): void;
    writeString(s: string, tag?: number): void;
    writeStringArray(strings: readonly string[]): void;
    _ensure(length: number): void;
}

export namespace Ber {
    const BMPString: number;
    const BitString: number;
    const Boolean: number;
    const CharacterString: number;
    const Constructor: number;
    const Context: number;
    const EOC: number;
    const Enumeration: number;
    const External: number;
    const GeneralString: number;
    const GeneralizedTime: number;
    const GraphicString: number;
    const IA5String: number;
    const Integer: number;
    const Null: number;
    const NumericString: number;
    const OID: number;
    const ObjectDescriptor: number;
    const OctetString: number;
    const PDV: number;
    const PrintableString: number;
    const Real: number;
    const RelativeOID: number;
    const Sequence: number;
    const Set: number;
    const T61String: number;
    const UTCTime: number;
    const UniversalString: number;
    const Utf8String: number;
    const VideotexString: number;
    const VisibleString: number;
}
/*
declare enum BerType {
  EOC = 0,
  Boolean = 1,
  Integer = 2,
  BitString = 3,
  OctetString = 4,
  Null = 5,
  OID = 6,
  ObjectDescriptor = 7,
  External = 8,
  Real = 9, // float
  Enumeration = 10,
  PDV = 11,
  Utf8String = 12,
  RelativeOID = 13,
  Sequence = 16,
  Set = 17,
  NumericString = 18,
  PrintableString = 19,
  T61String = 20,
  VideotexString = 21,
  IA5String = 22,
  UTCTime = 23,
  GeneralizedTime = 24,
  GraphicString = 25,
  VisibleString = 26,
  GeneralString = 28,
  UniversalString = 29,
  CharacterString = 30,
  BMPString = 31,
  Constructor = 32,
  Context = 128,
}

*/
