import { AwsCredentialIdentity, ChecksumConstructor, DateInput, HashConstructor, HeaderBag, HttpRequest, Provider } from "@smithy/types";
/**
 * @public
 */
export interface SignatureV4Init {
    /**
     * The service signing name.
     */
    service: string;
    /**
     * The region name or a function that returns a promise that will be
     * resolved with the region name.
     */
    region: string | Provider<string>;
    /**
     * The credentials with which the request should be signed or a function
     * that returns a promise that will be resolved with credentials.
     */
    credentials: AwsCredentialIdentity | Provider<AwsCredentialIdentity>;
    /**
     * A constructor function for a hash object that will calculate SHA-256 HMAC
     * checksums.
     */
    sha256?: ChecksumConstructor | HashConstructor;
    /**
     * Whether to uri-escape the request URI path as part of computing the
     * canonical request string. This is required for every AWS service, except
     * Amazon S3, as of late 2017.
     *
     * @default [true]
     */
    uriEscapePath?: boolean;
    /**
     * Whether to calculate a checksum of the request body and include it as
     * either a request header (when signing) or as a query string parameter
     * (when presigning). This is required for AWS Glacier and Amazon S3 and optional for
     * every other AWS service as of late 2017.
     *
     * @default [true]
     */
    applyChecksum?: boolean;
}
/**
 * @public
 */
export interface SignatureV4CryptoInit {
    sha256: ChecksumConstructor | HashConstructor;
}
/**
 * @internal
 */
export declare abstract class SignatureV4Base {
    protected readonly service: string;
    protected readonly regionProvider: Provider<string>;
    protected readonly credentialProvider: Provider<AwsCredentialIdentity>;
    protected readonly sha256: ChecksumConstructor | HashConstructor;
    private readonly uriEscapePath;
    protected readonly applyChecksum: boolean;
    protected constructor({ applyChecksum, credentials, region, service, sha256, uriEscapePath, }: SignatureV4Init & SignatureV4CryptoInit);
    protected createCanonicalRequest(request: HttpRequest, canonicalHeaders: HeaderBag, payloadHash: string): string;
    protected createStringToSign(longDate: string, credentialScope: string, canonicalRequest: string, algorithmIdentifier: string): Promise<string>;
    private getCanonicalPath;
    protected validateResolvedCredentials(credentials: unknown): void;
    protected formatDate(now: DateInput): {
        longDate: string;
        shortDate: string;
    };
    protected getCanonicalHeaderList(headers: object): string;
}
