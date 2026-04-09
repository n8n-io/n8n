import type { SignatureV4 as BaseSignatureV4 } from "@smithy/signature-v4";
import type { EventSigner, EventSigningArguments, FormattedEvent, HttpRequest as IHttpRequest, MessageSigner, RequestPresigner, RequestPresigningArguments, RequestSigner, RequestSigningArguments, SignableMessage, SignedMessage, SigningArguments, StringSigner } from "@smithy/types";
/**
 * Because this signer defers to sigv4, it implements all signing interfaces that
 * the sigv4 signer does, including message signing.
 *
 * @internal
 */
export declare class WebsocketSignatureV4 implements RequestPresigner, RequestSigner, StringSigner, EventSigner, MessageSigner {
    private readonly signer;
    constructor(options: {
        signer: BaseSignatureV4;
    });
    presign(originalRequest: IHttpRequest, options?: RequestPresigningArguments): Promise<IHttpRequest>;
    sign(stringToSign: string, options?: SigningArguments): Promise<string>;
    sign(event: FormattedEvent, options: EventSigningArguments): Promise<string>;
    sign(event: SignableMessage, options: SigningArguments): Promise<SignedMessage>;
    sign(requestToSign: IHttpRequest, options?: RequestSigningArguments): Promise<IHttpRequest>;
    signMessage(message: SignableMessage, args: SigningArguments): Promise<SignedMessage>;
}
