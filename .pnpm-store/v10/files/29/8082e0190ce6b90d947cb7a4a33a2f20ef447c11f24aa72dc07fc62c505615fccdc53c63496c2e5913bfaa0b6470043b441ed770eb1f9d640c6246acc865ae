import { type EncryptionKeyInfo } from './types';
export declare class CEKEntry {
    columnEncryptionKeyValues: EncryptionKeyInfo[];
    ordinal: number;
    databaseId: number;
    cekId: number;
    cekVersion: number;
    cekMdVersion: Buffer;
    constructor(ordinalVal: number);
    add(encryptedKey: Buffer, dbId: number, keyId: number, keyVersion: number, mdVersion: Buffer, keyPath: string, keyStoreName: string, algorithmName: string): void;
}
