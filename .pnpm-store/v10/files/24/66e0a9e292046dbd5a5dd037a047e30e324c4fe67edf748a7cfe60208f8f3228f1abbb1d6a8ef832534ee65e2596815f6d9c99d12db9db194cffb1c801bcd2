/// <reference types="node" />

import { BerReader, BerWriter } from "asn1";
import crypto = require("crypto");
import { Writable } from "stream";

declare class SshPK {}

declare namespace SshPK {
    // == algs.js == //

    type AlgorithmType = "dsa" | "rsa" | "ecdsa" | "ed25519";
    type AlgorithmTypeWithCurve = AlgorithmType | "curve25519";
    type ShaHashType = "sha1" | "sha256" | "sha384" | "sha512";
    type AlgorithmHashType = "md5" | ShaHashType;
    type CurveType = "nistp256" | "nistp384" | "nistp521";
    type AlgorithmPart = "p" | "q" | "g" | "y" | "x" | "n" | "e" | "d" | "iqmp" | "curve" | "Q" | "A" | "k";
    type KeyType = "public" | "private";

    class Algo {
        parts: string[];
        sizePart?: string | undefined;
        normalize?: boolean | undefined;
    }

    class algInfo {
        dsa: Algo;
        rsa: Algo;
        ecdsa: Algo;
        ed25519: Algo;
        curve25519: Algo;
    }

    class algPrivInfo {
        dsa: Algo;
        rsa: Algo;
        ecdsa: Algo;
        ed25519: Algo;
        curve25519: Algo;
    }

    class hashAlgs {
        md5: boolean;
        sha1: boolean;
        sha256: boolean;
        sha384: boolean;
        sha512: boolean;
    }

    class Curve {
        size: number;
        pkcs8oid: string;
        p: Buffer;
        a: Buffer;
        b: Buffer;
        s: Buffer;
        n: Buffer;
        G: Buffer;
    }

    class curves {
        nistp256: Curve;
        nistp384: Curve;
        nistp512: Curve;
    }

    class algs {
        info: algInfo;
        privInfo: algPrivInfo;
        hashAlgs: hashAlgs;
        curves: curves;
    }

    // == certificate.js == //

    interface CertificateOptions {
        subjects: Identity[];
        subjectKey: Key;
        issuer: Identity;
        issuerKey?: Key;

        signatures: { x509: Signature; openssh: Signature };
        serial: Buffer;
        validFrom: Date;
        validUntil: Date;

        purposes?: string[];
    }

    interface CertificateCreateOptions {
        lifetime?: number;
        validFrom?: Date;
        validUntil?: Date;
        serial?: Buffer;
        purposes?: string[];
        ca?: boolean;
    }

    type CertificateFormat = "openssh" | "pem" | "x509";

    class Certificate {
        subjects: Identity[];
        issuer: Identity;
        subjectKey: Key;
        issuerKey?: Key;
        signatures: { x509?: Format.x509Signature; openssh?: Format.OpenSshSignature };
        serial: Buffer;
        validFrom: Date;
        validUntil: Date;
        purposes?: string[];

        static formats: { [key in CertificateFormat]: Format };

        constructor(opts: CertificateOptions);

        toBuffer(format: CertificateFormat, options?: Format.WriteOptions): Buffer;

        toString(format: CertificateFormat, options?: Format.WriteOptions): string;

        fingerprint(algo?: AlgorithmHashType): Fingerprint;

        hash(algo: AlgorithmHashType): string;

        isExpired(when?: Date): boolean;

        isSignedBy(issuerCert: Certificate): boolean;

        getExtension(keyOrOid: string): Format.OpenSshSignatureExt | Format.x509SignatureExt | undefined;

        getExtensions(): Array<Format.OpenSshSignatureExt | Format.x509SignatureExt>;

        isSignedByKey(issuerKey: Key): boolean;

        signWith(key: PrivateKey): void;

        static createSelfSigned(
            subjectOrSubjects: Identity | Identity[],
            key: PrivateKey,
            options?: CertificateCreateOptions,
        ): Certificate;

        static create(
            subjectOrSubjects: Identity | Identity[],
            key: Key | PrivateKey,
            issuer: Identity,
            issuerKey: PrivateKey,
            options?: CertificateCreateOptions,
        ): Certificate;

        static parse(data: string | Buffer, format: CertificateFormat, options?: string | KeyParseOptions): Certificate;

