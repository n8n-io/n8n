import type { BodyPart, MultipartRequestBody, RawHttpHeadersInput } from "../interfaces.js";
/**
 * Describes a single part in a multipart body.
 */
export interface PartDescriptor {
    /**
     * Content type of this part. If set, this value will be used to set the Content-Type MIME header for this part, although explicitly
     * setting the Content-Type header in the headers bag will override this value. If set to `null`, no content type will be inferred from
     * the body field. Otherwise, the value of the Content-Type MIME header will be inferred based on the type of the body.
     */
    contentType?: string | null;
    /**
     * The disposition type of this part (for example, "form-data" for parts making up a multipart/form-data request). If set, this value
     * will be used to set the Content-Disposition MIME header for this part, in addition to the `name` and `filename` properties.
     * If the `name` or `filename` properties are set while `dispositionType` is left undefined, `dispositionType` will default to "form-data".
     *
     * Explicitly setting the Content-Disposition header in the headers bag will override this value.
     */
    dispositionType?: string;
    /**
     * The field name associated with this part. This value will be used to construct the Content-Disposition header,
     * along with the `dispositionType` and `filename` properties, if the header has not been set in the `headers` bag.
     */
    name?: string;
    /**
     * The file name of the content if it is a file. This value will be used to construct the Content-Disposition header,
     * along with the `dispositionType` and `name` properties, if the header has not been set in the `headers` bag.
     */
    filename?: string;
    /**
     * The multipart headers for this part of the multipart body. Values of the Content-Type and Content-Disposition headers set in the headers bag
     * will take precedence over those computed from the request body or the contentType, dispositionType, name, and filename fields on this object.
     */
    headers?: RawHttpHeadersInput;
    /**
     * The body of this part of the multipart request.
     */
    body?: unknown;
}
export declare function buildBodyPart(descriptor: PartDescriptor): BodyPart;
export declare function buildMultipartBody(parts: PartDescriptor[]): MultipartRequestBody;
//# sourceMappingURL=multipart.d.ts.map