import { ExternalAccountSupplierContext } from './baseexternalclient';
import { GaxiosOptions } from 'gaxios';
import { SubjectTokenFormatType, SubjectTokenSupplier } from './identitypoolclient';
/**
 * Interface that defines options used to build a {@link UrlSubjectTokenSupplier}
 */
export interface UrlSubjectTokenSupplierOptions {
    /**
     * The URL to call to retrieve the subject token. This is typically a local
     * metadata server.
     */
    url: string;
    /**
     * The token file or URL response type (JSON or text).
     */
    formatType: SubjectTokenFormatType;
    /**
     * For JSON response types, this is the subject_token field name. For Azure,
     * this is access_token. For text response types, this is ignored.
     */
    subjectTokenFieldName?: string;
    /**
     * The optional additional headers to send with the request to the metadata
     * server url.
     */
    headers?: {
        [key: string]: string;
    };
    /**
     * Additional gaxios options to use for the request to the specified URL.
     */
    additionalGaxiosOptions?: GaxiosOptions;
}
/**
 * Internal subject token supplier implementation used when a URL
 * is configured in the credential configuration used to build an {@link IdentityPoolClient}
 */
export declare class UrlSubjectTokenSupplier implements SubjectTokenSupplier {
    private readonly url;
    private readonly headers?;
    private readonly formatType;
    private readonly subjectTokenFieldName?;
    private readonly additionalGaxiosOptions?;
    /**
     * Instantiates a URL subject token supplier.
     * @param opts The URL subject token supplier options to build the supplier with.
     */
    constructor(opts: UrlSubjectTokenSupplierOptions);
    /**
     * Sends a GET request to the URL provided in the constructor and resolves
     * with the returned external subject token.
     * @param context {@link ExternalAccountSupplierContext} from the calling
     *   {@link IdentityPoolClient}, contains the requested audience and subject
     *   token type for the external account identity. Not used.
     */
    getSubjectToken(context: ExternalAccountSupplierContext): Promise<string>;
}