        static isCertificate(data: string | Buffer, ver: Version): boolean;
    }

    function parseCertificate(
        data: string | Buffer,
        format: CertificateFormat,
        options?: string | KeyParseOptions,
    ): Certificate;

    function createSelfSignedCertificate(
        subjectOrSubjects: Identity | Identity[],
        key: PrivateKey,
        options?: CertificateCreateOptions,
    ): Certificate;

    function createCertificate(
        subjectOrSubjects: Identity | Identity[],
        key: Key | PrivateKey,
        issuer: Identity,
        issuerKey: PrivateKey,
        options?: CertificateCreateOptions,
    ): Certificate;

    // == dhe.js == //

    class DiffieHellman {
        private constructor(key: Key | PrivateKey);

        getPublicKey(): Key;
        getPrivateKey(): PrivateKey | undefined;
        getKey(): PrivateKey | undefined;
        setKey(key: PrivateKey): void;
        setPrivateKey(key: PrivateKey): void;

        computeSecret(otherpk: Key): Buffer;

        generateKey(): PrivateKey;
        generateKeys(): PrivateKey;
    }

    // == ed-compat.js == //

    class Verifier extends Writable {
        constructor(key: Key, hashAlgo: "sha512");

        update(chunk: string | Buffer): void;

        verify(signature: Signature): boolean;
    }

    class Signer extends Writable {
        private constructor();

        update(data: crypto.BinaryLike): this;
        update(data: string, input_encoding: crypto.Encoding): this;

        sign(private_key: crypto.KeyLike | crypto.SignKeyObjectInput | crypto.SignPrivateKeyInput): Buffer;
        sign(
            private_key: crypto.KeyLike | crypto.SignKeyObjectInput | crypto.SignPrivateKeyInput,
            output_format: crypto.BinaryToTextEncoding,
        ): string;
        sign(): Signature;
    }

    // == errors.js == //

    class FingerprintFormatError implements Error {
        name: string;
        message: string;
        fingerprint?: Fingerprint;
        format?: string;

        constructor(fp?: Fingerprint, format?: string);
    }

    class InvalidAlgorithmError implements Error {
        name: string;
        message: string;
        algorithm: string;

        constructor(algo: string);
    }

    class KeyParseError implements Error {
        name: string;
        message: string;
        format: string;
        keyName: string;
        innerErr: Error;

        constructor(name: string, format: string, innerErr: Error);
    }

    class SignatureParseError implements Error {
        name: string;
        message: string;
        type: string;
        format: string;
        innerErr: Error;

        constructor(type: string, format: string, innerErr: Error);
    }

    class KeyEncryptedError implements Error {
        name: string;
        message: string;
        format: string;
        keyName: string;

        constructor(name: string, format: string);
    }

    class CertificateParseError implements Error {
        name: string;
        message: string;
        format: string;
        certName: string;
        innerErr: Error;

        constructor(name: string, format: string, innerErr: Error);
    }

    // == fingerprint.js == //

    type FingerprintType = "key" | "certificate";
    type FingerprintHashType = "ssh" | "spki";

    interface FingerprintOptions {
        type: FingerprintType;
        hash: Buffer;
        algorithm: AlgorithmHashType;
        hashType?: FingerprintHashType;
    }

    interface FingerprintParseOptions {
        enAlgs?: string[];
        algotirhms?: string[];
        type?: FingerprintType;
        hashType?: FingerprintHashType;
    }

    class Fingerprint {
        algorithm: AlgorithmHashType;
        hash: Buffer;
        type: FingerprintType;
        constructor(opts: FingerprintOptions);

        toString(format?: "hex" | "base64"): string;
        matches(other: Key | PrivateKey | Certificate): boolean;

        static parse(fp: string, options?: string[] | FingerprintParseOptions): Fingerprint;

        static isFingerprint(obj: any, ver: Version): boolean;
    }

    function parseFingerprint(fp: string, options?: string[] | FingerprintParseOptions): Fingerprint;

    // == formats/*.js == //

    interface Format {
        read(buf: string | Buffer, options?: Format.ReadOptions): Key | Certificate;
        write(keyOrCert: Key | PrivateKey | Certificate, options?: Format.WriteOptions): Buffer;
    }

    namespace Format {
        interface ReadOptions {
            passphrase?: string | Buffer;
            cipher?: SshPrivateCipher;
        }

