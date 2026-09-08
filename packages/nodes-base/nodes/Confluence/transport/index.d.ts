import type FormData from 'form-data';
import type { IDataObject, IExecuteFunctions, IHttpRequestMethods, ILoadOptionsFunctions } from 'n8n-workflow';
export declare const CONFLUENCE_CREDENTIAL_NAME = "confluenceCloudOAuth2Api";
export declare const SERVICE_ACCOUNT_CREDENTIAL_NAME = "atlassianServiceAccountApi";
/**
 * Resolves which credential the node is configured with. Dual-context like
 * `getSiteParameter`: dropdown searches run in a load-options context, where only
 * `getCurrentNodeParameter` sees the NDV's unsaved value. Anything other than the
 * literal 'serviceAccount' — including the parameter being absent on workflows
 * saved before the selector existed — maps to Cloud OAuth2.
 */
export declare function getConfluenceCredentialName(ctx: IExecuteFunctions | ILoadOptionsFunctions): string;
export declare function getConfluenceCloudId(this: IExecuteFunctions | ILoadOptionsFunctions): Promise<string>;
export declare function confluenceApiRequest(this: IExecuteFunctions | ILoadOptionsFunctions, method: IHttpRequestMethods, endpoint: string, body?: IDataObject | IDataObject[], qs?: IDataObject): Promise<IDataObject>;
/**
 * Fetches a binary resource (e.g. an attachment's server-relative `downloadLink`)
 * through the gateway and returns its raw bytes. Same base-URL concatenation rule
 * as `confluenceApiRequest`: the endpoint can never change the host.
 */
export declare function confluenceApiRequestBinary(this: IExecuteFunctions, endpoint: string): Promise<Buffer>;
/**
 * Uploads a multipart body (e.g. a file) through the gateway. PUT, not POST:
 * the same endpoint's POST is create-only and 400s on a filename that already
 * exists on the page, while PUT upserts (creates if new, new version if the
 * filename matches) so the delete+upload replace-a-file story becomes a single
 * call. No `json: true` and no explicit Content-Type: `form-data` sets its own
 * multipart boundary, and an explicit header would clobber it.
 */
export declare function confluenceApiRequestUpload(this: IExecuteFunctions, endpoint: string, formData: FormData): Promise<IDataObject>;
//# sourceMappingURL=index.d.ts.map