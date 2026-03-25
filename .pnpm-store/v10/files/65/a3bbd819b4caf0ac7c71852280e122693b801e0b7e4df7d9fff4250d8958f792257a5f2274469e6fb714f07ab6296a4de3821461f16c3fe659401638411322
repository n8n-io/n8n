import { SubjectTokenFormatType, SubjectTokenSupplier } from './identitypoolclient';
/**
 * Interface that defines options used to build a {@link FileSubjectTokenSupplier}
 */
export interface FileSubjectTokenSupplierOptions {
    /**
     * The file path where the external credential is located.
     */
    filePath: string;
    /**
     * The token file or URL response type (JSON or text).
     */
    formatType: SubjectTokenFormatType;
    /**
     * For JSON response types, this is the subject_token field name. For Azure,
     * this is access_token. For text response types, this is ignored.
     */
    subjectTokenFieldName?: string;
}
/**
 * Internal subject token supplier implementation used when a file location
 * is configured in the credential configuration used to build an {@link IdentityPoolClient}
 */
export declare class FileSubjectTokenSupplier implements SubjectTokenSupplier {
    private readonly filePath;
    private readonly formatType;
    private readonly subjectTokenFieldName?;
    /**
     * Instantiates a new file based subject token supplier.
     * @param opts The file subject token supplier options to build the supplier
     *   with.
     */
    constructor(opts: FileSubjectTokenSupplierOptions);
    /**
     * Returns the subject token stored at the file specified in the constructor.
     * @param context {@link ExternalAccountSupplierContext} from the calling
     *   {@link IdentityPoolClient}, contains the requested audience and subject
     *   token type for the external account identity. Not used.
     */
    getSubjectToken(): Promise<string>;
}