        interface WriteOptions extends ReadOptions {
            hashAlgo?: "sha1" | "sha256" | "sha512";
            comment?: string;
        }

        interface Auto extends Format {
            read(buf: string | Buffer, options?: ReadOptions): Key;
            write(key: Key): Buffer;
        }

        interface DnsSec extends Format {
            read(buf: string | Buffer): Key;
            write(key: PrivateKey, options?: { hashAlgo?: "sha1" | "sha256" | "sha512" }): Buffer;
        }

        interface OpenSshSignatureExt {
            critical: boolean;
            name: string;
            data: Buffer;
        }

        interface OpenSshSignature {
            nonce: Buffer;
            keyId: string;
            exts: OpenSshSignatureExt[];
            signature: Signature;
        }

        interface OpenSshCert extends Format {
            read(buf: string | Buffer): Certificate;
            verify(): false;
            sign(cert: Certificate, key: PrivateKey): boolean;
            signAsync(
                cert: Certificate,
                signer: (blob: Buffer, done: (err: Error | undefined, signature: Signature) => void) => void,
                done: (err?: Error) => void,
            ): void;
            write(cert: Certificate, options?: { comment?: string }): Buffer;
        }

        interface Pem extends Format {
            read(buf: string | Buffer, options?: ReadOptions, forceType?: "pkcs1" | "pkcs8"): Key;
            write(key: Key, options?: any, type?: "pkcs1" | "pkcs8"): Buffer;
        }

        interface Pkcs1 extends Format {
            read(buf: string | Buffer, options?: ReadOptions): Key;
            readPkcs1(alg: "RSA" | "DSA" | "EC" | "ECDSA", type: "public", der: BerReader): Key;
            readPkcs1(
                alg: "RSA" | "DSA" | "EC" | "ECDSA" | "EDDSA" | "EdDSA",
                type: "private",
                der: BerReader,
            ): PrivateKey;
            write(key: Key): Buffer;
            writePkcs1(der: BerWriter, key: Key): void;
        }

        interface Pkcs8 extends Format {
            read(buf: string | Buffer, options?: ReadOptions): Key;
            readPkcs8(alg: any, type: KeyType, der: BerReader): Key;
            write(key: Key): Buffer;
            writePkcs8(der: BerWriter, key: Key): void;
            pkcs8ToBuffer(key: Key): Buffer;

            readECDSACurve(der: BerReader): CurveType;
            writeECDSACurve(key: Key, der: BerWriter): void;
        }

        interface Putty extends Format {
            read(buf: string | Buffer): Key;
            write(key: Key): Buffer;
        }

        type Rfc4253Algorithm =
            | "ssh-dss"
            | "ssh-rsa"
            | "ssh-ed25519"
            | "ssh-curve25519"
            | "ecdsa-sha2-nistp256"
            | "ecdsa-sha2-nistp384"
            | "ecdsa-sha2-nistp521";

        interface Rfc4253 extends Format {
            read(buf: string | Buffer): Key;
            readType(type: KeyType | undefined, buf: string | Buffer): Key;
            write(key: Key): Buffer;
            /* semi-private api, used by sshpk-agent */
            readPartial(type: KeyType | undefined, buf: string | Buffer): Key;

            /* shared with ssh format */
            readInternal(partial: boolean, type: KeyType | undefined, buf: string | Buffer): Key;
            keyTypeToAlg(key: Key): Rfc4253Algorithm;
            algToKeyType(alg: Rfc4253Algorithm): AlgorithmTypeWithCurve;
        }

        type SshPrivateCipher =
            | "3des-cbc"
            | "blowfish-cbc"
            | "aes128-cbc"
            | "aes128-ctr"
            | "aes128-gcm@openssh.com"
            | "aes192-cbc"
            | "aes192-ctr"
            | "aes192-gcm@openssh.com"
            | "aes256-cbc"
            | "aes256-ctr"
            | "aes256-gcm@openssh.com";

        interface SshPrivate extends Format {
            read(buf: string | Buffer, options?: ReadOptions, forceType?: "pkcs1" | "pkcs8"): Key;
            readSSHPrivate(type: KeyType, buf: Buffer, options: { passphrase: string | Buffer }): Key;
            write(key: Key, options?: ReadOptions): Buffer;
        }

        interface Ssh extends Format {
            read(buf: string | Buffer): Key;
            write(key: Key): Buffer;
        }

