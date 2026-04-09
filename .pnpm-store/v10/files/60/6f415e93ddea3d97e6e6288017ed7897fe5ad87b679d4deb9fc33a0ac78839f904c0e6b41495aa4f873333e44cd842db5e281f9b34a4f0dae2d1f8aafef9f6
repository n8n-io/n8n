export declare class ColumnEncryptionAzureKeyVaultProvider {
    readonly name: string;
    private url;
    private readonly rsaEncryptionAlgorithmWithOAEPForAKV;
    private readonly firstVersion;
    private credentials;
    private readonly azureKeyVaultDomainName;
    private keyClient;
    constructor(clientId: string, clientKey: string, tenantId: string);
    decryptColumnEncryptionKey(masterKeyPath: string, encryptionAlgorithm: string, encryptedColumnEncryptionKey: Buffer): Promise<Buffer>;
    encryptColumnEncryptionKey(masterKeyPath: string, encryptionAlgorithm: string, columnEncryptionKey: Buffer): Promise<Buffer>;
    private getMasterKey;
    private createKeyClient;
    private createCryptoClient;
    private parsePath;
    private azureKeyVaultSignedHashedData;
    private azureKeyVaultWrap;
    private azureKeyVaultUnWrap;
    private getAKVKeySize;
    private validateEncryptionAlgorithm;
}
