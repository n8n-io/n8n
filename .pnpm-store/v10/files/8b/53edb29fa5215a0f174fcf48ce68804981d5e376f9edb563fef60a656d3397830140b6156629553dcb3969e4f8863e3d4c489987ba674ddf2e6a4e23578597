import { CEKEntry } from './cek-entry';
import { type BaseMetadata } from '../metadata-parser';
export interface EncryptionKeyInfo {
    encryptedKey: Buffer;
    dbId: number;
    keyId: number;
    keyVersion: number;
    mdVersion: Buffer;
    keyPath: string;
    keyStoreName: string;
    algorithmName: string;
}
export declare enum SQLServerEncryptionType {
    Deterministic = 1,
    Randomized = 2,
    PlainText = 0
}
export interface EncryptionAlgorithm {
    encryptData: (plainText: Buffer) => Buffer;
    decryptData: (cipherText: Buffer) => Buffer;
}
export interface CryptoMetadata {
    cekEntry?: CEKEntry;
    cipherAlgorithmId: number;
    cipherAlgorithmName?: string;
    normalizationRuleVersion: Buffer;
    encryptionKeyInfo?: EncryptionKeyInfo;
    ordinal: number;
    encryptionType: SQLServerEncryptionType;
    cipherAlgorithm?: EncryptionAlgorithm;
    baseTypeInfo?: BaseMetadata;
}
export interface HashMap<T> {
    [hash: string]: T;
}
export declare enum DescribeParameterEncryptionResultSet1 {
    KeyOrdinal = 0,
    DbId = 1,
    KeyId = 2,
    KeyVersion = 3,
    KeyMdVersion = 4,
    EncryptedKey = 5,
    ProviderName = 6,
    KeyPath = 7,
    KeyEncryptionAlgorithm = 8
}
export declare enum DescribeParameterEncryptionResultSet2 {
    ParameterOrdinal = 0,
    ParameterName = 1,
    ColumnEncryptionAlgorithm = 2,
    ColumnEncrytionType = 3,
    ColumnEncryptionKeyOrdinal = 4,
    NormalizationRuleVersion = 5
}
export declare enum SQLServerStatementColumnEncryptionSetting {
    /**
     * if "Column Encryption Setting=Enabled" in the connection string, use Enabled. Otherwise, maps to Disabled.
     */
    UseConnectionSetting = 0,
    /**
     * Enables TCE for the command. Overrides the connection level setting for this command.
     */
    Enabled = 1,
    /**
     * Parameters will not be encrypted, only the ResultSet will be decrypted. This is an optimization for queries that
     * do not pass any encrypted input parameters. Overrides the connection level setting for this command.
     */
    ResultSetOnly = 2,
    /**
     * Disables TCE for the command.Overrides the connection level setting for this command.
     */
    Disabled = 3
}