        interface x509Pem extends Format {
            read(buf: string | Buffer): Certificate;
            verify(cert: Certificate, key: Key): boolean;
            sign(cert: Certificate, key: PrivateKey): boolean;
            write(cert: Certificate): Buffer;
        }

        type x509SignAlgorithm =
            | "rsa-md5"
            | "rsa-sha1"
            | "rsa-sha256"
            | "rsa-sha384"
            | "rsa-sha512"
            | "dsa-sha1"
            | "dsa-sha256"
            | "ecdsa-sha1"
            | "ecdsa-sha256"
            | "ecdsa-sha384"
            | "ecdsa-sha512"
            | "ed25519-sha512";

        type x509ExtsOid = "2.5.29.35" | "2.5.29.17" | "2.5.29.19" | "2.5.29.15" | "2.5.29.37";

        interface x509SignatureExt {
            oid: x509ExtsOid;
            critical: boolean;
            pathLen?: number;
            bits?: string;
            data?: string;
        }

        interface x509Signature {
            signature: Signature;
            algo: x509SignAlgorithm;
            extras: { issuerUniqueID: Buffer; subjectUniqueID: Buffer; exts: x509SignatureExt[] };
            cache: Buffer;
        }

        interface x509 extends Format {
            read(buf: string | Buffer): Certificate;
            verify(cert: Certificate, key: Key): boolean;
            sign(cert: Certificate, key: PrivateKey): boolean;
            signAsync(
                cert: Certificate,
                signer: (blob: Buffer, done: (err: Error | undefined, signature: Signature) => void) => void,
                done: (err?: Error) => void,
            ): void;
            write(cert: Certificate): Buffer;
        }
    }

    // == identity.js == //

    type IndentityOidName =
        | "cn"
        | "o"
        | "ou"
        | "l"
        | "s"
        | "c"
        | "sn"
        | "postalCode"
        | "serialNumber"
        | "street"
        | "x500UniqueIdentifier"
        | "role"
        | "telephoneNumber"
        | "description"
        | "dc"
        | "uid"
        | "mail"
        | "title"
        | "gn"
        | "initials"
        | "pseudonym"
        | "emailAddress";

    type IdentityOidValue =
        | "2.5.4.3"
        | "2.5.4.10"
        | "2.5.4.11"
        | "2.5.4.7"
        | "2.5.4.8"
        | "2.5.4.6"
        | "2.5.4.4"
        | "2.5.4.17"
        | "2.5.4.5"
        | "2.5.4.9"
        | "2.5.4.45"
        | "2.5.4.72"
        | "2.5.4.20"
        | "2.5.4.13"
        | "0.9.2342.19200300.100.1.25"
        | "0.9.2342.19200300.100.1.1"
        | "0.9.2342.19200300.100.1.3"
        | "2.5.4.12"
        | "2.5.4.42"
        | "2.5.4.43"
        | "2.5.4.65"
        | "1.2.840.113549.1.9.1";

    type IdentityType = "host" | "user" | "email";
    type IdentityTypeWithUnknown = IdentityType | "unknown";

    interface IdentityComponent {
        name?: IndentityOidName;
        oid?: IdentityOidValue;
        asn1type?: number;
        value: Buffer | string;
    }

    interface IdentityNameComponent {
        name: IndentityOidName;
        value: Buffer | string;
    }

    class Identity {
        components: IdentityComponent[];
        componentLookup: { [key in IndentityOidName]: IdentityComponent[] };
        type: IdentityTypeWithUnknown;

        cn?: string;
        hostname?: string;
        uid?: string;
        email?: string;

        constructor(opts: {
            components: IdentityComponent[];
            type?: IdentityType;
            hostname?: string;
            uid?: string;
            email?: string;
        });

        toString(): string;

        get(name: IndentityOidName, asArray?: false): string;
        get(name: IndentityOidName, asArray: true): string[];

        toArray(): IdentityNameComponent[];

        toAsn1(der: BerWriter, tag?: number): void;

        equals(other: Identity): boolean;

        static forHost(hostname: string): Identity;
        static forUser(uid: string): Identity;
        static forEmail(email: string): Identity;
        static parseDN(dn: string): Identity;
        static fromArray(components: IdentityNameComponent[]): Identity;
        static parseAsn1(dn: BerReader, top?: number): Identity;

        static isIdentity(obj: any, ver: Version): boolean;
    }

