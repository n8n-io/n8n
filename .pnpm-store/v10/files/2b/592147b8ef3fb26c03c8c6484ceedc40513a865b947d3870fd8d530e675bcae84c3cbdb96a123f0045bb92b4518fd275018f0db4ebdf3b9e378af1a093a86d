import { EventSigner, EventSigningArguments, FormattedEvent, HttpRequest, MessageSigner, RequestPresigner, RequestPresigningArguments, RequestSigner, RequestSigningArguments, SignableMessage, SignedMessage, SigningArguments, StringSigner } from "@smithy/types";
import { SignatureV4CryptoInit, SignatureV4Init } from "./SignatureV4Base";
import { SignatureV4Base } from "./SignatureV4Base";
/**
 * @public
 */
export declare class SignatureV4 extends SignatureV4Base implements RequestPresigner, RequestSigner, StringSigner, EventSigner, MessageSigner {
    private readonly headerFormatter;
    constructor({ applyChecksum, credentials, region, service, sha256, uriEscapePath, }: SignatureV4Init & SignatureV4CryptoInit);
    presign(originalRequest: HttpRequest, options?: RequestPresigningArguments): Promise<HttpRequest>;
    sign(stringToSign: string, options?: SigningArguments): Promise<string>;
    sign(event: FormattedEvent, options: EventSigningArguments): Promise<string>;
    sign(event: SignableMessage, options: SigningArguments): Promise<SignedMessage>;
    sign(requestToSign: HttpRequest, options?: RequestSigningArguments): Promise<HttpRequest>;
    private signEvent;
    signMessage(signableMessage: SignableMessage, { signingDate, signingRegion, signingService }: SigningArguments): Promise<SignedMessage>;
    private signString;
    private signRequest;
    private getSignature;
    private getSigningKey;
}
