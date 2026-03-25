export interface ISecret {
    _id: string;
    version: number;
    workspace: string;
    user?: string;
    type: 'shared' | 'personal';
    environment: string;
    secretKeyCiphertext: string;
    secretKeyIV: string;
    secretKeyTag: string;
    secretValueCiphertext: string;
    secretValueIV: string;
    secretValueTag: string;
    secretCommentCiphertext?: string;
    secretCommentIV?: string;
    secretCommentTag?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ISecretBundle {
    secretName: string;
    secretValue: string | undefined;
    version?: number;
    workspace?: string;
    environment?: string;
    type?: 'shared' | 'personal'
    createdAt?: string;
    updatedAt?: string;
    isFallback: boolean;
    lastFetchedAt: Date;
}

export interface IServiceTokenData {
    _id: string;
    name: string;
    workspace: string;
    environment: string;
    user: string;
    serviceAccount: string;
    lastUsed: Date;
    expiresAt: Date;
    encryptedKey: string;
    iv: string;
    tag: string;
    createdAt: string;
    updatedAt: string;
}

export interface Scope {
    envSlug: string;
    path: string
}