    function identityFromDN(dn: string): Identity;
    function identityForHost(hostname: string): Identity;
    function identityForUser(uid: string): Identity;
    function identityForEmail(email: string): Identity;
    function identityFromArray(components: IdentityNameComponent[]): Identity;

    // == key.js == //

    type KeyFormatType =
        | "auto"
        | "pem"
        | "pkcs1"
        | "pkcs8"
        | "rfc4253"
        | "ssh"
        | "ssh-private"
        | "openssh"
        | "dnssec"
        | "putty"
        | "ppk";

    interface KeyPart {
        name: AlgorithmPart;
        data: Buffer;
    }

    interface KeyOptions {
        parts: KeyPart[];
        type: AlgorithmTypeWithCurve;
        comment?: string;
        source?: string;
    }

    interface KeyParseOptions extends Format.ReadOptions {
        filename?: string;
    }

    /** extends crypto.Verify but override 'verify' function */
    interface Verify {
        update(data: crypto.BinaryLike): Verify;
        update(data: string, input_encoding: crypto.Encoding): Verify;

        verify(signature: Signature): boolean;
        verify(signature: string | Buffer, fmt?: crypto.BinaryToTextEncoding): boolean;
    }

    class Key {
        type: AlgorithmTypeWithCurve;
        parts: KeyPart[];
        part: { [key in AlgorithmType]: KeyPart };
        comment?: string;
        source?: string;
        curve?: string;
        size: number;
        constructor(opts: KeyOptions);

        static formats: { [key in KeyFormatType]: Format };

        toBuffer(format: KeyFormatType, options?: Format.WriteOptions): Buffer;
        toString(format: KeyFormatType, options?: Format.WriteOptions): string;
        hash(algo: AlgorithmHashType, type?: FingerprintHashType): Buffer;
        fingerprint(algo?: AlgorithmHashType, type?: FingerprintHashType): Fingerprint;
        defaultHashAlgorithm(): ShaHashType;
        createVerify(algo?: AlgorithmHashType): Verify;
        createDiffieHellman(): DiffieHellman;
        createDH(): DiffieHellman;

        static parse(data: string | Buffer, format?: KeyFormatType, options?: string | KeyParseOptions): Key;

        static isKey(obj: any, ver: Version): boolean;
    }

    function parseKey(
        data: string | Buffer,
        format?: KeyFormatType,
        options?: string | (Format.ReadOptions & { filename?: string }),
    ): Key;

    // == private-key.js == //

    type PrivateKeyFormatType =
        | "auto"
        | "pem"
        | "pkcs1"
        | "pkcs8"
        | "rfc4253"
        | "ssh"
        | "ssh-private"
        | "openssh"
        | "dnssec";

    class PrivateKey {
        type: AlgorithmTypeWithCurve;
        parts: KeyPart[];
        part: { [key in AlgorithmType]: KeyPart };
        comment?: string;
        source?: string;
        curve?: string;
        size: number;
        constructor(opts: KeyOptions);

        toBuffer(format: PrivateKeyFormatType, options?: Format.WriteOptions): Buffer;
        toString(format: PrivateKeyFormatType, options?: Format.WriteOptions): string;
        hash(algo: AlgorithmHashType, type?: FingerprintHashType): Buffer;
        fingerprint(algo?: AlgorithmHashType, type?: FingerprintHashType): Fingerprint;
        defaultHashAlgorithm(): ShaHashType;
        toPublic(): Key;
        derive(newType: "ed25519" | "curve25519"): PrivateKey;
        createVerify(algo?: AlgorithmHashType): Verify;
        createSign(hashAlgo: AlgorithmHashType): Signer;
        createDiffieHellman(): DiffieHellman;
        createDH(): DiffieHellman;

        static parse(
            data: string | Buffer,
            format?: PrivateKeyFormatType,
            options?: string | KeyParseOptions,
        ): PrivateKey;

        static isPrivateKey(data: any, ver: Version): boolean;

        static generate(type: "ecdsa", options?: { curve?: CurveType }): PrivateKey;
        static generate(type: "ed25519"): PrivateKey;
    }

    namespace PrivateKey {
        let formats: { [key in PrivateKeyFormatType]: Format };
    }

    function parsePrivateKey(
        data: string | Buffer,
        format?: PrivateKeyFormatType,
        options?: string | KeyParseOptions,
    ): PrivateKey;

