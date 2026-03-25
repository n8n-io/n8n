import { SignatureV4 as BaseSignatureV4 } from "@smithy/signature-v4";
import { HttpRequest as IHttpRequest, RequestPresigner, RequestPresigningArguments, RequestSigner, RequestSigningArguments } from "@smithy/types";
export declare class WebsocketSignatureV4 implements RequestSigner, RequestPresigner {
    private readonly signer;
    constructor(options: {
        signer: BaseSignatureV4;
    });
    presign(originalRequest: IHttpRequest, options?: RequestPresigningArguments): Promise<IHttpRequest>;
    sign(toSign: IHttpRequest, options?: RequestSigningArguments): Promise<IHttpRequest>;
}