    function generatePrivateKey(type: "ecdsa", options?: { curve?: CurveType }): PrivateKey;
    function generatePrivateKey(type: "ed25519"): PrivateKey;

    // == signature.js == //

    type SignatureFormatType = "asn1" | "ssh" | "raw";
    type SignaturePartType = "r" | "s" | "sig";

    interface SignaturePart {
        name: SignaturePartType;
        data: Buffer;
    }

    interface SignatureOptions {
        type: AlgorithmType;
        hashAlgo?: AlgorithmHashType;
        curve?: CurveType;
        parts: SignaturePart[];
    }

    class Signature {
        type: AlgorithmType;
        hashAlgorithm?: AlgorithmHashType;
        curve?: CurveType;
        parts: SignaturePart[];
        part: { [key in SignaturePartType]: SignaturePart };

        constructor(opts: SignatureOptions);
        toBuffer(format?: SignatureFormatType): Buffer;
        toString(format?: SignatureFormatType): string;

        static parse(data: string | Buffer, type: AlgorithmType, format: SignatureFormatType): Signature;

        static isSignature(obj: any, ver: Version): boolean;
    }

    function parseSignature(data: string | Buffer, type: AlgorithmType, format: SignatureFormatType): Signature;

    // == ssh-buffer.js == //

    class SSHPart {
        data: Buffer;
    }

    class SSHBuffer {
        constructor(opts: { buffer?: Buffer });

        toBuffer(): Buffer;
        atEnd(): boolean;
        remainder(): Buffer;
        skip(n: number): void;
        expand(): void;
        readPart(): SSHPart;
        readBuffer(): Buffer;
        readString(): string;
        readCString(): string;
        readInt(): number;
        readInt64(): Buffer;
        readChar(): string;
        writeBuffer(buf: Buffer): void;
        writeString(buf: string): void;
        writeCString(buf: string): void;
        writeInt(buf: number): void;
        writeInt64(buf: Buffer): void;
        writeChar(buf: string): void;
        writePart(buf: SSHPart): void;
        write(buf: Buffer): void;
    }

    // == utils.js == //

    type Version = [number, number];

    function bufferSplit(buf: Buffer, chr: string): Buffer[];

    function addRSAMissing(key: PrivateKey): void;

    function calculateDSAPublic(g: Buffer, p: Buffer, x: Buffer): Buffer;

    function calculateED25519Public(k: Buffer): Buffer;

    function calculateX25519Public(k: Buffer): Buffer;

    function mpNormalize(buf: Buffer): Buffer;

    function mpDenormalize(buf: Buffer): Buffer;

    function ecNormalize(buf: Buffer, addZero?: boolean): Buffer;

    function countZeros(buf: Buffer): number;

    function assertCompatible(obj: object, klass: any, needVer: Version, name?: string): void;

    function isCompatible(obj: object, klass: any, needVer: Version): boolean;

    interface OpenSslKeyDeriv {
        key: Buffer;
        iv: Buffer;
    }

    function opensslKeyDeriv(
        cipher: "des-ede3-cbc" | "aes-128-cbc" | "aes-256-cbc",
        salt: Buffer,
        passphrase: Buffer,
        count: number,
    ): OpenSslKeyDeriv;

    type OpenSshCipherName =
        | "des-ede3-cbc"
        | "bf-cbc"
        | "aes-128-cbc"
        | "aes-128-ctr"
        | "aes-128-gcm"
        | "aes-192-cbc"
        | "aes-192-ctr"
        | "aes-192-gcm"
        | "aes-256-cbc"
        | "aes-256-ctr"
        | "aes-256-gcm";

    class OpenSshCipherInfo {
        keySize: number;
        blockSize: number;
        opensslName: OpenSshCipherName;
    }

    function opensshCipherInfo(cipter: Format.SshPrivateCipher): OpenSshCipherInfo;

    function publicFromPrivateECDSA(curveName: CurveType, priv: Buffer): Key;

    function zeroPadToLength(buf: Buffer, len: number): Buffer;

    function writeBitString(der: BerWriter, buf: Buffer, tag?: number): void;

    function readBitString(der: BerReader, tag?: number): Buffer;

    function pbkdf2(
        hashAlg: string,
        salt: Buffer,
        iterations: number,
        size: number,
        passphrase: crypto.BinaryLike,
    ): Buffer;
}

export = SshPK;
