import { loadRestXmlErrorCode, parseXmlBody as parseBody, parseXmlErrorBody as parseErrorBody } from "@aws-sdk/core";
import { XmlNode as __XmlNode, XmlText as __XmlText } from "@aws-sdk/xml-builder";
import { requestBuilder as rb } from "@smithy/core";
import { isValidHostname as __isValidHostname, } from "@smithy/protocol-http";
import { collectBody, dateToUtcString as __dateToUtcString, decorateServiceException as __decorateServiceException, expectNonNull as __expectNonNull, expectObject as __expectObject, expectString as __expectString, expectUnion as __expectUnion, getArrayIfSingleItem as __getArrayIfSingleItem, isSerializableHeaderValue, map, parseBoolean as __parseBoolean, parseRfc3339DateTimeWithOffset as __parseRfc3339DateTimeWithOffset, parseRfc7231DateTime as __parseRfc7231DateTime, quoteHeader as __quoteHeader, serializeDateTime as __serializeDateTime, strictParseInt32 as __strictParseInt32, strictParseLong as __strictParseLong, withBaseException, } from "@smithy/smithy-client";
import { AnalyticsFilter, BucketAlreadyExists, BucketAlreadyOwnedByYou, InvalidObjectState, MetricsFilter, NoSuchBucket, NoSuchKey, NoSuchUpload, NotFound, ObjectNotInActiveTierError, } from "../models/models_0";
import { EncryptionTypeMismatch, InvalidRequest, InvalidWriteOffset, ObjectAlreadyInActiveTierError, TooManyParts, } from "../models/models_1";
import { S3ServiceException as __BaseException } from "../models/S3ServiceException";
export const se_AbortMultipartUploadCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xarp]: input[_RP],
        [_xaebo]: input[_EBO],
        [_xaimit]: [() => isSerializableHeaderValue(input[_IMIT]), () => __dateToUtcString(input[_IMIT]).toString()],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_xi]: [, "AbortMultipartUpload"],
        [_uI]: [, __expectNonNull(input[_UI], `UploadId`)],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
export const se_CompleteMultipartUploadCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_xacc]: input[_CCRC],
        [_xacc_]: input[_CCRCC],
        [_xacc__]: input[_CCRCNVME],
        [_xacs]: input[_CSHA],
        [_xacs_]: input[_CSHAh],
        [_xact]: input[_CT],
        [_xamos]: [() => isSerializableHeaderValue(input[_MOS]), () => input[_MOS].toString()],
        [_xarp]: input[_RP],
        [_xaebo]: input[_EBO],
        [_im]: input[_IM],
        [_inm]: input[_INM],
        [_xasseca]: input[_SSECA],
        [_xasseck]: input[_SSECK],
        [_xasseckm]: input[_SSECKMD],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_uI]: [, __expectNonNull(input[_UI], `UploadId`)],
    });
    let body;
    let contents;
    if (input.MultipartUpload !== undefined) {
        contents = se_CompletedMultipartUpload(input.MultipartUpload, context);
        contents = contents.n("CompleteMultipartUpload");
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("POST").h(headers).q(query).b(body);
    return b.build();
};
export const se_CopyObjectCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        ...(input.Metadata !== undefined &&
            Object.keys(input.Metadata).reduce((acc, suffix) => {
                acc[`x-amz-meta-${suffix.toLowerCase()}`] = input.Metadata[suffix];
                return acc;
            }, {})),
        [_xaa]: input[_ACL],
        [_cc]: input[_CC],
        [_xaca]: input[_CA],
        [_cd]: input[_CD],
        [_ce]: input[_CE],
        [_cl]: input[_CL],
        [_ct]: input[_CTo],
        [_xacs__]: input[_CS],
        [_xacsim]: input[_CSIM],
        [_xacsims]: [() => isSerializableHeaderValue(input[_CSIMS]), () => __dateToUtcString(input[_CSIMS]).toString()],
        [_xacsinm]: input[_CSINM],
        [_xacsius]: [() => isSerializableHeaderValue(input[_CSIUS]), () => __dateToUtcString(input[_CSIUS]).toString()],
        [_e]: [() => isSerializableHeaderValue(input[_E]), () => __dateToUtcString(input[_E]).toString()],
        [_xagfc]: input[_GFC],
        [_xagr]: input[_GR],
        [_xagra]: input[_GRACP],
        [_xagwa]: input[_GWACP],
        [_xamd]: input[_MD],
        [_xatd]: input[_TD],
        [_xasse]: input[_SSE],
        [_xasc]: input[_SC],
        [_xawrl]: input[_WRL],
        [_xasseca]: input[_SSECA],
        [_xasseck]: input[_SSECK],
        [_xasseckm]: input[_SSECKMD],
        [_xasseakki]: input[_SSEKMSKI],
        [_xassec]: input[_SSEKMSEC],
        [_xassebke]: [() => isSerializableHeaderValue(input[_BKE]), () => input[_BKE].toString()],
        [_xacssseca]: input[_CSSSECA],
        [_xacssseck]: input[_CSSSECK],
        [_xacssseckm]: input[_CSSSECKMD],
        [_xarp]: input[_RP],
        [_xat]: input[_T],
        [_xaolm]: input[_OLM],
        [_xaolrud]: [() => isSerializableHeaderValue(input[_OLRUD]), () => __serializeDateTime(input[_OLRUD]).toString()],
        [_xaollh]: input[_OLLHS],
        [_xaebo]: input[_EBO],
        [_xasebo]: input[_ESBO],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_xi]: [, "CopyObject"],
    });
    let body;
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_CreateBucketCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_xaa]: input[_ACL],
        [_xagfc]: input[_GFC],
        [_xagr]: input[_GR],
        [_xagra]: input[_GRACP],
        [_xagw]: input[_GW],
        [_xagwa]: input[_GWACP],
        [_xabole]: [() => isSerializableHeaderValue(input[_OLEFB]), () => input[_OLEFB].toString()],
        [_xaoo]: input[_OO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    let body;
    let contents;
    if (input.CreateBucketConfiguration !== undefined) {
        contents = se_CreateBucketConfiguration(input.CreateBucketConfiguration, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_CreateBucketMetadataTableConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_cm]: input[_CMD],
        [_xasca]: input[_CA],
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_mT]: [, ""],
    });
    let body;
    let contents;
    if (input.MetadataTableConfiguration !== undefined) {
        contents = se_MetadataTableConfiguration(input.MetadataTableConfiguration, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("POST").h(headers).q(query).b(body);
    return b.build();
};
export const se_CreateMultipartUploadCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        ...(input.Metadata !== undefined &&
            Object.keys(input.Metadata).reduce((acc, suffix) => {
                acc[`x-amz-meta-${suffix.toLowerCase()}`] = input.Metadata[suffix];
                return acc;
            }, {})),
        [_xaa]: input[_ACL],
        [_cc]: input[_CC],
        [_cd]: input[_CD],
        [_ce]: input[_CE],
        [_cl]: input[_CL],
        [_ct]: input[_CTo],
        [_e]: [() => isSerializableHeaderValue(input[_E]), () => __dateToUtcString(input[_E]).toString()],
        [_xagfc]: input[_GFC],
        [_xagr]: input[_GR],
        [_xagra]: input[_GRACP],
        [_xagwa]: input[_GWACP],
        [_xasse]: input[_SSE],
        [_xasc]: input[_SC],
        [_xawrl]: input[_WRL],
        [_xasseca]: input[_SSECA],
        [_xasseck]: input[_SSECK],
        [_xasseckm]: input[_SSECKMD],
        [_xasseakki]: input[_SSEKMSKI],
        [_xassec]: input[_SSEKMSEC],
        [_xassebke]: [() => isSerializableHeaderValue(input[_BKE]), () => input[_BKE].toString()],
        [_xarp]: input[_RP],
        [_xat]: input[_T],
        [_xaolm]: input[_OLM],
        [_xaolrud]: [() => isSerializableHeaderValue(input[_OLRUD]), () => __serializeDateTime(input[_OLRUD]).toString()],
        [_xaollh]: input[_OLLHS],
        [_xaebo]: input[_EBO],
        [_xaca]: input[_CA],
        [_xact]: input[_CT],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_u]: [, ""],
    });
    let body;
    b.m("POST").h(headers).q(query).b(body);
    return b.build();
};
export const se_CreateSessionCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xacsm]: input[_SM],
        [_xasse]: input[_SSE],
        [_xasseakki]: input[_SSEKMSKI],
        [_xassec]: input[_SSEKMSEC],
        [_xassebke]: [() => isSerializableHeaderValue(input[_BKE]), () => input[_BKE].toString()],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_s]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_DeleteBucketCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
export const se_DeleteBucketAnalyticsConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_a]: [, ""],
        [_i]: [, __expectNonNull(input[_I], `Id`)],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
export const se_DeleteBucketCorsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_c]: [, ""],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
export const se_DeleteBucketEncryptionCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_en]: [, ""],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
export const se_DeleteBucketIntelligentTieringConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_it]: [, ""],
        [_i]: [, __expectNonNull(input[_I], `Id`)],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
export const se_DeleteBucketInventoryConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_in]: [, ""],
        [_i]: [, __expectNonNull(input[_I], `Id`)],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
export const se_DeleteBucketLifecycleCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_l]: [, ""],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
export const se_DeleteBucketMetadataTableConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_mT]: [, ""],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
export const se_DeleteBucketMetricsConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_m]: [, ""],
        [_i]: [, __expectNonNull(input[_I], `Id`)],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
export const se_DeleteBucketOwnershipControlsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_oC]: [, ""],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
export const se_DeleteBucketPolicyCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_p]: [, ""],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
export const se_DeleteBucketReplicationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_r]: [, ""],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
export const se_DeleteBucketTaggingCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_t]: [, ""],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
export const se_DeleteBucketWebsiteCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_w]: [, ""],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
export const se_DeleteObjectCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xam]: input[_MFA],
        [_xarp]: input[_RP],
        [_xabgr]: [() => isSerializableHeaderValue(input[_BGR]), () => input[_BGR].toString()],
        [_xaebo]: input[_EBO],
        [_im]: input[_IM],
        [_xaimlmt]: [() => isSerializableHeaderValue(input[_IMLMT]), () => __dateToUtcString(input[_IMLMT]).toString()],
        [_xaims]: [() => isSerializableHeaderValue(input[_IMS]), () => input[_IMS].toString()],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_xi]: [, "DeleteObject"],
        [_vI]: [, input[_VI]],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
export const se_DeleteObjectsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_xam]: input[_MFA],
        [_xarp]: input[_RP],
        [_xabgr]: [() => isSerializableHeaderValue(input[_BGR]), () => input[_BGR].toString()],
        [_xaebo]: input[_EBO],
        [_xasca]: input[_CA],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_d]: [, ""],
    });
    let body;
    let contents;
    if (input.Delete !== undefined) {
        contents = se_Delete(input.Delete, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("POST").h(headers).q(query).b(body);
    return b.build();
};
export const se_DeleteObjectTaggingCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_t]: [, ""],
        [_vI]: [, input[_VI]],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
export const se_DeletePublicAccessBlockCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_pAB]: [, ""],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketAccelerateConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
        [_xarp]: input[_RP],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_ac]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketAclCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_acl]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketAnalyticsConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_a]: [, ""],
        [_xi]: [, "GetBucketAnalyticsConfiguration"],
        [_i]: [, __expectNonNull(input[_I], `Id`)],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketCorsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_c]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketEncryptionCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_en]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketIntelligentTieringConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_it]: [, ""],
        [_xi]: [, "GetBucketIntelligentTieringConfiguration"],
        [_i]: [, __expectNonNull(input[_I], `Id`)],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketInventoryConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_in]: [, ""],
        [_xi]: [, "GetBucketInventoryConfiguration"],
        [_i]: [, __expectNonNull(input[_I], `Id`)],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketLifecycleConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_l]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketLocationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_lo]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketLoggingCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_log]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketMetadataTableConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_mT]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketMetricsConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_m]: [, ""],
        [_xi]: [, "GetBucketMetricsConfiguration"],
        [_i]: [, __expectNonNull(input[_I], `Id`)],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketNotificationConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_n]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketOwnershipControlsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_oC]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketPolicyCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_p]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketPolicyStatusCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_pS]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketReplicationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_r]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketRequestPaymentCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_rP]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketTaggingCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_t]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketVersioningCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_v]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetBucketWebsiteCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_w]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetObjectCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_im]: input[_IM],
        [_ims]: [() => isSerializableHeaderValue(input[_IMSf]), () => __dateToUtcString(input[_IMSf]).toString()],
        [_inm]: input[_INM],
        [_ius]: [() => isSerializableHeaderValue(input[_IUS]), () => __dateToUtcString(input[_IUS]).toString()],
        [_ra]: input[_R],
        [_xasseca]: input[_SSECA],
        [_xasseck]: input[_SSECK],
        [_xasseckm]: input[_SSECKMD],
        [_xarp]: input[_RP],
        [_xaebo]: input[_EBO],
        [_xacm]: input[_CM],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_xi]: [, "GetObject"],
        [_rcc]: [, input[_RCC]],
        [_rcd]: [, input[_RCD]],
        [_rce]: [, input[_RCE]],
        [_rcl]: [, input[_RCL]],
        [_rct]: [, input[_RCT]],
        [_re]: [() => input.ResponseExpires !== void 0, () => __dateToUtcString(input[_RE]).toString()],
        [_vI]: [, input[_VI]],
        [_pN]: [() => input.PartNumber !== void 0, () => input[_PN].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetObjectAclCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xarp]: input[_RP],
        [_xaebo]: input[_EBO],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_acl]: [, ""],
        [_vI]: [, input[_VI]],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetObjectAttributesCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xamp]: [() => isSerializableHeaderValue(input[_MP]), () => input[_MP].toString()],
        [_xapnm]: input[_PNM],
        [_xasseca]: input[_SSECA],
        [_xasseck]: input[_SSECK],
        [_xasseckm]: input[_SSECKMD],
        [_xarp]: input[_RP],
        [_xaebo]: input[_EBO],
        [_xaoa]: [() => isSerializableHeaderValue(input[_OA]), () => (input[_OA] || []).map(__quoteHeader).join(", ")],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_at]: [, ""],
        [_vI]: [, input[_VI]],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetObjectLegalHoldCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xarp]: input[_RP],
        [_xaebo]: input[_EBO],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_lh]: [, ""],
        [_vI]: [, input[_VI]],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetObjectLockConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_ol]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetObjectRetentionCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xarp]: input[_RP],
        [_xaebo]: input[_EBO],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_ret]: [, ""],
        [_vI]: [, input[_VI]],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetObjectTaggingCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
        [_xarp]: input[_RP],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_t]: [, ""],
        [_vI]: [, input[_VI]],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetObjectTorrentCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xarp]: input[_RP],
        [_xaebo]: input[_EBO],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_to]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetPublicAccessBlockCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_pAB]: [, ""],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_HeadBucketCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    let body;
    b.m("HEAD").h(headers).b(body);
    return b.build();
};
export const se_HeadObjectCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_im]: input[_IM],
        [_ims]: [() => isSerializableHeaderValue(input[_IMSf]), () => __dateToUtcString(input[_IMSf]).toString()],
        [_inm]: input[_INM],
        [_ius]: [() => isSerializableHeaderValue(input[_IUS]), () => __dateToUtcString(input[_IUS]).toString()],
        [_ra]: input[_R],
        [_xasseca]: input[_SSECA],
        [_xasseck]: input[_SSECK],
        [_xasseckm]: input[_SSECKMD],
        [_xarp]: input[_RP],
        [_xaebo]: input[_EBO],
        [_xacm]: input[_CM],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_rcc]: [, input[_RCC]],
        [_rcd]: [, input[_RCD]],
        [_rce]: [, input[_RCE]],
        [_rcl]: [, input[_RCL]],
        [_rct]: [, input[_RCT]],
        [_re]: [() => input.ResponseExpires !== void 0, () => __dateToUtcString(input[_RE]).toString()],
        [_vI]: [, input[_VI]],
        [_pN]: [() => input.PartNumber !== void 0, () => input[_PN].toString()],
    });
    let body;
    b.m("HEAD").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListBucketAnalyticsConfigurationsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_a]: [, ""],
        [_xi]: [, "ListBucketAnalyticsConfigurations"],
        [_ct_]: [, input[_CTon]],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListBucketIntelligentTieringConfigurationsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_it]: [, ""],
        [_xi]: [, "ListBucketIntelligentTieringConfigurations"],
        [_ct_]: [, input[_CTon]],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListBucketInventoryConfigurationsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_in]: [, ""],
        [_xi]: [, "ListBucketInventoryConfigurations"],
        [_ct_]: [, input[_CTon]],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListBucketMetricsConfigurationsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_m]: [, ""],
        [_xi]: [, "ListBucketMetricsConfigurations"],
        [_ct_]: [, input[_CTon]],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListBucketsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/");
    const query = map({
        [_xi]: [, "ListBuckets"],
        [_mb]: [() => input.MaxBuckets !== void 0, () => input[_MB].toString()],
        [_ct_]: [, input[_CTon]],
        [_pr]: [, input[_P]],
        [_br]: [, input[_BR]],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListDirectoryBucketsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/");
    const query = map({
        [_xi]: [, "ListDirectoryBuckets"],
        [_ct_]: [, input[_CTon]],
        [_mdb]: [() => input.MaxDirectoryBuckets !== void 0, () => input[_MDB].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListMultipartUploadsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
        [_xarp]: input[_RP],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_u]: [, ""],
        [_de]: [, input[_D]],
        [_et]: [, input[_ET]],
        [_km]: [, input[_KM]],
        [_mu]: [() => input.MaxUploads !== void 0, () => input[_MU].toString()],
        [_pr]: [, input[_P]],
        [_uim]: [, input[_UIM]],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListObjectsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xarp]: input[_RP],
        [_xaebo]: input[_EBO],
        [_xaooa]: [() => isSerializableHeaderValue(input[_OOA]), () => (input[_OOA] || []).map(__quoteHeader).join(", ")],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_de]: [, input[_D]],
        [_et]: [, input[_ET]],
        [_ma]: [, input[_M]],
        [_mk]: [() => input.MaxKeys !== void 0, () => input[_MK].toString()],
        [_pr]: [, input[_P]],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListObjectsV2Command = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xarp]: input[_RP],
        [_xaebo]: input[_EBO],
        [_xaooa]: [() => isSerializableHeaderValue(input[_OOA]), () => (input[_OOA] || []).map(__quoteHeader).join(", ")],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_lt]: [, "2"],
        [_de]: [, input[_D]],
        [_et]: [, input[_ET]],
        [_mk]: [() => input.MaxKeys !== void 0, () => input[_MK].toString()],
        [_pr]: [, input[_P]],
        [_ct_]: [, input[_CTon]],
        [_fo]: [() => input.FetchOwner !== void 0, () => input[_FO].toString()],
        [_sa]: [, input[_SA]],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListObjectVersionsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xaebo]: input[_EBO],
        [_xarp]: input[_RP],
        [_xaooa]: [() => isSerializableHeaderValue(input[_OOA]), () => (input[_OOA] || []).map(__quoteHeader).join(", ")],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_ver]: [, ""],
        [_de]: [, input[_D]],
        [_et]: [, input[_ET]],
        [_km]: [, input[_KM]],
        [_mk]: [() => input.MaxKeys !== void 0, () => input[_MK].toString()],
        [_pr]: [, input[_P]],
        [_vim]: [, input[_VIM]],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListPartsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xarp]: input[_RP],
        [_xaebo]: input[_EBO],
        [_xasseca]: input[_SSECA],
        [_xasseck]: input[_SSECK],
        [_xasseckm]: input[_SSECKMD],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_xi]: [, "ListParts"],
        [_mp]: [() => input.MaxParts !== void 0, () => input[_MP].toString()],
        [_pnm]: [, input[_PNM]],
        [_uI]: [, __expectNonNull(input[_UI], `UploadId`)],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutBucketAccelerateConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_xaebo]: input[_EBO],
        [_xasca]: input[_CA],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_ac]: [, ""],
    });
    let body;
    let contents;
    if (input.AccelerateConfiguration !== undefined) {
        contents = se_AccelerateConfiguration(input.AccelerateConfiguration, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutBucketAclCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_xaa]: input[_ACL],
        [_cm]: input[_CMD],
        [_xasca]: input[_CA],
        [_xagfc]: input[_GFC],
        [_xagr]: input[_GR],
        [_xagra]: input[_GRACP],
        [_xagw]: input[_GW],
        [_xagwa]: input[_GWACP],
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_acl]: [, ""],
    });
    let body;
    let contents;
    if (input.AccessControlPolicy !== undefined) {
        contents = se_AccessControlPolicy(input.AccessControlPolicy, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutBucketAnalyticsConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_a]: [, ""],
        [_i]: [, __expectNonNull(input[_I], `Id`)],
    });
    let body;
    let contents;
    if (input.AnalyticsConfiguration !== undefined) {
        contents = se_AnalyticsConfiguration(input.AnalyticsConfiguration, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutBucketCorsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_cm]: input[_CMD],
        [_xasca]: input[_CA],
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_c]: [, ""],
    });
    let body;
    let contents;
    if (input.CORSConfiguration !== undefined) {
        contents = se_CORSConfiguration(input.CORSConfiguration, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutBucketEncryptionCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_cm]: input[_CMD],
        [_xasca]: input[_CA],
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_en]: [, ""],
    });
    let body;
    let contents;
    if (input.ServerSideEncryptionConfiguration !== undefined) {
        contents = se_ServerSideEncryptionConfiguration(input.ServerSideEncryptionConfiguration, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutBucketIntelligentTieringConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/xml",
    };
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_it]: [, ""],
        [_i]: [, __expectNonNull(input[_I], `Id`)],
    });
    let body;
    let contents;
    if (input.IntelligentTieringConfiguration !== undefined) {
        contents = se_IntelligentTieringConfiguration(input.IntelligentTieringConfiguration, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutBucketInventoryConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_in]: [, ""],
        [_i]: [, __expectNonNull(input[_I], `Id`)],
    });
    let body;
    let contents;
    if (input.InventoryConfiguration !== undefined) {
        contents = se_InventoryConfiguration(input.InventoryConfiguration, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutBucketLifecycleConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_xasca]: input[_CA],
        [_xaebo]: input[_EBO],
        [_xatdmos]: input[_TDMOS],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_l]: [, ""],
    });
    let body;
    let contents;
    if (input.LifecycleConfiguration !== undefined) {
        contents = se_BucketLifecycleConfiguration(input.LifecycleConfiguration, context);
        contents = contents.n("LifecycleConfiguration");
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutBucketLoggingCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_cm]: input[_CMD],
        [_xasca]: input[_CA],
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_log]: [, ""],
    });
    let body;
    let contents;
    if (input.BucketLoggingStatus !== undefined) {
        contents = se_BucketLoggingStatus(input.BucketLoggingStatus, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutBucketMetricsConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_m]: [, ""],
        [_i]: [, __expectNonNull(input[_I], `Id`)],
    });
    let body;
    let contents;
    if (input.MetricsConfiguration !== undefined) {
        contents = se_MetricsConfiguration(input.MetricsConfiguration, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutBucketNotificationConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_xaebo]: input[_EBO],
        [_xasdv]: [() => isSerializableHeaderValue(input[_SDV]), () => input[_SDV].toString()],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_n]: [, ""],
    });
    let body;
    let contents;
    if (input.NotificationConfiguration !== undefined) {
        contents = se_NotificationConfiguration(input.NotificationConfiguration, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutBucketOwnershipControlsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_cm]: input[_CMD],
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_oC]: [, ""],
    });
    let body;
    let contents;
    if (input.OwnershipControls !== undefined) {
        contents = se_OwnershipControls(input.OwnershipControls, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutBucketPolicyCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "text/plain",
        [_cm]: input[_CMD],
        [_xasca]: input[_CA],
        [_xacrsba]: [() => isSerializableHeaderValue(input[_CRSBA]), () => input[_CRSBA].toString()],
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_p]: [, ""],
    });
    let body;
    let contents;
    if (input.Policy !== undefined) {
        contents = input.Policy;
        body = contents;
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutBucketReplicationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_cm]: input[_CMD],
        [_xasca]: input[_CA],
        [_xabolt]: input[_To],
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_r]: [, ""],
    });
    let body;
    let contents;
    if (input.ReplicationConfiguration !== undefined) {
        contents = se_ReplicationConfiguration(input.ReplicationConfiguration, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutBucketRequestPaymentCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_cm]: input[_CMD],
        [_xasca]: input[_CA],
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_rP]: [, ""],
    });
    let body;
    let contents;
    if (input.RequestPaymentConfiguration !== undefined) {
        contents = se_RequestPaymentConfiguration(input.RequestPaymentConfiguration, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutBucketTaggingCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_cm]: input[_CMD],
        [_xasca]: input[_CA],
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_t]: [, ""],
    });
    let body;
    let contents;
    if (input.Tagging !== undefined) {
        contents = se_Tagging(input.Tagging, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutBucketVersioningCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_cm]: input[_CMD],
        [_xasca]: input[_CA],
        [_xam]: input[_MFA],
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_v]: [, ""],
    });
    let body;
    let contents;
    if (input.VersioningConfiguration !== undefined) {
        contents = se_VersioningConfiguration(input.VersioningConfiguration, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutBucketWebsiteCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_cm]: input[_CMD],
        [_xasca]: input[_CA],
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_w]: [, ""],
    });
    let body;
    let contents;
    if (input.WebsiteConfiguration !== undefined) {
        contents = se_WebsiteConfiguration(input.WebsiteConfiguration, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutObjectCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        ...(input.Metadata !== undefined &&
            Object.keys(input.Metadata).reduce((acc, suffix) => {
                acc[`x-amz-meta-${suffix.toLowerCase()}`] = input.Metadata[suffix];
                return acc;
            }, {})),
        [_ct]: input[_CTo] || "application/octet-stream",
        [_xaa]: input[_ACL],
        [_cc]: input[_CC],
        [_cd]: input[_CD],
        [_ce]: input[_CE],
        [_cl]: input[_CL],
        [_cl_]: [() => isSerializableHeaderValue(input[_CLo]), () => input[_CLo].toString()],
        [_cm]: input[_CMD],
        [_xasca]: input[_CA],
        [_xacc]: input[_CCRC],
        [_xacc_]: input[_CCRCC],
        [_xacc__]: input[_CCRCNVME],
        [_xacs]: input[_CSHA],
        [_xacs_]: input[_CSHAh],
        [_e]: [() => isSerializableHeaderValue(input[_E]), () => __dateToUtcString(input[_E]).toString()],
        [_im]: input[_IM],
        [_inm]: input[_INM],
        [_xagfc]: input[_GFC],
        [_xagr]: input[_GR],
        [_xagra]: input[_GRACP],
        [_xagwa]: input[_GWACP],
        [_xawob]: [() => isSerializableHeaderValue(input[_WOB]), () => input[_WOB].toString()],
        [_xasse]: input[_SSE],
        [_xasc]: input[_SC],
        [_xawrl]: input[_WRL],
        [_xasseca]: input[_SSECA],
        [_xasseck]: input[_SSECK],
        [_xasseckm]: input[_SSECKMD],
        [_xasseakki]: input[_SSEKMSKI],
        [_xassec]: input[_SSEKMSEC],
        [_xassebke]: [() => isSerializableHeaderValue(input[_BKE]), () => input[_BKE].toString()],
        [_xarp]: input[_RP],
        [_xat]: input[_T],
        [_xaolm]: input[_OLM],
        [_xaolrud]: [() => isSerializableHeaderValue(input[_OLRUD]), () => __serializeDateTime(input[_OLRUD]).toString()],
        [_xaollh]: input[_OLLHS],
        [_xaebo]: input[_EBO],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_xi]: [, "PutObject"],
    });
    let body;
    let contents;
    if (input.Body !== undefined) {
        contents = input.Body;
        body = contents;
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutObjectAclCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_xaa]: input[_ACL],
        [_cm]: input[_CMD],
        [_xasca]: input[_CA],
        [_xagfc]: input[_GFC],
        [_xagr]: input[_GR],
        [_xagra]: input[_GRACP],
        [_xagw]: input[_GW],
        [_xagwa]: input[_GWACP],
        [_xarp]: input[_RP],
        [_xaebo]: input[_EBO],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_acl]: [, ""],
        [_vI]: [, input[_VI]],
    });
    let body;
    let contents;
    if (input.AccessControlPolicy !== undefined) {
        contents = se_AccessControlPolicy(input.AccessControlPolicy, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutObjectLegalHoldCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_xarp]: input[_RP],
        [_cm]: input[_CMD],
        [_xasca]: input[_CA],
        [_xaebo]: input[_EBO],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_lh]: [, ""],
        [_vI]: [, input[_VI]],
    });
    let body;
    let contents;
    if (input.LegalHold !== undefined) {
        contents = se_ObjectLockLegalHold(input.LegalHold, context);
        contents = contents.n("LegalHold");
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutObjectLockConfigurationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_xarp]: input[_RP],
        [_xabolt]: input[_To],
        [_cm]: input[_CMD],
        [_xasca]: input[_CA],
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_ol]: [, ""],
    });
    let body;
    let contents;
    if (input.ObjectLockConfiguration !== undefined) {
        contents = se_ObjectLockConfiguration(input.ObjectLockConfiguration, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutObjectRetentionCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_xarp]: input[_RP],
        [_xabgr]: [() => isSerializableHeaderValue(input[_BGR]), () => input[_BGR].toString()],
        [_cm]: input[_CMD],
        [_xasca]: input[_CA],
        [_xaebo]: input[_EBO],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_ret]: [, ""],
        [_vI]: [, input[_VI]],
    });
    let body;
    let contents;
    if (input.Retention !== undefined) {
        contents = se_ObjectLockRetention(input.Retention, context);
        contents = contents.n("Retention");
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutObjectTaggingCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_cm]: input[_CMD],
        [_xasca]: input[_CA],
        [_xaebo]: input[_EBO],
        [_xarp]: input[_RP],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_t]: [, ""],
        [_vI]: [, input[_VI]],
    });
    let body;
    let contents;
    if (input.Tagging !== undefined) {
        contents = se_Tagging(input.Tagging, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_PutPublicAccessBlockCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_cm]: input[_CMD],
        [_xasca]: input[_CA],
        [_xaebo]: input[_EBO],
    });
    b.bp("/");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    const query = map({
        [_pAB]: [, ""],
    });
    let body;
    let contents;
    if (input.PublicAccessBlockConfiguration !== undefined) {
        contents = se_PublicAccessBlockConfiguration(input.PublicAccessBlockConfiguration, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_RestoreObjectCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_xarp]: input[_RP],
        [_xasca]: input[_CA],
        [_xaebo]: input[_EBO],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_res]: [, ""],
        [_vI]: [, input[_VI]],
    });
    let body;
    let contents;
    if (input.RestoreRequest !== undefined) {
        contents = se_RestoreRequest(input.RestoreRequest, context);
        body = _ve;
        contents.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
        body += contents.toString();
    }
    b.m("POST").h(headers).q(query).b(body);
    return b.build();
};
export const se_SelectObjectContentCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/xml",
        [_xasseca]: input[_SSECA],
        [_xasseck]: input[_SSECK],
        [_xasseckm]: input[_SSECKMD],
        [_xaebo]: input[_EBO],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_se]: [, ""],
        [_st]: [, "2"],
    });
    let body;
    body = _ve;
    const bn = new __XmlNode(_SOCR);
    bn.a("xmlns", "http://s3.amazonaws.com/doc/2006-03-01/");
    bn.cc(input, _Ex);
    bn.cc(input, _ETx);
    if (input[_IS] != null) {
        bn.c(se_InputSerialization(input[_IS], context).n(_IS));
    }
    if (input[_OS] != null) {
        bn.c(se_OutputSerialization(input[_OS], context).n(_OS));
    }
    if (input[_RPe] != null) {
        bn.c(se_RequestProgress(input[_RPe], context).n(_RPe));
    }
    if (input[_SR] != null) {
        bn.c(se_ScanRange(input[_SR], context).n(_SR));
    }
    body += bn.toString();
    b.m("POST").h(headers).q(query).b(body);
    return b.build();
};
export const se_UploadPartCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/octet-stream",
        [_cl_]: [() => isSerializableHeaderValue(input[_CLo]), () => input[_CLo].toString()],
        [_cm]: input[_CMD],
        [_xasca]: input[_CA],
        [_xacc]: input[_CCRC],
        [_xacc_]: input[_CCRCC],
        [_xacc__]: input[_CCRCNVME],
        [_xacs]: input[_CSHA],
        [_xacs_]: input[_CSHAh],
        [_xasseca]: input[_SSECA],
        [_xasseck]: input[_SSECK],
        [_xasseckm]: input[_SSECKMD],
        [_xarp]: input[_RP],
        [_xaebo]: input[_EBO],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_xi]: [, "UploadPart"],
        [_pN]: [__expectNonNull(input.PartNumber, `PartNumber`) != null, () => input[_PN].toString()],
        [_uI]: [, __expectNonNull(input[_UI], `UploadId`)],
    });
    let body;
    let contents;
    if (input.Body !== undefined) {
        contents = input.Body;
        body = contents;
    }
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_UploadPartCopyCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        [_xacs__]: input[_CS],
        [_xacsim]: input[_CSIM],
        [_xacsims]: [() => isSerializableHeaderValue(input[_CSIMS]), () => __dateToUtcString(input[_CSIMS]).toString()],
        [_xacsinm]: input[_CSINM],
        [_xacsius]: [() => isSerializableHeaderValue(input[_CSIUS]), () => __dateToUtcString(input[_CSIUS]).toString()],
        [_xacsr]: input[_CSR],
        [_xasseca]: input[_SSECA],
        [_xasseck]: input[_SSECK],
        [_xasseckm]: input[_SSECKMD],
        [_xacssseca]: input[_CSSSECA],
        [_xacssseck]: input[_CSSSECK],
        [_xacssseckm]: input[_CSSSECKMD],
        [_xarp]: input[_RP],
        [_xaebo]: input[_EBO],
        [_xasebo]: input[_ESBO],
    });
    b.bp("/{Key+}");
    b.p("Bucket", () => input.Bucket, "{Bucket}", false);
    b.p("Key", () => input.Key, "{Key+}", true);
    const query = map({
        [_xi]: [, "UploadPartCopy"],
        [_pN]: [__expectNonNull(input.PartNumber, `PartNumber`) != null, () => input[_PN].toString()],
        [_uI]: [, __expectNonNull(input[_UI], `UploadId`)],
    });
    let body;
    b.m("PUT").h(headers).q(query).b(body);
    return b.build();
};
export const se_WriteGetObjectResponseCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
        ...(input.Metadata !== undefined &&
            Object.keys(input.Metadata).reduce((acc, suffix) => {
                acc[`x-amz-meta-${suffix.toLowerCase()}`] = input.Metadata[suffix];
                return acc;
            }, {})),
        "content-type": "application/octet-stream",
        [_xarr]: input[_RR],
        [_xart]: input[_RT],
        [_xafs]: [() => isSerializableHeaderValue(input[_SCt]), () => input[_SCt].toString()],
        [_xafec]: input[_EC],
        [_xafem]: input[_EM],
        [_xafhar]: input[_AR],
        [_xafhcc]: input[_CC],
        [_xafhcd]: input[_CD],
        [_xafhce]: input[_CE],
        [_xafhcl]: input[_CL],
        [_cl_]: [() => isSerializableHeaderValue(input[_CLo]), () => input[_CLo].toString()],
        [_xafhcr]: input[_CR],
        [_xafhct]: input[_CTo],
        [_xafhxacc]: input[_CCRC],
        [_xafhxacc_]: input[_CCRCC],
        [_xafhxacc__]: input[_CCRCNVME],
        [_xafhxacs]: input[_CSHA],
        [_xafhxacs_]: input[_CSHAh],
        [_xafhxadm]: [() => isSerializableHeaderValue(input[_DM]), () => input[_DM].toString()],
        [_xafhe]: input[_ETa],
        [_xafhe_]: [() => isSerializableHeaderValue(input[_E]), () => __dateToUtcString(input[_E]).toString()],
        [_xafhxae]: input[_Exp],
        [_xafhlm]: [() => isSerializableHeaderValue(input[_LM]), () => __dateToUtcString(input[_LM]).toString()],
        [_xafhxamm]: [() => isSerializableHeaderValue(input[_MM]), () => input[_MM].toString()],
        [_xafhxaolm]: input[_OLM],
        [_xafhxaollh]: input[_OLLHS],
        [_xafhxaolrud]: [
            () => isSerializableHeaderValue(input[_OLRUD]),
            () => __serializeDateTime(input[_OLRUD]).toString(),
        ],
        [_xafhxampc]: [() => isSerializableHeaderValue(input[_PC]), () => input[_PC].toString()],
        [_xafhxars]: input[_RS],
        [_xafhxarc]: input[_RC],
        [_xafhxar]: input[_Re],
        [_xafhxasse]: input[_SSE],
        [_xafhxasseca]: input[_SSECA],
        [_xafhxasseakki]: input[_SSEKMSKI],
        [_xafhxasseckm]: input[_SSECKMD],
        [_xafhxasc]: input[_SC],
        [_xafhxatc]: [() => isSerializableHeaderValue(input[_TC]), () => input[_TC].toString()],
        [_xafhxavi]: input[_VI],
        [_xafhxassebke]: [() => isSerializableHeaderValue(input[_BKE]), () => input[_BKE].toString()],
    });
    b.bp("/WriteGetObjectResponse");
    let body;
    let contents;
    if (input.Body !== undefined) {
        contents = input.Body;
        body = contents;
    }
    let { hostname: resolvedHostname } = await context.endpoint();
    if (context.disableHostPrefix !== true) {
        resolvedHostname = "{RequestRoute}." + resolvedHostname;
        if (input.RequestRoute === undefined) {
            throw new Error("Empty value provided for input host prefix: RequestRoute.");
        }
        resolvedHostname = resolvedHostname.replace("{RequestRoute}", input.RequestRoute);
        if (!__isValidHostname(resolvedHostname)) {
            throw new Error("ValidationError: prefixed hostname must be hostname compatible.");
        }
    }
    b.hn(resolvedHostname);
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const de_AbortMultipartUploadCommand = async (output, context) => {
    if (output.statusCode !== 204 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_RC]: [, output.headers[_xarc]],
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_CompleteMultipartUploadCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_Exp]: [, output.headers[_xae]],
        [_SSE]: [, output.headers[_xasse]],
        [_VI]: [, output.headers[_xavi]],
        [_SSEKMSKI]: [, output.headers[_xasseakki]],
        [_BKE]: [() => void 0 !== output.headers[_xassebke], () => __parseBoolean(output.headers[_xassebke])],
        [_RC]: [, output.headers[_xarc]],
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data[_B] != null) {
        contents[_B] = __expectString(data[_B]);
    }
    if (data[_CCRC] != null) {
        contents[_CCRC] = __expectString(data[_CCRC]);
    }
    if (data[_CCRCC] != null) {
        contents[_CCRCC] = __expectString(data[_CCRCC]);
    }
    if (data[_CCRCNVME] != null) {
        contents[_CCRCNVME] = __expectString(data[_CCRCNVME]);
    }
    if (data[_CSHA] != null) {
        contents[_CSHA] = __expectString(data[_CSHA]);
    }
    if (data[_CSHAh] != null) {
        contents[_CSHAh] = __expectString(data[_CSHAh]);
    }
    if (data[_CT] != null) {
        contents[_CT] = __expectString(data[_CT]);
    }
    if (data[_ETa] != null) {
        contents[_ETa] = __expectString(data[_ETa]);
    }
    if (data[_K] != null) {
        contents[_K] = __expectString(data[_K]);
    }
    if (data[_L] != null) {
        contents[_L] = __expectString(data[_L]);
    }
    return contents;
};
export const de_CopyObjectCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_Exp]: [, output.headers[_xae]],
        [_CSVI]: [, output.headers[_xacsvi]],
        [_VI]: [, output.headers[_xavi]],
        [_SSE]: [, output.headers[_xasse]],
        [_SSECA]: [, output.headers[_xasseca]],
        [_SSECKMD]: [, output.headers[_xasseckm]],
        [_SSEKMSKI]: [, output.headers[_xasseakki]],
        [_SSEKMSEC]: [, output.headers[_xassec]],
        [_BKE]: [() => void 0 !== output.headers[_xassebke], () => __parseBoolean(output.headers[_xassebke])],
        [_RC]: [, output.headers[_xarc]],
    });
    const data = __expectObject(await parseBody(output.body, context));
    contents.CopyObjectResult = de_CopyObjectResult(data, context);
    return contents;
};
export const de_CreateBucketCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_L]: [, output.headers[_lo]],
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_CreateBucketMetadataTableConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_CreateMultipartUploadCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_AD]: [
            () => void 0 !== output.headers[_xaad],
            () => __expectNonNull(__parseRfc7231DateTime(output.headers[_xaad])),
        ],
        [_ARI]: [, output.headers[_xaari]],
        [_SSE]: [, output.headers[_xasse]],
        [_SSECA]: [, output.headers[_xasseca]],
        [_SSECKMD]: [, output.headers[_xasseckm]],
        [_SSEKMSKI]: [, output.headers[_xasseakki]],
        [_SSEKMSEC]: [, output.headers[_xassec]],
        [_BKE]: [() => void 0 !== output.headers[_xassebke], () => __parseBoolean(output.headers[_xassebke])],
        [_RC]: [, output.headers[_xarc]],
        [_CA]: [, output.headers[_xaca]],
        [_CT]: [, output.headers[_xact]],
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data[_B] != null) {
        contents[_B] = __expectString(data[_B]);
    }
    if (data[_K] != null) {
        contents[_K] = __expectString(data[_K]);
    }
    if (data[_UI] != null) {
        contents[_UI] = __expectString(data[_UI]);
    }
    return contents;
};
export const de_CreateSessionCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_SSE]: [, output.headers[_xasse]],
        [_SSEKMSKI]: [, output.headers[_xasseakki]],
        [_SSEKMSEC]: [, output.headers[_xassec]],
        [_BKE]: [() => void 0 !== output.headers[_xassebke], () => __parseBoolean(output.headers[_xassebke])],
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data[_C] != null) {
        contents[_C] = de_SessionCredentials(data[_C], context);
    }
    return contents;
};
export const de_DeleteBucketCommand = async (output, context) => {
    if (output.statusCode !== 204 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteBucketAnalyticsConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 204 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteBucketCorsCommand = async (output, context) => {
    if (output.statusCode !== 204 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteBucketEncryptionCommand = async (output, context) => {
    if (output.statusCode !== 204 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteBucketIntelligentTieringConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 204 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteBucketInventoryConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 204 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteBucketLifecycleCommand = async (output, context) => {
    if (output.statusCode !== 204 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteBucketMetadataTableConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 204 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteBucketMetricsConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 204 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteBucketOwnershipControlsCommand = async (output, context) => {
    if (output.statusCode !== 204 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteBucketPolicyCommand = async (output, context) => {
    if (output.statusCode !== 204 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteBucketReplicationCommand = async (output, context) => {
    if (output.statusCode !== 204 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteBucketTaggingCommand = async (output, context) => {
    if (output.statusCode !== 204 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteBucketWebsiteCommand = async (output, context) => {
    if (output.statusCode !== 204 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteObjectCommand = async (output, context) => {
    if (output.statusCode !== 204 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_DM]: [() => void 0 !== output.headers[_xadm], () => __parseBoolean(output.headers[_xadm])],
        [_VI]: [, output.headers[_xavi]],
        [_RC]: [, output.headers[_xarc]],
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteObjectsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_RC]: [, output.headers[_xarc]],
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data.Deleted === "") {
        contents[_De] = [];
    }
    else if (data[_De] != null) {
        contents[_De] = de_DeletedObjects(__getArrayIfSingleItem(data[_De]), context);
    }
    if (data.Error === "") {
        contents[_Err] = [];
    }
    else if (data[_Er] != null) {
        contents[_Err] = de_Errors(__getArrayIfSingleItem(data[_Er]), context);
    }
    return contents;
};
export const de_DeleteObjectTaggingCommand = async (output, context) => {
    if (output.statusCode !== 204 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_VI]: [, output.headers[_xavi]],
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeletePublicAccessBlockCommand = async (output, context) => {
    if (output.statusCode !== 204 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_GetBucketAccelerateConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_RC]: [, output.headers[_xarc]],
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data[_S] != null) {
        contents[_S] = __expectString(data[_S]);
    }
    return contents;
};
export const de_GetBucketAclCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data.AccessControlList === "") {
        contents[_Gr] = [];
    }
    else if (data[_ACLc] != null && data[_ACLc][_G] != null) {
        contents[_Gr] = de_Grants(__getArrayIfSingleItem(data[_ACLc][_G]), context);
    }
    if (data[_O] != null) {
        contents[_O] = de_Owner(data[_O], context);
    }
    return contents;
};
export const de_GetBucketAnalyticsConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectObject(await parseBody(output.body, context));
    contents.AnalyticsConfiguration = de_AnalyticsConfiguration(data, context);
    return contents;
};
export const de_GetBucketCorsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data.CORSRule === "") {
        contents[_CORSRu] = [];
    }
    else if (data[_CORSR] != null) {
        contents[_CORSRu] = de_CORSRules(__getArrayIfSingleItem(data[_CORSR]), context);
    }
    return contents;
};
export const de_GetBucketEncryptionCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectObject(await parseBody(output.body, context));
    contents.ServerSideEncryptionConfiguration = de_ServerSideEncryptionConfiguration(data, context);
    return contents;
};
export const de_GetBucketIntelligentTieringConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectObject(await parseBody(output.body, context));
    contents.IntelligentTieringConfiguration = de_IntelligentTieringConfiguration(data, context);
    return contents;
};
export const de_GetBucketInventoryConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectObject(await parseBody(output.body, context));
    contents.InventoryConfiguration = de_InventoryConfiguration(data, context);
    return contents;
};
export const de_GetBucketLifecycleConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_TDMOS]: [, output.headers[_xatdmos]],
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data.Rule === "") {
        contents[_Rul] = [];
    }
    else if (data[_Ru] != null) {
        contents[_Rul] = de_LifecycleRules(__getArrayIfSingleItem(data[_Ru]), context);
    }
    return contents;
};
export const de_GetBucketLocationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data[_LC] != null) {
        contents[_LC] = __expectString(data[_LC]);
    }
    return contents;
};
export const de_GetBucketLoggingCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data[_LE] != null) {
        contents[_LE] = de_LoggingEnabled(data[_LE], context);
    }
    return contents;
};
export const de_GetBucketMetadataTableConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectObject(await parseBody(output.body, context));
    contents.GetBucketMetadataTableConfigurationResult = de_GetBucketMetadataTableConfigurationResult(data, context);
    return contents;
};
export const de_GetBucketMetricsConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectObject(await parseBody(output.body, context));
    contents.MetricsConfiguration = de_MetricsConfiguration(data, context);
    return contents;
};
export const de_GetBucketNotificationConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data[_EBC] != null) {
        contents[_EBC] = de_EventBridgeConfiguration(data[_EBC], context);
    }
    if (data.CloudFunctionConfiguration === "") {
        contents[_LFC] = [];
    }
    else if (data[_CFC] != null) {
        contents[_LFC] = de_LambdaFunctionConfigurationList(__getArrayIfSingleItem(data[_CFC]), context);
    }
    if (data.QueueConfiguration === "") {
        contents[_QCu] = [];
    }
    else if (data[_QC] != null) {
        contents[_QCu] = de_QueueConfigurationList(__getArrayIfSingleItem(data[_QC]), context);
    }
    if (data.TopicConfiguration === "") {
        contents[_TCop] = [];
    }
    else if (data[_TCo] != null) {
        contents[_TCop] = de_TopicConfigurationList(__getArrayIfSingleItem(data[_TCo]), context);
    }
    return contents;
};
export const de_GetBucketOwnershipControlsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectObject(await parseBody(output.body, context));
    contents.OwnershipControls = de_OwnershipControls(data, context);
    return contents;
};
export const de_GetBucketPolicyCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = await collectBodyString(output.body, context);
    contents.Policy = __expectString(data);
    return contents;
};
export const de_GetBucketPolicyStatusCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectObject(await parseBody(output.body, context));
    contents.PolicyStatus = de_PolicyStatus(data, context);
    return contents;
};
export const de_GetBucketReplicationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectObject(await parseBody(output.body, context));
    contents.ReplicationConfiguration = de_ReplicationConfiguration(data, context);
    return contents;
};
export const de_GetBucketRequestPaymentCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data[_Pa] != null) {
        contents[_Pa] = __expectString(data[_Pa]);
    }
    return contents;
};
export const de_GetBucketTaggingCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data.TagSet === "") {
        contents[_TS] = [];
    }
    else if (data[_TS] != null && data[_TS][_Ta] != null) {
        contents[_TS] = de_TagSet(__getArrayIfSingleItem(data[_TS][_Ta]), context);
    }
    return contents;
};
export const de_GetBucketVersioningCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data[_MDf] != null) {
        contents[_MFAD] = __expectString(data[_MDf]);
    }
    if (data[_S] != null) {
        contents[_S] = __expectString(data[_S]);
    }
    return contents;
};
export const de_GetBucketWebsiteCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data[_ED] != null) {
        contents[_ED] = de_ErrorDocument(data[_ED], context);
    }
    if (data[_ID] != null) {
        contents[_ID] = de_IndexDocument(data[_ID], context);
    }
    if (data[_RART] != null) {
        contents[_RART] = de_RedirectAllRequestsTo(data[_RART], context);
    }
    if (data.RoutingRules === "") {
        contents[_RRo] = [];
    }
    else if (data[_RRo] != null && data[_RRo][_RRou] != null) {
        contents[_RRo] = de_RoutingRules(__getArrayIfSingleItem(data[_RRo][_RRou]), context);
    }
    return contents;
};
export const de_GetObjectCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_DM]: [() => void 0 !== output.headers[_xadm], () => __parseBoolean(output.headers[_xadm])],
        [_AR]: [, output.headers[_ar]],
        [_Exp]: [, output.headers[_xae]],
        [_Re]: [, output.headers[_xar]],
        [_LM]: [() => void 0 !== output.headers[_lm], () => __expectNonNull(__parseRfc7231DateTime(output.headers[_lm]))],
        [_CLo]: [() => void 0 !== output.headers[_cl_], () => __strictParseLong(output.headers[_cl_])],
        [_ETa]: [, output.headers[_eta]],
        [_CCRC]: [, output.headers[_xacc]],
        [_CCRCC]: [, output.headers[_xacc_]],
        [_CCRCNVME]: [, output.headers[_xacc__]],
        [_CSHA]: [, output.headers[_xacs]],
        [_CSHAh]: [, output.headers[_xacs_]],
        [_CT]: [, output.headers[_xact]],
        [_MM]: [() => void 0 !== output.headers[_xamm], () => __strictParseInt32(output.headers[_xamm])],
        [_VI]: [, output.headers[_xavi]],
        [_CC]: [, output.headers[_cc]],
        [_CD]: [, output.headers[_cd]],
        [_CE]: [, output.headers[_ce]],
        [_CL]: [, output.headers[_cl]],
        [_CR]: [, output.headers[_cr]],
        [_CTo]: [, output.headers[_ct]],
        [_E]: [() => void 0 !== output.headers[_e], () => __expectNonNull(__parseRfc7231DateTime(output.headers[_e]))],
        [_ES]: [, output.headers[_ex]],
        [_WRL]: [, output.headers[_xawrl]],
        [_SSE]: [, output.headers[_xasse]],
        [_SSECA]: [, output.headers[_xasseca]],
        [_SSECKMD]: [, output.headers[_xasseckm]],
        [_SSEKMSKI]: [, output.headers[_xasseakki]],
        [_BKE]: [() => void 0 !== output.headers[_xassebke], () => __parseBoolean(output.headers[_xassebke])],
        [_SC]: [, output.headers[_xasc]],
        [_RC]: [, output.headers[_xarc]],
        [_RS]: [, output.headers[_xars]],
        [_PC]: [() => void 0 !== output.headers[_xampc], () => __strictParseInt32(output.headers[_xampc])],
        [_TC]: [() => void 0 !== output.headers[_xatc], () => __strictParseInt32(output.headers[_xatc])],
        [_OLM]: [, output.headers[_xaolm]],
        [_OLRUD]: [
            () => void 0 !== output.headers[_xaolrud],
            () => __expectNonNull(__parseRfc3339DateTimeWithOffset(output.headers[_xaolrud])),
        ],
        [_OLLHS]: [, output.headers[_xaollh]],
        Metadata: [
            ,
            Object.keys(output.headers)
                .filter((header) => header.startsWith("x-amz-meta-"))
                .reduce((acc, header) => {
                acc[header.substring(11)] = output.headers[header];
                return acc;
            }, {}),
        ],
    });
    const data = output.body;
    context.sdkStreamMixin(data);
    contents.Body = data;
    return contents;
};
export const de_GetObjectAclCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_RC]: [, output.headers[_xarc]],
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data.AccessControlList === "") {
        contents[_Gr] = [];
    }
    else if (data[_ACLc] != null && data[_ACLc][_G] != null) {
        contents[_Gr] = de_Grants(__getArrayIfSingleItem(data[_ACLc][_G]), context);
    }
    if (data[_O] != null) {
        contents[_O] = de_Owner(data[_O], context);
    }
    return contents;
};
export const de_GetObjectAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_DM]: [() => void 0 !== output.headers[_xadm], () => __parseBoolean(output.headers[_xadm])],
        [_LM]: [() => void 0 !== output.headers[_lm], () => __expectNonNull(__parseRfc7231DateTime(output.headers[_lm]))],
        [_VI]: [, output.headers[_xavi]],
        [_RC]: [, output.headers[_xarc]],
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data[_Ch] != null) {
        contents[_Ch] = de_Checksum(data[_Ch], context);
    }
    if (data[_ETa] != null) {
        contents[_ETa] = __expectString(data[_ETa]);
    }
    if (data[_OP] != null) {
        contents[_OP] = de_GetObjectAttributesParts(data[_OP], context);
    }
    if (data[_OSb] != null) {
        contents[_OSb] = __strictParseLong(data[_OSb]);
    }
    if (data[_SC] != null) {
        contents[_SC] = __expectString(data[_SC]);
    }
    return contents;
};
export const de_GetObjectLegalHoldCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectObject(await parseBody(output.body, context));
    contents.LegalHold = de_ObjectLockLegalHold(data, context);
    return contents;
};
export const de_GetObjectLockConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectObject(await parseBody(output.body, context));
    contents.ObjectLockConfiguration = de_ObjectLockConfiguration(data, context);
    return contents;
};
export const de_GetObjectRetentionCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectObject(await parseBody(output.body, context));
    contents.Retention = de_ObjectLockRetention(data, context);
    return contents;
};
export const de_GetObjectTaggingCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_VI]: [, output.headers[_xavi]],
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data.TagSet === "") {
        contents[_TS] = [];
    }
    else if (data[_TS] != null && data[_TS][_Ta] != null) {
        contents[_TS] = de_TagSet(__getArrayIfSingleItem(data[_TS][_Ta]), context);
    }
    return contents;
};
export const de_GetObjectTorrentCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_RC]: [, output.headers[_xarc]],
    });
    const data = output.body;
    context.sdkStreamMixin(data);
    contents.Body = data;
    return contents;
};
export const de_GetPublicAccessBlockCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectObject(await parseBody(output.body, context));
    contents.PublicAccessBlockConfiguration = de_PublicAccessBlockConfiguration(data, context);
    return contents;
};
export const de_HeadBucketCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_BLT]: [, output.headers[_xablt]],
        [_BLN]: [, output.headers[_xabln]],
        [_BR]: [, output.headers[_xabr]],
        [_APA]: [() => void 0 !== output.headers[_xaapa], () => __parseBoolean(output.headers[_xaapa])],
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_HeadObjectCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_DM]: [() => void 0 !== output.headers[_xadm], () => __parseBoolean(output.headers[_xadm])],
        [_AR]: [, output.headers[_ar]],
        [_Exp]: [, output.headers[_xae]],
        [_Re]: [, output.headers[_xar]],
        [_AS]: [, output.headers[_xaas]],
        [_LM]: [() => void 0 !== output.headers[_lm], () => __expectNonNull(__parseRfc7231DateTime(output.headers[_lm]))],
        [_CLo]: [() => void 0 !== output.headers[_cl_], () => __strictParseLong(output.headers[_cl_])],
        [_CCRC]: [, output.headers[_xacc]],
        [_CCRCC]: [, output.headers[_xacc_]],
        [_CCRCNVME]: [, output.headers[_xacc__]],
        [_CSHA]: [, output.headers[_xacs]],
        [_CSHAh]: [, output.headers[_xacs_]],
        [_CT]: [, output.headers[_xact]],
        [_ETa]: [, output.headers[_eta]],
        [_MM]: [() => void 0 !== output.headers[_xamm], () => __strictParseInt32(output.headers[_xamm])],
        [_VI]: [, output.headers[_xavi]],
        [_CC]: [, output.headers[_cc]],
        [_CD]: [, output.headers[_cd]],
        [_CE]: [, output.headers[_ce]],
        [_CL]: [, output.headers[_cl]],
        [_CTo]: [, output.headers[_ct]],
        [_CR]: [, output.headers[_cr]],
        [_E]: [() => void 0 !== output.headers[_e], () => __expectNonNull(__parseRfc7231DateTime(output.headers[_e]))],
        [_ES]: [, output.headers[_ex]],
        [_WRL]: [, output.headers[_xawrl]],
        [_SSE]: [, output.headers[_xasse]],
        [_SSECA]: [, output.headers[_xasseca]],
        [_SSECKMD]: [, output.headers[_xasseckm]],
        [_SSEKMSKI]: [, output.headers[_xasseakki]],
        [_BKE]: [() => void 0 !== output.headers[_xassebke], () => __parseBoolean(output.headers[_xassebke])],
        [_SC]: [, output.headers[_xasc]],
        [_RC]: [, output.headers[_xarc]],
        [_RS]: [, output.headers[_xars]],
        [_PC]: [() => void 0 !== output.headers[_xampc], () => __strictParseInt32(output.headers[_xampc])],
        [_OLM]: [, output.headers[_xaolm]],
        [_OLRUD]: [
            () => void 0 !== output.headers[_xaolrud],
            () => __expectNonNull(__parseRfc3339DateTimeWithOffset(output.headers[_xaolrud])),
        ],
        [_OLLHS]: [, output.headers[_xaollh]],
        Metadata: [
            ,
            Object.keys(output.headers)
                .filter((header) => header.startsWith("x-amz-meta-"))
                .reduce((acc, header) => {
                acc[header.substring(11)] = output.headers[header];
                return acc;
            }, {}),
        ],
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_ListBucketAnalyticsConfigurationsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data.AnalyticsConfiguration === "") {
        contents[_ACLn] = [];
    }
    else if (data[_AC] != null) {
        contents[_ACLn] = de_AnalyticsConfigurationList(__getArrayIfSingleItem(data[_AC]), context);
    }
    if (data[_CTon] != null) {
        contents[_CTon] = __expectString(data[_CTon]);
    }
    if (data[_IT] != null) {
        contents[_IT] = __parseBoolean(data[_IT]);
    }
    if (data[_NCT] != null) {
        contents[_NCT] = __expectString(data[_NCT]);
    }
    return contents;
};
export const de_ListBucketIntelligentTieringConfigurationsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data[_CTon] != null) {
        contents[_CTon] = __expectString(data[_CTon]);
    }
    if (data.IntelligentTieringConfiguration === "") {
        contents[_ITCL] = [];
    }
    else if (data[_ITC] != null) {
        contents[_ITCL] = de_IntelligentTieringConfigurationList(__getArrayIfSingleItem(data[_ITC]), context);
    }
    if (data[_IT] != null) {
        contents[_IT] = __parseBoolean(data[_IT]);
    }
    if (data[_NCT] != null) {
        contents[_NCT] = __expectString(data[_NCT]);
    }
    return contents;
};
export const de_ListBucketInventoryConfigurationsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data[_CTon] != null) {
        contents[_CTon] = __expectString(data[_CTon]);
    }
    if (data.InventoryConfiguration === "") {
        contents[_ICL] = [];
    }
    else if (data[_IC] != null) {
        contents[_ICL] = de_InventoryConfigurationList(__getArrayIfSingleItem(data[_IC]), context);
    }
    if (data[_IT] != null) {
        contents[_IT] = __parseBoolean(data[_IT]);
    }
    if (data[_NCT] != null) {
        contents[_NCT] = __expectString(data[_NCT]);
    }
    return contents;
};
export const de_ListBucketMetricsConfigurationsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data[_CTon] != null) {
        contents[_CTon] = __expectString(data[_CTon]);
    }
    if (data[_IT] != null) {
        contents[_IT] = __parseBoolean(data[_IT]);
    }
    if (data.MetricsConfiguration === "") {
        contents[_MCL] = [];
    }
    else if (data[_MC] != null) {
        contents[_MCL] = de_MetricsConfigurationList(__getArrayIfSingleItem(data[_MC]), context);
    }
    if (data[_NCT] != null) {
        contents[_NCT] = __expectString(data[_NCT]);
    }
    return contents;
};
export const de_ListBucketsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data.Buckets === "") {
        contents[_Bu] = [];
    }
    else if (data[_Bu] != null && data[_Bu][_B] != null) {
        contents[_Bu] = de_Buckets(__getArrayIfSingleItem(data[_Bu][_B]), context);
    }
    if (data[_CTon] != null) {
        contents[_CTon] = __expectString(data[_CTon]);
    }
    if (data[_O] != null) {
        contents[_O] = de_Owner(data[_O], context);
    }
    if (data[_P] != null) {
        contents[_P] = __expectString(data[_P]);
    }
    return contents;
};
export const de_ListDirectoryBucketsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data.Buckets === "") {
        contents[_Bu] = [];
    }
    else if (data[_Bu] != null && data[_Bu][_B] != null) {
        contents[_Bu] = de_Buckets(__getArrayIfSingleItem(data[_Bu][_B]), context);
    }
    if (data[_CTon] != null) {
        contents[_CTon] = __expectString(data[_CTon]);
    }
    return contents;
};
export const de_ListMultipartUploadsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_RC]: [, output.headers[_xarc]],
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data[_B] != null) {
        contents[_B] = __expectString(data[_B]);
    }
    if (data.CommonPrefixes === "") {
        contents[_CP] = [];
    }
    else if (data[_CP] != null) {
        contents[_CP] = de_CommonPrefixList(__getArrayIfSingleItem(data[_CP]), context);
    }
    if (data[_D] != null) {
        contents[_D] = __expectString(data[_D]);
    }
    if (data[_ET] != null) {
        contents[_ET] = __expectString(data[_ET]);
    }
    if (data[_IT] != null) {
        contents[_IT] = __parseBoolean(data[_IT]);
    }
    if (data[_KM] != null) {
        contents[_KM] = __expectString(data[_KM]);
    }
    if (data[_MU] != null) {
        contents[_MU] = __strictParseInt32(data[_MU]);
    }
    if (data[_NKM] != null) {
        contents[_NKM] = __expectString(data[_NKM]);
    }
    if (data[_NUIM] != null) {
        contents[_NUIM] = __expectString(data[_NUIM]);
    }
    if (data[_P] != null) {
        contents[_P] = __expectString(data[_P]);
    }
    if (data[_UIM] != null) {
        contents[_UIM] = __expectString(data[_UIM]);
    }
    if (data.Upload === "") {
        contents[_Up] = [];
    }
    else if (data[_U] != null) {
        contents[_Up] = de_MultipartUploadList(__getArrayIfSingleItem(data[_U]), context);
    }
    return contents;
};
export const de_ListObjectsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_RC]: [, output.headers[_xarc]],
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data.CommonPrefixes === "") {
        contents[_CP] = [];
    }
    else if (data[_CP] != null) {
        contents[_CP] = de_CommonPrefixList(__getArrayIfSingleItem(data[_CP]), context);
    }
    if (data.Contents === "") {
        contents[_Co] = [];
    }
    else if (data[_Co] != null) {
        contents[_Co] = de_ObjectList(__getArrayIfSingleItem(data[_Co]), context);
    }
    if (data[_D] != null) {
        contents[_D] = __expectString(data[_D]);
    }
    if (data[_ET] != null) {
        contents[_ET] = __expectString(data[_ET]);
    }
    if (data[_IT] != null) {
        contents[_IT] = __parseBoolean(data[_IT]);
    }
    if (data[_M] != null) {
        contents[_M] = __expectString(data[_M]);
    }
    if (data[_MK] != null) {
        contents[_MK] = __strictParseInt32(data[_MK]);
    }
    if (data[_N] != null) {
        contents[_N] = __expectString(data[_N]);
    }
    if (data[_NM] != null) {
        contents[_NM] = __expectString(data[_NM]);
    }
    if (data[_P] != null) {
        contents[_P] = __expectString(data[_P]);
    }
    return contents;
};
export const de_ListObjectsV2Command = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_RC]: [, output.headers[_xarc]],
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data.CommonPrefixes === "") {
        contents[_CP] = [];
    }
    else if (data[_CP] != null) {
        contents[_CP] = de_CommonPrefixList(__getArrayIfSingleItem(data[_CP]), context);
    }
    if (data.Contents === "") {
        contents[_Co] = [];
    }
    else if (data[_Co] != null) {
        contents[_Co] = de_ObjectList(__getArrayIfSingleItem(data[_Co]), context);
    }
    if (data[_CTon] != null) {
        contents[_CTon] = __expectString(data[_CTon]);
    }
    if (data[_D] != null) {
        contents[_D] = __expectString(data[_D]);
    }
    if (data[_ET] != null) {
        contents[_ET] = __expectString(data[_ET]);
    }
    if (data[_IT] != null) {
        contents[_IT] = __parseBoolean(data[_IT]);
    }
    if (data[_KC] != null) {
        contents[_KC] = __strictParseInt32(data[_KC]);
    }
    if (data[_MK] != null) {
        contents[_MK] = __strictParseInt32(data[_MK]);
    }
    if (data[_N] != null) {
        contents[_N] = __expectString(data[_N]);
    }
    if (data[_NCT] != null) {
        contents[_NCT] = __expectString(data[_NCT]);
    }
    if (data[_P] != null) {
        contents[_P] = __expectString(data[_P]);
    }
    if (data[_SA] != null) {
        contents[_SA] = __expectString(data[_SA]);
    }
    return contents;
};
export const de_ListObjectVersionsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_RC]: [, output.headers[_xarc]],
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data.CommonPrefixes === "") {
        contents[_CP] = [];
    }
    else if (data[_CP] != null) {
        contents[_CP] = de_CommonPrefixList(__getArrayIfSingleItem(data[_CP]), context);
    }
    if (data.DeleteMarker === "") {
        contents[_DMe] = [];
    }
    else if (data[_DM] != null) {
        contents[_DMe] = de_DeleteMarkers(__getArrayIfSingleItem(data[_DM]), context);
    }
    if (data[_D] != null) {
        contents[_D] = __expectString(data[_D]);
    }
    if (data[_ET] != null) {
        contents[_ET] = __expectString(data[_ET]);
    }
    if (data[_IT] != null) {
        contents[_IT] = __parseBoolean(data[_IT]);
    }
    if (data[_KM] != null) {
        contents[_KM] = __expectString(data[_KM]);
    }
    if (data[_MK] != null) {
        contents[_MK] = __strictParseInt32(data[_MK]);
    }
    if (data[_N] != null) {
        contents[_N] = __expectString(data[_N]);
    }
    if (data[_NKM] != null) {
        contents[_NKM] = __expectString(data[_NKM]);
    }
    if (data[_NVIM] != null) {
        contents[_NVIM] = __expectString(data[_NVIM]);
    }
    if (data[_P] != null) {
        contents[_P] = __expectString(data[_P]);
    }
    if (data[_VIM] != null) {
        contents[_VIM] = __expectString(data[_VIM]);
    }
    if (data.Version === "") {
        contents[_Ve] = [];
    }
    else if (data[_V] != null) {
        contents[_Ve] = de_ObjectVersionList(__getArrayIfSingleItem(data[_V]), context);
    }
    return contents;
};
export const de_ListPartsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_AD]: [
            () => void 0 !== output.headers[_xaad],
            () => __expectNonNull(__parseRfc7231DateTime(output.headers[_xaad])),
        ],
        [_ARI]: [, output.headers[_xaari]],
        [_RC]: [, output.headers[_xarc]],
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    if (data[_B] != null) {
        contents[_B] = __expectString(data[_B]);
    }
    if (data[_CA] != null) {
        contents[_CA] = __expectString(data[_CA]);
    }
    if (data[_CT] != null) {
        contents[_CT] = __expectString(data[_CT]);
    }
    if (data[_In] != null) {
        contents[_In] = de_Initiator(data[_In], context);
    }
    if (data[_IT] != null) {
        contents[_IT] = __parseBoolean(data[_IT]);
    }
    if (data[_K] != null) {
        contents[_K] = __expectString(data[_K]);
    }
    if (data[_MP] != null) {
        contents[_MP] = __strictParseInt32(data[_MP]);
    }
    if (data[_NPNM] != null) {
        contents[_NPNM] = __expectString(data[_NPNM]);
    }
    if (data[_O] != null) {
        contents[_O] = de_Owner(data[_O], context);
    }
    if (data[_PNM] != null) {
        contents[_PNM] = __expectString(data[_PNM]);
    }
    if (data.Part === "") {
        contents[_Part] = [];
    }
    else if (data[_Par] != null) {
        contents[_Part] = de_Parts(__getArrayIfSingleItem(data[_Par]), context);
    }
    if (data[_SC] != null) {
        contents[_SC] = __expectString(data[_SC]);
    }
    if (data[_UI] != null) {
        contents[_UI] = __expectString(data[_UI]);
    }
    return contents;
};
export const de_PutBucketAccelerateConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutBucketAclCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutBucketAnalyticsConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutBucketCorsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutBucketEncryptionCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutBucketIntelligentTieringConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutBucketInventoryConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutBucketLifecycleConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_TDMOS]: [, output.headers[_xatdmos]],
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutBucketLoggingCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutBucketMetricsConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutBucketNotificationConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutBucketOwnershipControlsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutBucketPolicyCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutBucketReplicationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutBucketRequestPaymentCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutBucketTaggingCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutBucketVersioningCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutBucketWebsiteCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutObjectCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_Exp]: [, output.headers[_xae]],
        [_ETa]: [, output.headers[_eta]],
        [_CCRC]: [, output.headers[_xacc]],
        [_CCRCC]: [, output.headers[_xacc_]],
        [_CCRCNVME]: [, output.headers[_xacc__]],
        [_CSHA]: [, output.headers[_xacs]],
        [_CSHAh]: [, output.headers[_xacs_]],
        [_CT]: [, output.headers[_xact]],
        [_SSE]: [, output.headers[_xasse]],
        [_VI]: [, output.headers[_xavi]],
        [_SSECA]: [, output.headers[_xasseca]],
        [_SSECKMD]: [, output.headers[_xasseckm]],
        [_SSEKMSKI]: [, output.headers[_xasseakki]],
        [_SSEKMSEC]: [, output.headers[_xassec]],
        [_BKE]: [() => void 0 !== output.headers[_xassebke], () => __parseBoolean(output.headers[_xassebke])],
        [_Si]: [() => void 0 !== output.headers[_xaos], () => __strictParseLong(output.headers[_xaos])],
        [_RC]: [, output.headers[_xarc]],
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutObjectAclCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_RC]: [, output.headers[_xarc]],
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutObjectLegalHoldCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_RC]: [, output.headers[_xarc]],
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutObjectLockConfigurationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_RC]: [, output.headers[_xarc]],
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutObjectRetentionCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_RC]: [, output.headers[_xarc]],
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutObjectTaggingCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_VI]: [, output.headers[_xavi]],
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutPublicAccessBlockCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_RestoreObjectCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_RC]: [, output.headers[_xarc]],
        [_ROP]: [, output.headers[_xarop]],
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_SelectObjectContentCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = output.body;
    contents.Payload = de_SelectObjectContentEventStream(data, context);
    return contents;
};
export const de_UploadPartCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_SSE]: [, output.headers[_xasse]],
        [_ETa]: [, output.headers[_eta]],
        [_CCRC]: [, output.headers[_xacc]],
        [_CCRCC]: [, output.headers[_xacc_]],
        [_CCRCNVME]: [, output.headers[_xacc__]],
        [_CSHA]: [, output.headers[_xacs]],
        [_CSHAh]: [, output.headers[_xacs_]],
        [_SSECA]: [, output.headers[_xasseca]],
        [_SSECKMD]: [, output.headers[_xasseckm]],
        [_SSEKMSKI]: [, output.headers[_xasseakki]],
        [_BKE]: [() => void 0 !== output.headers[_xassebke], () => __parseBoolean(output.headers[_xassebke])],
        [_RC]: [, output.headers[_xarc]],
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_UploadPartCopyCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_CSVI]: [, output.headers[_xacsvi]],
        [_SSE]: [, output.headers[_xasse]],
        [_SSECA]: [, output.headers[_xasseca]],
        [_SSECKMD]: [, output.headers[_xasseckm]],
        [_SSEKMSKI]: [, output.headers[_xasseakki]],
        [_BKE]: [() => void 0 !== output.headers[_xassebke], () => __parseBoolean(output.headers[_xassebke])],
        [_RC]: [, output.headers[_xarc]],
    });
    const data = __expectObject(await parseBody(output.body, context));
    contents.CopyPartResult = de_CopyPartResult(data, context);
    return contents;
};
export const de_WriteGetObjectResponseCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
const de_CommandError = async (output, context) => {
    const parsedOutput = {
        ...output,
        body: await parseErrorBody(output.body, context),
    };
    const errorCode = loadRestXmlErrorCode(output, parsedOutput.body);
    switch (errorCode) {
        case "NoSuchUpload":
        case "com.amazonaws.s3#NoSuchUpload":
            throw await de_NoSuchUploadRes(parsedOutput, context);
        case "ObjectNotInActiveTierError":
        case "com.amazonaws.s3#ObjectNotInActiveTierError":
            throw await de_ObjectNotInActiveTierErrorRes(parsedOutput, context);
        case "BucketAlreadyExists":
        case "com.amazonaws.s3#BucketAlreadyExists":
            throw await de_BucketAlreadyExistsRes(parsedOutput, context);
        case "BucketAlreadyOwnedByYou":
        case "com.amazonaws.s3#BucketAlreadyOwnedByYou":
            throw await de_BucketAlreadyOwnedByYouRes(parsedOutput, context);
        case "NoSuchBucket":
        case "com.amazonaws.s3#NoSuchBucket":
            throw await de_NoSuchBucketRes(parsedOutput, context);
        case "InvalidObjectState":
        case "com.amazonaws.s3#InvalidObjectState":
            throw await de_InvalidObjectStateRes(parsedOutput, context);
        case "NoSuchKey":
        case "com.amazonaws.s3#NoSuchKey":
            throw await de_NoSuchKeyRes(parsedOutput, context);
        case "NotFound":
        case "com.amazonaws.s3#NotFound":
            throw await de_NotFoundRes(parsedOutput, context);
        case "EncryptionTypeMismatch":
        case "com.amazonaws.s3#EncryptionTypeMismatch":
            throw await de_EncryptionTypeMismatchRes(parsedOutput, context);
        case "InvalidRequest":
        case "com.amazonaws.s3#InvalidRequest":
            throw await de_InvalidRequestRes(parsedOutput, context);
        case "InvalidWriteOffset":
        case "com.amazonaws.s3#InvalidWriteOffset":
            throw await de_InvalidWriteOffsetRes(parsedOutput, context);
        case "TooManyParts":
        case "com.amazonaws.s3#TooManyParts":
            throw await de_TooManyPartsRes(parsedOutput, context);
        case "ObjectAlreadyInActiveTierError":
        case "com.amazonaws.s3#ObjectAlreadyInActiveTierError":
            throw await de_ObjectAlreadyInActiveTierErrorRes(parsedOutput, context);
        default:
            const parsedBody = parsedOutput.body;
            return throwDefaultError({
                output,
                parsedBody,
                errorCode,
            });
    }
};
const throwDefaultError = withBaseException(__BaseException);
const de_BucketAlreadyExistsRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const exception = new BucketAlreadyExists({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_BucketAlreadyOwnedByYouRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const exception = new BucketAlreadyOwnedByYou({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_EncryptionTypeMismatchRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const exception = new EncryptionTypeMismatch({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_InvalidObjectStateRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    if (data[_AT] != null) {
        contents[_AT] = __expectString(data[_AT]);
    }
    if (data[_SC] != null) {
        contents[_SC] = __expectString(data[_SC]);
    }
    const exception = new InvalidObjectState({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_InvalidRequestRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const exception = new InvalidRequest({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_InvalidWriteOffsetRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const exception = new InvalidWriteOffset({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_NoSuchBucketRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const exception = new NoSuchBucket({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_NoSuchKeyRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const exception = new NoSuchKey({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_NoSuchUploadRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const exception = new NoSuchUpload({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_NotFoundRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const exception = new NotFound({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_ObjectAlreadyInActiveTierErrorRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const exception = new ObjectAlreadyInActiveTierError({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_ObjectNotInActiveTierErrorRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const exception = new ObjectNotInActiveTierError({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_TooManyPartsRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const exception = new TooManyParts({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_SelectObjectContentEventStream = (output, context) => {
    return context.eventStreamMarshaller.deserialize(output, async (event) => {
        if (event["Records"] != null) {
            return {
                Records: await de_RecordsEvent_event(event["Records"], context),
            };
        }
        if (event["Stats"] != null) {
            return {
                Stats: await de_StatsEvent_event(event["Stats"], context),
            };
        }
        if (event["Progress"] != null) {
            return {
                Progress: await de_ProgressEvent_event(event["Progress"], context),
            };
        }
        if (event["Cont"] != null) {
            return {
                Cont: await de_ContinuationEvent_event(event["Cont"], context),
            };
        }
        if (event["End"] != null) {
            return {
                End: await de_EndEvent_event(event["End"], context),
            };
        }
        return { $unknown: output };
    });
};
const de_ContinuationEvent_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    Object.assign(contents, de_ContinuationEvent(data, context));
    return contents;
};
const de_EndEvent_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    Object.assign(contents, de_EndEvent(data, context));
    return contents;
};
const de_ProgressEvent_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    contents.Details = de_Progress(data, context);
    return contents;
};
const de_RecordsEvent_event = async (output, context) => {
    const contents = {};
    contents.Payload = output.body;
    return contents;
};
const de_StatsEvent_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    contents.Details = de_Stats(data, context);
    return contents;
};
const se_AbortIncompleteMultipartUpload = (input, context) => {
    const bn = new __XmlNode(_AIMU);
    if (input[_DAI] != null) {
        bn.c(__XmlNode.of(_DAI, String(input[_DAI])).n(_DAI));
    }
    return bn;
};
const se_AccelerateConfiguration = (input, context) => {
    const bn = new __XmlNode(_ACc);
    if (input[_S] != null) {
        bn.c(__XmlNode.of(_BAS, input[_S]).n(_S));
    }
    return bn;
};
const se_AccessControlPolicy = (input, context) => {
    const bn = new __XmlNode(_ACP);
    bn.lc(input, "Grants", "AccessControlList", () => se_Grants(input[_Gr], context));
    if (input[_O] != null) {
        bn.c(se_Owner(input[_O], context).n(_O));
    }
    return bn;
};
const se_AccessControlTranslation = (input, context) => {
    const bn = new __XmlNode(_ACT);
    if (input[_O] != null) {
        bn.c(__XmlNode.of(_OOw, input[_O]).n(_O));
    }
    return bn;
};
const se_AllowedHeaders = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = __XmlNode.of(_AH, entry);
        return n.n(_me);
    });
};
const se_AllowedMethods = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = __XmlNode.of(_AM, entry);
        return n.n(_me);
    });
};
const se_AllowedOrigins = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = __XmlNode.of(_AO, entry);
        return n.n(_me);
    });
};
const se_AnalyticsAndOperator = (input, context) => {
    const bn = new __XmlNode(_AAO);
    bn.cc(input, _P);
    bn.l(input, "Tags", "Tag", () => se_TagSet(input[_Tag], context));
    return bn;
};
const se_AnalyticsConfiguration = (input, context) => {
    const bn = new __XmlNode(_AC);
    if (input[_I] != null) {
        bn.c(__XmlNode.of(_AI, input[_I]).n(_I));
    }
    if (input[_F] != null) {
        bn.c(se_AnalyticsFilter(input[_F], context).n(_F));
    }
    if (input[_SCA] != null) {
        bn.c(se_StorageClassAnalysis(input[_SCA], context).n(_SCA));
    }
    return bn;
};
const se_AnalyticsExportDestination = (input, context) => {
    const bn = new __XmlNode(_AED);
    if (input[_SBD] != null) {
        bn.c(se_AnalyticsS3BucketDestination(input[_SBD], context).n(_SBD));
    }
    return bn;
};
const se_AnalyticsFilter = (input, context) => {
    const bn = new __XmlNode(_AF);
    AnalyticsFilter.visit(input, {
        Prefix: (value) => {
            if (input[_P] != null) {
                bn.c(__XmlNode.of(_P, value).n(_P));
            }
        },
        Tag: (value) => {
            if (input[_Ta] != null) {
                bn.c(se_Tag(value, context).n(_Ta));
            }
        },
        And: (value) => {
            if (input[_A] != null) {
                bn.c(se_AnalyticsAndOperator(value, context).n(_A));
            }
        },
        _: (name, value) => {
            if (!(value instanceof __XmlNode || value instanceof __XmlText)) {
                throw new Error("Unable to serialize unknown union members in XML.");
            }
            bn.c(new __XmlNode(name).c(value));
        },
    });
    return bn;
};
const se_AnalyticsS3BucketDestination = (input, context) => {
    const bn = new __XmlNode(_ASBD);
    if (input[_Fo] != null) {
        bn.c(__XmlNode.of(_ASEFF, input[_Fo]).n(_Fo));
    }
    if (input[_BAI] != null) {
        bn.c(__XmlNode.of(_AIc, input[_BAI]).n(_BAI));
    }
    if (input[_B] != null) {
        bn.c(__XmlNode.of(_BN, input[_B]).n(_B));
    }
    bn.cc(input, _P);
    return bn;
};
const se_BucketInfo = (input, context) => {
    const bn = new __XmlNode(_BI);
    bn.cc(input, _DR);
    if (input[_Ty] != null) {
        bn.c(__XmlNode.of(_BT, input[_Ty]).n(_Ty));
    }
    return bn;
};
const se_BucketLifecycleConfiguration = (input, context) => {
    const bn = new __XmlNode(_BLC);
    bn.l(input, "Rules", "Rule", () => se_LifecycleRules(input[_Rul], context));
    return bn;
};
const se_BucketLoggingStatus = (input, context) => {
    const bn = new __XmlNode(_BLS);
    if (input[_LE] != null) {
        bn.c(se_LoggingEnabled(input[_LE], context).n(_LE));
    }
    return bn;
};
const se_CompletedMultipartUpload = (input, context) => {
    const bn = new __XmlNode(_CMU);
    bn.l(input, "Parts", "Part", () => se_CompletedPartList(input[_Part], context));
    return bn;
};
const se_CompletedPart = (input, context) => {
    const bn = new __XmlNode(_CPo);
    bn.cc(input, _ETa);
    bn.cc(input, _CCRC);
    bn.cc(input, _CCRCC);
    bn.cc(input, _CCRCNVME);
    bn.cc(input, _CSHA);
    bn.cc(input, _CSHAh);
    if (input[_PN] != null) {
        bn.c(__XmlNode.of(_PN, String(input[_PN])).n(_PN));
    }
    return bn;
};
const se_CompletedPartList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = se_CompletedPart(entry, context);
        return n.n(_me);
    });
};
const se_Condition = (input, context) => {
    const bn = new __XmlNode(_Con);
    bn.cc(input, _HECRE);
    bn.cc(input, _KPE);
    return bn;
};
const se_CORSConfiguration = (input, context) => {
    const bn = new __XmlNode(_CORSC);
    bn.l(input, "CORSRules", "CORSRule", () => se_CORSRules(input[_CORSRu], context));
    return bn;
};
const se_CORSRule = (input, context) => {
    const bn = new __XmlNode(_CORSR);
    bn.cc(input, _ID_);
    bn.l(input, "AllowedHeaders", "AllowedHeader", () => se_AllowedHeaders(input[_AHl], context));
    bn.l(input, "AllowedMethods", "AllowedMethod", () => se_AllowedMethods(input[_AMl], context));
    bn.l(input, "AllowedOrigins", "AllowedOrigin", () => se_AllowedOrigins(input[_AOl], context));
    bn.l(input, "ExposeHeaders", "ExposeHeader", () => se_ExposeHeaders(input[_EH], context));
    if (input[_MAS] != null) {
        bn.c(__XmlNode.of(_MAS, String(input[_MAS])).n(_MAS));
    }
    return bn;
};
const se_CORSRules = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = se_CORSRule(entry, context);
        return n.n(_me);
    });
};
const se_CreateBucketConfiguration = (input, context) => {
    const bn = new __XmlNode(_CBC);
    if (input[_LC] != null) {
        bn.c(__XmlNode.of(_BLCu, input[_LC]).n(_LC));
    }
    if (input[_L] != null) {
        bn.c(se_LocationInfo(input[_L], context).n(_L));
    }
    if (input[_B] != null) {
        bn.c(se_BucketInfo(input[_B], context).n(_B));
    }
    return bn;
};
const se_CSVInput = (input, context) => {
    const bn = new __XmlNode(_CSVIn);
    bn.cc(input, _FHI);
    bn.cc(input, _Com);
    bn.cc(input, _QEC);
    bn.cc(input, _RD);
    bn.cc(input, _FD);
    bn.cc(input, _QCuo);
    if (input[_AQRD] != null) {
        bn.c(__XmlNode.of(_AQRD, String(input[_AQRD])).n(_AQRD));
    }
    return bn;
};
const se_CSVOutput = (input, context) => {
    const bn = new __XmlNode(_CSVO);
    bn.cc(input, _QF);
    bn.cc(input, _QEC);
    bn.cc(input, _RD);
    bn.cc(input, _FD);
    bn.cc(input, _QCuo);
    return bn;
};
const se_DefaultRetention = (input, context) => {
    const bn = new __XmlNode(_DRe);
    if (input[_Mo] != null) {
        bn.c(__XmlNode.of(_OLRM, input[_Mo]).n(_Mo));
    }
    if (input[_Da] != null) {
        bn.c(__XmlNode.of(_Da, String(input[_Da])).n(_Da));
    }
    if (input[_Y] != null) {
        bn.c(__XmlNode.of(_Y, String(input[_Y])).n(_Y));
    }
    return bn;
};
const se_Delete = (input, context) => {
    const bn = new __XmlNode(_Del);
    bn.l(input, "Objects", "Object", () => se_ObjectIdentifierList(input[_Ob], context));
    if (input[_Q] != null) {
        bn.c(__XmlNode.of(_Q, String(input[_Q])).n(_Q));
    }
    return bn;
};
const se_DeleteMarkerReplication = (input, context) => {
    const bn = new __XmlNode(_DMR);
    if (input[_S] != null) {
        bn.c(__XmlNode.of(_DMRS, input[_S]).n(_S));
    }
    return bn;
};
const se_Destination = (input, context) => {
    const bn = new __XmlNode(_Des);
    if (input[_B] != null) {
        bn.c(__XmlNode.of(_BN, input[_B]).n(_B));
    }
    if (input[_Ac] != null) {
        bn.c(__XmlNode.of(_AIc, input[_Ac]).n(_Ac));
    }
    bn.cc(input, _SC);
    if (input[_ACT] != null) {
        bn.c(se_AccessControlTranslation(input[_ACT], context).n(_ACT));
    }
    if (input[_ECn] != null) {
        bn.c(se_EncryptionConfiguration(input[_ECn], context).n(_ECn));
    }
    if (input[_RTe] != null) {
        bn.c(se_ReplicationTime(input[_RTe], context).n(_RTe));
    }
    if (input[_Me] != null) {
        bn.c(se_Metrics(input[_Me], context).n(_Me));
    }
    return bn;
};
const se_Encryption = (input, context) => {
    const bn = new __XmlNode(_En);
    if (input[_ETn] != null) {
        bn.c(__XmlNode.of(_SSE, input[_ETn]).n(_ETn));
    }
    if (input[_KMSKI] != null) {
        bn.c(__XmlNode.of(_SSEKMSKI, input[_KMSKI]).n(_KMSKI));
    }
    bn.cc(input, _KMSC);
    return bn;
};
const se_EncryptionConfiguration = (input, context) => {
    const bn = new __XmlNode(_ECn);
    bn.cc(input, _RKKID);
    return bn;
};
const se_ErrorDocument = (input, context) => {
    const bn = new __XmlNode(_ED);
    if (input[_K] != null) {
        bn.c(__XmlNode.of(_OK, input[_K]).n(_K));
    }
    return bn;
};
const se_EventBridgeConfiguration = (input, context) => {
    const bn = new __XmlNode(_EBC);
    return bn;
};
const se_EventList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = __XmlNode.of(_Ev, entry);
        return n.n(_me);
    });
};
const se_ExistingObjectReplication = (input, context) => {
    const bn = new __XmlNode(_EOR);
    if (input[_S] != null) {
        bn.c(__XmlNode.of(_EORS, input[_S]).n(_S));
    }
    return bn;
};
const se_ExposeHeaders = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = __XmlNode.of(_EHx, entry);
        return n.n(_me);
    });
};
const se_FilterRule = (input, context) => {
    const bn = new __XmlNode(_FR);
    if (input[_N] != null) {
        bn.c(__XmlNode.of(_FRN, input[_N]).n(_N));
    }
    if (input[_Va] != null) {
        bn.c(__XmlNode.of(_FRV, input[_Va]).n(_Va));
    }
    return bn;
};
const se_FilterRuleList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = se_FilterRule(entry, context);
        return n.n(_me);
    });
};
const se_GlacierJobParameters = (input, context) => {
    const bn = new __XmlNode(_GJP);
    bn.cc(input, _Ti);
    return bn;
};
const se_Grant = (input, context) => {
    const bn = new __XmlNode(_G);
    if (input[_Gra] != null) {
        const n = se_Grantee(input[_Gra], context).n(_Gra);
        n.a("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
        bn.c(n);
    }
    bn.cc(input, _Pe);
    return bn;
};
const se_Grantee = (input, context) => {
    const bn = new __XmlNode(_Gra);
    bn.cc(input, _DN);
    bn.cc(input, _EA);
    bn.cc(input, _ID_);
    bn.cc(input, _URI);
    bn.a("xsi:type", input[_Ty]);
    return bn;
};
const se_Grants = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = se_Grant(entry, context);
        return n.n(_G);
    });
};
const se_IndexDocument = (input, context) => {
    const bn = new __XmlNode(_ID);
    bn.cc(input, _Su);
    return bn;
};
const se_InputSerialization = (input, context) => {
    const bn = new __XmlNode(_IS);
    if (input[_CSV] != null) {
        bn.c(se_CSVInput(input[_CSV], context).n(_CSV));
    }
    bn.cc(input, _CTom);
    if (input[_JSON] != null) {
        bn.c(se_JSONInput(input[_JSON], context).n(_JSON));
    }
    if (input[_Parq] != null) {
        bn.c(se_ParquetInput(input[_Parq], context).n(_Parq));
    }
    return bn;
};
const se_IntelligentTieringAndOperator = (input, context) => {
    const bn = new __XmlNode(_ITAO);
    bn.cc(input, _P);
    bn.l(input, "Tags", "Tag", () => se_TagSet(input[_Tag], context));
    return bn;
};
const se_IntelligentTieringConfiguration = (input, context) => {
    const bn = new __XmlNode(_ITC);
    if (input[_I] != null) {
        bn.c(__XmlNode.of(_ITI, input[_I]).n(_I));
    }
    if (input[_F] != null) {
        bn.c(se_IntelligentTieringFilter(input[_F], context).n(_F));
    }
    if (input[_S] != null) {
        bn.c(__XmlNode.of(_ITS, input[_S]).n(_S));
    }
    bn.l(input, "Tierings", "Tiering", () => se_TieringList(input[_Tie], context));
    return bn;
};
const se_IntelligentTieringFilter = (input, context) => {
    const bn = new __XmlNode(_ITF);
    bn.cc(input, _P);
    if (input[_Ta] != null) {
        bn.c(se_Tag(input[_Ta], context).n(_Ta));
    }
    if (input[_A] != null) {
        bn.c(se_IntelligentTieringAndOperator(input[_A], context).n(_A));
    }
    return bn;
};
const se_InventoryConfiguration = (input, context) => {
    const bn = new __XmlNode(_IC);
    if (input[_Des] != null) {
        bn.c(se_InventoryDestination(input[_Des], context).n(_Des));
    }
    if (input[_IE] != null) {
        bn.c(__XmlNode.of(_IE, String(input[_IE])).n(_IE));
    }
    if (input[_F] != null) {
        bn.c(se_InventoryFilter(input[_F], context).n(_F));
    }
    if (input[_I] != null) {
        bn.c(__XmlNode.of(_II, input[_I]).n(_I));
    }
    if (input[_IOV] != null) {
        bn.c(__XmlNode.of(_IIOV, input[_IOV]).n(_IOV));
    }
    bn.lc(input, "OptionalFields", "OptionalFields", () => se_InventoryOptionalFields(input[_OF], context));
    if (input[_Sc] != null) {
        bn.c(se_InventorySchedule(input[_Sc], context).n(_Sc));
    }
    return bn;
};
const se_InventoryDestination = (input, context) => {
    const bn = new __XmlNode(_IDn);
    if (input[_SBD] != null) {
        bn.c(se_InventoryS3BucketDestination(input[_SBD], context).n(_SBD));
    }
    return bn;
};
const se_InventoryEncryption = (input, context) => {
    const bn = new __XmlNode(_IEn);
    if (input[_SSES] != null) {
        bn.c(se_SSES3(input[_SSES], context).n(_SS));
    }
    if (input[_SSEKMS] != null) {
        bn.c(se_SSEKMS(input[_SSEKMS], context).n(_SK));
    }
    return bn;
};
const se_InventoryFilter = (input, context) => {
    const bn = new __XmlNode(_IF);
    bn.cc(input, _P);
    return bn;
};
const se_InventoryOptionalFields = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = __XmlNode.of(_IOF, entry);
        return n.n(_Fi);
    });
};
const se_InventoryS3BucketDestination = (input, context) => {
    const bn = new __XmlNode(_ISBD);
    bn.cc(input, _AIc);
    if (input[_B] != null) {
        bn.c(__XmlNode.of(_BN, input[_B]).n(_B));
    }
    if (input[_Fo] != null) {
        bn.c(__XmlNode.of(_IFn, input[_Fo]).n(_Fo));
    }
    bn.cc(input, _P);
    if (input[_En] != null) {
        bn.c(se_InventoryEncryption(input[_En], context).n(_En));
    }
    return bn;
};
const se_InventorySchedule = (input, context) => {
    const bn = new __XmlNode(_ISn);
    if (input[_Fr] != null) {
        bn.c(__XmlNode.of(_IFnv, input[_Fr]).n(_Fr));
    }
    return bn;
};
const se_JSONInput = (input, context) => {
    const bn = new __XmlNode(_JSONI);
    if (input[_Ty] != null) {
        bn.c(__XmlNode.of(_JSONT, input[_Ty]).n(_Ty));
    }
    return bn;
};
const se_JSONOutput = (input, context) => {
    const bn = new __XmlNode(_JSONO);
    bn.cc(input, _RD);
    return bn;
};
const se_LambdaFunctionConfiguration = (input, context) => {
    const bn = new __XmlNode(_LFCa);
    if (input[_I] != null) {
        bn.c(__XmlNode.of(_NI, input[_I]).n(_I));
    }
    if (input[_LFA] != null) {
        bn.c(__XmlNode.of(_LFA, input[_LFA]).n(_CF));
    }
    bn.l(input, "Events", "Event", () => se_EventList(input[_Eve], context));
    if (input[_F] != null) {
        bn.c(se_NotificationConfigurationFilter(input[_F], context).n(_F));
    }
    return bn;
};
const se_LambdaFunctionConfigurationList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = se_LambdaFunctionConfiguration(entry, context);
        return n.n(_me);
    });
};
const se_LifecycleExpiration = (input, context) => {
    const bn = new __XmlNode(_LEi);
    if (input[_Dat] != null) {
        bn.c(__XmlNode.of(_Dat, __serializeDateTime(input[_Dat]).toString()).n(_Dat));
    }
    if (input[_Da] != null) {
        bn.c(__XmlNode.of(_Da, String(input[_Da])).n(_Da));
    }
    if (input[_EODM] != null) {
        bn.c(__XmlNode.of(_EODM, String(input[_EODM])).n(_EODM));
    }
    return bn;
};
const se_LifecycleRule = (input, context) => {
    const bn = new __XmlNode(_LR);
    if (input[_Exp] != null) {
        bn.c(se_LifecycleExpiration(input[_Exp], context).n(_Exp));
    }
    bn.cc(input, _ID_);
    bn.cc(input, _P);
    if (input[_F] != null) {
        bn.c(se_LifecycleRuleFilter(input[_F], context).n(_F));
    }
    if (input[_S] != null) {
        bn.c(__XmlNode.of(_ESx, input[_S]).n(_S));
    }
    bn.l(input, "Transitions", "Transition", () => se_TransitionList(input[_Tr], context));
    bn.l(input, "NoncurrentVersionTransitions", "NoncurrentVersionTransition", () => se_NoncurrentVersionTransitionList(input[_NVT], context));
    if (input[_NVE] != null) {
        bn.c(se_NoncurrentVersionExpiration(input[_NVE], context).n(_NVE));
    }
    if (input[_AIMU] != null) {
        bn.c(se_AbortIncompleteMultipartUpload(input[_AIMU], context).n(_AIMU));
    }
    return bn;
};
const se_LifecycleRuleAndOperator = (input, context) => {
    const bn = new __XmlNode(_LRAO);
    bn.cc(input, _P);
    bn.l(input, "Tags", "Tag", () => se_TagSet(input[_Tag], context));
    if (input[_OSGT] != null) {
        bn.c(__XmlNode.of(_OSGTB, String(input[_OSGT])).n(_OSGT));
    }
    if (input[_OSLT] != null) {
        bn.c(__XmlNode.of(_OSLTB, String(input[_OSLT])).n(_OSLT));
    }
    return bn;
};
const se_LifecycleRuleFilter = (input, context) => {
    const bn = new __XmlNode(_LRF);
    bn.cc(input, _P);
    if (input[_Ta] != null) {
        bn.c(se_Tag(input[_Ta], context).n(_Ta));
    }
    if (input[_OSGT] != null) {
        bn.c(__XmlNode.of(_OSGTB, String(input[_OSGT])).n(_OSGT));
    }
    if (input[_OSLT] != null) {
        bn.c(__XmlNode.of(_OSLTB, String(input[_OSLT])).n(_OSLT));
    }
    if (input[_A] != null) {
        bn.c(se_LifecycleRuleAndOperator(input[_A], context).n(_A));
    }
    return bn;
};
const se_LifecycleRules = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = se_LifecycleRule(entry, context);
        return n.n(_me);
    });
};
const se_LocationInfo = (input, context) => {
    const bn = new __XmlNode(_LI);
    if (input[_Ty] != null) {
        bn.c(__XmlNode.of(_LT, input[_Ty]).n(_Ty));
    }
    if (input[_N] != null) {
        bn.c(__XmlNode.of(_LNAS, input[_N]).n(_N));
    }
    return bn;
};
const se_LoggingEnabled = (input, context) => {
    const bn = new __XmlNode(_LE);
    bn.cc(input, _TB);
    bn.lc(input, "TargetGrants", "TargetGrants", () => se_TargetGrants(input[_TG], context));
    bn.cc(input, _TP);
    if (input[_TOKF] != null) {
        bn.c(se_TargetObjectKeyFormat(input[_TOKF], context).n(_TOKF));
    }
    return bn;
};
const se_MetadataEntry = (input, context) => {
    const bn = new __XmlNode(_ME);
    if (input[_N] != null) {
        bn.c(__XmlNode.of(_MKe, input[_N]).n(_N));
    }
    if (input[_Va] != null) {
        bn.c(__XmlNode.of(_MV, input[_Va]).n(_Va));
    }
    return bn;
};
const se_MetadataTableConfiguration = (input, context) => {
    const bn = new __XmlNode(_MTC);
    if (input[_STD] != null) {
        bn.c(se_S3TablesDestination(input[_STD], context).n(_STD));
    }
    return bn;
};
const se_Metrics = (input, context) => {
    const bn = new __XmlNode(_Me);
    if (input[_S] != null) {
        bn.c(__XmlNode.of(_MS, input[_S]).n(_S));
    }
    if (input[_ETv] != null) {
        bn.c(se_ReplicationTimeValue(input[_ETv], context).n(_ETv));
    }
    return bn;
};
const se_MetricsAndOperator = (input, context) => {
    const bn = new __XmlNode(_MAO);
    bn.cc(input, _P);
    bn.l(input, "Tags", "Tag", () => se_TagSet(input[_Tag], context));
    bn.cc(input, _APAc);
    return bn;
};
const se_MetricsConfiguration = (input, context) => {
    const bn = new __XmlNode(_MC);
    if (input[_I] != null) {
        bn.c(__XmlNode.of(_MI, input[_I]).n(_I));
    }
    if (input[_F] != null) {
        bn.c(se_MetricsFilter(input[_F], context).n(_F));
    }
    return bn;
};
const se_MetricsFilter = (input, context) => {
    const bn = new __XmlNode(_MF);
    MetricsFilter.visit(input, {
        Prefix: (value) => {
            if (input[_P] != null) {
                bn.c(__XmlNode.of(_P, value).n(_P));
            }
        },
        Tag: (value) => {
            if (input[_Ta] != null) {
                bn.c(se_Tag(value, context).n(_Ta));
            }
        },
        AccessPointArn: (value) => {
            if (input[_APAc] != null) {
                bn.c(__XmlNode.of(_APAc, value).n(_APAc));
            }
        },
        And: (value) => {
            if (input[_A] != null) {
                bn.c(se_MetricsAndOperator(value, context).n(_A));
            }
        },
        _: (name, value) => {
            if (!(value instanceof __XmlNode || value instanceof __XmlText)) {
                throw new Error("Unable to serialize unknown union members in XML.");
            }
            bn.c(new __XmlNode(name).c(value));
        },
    });
    return bn;
};
const se_NoncurrentVersionExpiration = (input, context) => {
    const bn = new __XmlNode(_NVE);
    if (input[_ND] != null) {
        bn.c(__XmlNode.of(_Da, String(input[_ND])).n(_ND));
    }
    if (input[_NNV] != null) {
        bn.c(__XmlNode.of(_VC, String(input[_NNV])).n(_NNV));
    }
    return bn;
};
const se_NoncurrentVersionTransition = (input, context) => {
    const bn = new __XmlNode(_NVTo);
    if (input[_ND] != null) {
        bn.c(__XmlNode.of(_Da, String(input[_ND])).n(_ND));
    }
    if (input[_SC] != null) {
        bn.c(__XmlNode.of(_TSC, input[_SC]).n(_SC));
    }
    if (input[_NNV] != null) {
        bn.c(__XmlNode.of(_VC, String(input[_NNV])).n(_NNV));
    }
    return bn;
};
const se_NoncurrentVersionTransitionList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = se_NoncurrentVersionTransition(entry, context);
        return n.n(_me);
    });
};
const se_NotificationConfiguration = (input, context) => {
    const bn = new __XmlNode(_NC);
    bn.l(input, "TopicConfigurations", "TopicConfiguration", () => se_TopicConfigurationList(input[_TCop], context));
    bn.l(input, "QueueConfigurations", "QueueConfiguration", () => se_QueueConfigurationList(input[_QCu], context));
    bn.l(input, "LambdaFunctionConfigurations", "CloudFunctionConfiguration", () => se_LambdaFunctionConfigurationList(input[_LFC], context));
    if (input[_EBC] != null) {
        bn.c(se_EventBridgeConfiguration(input[_EBC], context).n(_EBC));
    }
    return bn;
};
const se_NotificationConfigurationFilter = (input, context) => {
    const bn = new __XmlNode(_NCF);
    if (input[_K] != null) {
        bn.c(se_S3KeyFilter(input[_K], context).n(_SKe));
    }
    return bn;
};
const se_ObjectIdentifier = (input, context) => {
    const bn = new __XmlNode(_OI);
    if (input[_K] != null) {
        bn.c(__XmlNode.of(_OK, input[_K]).n(_K));
    }
    if (input[_VI] != null) {
        bn.c(__XmlNode.of(_OVI, input[_VI]).n(_VI));
    }
    bn.cc(input, _ETa);
    if (input[_LMT] != null) {
        bn.c(__XmlNode.of(_LMT, __dateToUtcString(input[_LMT]).toString()).n(_LMT));
    }
    if (input[_Si] != null) {
        bn.c(__XmlNode.of(_Si, String(input[_Si])).n(_Si));
    }
    return bn;
};
const se_ObjectIdentifierList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = se_ObjectIdentifier(entry, context);
        return n.n(_me);
    });
};
const se_ObjectLockConfiguration = (input, context) => {
    const bn = new __XmlNode(_OLC);
    bn.cc(input, _OLE);
    if (input[_Ru] != null) {
        bn.c(se_ObjectLockRule(input[_Ru], context).n(_Ru));
    }
    return bn;
};
const se_ObjectLockLegalHold = (input, context) => {
    const bn = new __XmlNode(_OLLH);
    if (input[_S] != null) {
        bn.c(__XmlNode.of(_OLLHS, input[_S]).n(_S));
    }
    return bn;
};
const se_ObjectLockRetention = (input, context) => {
    const bn = new __XmlNode(_OLR);
    if (input[_Mo] != null) {
        bn.c(__XmlNode.of(_OLRM, input[_Mo]).n(_Mo));
    }
    if (input[_RUD] != null) {
        bn.c(__XmlNode.of(_Dat, __serializeDateTime(input[_RUD]).toString()).n(_RUD));
    }
    return bn;
};
const se_ObjectLockRule = (input, context) => {
    const bn = new __XmlNode(_OLRb);
    if (input[_DRe] != null) {
        bn.c(se_DefaultRetention(input[_DRe], context).n(_DRe));
    }
    return bn;
};
const se_OutputLocation = (input, context) => {
    const bn = new __XmlNode(_OL);
    if (input[_S_] != null) {
        bn.c(se_S3Location(input[_S_], context).n(_S_));
    }
    return bn;
};
const se_OutputSerialization = (input, context) => {
    const bn = new __XmlNode(_OS);
    if (input[_CSV] != null) {
        bn.c(se_CSVOutput(input[_CSV], context).n(_CSV));
    }
    if (input[_JSON] != null) {
        bn.c(se_JSONOutput(input[_JSON], context).n(_JSON));
    }
    return bn;
};
const se_Owner = (input, context) => {
    const bn = new __XmlNode(_O);
    bn.cc(input, _DN);
    bn.cc(input, _ID_);
    return bn;
};
const se_OwnershipControls = (input, context) => {
    const bn = new __XmlNode(_OC);
    bn.l(input, "Rules", "Rule", () => se_OwnershipControlsRules(input[_Rul], context));
    return bn;
};
const se_OwnershipControlsRule = (input, context) => {
    const bn = new __XmlNode(_OCR);
    bn.cc(input, _OO);
    return bn;
};
const se_OwnershipControlsRules = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = se_OwnershipControlsRule(entry, context);
        return n.n(_me);
    });
};
const se_ParquetInput = (input, context) => {
    const bn = new __XmlNode(_PI);
    return bn;
};
const se_PartitionedPrefix = (input, context) => {
    const bn = new __XmlNode(_PP);
    bn.cc(input, _PDS);
    return bn;
};
const se_PublicAccessBlockConfiguration = (input, context) => {
    const bn = new __XmlNode(_PABC);
    if (input[_BPA] != null) {
        bn.c(__XmlNode.of(_Se, String(input[_BPA])).n(_BPA));
    }
    if (input[_IPA] != null) {
        bn.c(__XmlNode.of(_Se, String(input[_IPA])).n(_IPA));
    }
    if (input[_BPP] != null) {
        bn.c(__XmlNode.of(_Se, String(input[_BPP])).n(_BPP));
    }
    if (input[_RPB] != null) {
        bn.c(__XmlNode.of(_Se, String(input[_RPB])).n(_RPB));
    }
    return bn;
};
const se_QueueConfiguration = (input, context) => {
    const bn = new __XmlNode(_QC);
    if (input[_I] != null) {
        bn.c(__XmlNode.of(_NI, input[_I]).n(_I));
    }
    if (input[_QA] != null) {
        bn.c(__XmlNode.of(_QA, input[_QA]).n(_Qu));
    }
    bn.l(input, "Events", "Event", () => se_EventList(input[_Eve], context));
    if (input[_F] != null) {
        bn.c(se_NotificationConfigurationFilter(input[_F], context).n(_F));
    }
    return bn;
};
const se_QueueConfigurationList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = se_QueueConfiguration(entry, context);
        return n.n(_me);
    });
};
const se_Redirect = (input, context) => {
    const bn = new __XmlNode(_Red);
    bn.cc(input, _HN);
    bn.cc(input, _HRC);
    bn.cc(input, _Pr);
    bn.cc(input, _RKPW);
    bn.cc(input, _RKW);
    return bn;
};
const se_RedirectAllRequestsTo = (input, context) => {
    const bn = new __XmlNode(_RART);
    bn.cc(input, _HN);
    bn.cc(input, _Pr);
    return bn;
};
const se_ReplicaModifications = (input, context) => {
    const bn = new __XmlNode(_RM);
    if (input[_S] != null) {
        bn.c(__XmlNode.of(_RMS, input[_S]).n(_S));
    }
    return bn;
};
const se_ReplicationConfiguration = (input, context) => {
    const bn = new __XmlNode(_RCe);
    bn.cc(input, _Ro);
    bn.l(input, "Rules", "Rule", () => se_ReplicationRules(input[_Rul], context));
    return bn;
};
const se_ReplicationRule = (input, context) => {
    const bn = new __XmlNode(_RRe);
    bn.cc(input, _ID_);
    if (input[_Pri] != null) {
        bn.c(__XmlNode.of(_Pri, String(input[_Pri])).n(_Pri));
    }
    bn.cc(input, _P);
    if (input[_F] != null) {
        bn.c(se_ReplicationRuleFilter(input[_F], context).n(_F));
    }
    if (input[_S] != null) {
        bn.c(__XmlNode.of(_RRS, input[_S]).n(_S));
    }
    if (input[_SSC] != null) {
        bn.c(se_SourceSelectionCriteria(input[_SSC], context).n(_SSC));
    }
    if (input[_EOR] != null) {
        bn.c(se_ExistingObjectReplication(input[_EOR], context).n(_EOR));
    }
    if (input[_Des] != null) {
        bn.c(se_Destination(input[_Des], context).n(_Des));
    }
    if (input[_DMR] != null) {
        bn.c(se_DeleteMarkerReplication(input[_DMR], context).n(_DMR));
    }
    return bn;
};
const se_ReplicationRuleAndOperator = (input, context) => {
    const bn = new __XmlNode(_RRAO);
    bn.cc(input, _P);
    bn.l(input, "Tags", "Tag", () => se_TagSet(input[_Tag], context));
    return bn;
};
const se_ReplicationRuleFilter = (input, context) => {
    const bn = new __XmlNode(_RRF);
    bn.cc(input, _P);
    if (input[_Ta] != null) {
        bn.c(se_Tag(input[_Ta], context).n(_Ta));
    }
    if (input[_A] != null) {
        bn.c(se_ReplicationRuleAndOperator(input[_A], context).n(_A));
    }
    return bn;
};
const se_ReplicationRules = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = se_ReplicationRule(entry, context);
        return n.n(_me);
    });
};
const se_ReplicationTime = (input, context) => {
    const bn = new __XmlNode(_RTe);
    if (input[_S] != null) {
        bn.c(__XmlNode.of(_RTS, input[_S]).n(_S));
    }
    if (input[_Tim] != null) {
        bn.c(se_ReplicationTimeValue(input[_Tim], context).n(_Tim));
    }
    return bn;
};
const se_ReplicationTimeValue = (input, context) => {
    const bn = new __XmlNode(_RTV);
    if (input[_Mi] != null) {
        bn.c(__XmlNode.of(_Mi, String(input[_Mi])).n(_Mi));
    }
    return bn;
};
const se_RequestPaymentConfiguration = (input, context) => {
    const bn = new __XmlNode(_RPC);
    bn.cc(input, _Pa);
    return bn;
};
const se_RequestProgress = (input, context) => {
    const bn = new __XmlNode(_RPe);
    if (input[_Ena] != null) {
        bn.c(__XmlNode.of(_ERP, String(input[_Ena])).n(_Ena));
    }
    return bn;
};
const se_RestoreRequest = (input, context) => {
    const bn = new __XmlNode(_RRes);
    if (input[_Da] != null) {
        bn.c(__XmlNode.of(_Da, String(input[_Da])).n(_Da));
    }
    if (input[_GJP] != null) {
        bn.c(se_GlacierJobParameters(input[_GJP], context).n(_GJP));
    }
    if (input[_Ty] != null) {
        bn.c(__XmlNode.of(_RRT, input[_Ty]).n(_Ty));
    }
    bn.cc(input, _Ti);
    bn.cc(input, _Desc);
    if (input[_SP] != null) {
        bn.c(se_SelectParameters(input[_SP], context).n(_SP));
    }
    if (input[_OL] != null) {
        bn.c(se_OutputLocation(input[_OL], context).n(_OL));
    }
    return bn;
};
const se_RoutingRule = (input, context) => {
    const bn = new __XmlNode(_RRou);
    if (input[_Con] != null) {
        bn.c(se_Condition(input[_Con], context).n(_Con));
    }
    if (input[_Red] != null) {
        bn.c(se_Redirect(input[_Red], context).n(_Red));
    }
    return bn;
};
const se_RoutingRules = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = se_RoutingRule(entry, context);
        return n.n(_RRou);
    });
};
const se_S3KeyFilter = (input, context) => {
    const bn = new __XmlNode(_SKF);
    bn.l(input, "FilterRules", "FilterRule", () => se_FilterRuleList(input[_FRi], context));
    return bn;
};
const se_S3Location = (input, context) => {
    const bn = new __XmlNode(_SL);
    bn.cc(input, _BN);
    if (input[_P] != null) {
        bn.c(__XmlNode.of(_LP, input[_P]).n(_P));
    }
    if (input[_En] != null) {
        bn.c(se_Encryption(input[_En], context).n(_En));
    }
    if (input[_CACL] != null) {
        bn.c(__XmlNode.of(_OCACL, input[_CACL]).n(_CACL));
    }
    bn.lc(input, "AccessControlList", "AccessControlList", () => se_Grants(input[_ACLc], context));
    if (input[_T] != null) {
        bn.c(se_Tagging(input[_T], context).n(_T));
    }
    bn.lc(input, "UserMetadata", "UserMetadata", () => se_UserMetadata(input[_UM], context));
    bn.cc(input, _SC);
    return bn;
};
const se_S3TablesDestination = (input, context) => {
    const bn = new __XmlNode(_STD);
    if (input[_TBA] != null) {
        bn.c(__XmlNode.of(_STBA, input[_TBA]).n(_TBA));
    }
    if (input[_TN] != null) {
        bn.c(__XmlNode.of(_STN, input[_TN]).n(_TN));
    }
    return bn;
};
const se_ScanRange = (input, context) => {
    const bn = new __XmlNode(_SR);
    if (input[_St] != null) {
        bn.c(__XmlNode.of(_St, String(input[_St])).n(_St));
    }
    if (input[_End] != null) {
        bn.c(__XmlNode.of(_End, String(input[_End])).n(_End));
    }
    return bn;
};
const se_SelectParameters = (input, context) => {
    const bn = new __XmlNode(_SP);
    if (input[_IS] != null) {
        bn.c(se_InputSerialization(input[_IS], context).n(_IS));
    }
    bn.cc(input, _ETx);
    bn.cc(input, _Ex);
    if (input[_OS] != null) {
        bn.c(se_OutputSerialization(input[_OS], context).n(_OS));
    }
    return bn;
};
const se_ServerSideEncryptionByDefault = (input, context) => {
    const bn = new __XmlNode(_SSEBD);
    if (input[_SSEA] != null) {
        bn.c(__XmlNode.of(_SSE, input[_SSEA]).n(_SSEA));
    }
    if (input[_KMSMKID] != null) {
        bn.c(__XmlNode.of(_SSEKMSKI, input[_KMSMKID]).n(_KMSMKID));
    }
    return bn;
};
const se_ServerSideEncryptionConfiguration = (input, context) => {
    const bn = new __XmlNode(_SSEC);
    bn.l(input, "Rules", "Rule", () => se_ServerSideEncryptionRules(input[_Rul], context));
    return bn;
};
const se_ServerSideEncryptionRule = (input, context) => {
    const bn = new __XmlNode(_SSER);
    if (input[_ASSEBD] != null) {
        bn.c(se_ServerSideEncryptionByDefault(input[_ASSEBD], context).n(_ASSEBD));
    }
    if (input[_BKE] != null) {
        bn.c(__XmlNode.of(_BKE, String(input[_BKE])).n(_BKE));
    }
    return bn;
};
const se_ServerSideEncryptionRules = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = se_ServerSideEncryptionRule(entry, context);
        return n.n(_me);
    });
};
const se_SimplePrefix = (input, context) => {
    const bn = new __XmlNode(_SPi);
    return bn;
};
const se_SourceSelectionCriteria = (input, context) => {
    const bn = new __XmlNode(_SSC);
    if (input[_SKEO] != null) {
        bn.c(se_SseKmsEncryptedObjects(input[_SKEO], context).n(_SKEO));
    }
    if (input[_RM] != null) {
        bn.c(se_ReplicaModifications(input[_RM], context).n(_RM));
    }
    return bn;
};
const se_SSEKMS = (input, context) => {
    const bn = new __XmlNode(_SK);
    if (input[_KI] != null) {
        bn.c(__XmlNode.of(_SSEKMSKI, input[_KI]).n(_KI));
    }
    return bn;
};
const se_SseKmsEncryptedObjects = (input, context) => {
    const bn = new __XmlNode(_SKEO);
    if (input[_S] != null) {
        bn.c(__XmlNode.of(_SKEOS, input[_S]).n(_S));
    }
    return bn;
};
const se_SSES3 = (input, context) => {
    const bn = new __XmlNode(_SS);
    return bn;
};
const se_StorageClassAnalysis = (input, context) => {
    const bn = new __XmlNode(_SCA);
    if (input[_DE] != null) {
        bn.c(se_StorageClassAnalysisDataExport(input[_DE], context).n(_DE));
    }
    return bn;
};
const se_StorageClassAnalysisDataExport = (input, context) => {
    const bn = new __XmlNode(_SCADE);
    if (input[_OSV] != null) {
        bn.c(__XmlNode.of(_SCASV, input[_OSV]).n(_OSV));
    }
    if (input[_Des] != null) {
        bn.c(se_AnalyticsExportDestination(input[_Des], context).n(_Des));
    }
    return bn;
};
const se_Tag = (input, context) => {
    const bn = new __XmlNode(_Ta);
    if (input[_K] != null) {
        bn.c(__XmlNode.of(_OK, input[_K]).n(_K));
    }
    bn.cc(input, _Va);
    return bn;
};
const se_Tagging = (input, context) => {
    const bn = new __XmlNode(_T);
    bn.lc(input, "TagSet", "TagSet", () => se_TagSet(input[_TS], context));
    return bn;
};
const se_TagSet = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = se_Tag(entry, context);
        return n.n(_Ta);
    });
};
const se_TargetGrant = (input, context) => {
    const bn = new __XmlNode(_TGa);
    if (input[_Gra] != null) {
        const n = se_Grantee(input[_Gra], context).n(_Gra);
        n.a("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
        bn.c(n);
    }
    if (input[_Pe] != null) {
        bn.c(__XmlNode.of(_BLP, input[_Pe]).n(_Pe));
    }
    return bn;
};
const se_TargetGrants = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = se_TargetGrant(entry, context);
        return n.n(_G);
    });
};
const se_TargetObjectKeyFormat = (input, context) => {
    const bn = new __XmlNode(_TOKF);
    if (input[_SPi] != null) {
        bn.c(se_SimplePrefix(input[_SPi], context).n(_SPi));
    }
    if (input[_PP] != null) {
        bn.c(se_PartitionedPrefix(input[_PP], context).n(_PP));
    }
    return bn;
};
const se_Tiering = (input, context) => {
    const bn = new __XmlNode(_Tier);
    if (input[_Da] != null) {
        bn.c(__XmlNode.of(_ITD, String(input[_Da])).n(_Da));
    }
    if (input[_AT] != null) {
        bn.c(__XmlNode.of(_ITAT, input[_AT]).n(_AT));
    }
    return bn;
};
const se_TieringList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = se_Tiering(entry, context);
        return n.n(_me);
    });
};
const se_TopicConfiguration = (input, context) => {
    const bn = new __XmlNode(_TCo);
    if (input[_I] != null) {
        bn.c(__XmlNode.of(_NI, input[_I]).n(_I));
    }
    if (input[_TA] != null) {
        bn.c(__XmlNode.of(_TA, input[_TA]).n(_Top));
    }
    bn.l(input, "Events", "Event", () => se_EventList(input[_Eve], context));
    if (input[_F] != null) {
        bn.c(se_NotificationConfigurationFilter(input[_F], context).n(_F));
    }
    return bn;
};
const se_TopicConfigurationList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = se_TopicConfiguration(entry, context);
        return n.n(_me);
    });
};
const se_Transition = (input, context) => {
    const bn = new __XmlNode(_Tra);
    if (input[_Dat] != null) {
        bn.c(__XmlNode.of(_Dat, __serializeDateTime(input[_Dat]).toString()).n(_Dat));
    }
    if (input[_Da] != null) {
        bn.c(__XmlNode.of(_Da, String(input[_Da])).n(_Da));
    }
    if (input[_SC] != null) {
        bn.c(__XmlNode.of(_TSC, input[_SC]).n(_SC));
    }
    return bn;
};
const se_TransitionList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = se_Transition(entry, context);
        return n.n(_me);
    });
};
const se_UserMetadata = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        const n = se_MetadataEntry(entry, context);
        return n.n(_ME);
    });
};
const se_VersioningConfiguration = (input, context) => {
    const bn = new __XmlNode(_VCe);
    if (input[_MFAD] != null) {
        bn.c(__XmlNode.of(_MFAD, input[_MFAD]).n(_MDf));
    }
    if (input[_S] != null) {
        bn.c(__XmlNode.of(_BVS, input[_S]).n(_S));
    }
    return bn;
};
const se_WebsiteConfiguration = (input, context) => {
    const bn = new __XmlNode(_WC);
    if (input[_ED] != null) {
        bn.c(se_ErrorDocument(input[_ED], context).n(_ED));
    }
    if (input[_ID] != null) {
        bn.c(se_IndexDocument(input[_ID], context).n(_ID));
    }
    if (input[_RART] != null) {
        bn.c(se_RedirectAllRequestsTo(input[_RART], context).n(_RART));
    }
    bn.lc(input, "RoutingRules", "RoutingRules", () => se_RoutingRules(input[_RRo], context));
    return bn;
};
const de_AbortIncompleteMultipartUpload = (output, context) => {
    const contents = {};
    if (output[_DAI] != null) {
        contents[_DAI] = __strictParseInt32(output[_DAI]);
    }
    return contents;
};
const de_AccessControlTranslation = (output, context) => {
    const contents = {};
    if (output[_O] != null) {
        contents[_O] = __expectString(output[_O]);
    }
    return contents;
};
const de_AllowedHeaders = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
};
const de_AllowedMethods = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
};
const de_AllowedOrigins = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
};
const de_AnalyticsAndOperator = (output, context) => {
    const contents = {};
    if (output[_P] != null) {
        contents[_P] = __expectString(output[_P]);
    }
    if (output.Tag === "") {
        contents[_Tag] = [];
    }
    else if (output[_Ta] != null) {
        contents[_Tag] = de_TagSet(__getArrayIfSingleItem(output[_Ta]), context);
    }
    return contents;
};
const de_AnalyticsConfiguration = (output, context) => {
    const contents = {};
    if (output[_I] != null) {
        contents[_I] = __expectString(output[_I]);
    }
    if (output.Filter === "") {
    }
    else if (output[_F] != null) {
        contents[_F] = de_AnalyticsFilter(__expectUnion(output[_F]), context);
    }
    if (output[_SCA] != null) {
        contents[_SCA] = de_StorageClassAnalysis(output[_SCA], context);
    }
    return contents;
};
const de_AnalyticsConfigurationList = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_AnalyticsConfiguration(entry, context);
    });
};
const de_AnalyticsExportDestination = (output, context) => {
    const contents = {};
    if (output[_SBD] != null) {
        contents[_SBD] = de_AnalyticsS3BucketDestination(output[_SBD], context);
    }
    return contents;
};
const de_AnalyticsFilter = (output, context) => {
    if (output[_P] != null) {
        return {
            Prefix: __expectString(output[_P]),
        };
    }
    if (output[_Ta] != null) {
        return {
            Tag: de_Tag(output[_Ta], context),
        };
    }
    if (output[_A] != null) {
        return {
            And: de_AnalyticsAndOperator(output[_A], context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_AnalyticsS3BucketDestination = (output, context) => {
    const contents = {};
    if (output[_Fo] != null) {
        contents[_Fo] = __expectString(output[_Fo]);
    }
    if (output[_BAI] != null) {
        contents[_BAI] = __expectString(output[_BAI]);
    }
    if (output[_B] != null) {
        contents[_B] = __expectString(output[_B]);
    }
    if (output[_P] != null) {
        contents[_P] = __expectString(output[_P]);
    }
    return contents;
};
const de_Bucket = (output, context) => {
    const contents = {};
    if (output[_N] != null) {
        contents[_N] = __expectString(output[_N]);
    }
    if (output[_CDr] != null) {
        contents[_CDr] = __expectNonNull(__parseRfc3339DateTimeWithOffset(output[_CDr]));
    }
    if (output[_BR] != null) {
        contents[_BR] = __expectString(output[_BR]);
    }
    return contents;
};
const de_Buckets = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Bucket(entry, context);
    });
};
const de_Checksum = (output, context) => {
    const contents = {};
    if (output[_CCRC] != null) {
        contents[_CCRC] = __expectString(output[_CCRC]);
    }
    if (output[_CCRCC] != null) {
        contents[_CCRCC] = __expectString(output[_CCRCC]);
    }
    if (output[_CCRCNVME] != null) {
        contents[_CCRCNVME] = __expectString(output[_CCRCNVME]);
    }
    if (output[_CSHA] != null) {
        contents[_CSHA] = __expectString(output[_CSHA]);
    }
    if (output[_CSHAh] != null) {
        contents[_CSHAh] = __expectString(output[_CSHAh]);
    }
    if (output[_CT] != null) {
        contents[_CT] = __expectString(output[_CT]);
    }
    return contents;
};
const de_ChecksumAlgorithmList = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
};
const de_CommonPrefix = (output, context) => {
    const contents = {};
    if (output[_P] != null) {
        contents[_P] = __expectString(output[_P]);
    }
    return contents;
};
const de_CommonPrefixList = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_CommonPrefix(entry, context);
    });
};
const de_Condition = (output, context) => {
    const contents = {};
    if (output[_HECRE] != null) {
        contents[_HECRE] = __expectString(output[_HECRE]);
    }
    if (output[_KPE] != null) {
        contents[_KPE] = __expectString(output[_KPE]);
    }
    return contents;
};
const de_ContinuationEvent = (output, context) => {
    const contents = {};
    return contents;
};
const de_CopyObjectResult = (output, context) => {
    const contents = {};
    if (output[_ETa] != null) {
        contents[_ETa] = __expectString(output[_ETa]);
    }
    if (output[_LM] != null) {
        contents[_LM] = __expectNonNull(__parseRfc3339DateTimeWithOffset(output[_LM]));
    }
    if (output[_CT] != null) {
        contents[_CT] = __expectString(output[_CT]);
    }
    if (output[_CCRC] != null) {
        contents[_CCRC] = __expectString(output[_CCRC]);
    }
    if (output[_CCRCC] != null) {
        contents[_CCRCC] = __expectString(output[_CCRCC]);
    }
    if (output[_CCRCNVME] != null) {
        contents[_CCRCNVME] = __expectString(output[_CCRCNVME]);
    }
    if (output[_CSHA] != null) {
        contents[_CSHA] = __expectString(output[_CSHA]);
    }
    if (output[_CSHAh] != null) {
        contents[_CSHAh] = __expectString(output[_CSHAh]);
    }
    return contents;
};
const de_CopyPartResult = (output, context) => {
    const contents = {};
    if (output[_ETa] != null) {
        contents[_ETa] = __expectString(output[_ETa]);
    }
    if (output[_LM] != null) {
        contents[_LM] = __expectNonNull(__parseRfc3339DateTimeWithOffset(output[_LM]));
    }
    if (output[_CCRC] != null) {
        contents[_CCRC] = __expectString(output[_CCRC]);
    }
    if (output[_CCRCC] != null) {
        contents[_CCRCC] = __expectString(output[_CCRCC]);
    }
    if (output[_CCRCNVME] != null) {
        contents[_CCRCNVME] = __expectString(output[_CCRCNVME]);
    }
    if (output[_CSHA] != null) {
        contents[_CSHA] = __expectString(output[_CSHA]);
    }
    if (output[_CSHAh] != null) {
        contents[_CSHAh] = __expectString(output[_CSHAh]);
    }
    return contents;
};
const de_CORSRule = (output, context) => {
    const contents = {};
    if (output[_ID_] != null) {
        contents[_ID_] = __expectString(output[_ID_]);
    }
    if (output.AllowedHeader === "") {
        contents[_AHl] = [];
    }
    else if (output[_AH] != null) {
        contents[_AHl] = de_AllowedHeaders(__getArrayIfSingleItem(output[_AH]), context);
    }
    if (output.AllowedMethod === "") {
        contents[_AMl] = [];
    }
    else if (output[_AM] != null) {
        contents[_AMl] = de_AllowedMethods(__getArrayIfSingleItem(output[_AM]), context);
    }
    if (output.AllowedOrigin === "") {
        contents[_AOl] = [];
    }
    else if (output[_AO] != null) {
        contents[_AOl] = de_AllowedOrigins(__getArrayIfSingleItem(output[_AO]), context);
    }
    if (output.ExposeHeader === "") {
        contents[_EH] = [];
    }
    else if (output[_EHx] != null) {
        contents[_EH] = de_ExposeHeaders(__getArrayIfSingleItem(output[_EHx]), context);
    }
    if (output[_MAS] != null) {
        contents[_MAS] = __strictParseInt32(output[_MAS]);
    }
    return contents;
};
const de_CORSRules = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_CORSRule(entry, context);
    });
};
const de_DefaultRetention = (output, context) => {
    const contents = {};
    if (output[_Mo] != null) {
        contents[_Mo] = __expectString(output[_Mo]);
    }
    if (output[_Da] != null) {
        contents[_Da] = __strictParseInt32(output[_Da]);
    }
    if (output[_Y] != null) {
        contents[_Y] = __strictParseInt32(output[_Y]);
    }
    return contents;
};
const de_DeletedObject = (output, context) => {
    const contents = {};
    if (output[_K] != null) {
        contents[_K] = __expectString(output[_K]);
    }
    if (output[_VI] != null) {
        contents[_VI] = __expectString(output[_VI]);
    }
    if (output[_DM] != null) {
        contents[_DM] = __parseBoolean(output[_DM]);
    }
    if (output[_DMVI] != null) {
        contents[_DMVI] = __expectString(output[_DMVI]);
    }
    return contents;
};
const de_DeletedObjects = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DeletedObject(entry, context);
    });
};
const de_DeleteMarkerEntry = (output, context) => {
    const contents = {};
    if (output[_O] != null) {
        contents[_O] = de_Owner(output[_O], context);
    }
    if (output[_K] != null) {
        contents[_K] = __expectString(output[_K]);
    }
    if (output[_VI] != null) {
        contents[_VI] = __expectString(output[_VI]);
    }
    if (output[_IL] != null) {
        contents[_IL] = __parseBoolean(output[_IL]);
    }
    if (output[_LM] != null) {
        contents[_LM] = __expectNonNull(__parseRfc3339DateTimeWithOffset(output[_LM]));
    }
    return contents;
};
const de_DeleteMarkerReplication = (output, context) => {
    const contents = {};
    if (output[_S] != null) {
        contents[_S] = __expectString(output[_S]);
    }
    return contents;
};
const de_DeleteMarkers = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DeleteMarkerEntry(entry, context);
    });
};
const de_Destination = (output, context) => {
    const contents = {};
    if (output[_B] != null) {
        contents[_B] = __expectString(output[_B]);
    }
    if (output[_Ac] != null) {
        contents[_Ac] = __expectString(output[_Ac]);
    }
    if (output[_SC] != null) {
        contents[_SC] = __expectString(output[_SC]);
    }
    if (output[_ACT] != null) {
        contents[_ACT] = de_AccessControlTranslation(output[_ACT], context);
    }
    if (output[_ECn] != null) {
        contents[_ECn] = de_EncryptionConfiguration(output[_ECn], context);
    }
    if (output[_RTe] != null) {
        contents[_RTe] = de_ReplicationTime(output[_RTe], context);
    }
    if (output[_Me] != null) {
        contents[_Me] = de_Metrics(output[_Me], context);
    }
    return contents;
};
const de_EncryptionConfiguration = (output, context) => {
    const contents = {};
    if (output[_RKKID] != null) {
        contents[_RKKID] = __expectString(output[_RKKID]);
    }
    return contents;
};
const de_EndEvent = (output, context) => {
    const contents = {};
    return contents;
};
const de__Error = (output, context) => {
    const contents = {};
    if (output[_K] != null) {
        contents[_K] = __expectString(output[_K]);
    }
    if (output[_VI] != null) {
        contents[_VI] = __expectString(output[_VI]);
    }
    if (output[_Cod] != null) {
        contents[_Cod] = __expectString(output[_Cod]);
    }
    if (output[_Mes] != null) {
        contents[_Mes] = __expectString(output[_Mes]);
    }
    return contents;
};
const de_ErrorDetails = (output, context) => {
    const contents = {};
    if (output[_EC] != null) {
        contents[_EC] = __expectString(output[_EC]);
    }
    if (output[_EM] != null) {
        contents[_EM] = __expectString(output[_EM]);
    }
    return contents;
};
const de_ErrorDocument = (output, context) => {
    const contents = {};
    if (output[_K] != null) {
        contents[_K] = __expectString(output[_K]);
    }
    return contents;
};
const de_Errors = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de__Error(entry, context);
    });
};
const de_EventBridgeConfiguration = (output, context) => {
    const contents = {};
    return contents;
};
const de_EventList = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
};
const de_ExistingObjectReplication = (output, context) => {
    const contents = {};
    if (output[_S] != null) {
        contents[_S] = __expectString(output[_S]);
    }
    return contents;
};
const de_ExposeHeaders = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
};
const de_FilterRule = (output, context) => {
    const contents = {};
    if (output[_N] != null) {
        contents[_N] = __expectString(output[_N]);
    }
    if (output[_Va] != null) {
        contents[_Va] = __expectString(output[_Va]);
    }
    return contents;
};
const de_FilterRuleList = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_FilterRule(entry, context);
    });
};
const de_GetBucketMetadataTableConfigurationResult = (output, context) => {
    const contents = {};
    if (output[_MTCR] != null) {
        contents[_MTCR] = de_MetadataTableConfigurationResult(output[_MTCR], context);
    }
    if (output[_S] != null) {
        contents[_S] = __expectString(output[_S]);
    }
    if (output[_Er] != null) {
        contents[_Er] = de_ErrorDetails(output[_Er], context);
    }
    return contents;
};
const de_GetObjectAttributesParts = (output, context) => {
    const contents = {};
    if (output[_PC] != null) {
        contents[_TPC] = __strictParseInt32(output[_PC]);
    }
    if (output[_PNM] != null) {
        contents[_PNM] = __expectString(output[_PNM]);
    }
    if (output[_NPNM] != null) {
        contents[_NPNM] = __expectString(output[_NPNM]);
    }
    if (output[_MP] != null) {
        contents[_MP] = __strictParseInt32(output[_MP]);
    }
    if (output[_IT] != null) {
        contents[_IT] = __parseBoolean(output[_IT]);
    }
    if (output.Part === "") {
        contents[_Part] = [];
    }
    else if (output[_Par] != null) {
        contents[_Part] = de_PartsList(__getArrayIfSingleItem(output[_Par]), context);
    }
    return contents;
};
const de_Grant = (output, context) => {
    const contents = {};
    if (output[_Gra] != null) {
        contents[_Gra] = de_Grantee(output[_Gra], context);
    }
    if (output[_Pe] != null) {
        contents[_Pe] = __expectString(output[_Pe]);
    }
    return contents;
};
const de_Grantee = (output, context) => {
    const contents = {};
    if (output[_DN] != null) {
        contents[_DN] = __expectString(output[_DN]);
    }
    if (output[_EA] != null) {
        contents[_EA] = __expectString(output[_EA]);
    }
    if (output[_ID_] != null) {
        contents[_ID_] = __expectString(output[_ID_]);
    }
    if (output[_URI] != null) {
        contents[_URI] = __expectString(output[_URI]);
    }
    if (output[_x] != null) {
        contents[_Ty] = __expectString(output[_x]);
    }
    return contents;
};
const de_Grants = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Grant(entry, context);
    });
};
const de_IndexDocument = (output, context) => {
    const contents = {};
    if (output[_Su] != null) {
        contents[_Su] = __expectString(output[_Su]);
    }
    return contents;
};
const de_Initiator = (output, context) => {
    const contents = {};
    if (output[_ID_] != null) {
        contents[_ID_] = __expectString(output[_ID_]);
    }
    if (output[_DN] != null) {
        contents[_DN] = __expectString(output[_DN]);
    }
    return contents;
};
const de_IntelligentTieringAndOperator = (output, context) => {
    const contents = {};
    if (output[_P] != null) {
        contents[_P] = __expectString(output[_P]);
    }
    if (output.Tag === "") {
        contents[_Tag] = [];
    }
    else if (output[_Ta] != null) {
        contents[_Tag] = de_TagSet(__getArrayIfSingleItem(output[_Ta]), context);
    }
    return contents;
};
const de_IntelligentTieringConfiguration = (output, context) => {
    const contents = {};
    if (output[_I] != null) {
        contents[_I] = __expectString(output[_I]);
    }
    if (output[_F] != null) {
        contents[_F] = de_IntelligentTieringFilter(output[_F], context);
    }
    if (output[_S] != null) {
        contents[_S] = __expectString(output[_S]);
    }
    if (output.Tiering === "") {
        contents[_Tie] = [];
    }
    else if (output[_Tier] != null) {
        contents[_Tie] = de_TieringList(__getArrayIfSingleItem(output[_Tier]), context);
    }
    return contents;
};
const de_IntelligentTieringConfigurationList = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_IntelligentTieringConfiguration(entry, context);
    });
};
const de_IntelligentTieringFilter = (output, context) => {
    const contents = {};
    if (output[_P] != null) {
        contents[_P] = __expectString(output[_P]);
    }
    if (output[_Ta] != null) {
        contents[_Ta] = de_Tag(output[_Ta], context);
    }
    if (output[_A] != null) {
        contents[_A] = de_IntelligentTieringAndOperator(output[_A], context);
    }
    return contents;
};
const de_InventoryConfiguration = (output, context) => {
    const contents = {};
    if (output[_Des] != null) {
        contents[_Des] = de_InventoryDestination(output[_Des], context);
    }
    if (output[_IE] != null) {
        contents[_IE] = __parseBoolean(output[_IE]);
    }
    if (output[_F] != null) {
        contents[_F] = de_InventoryFilter(output[_F], context);
    }
    if (output[_I] != null) {
        contents[_I] = __expectString(output[_I]);
    }
    if (output[_IOV] != null) {
        contents[_IOV] = __expectString(output[_IOV]);
    }
    if (output.OptionalFields === "") {
        contents[_OF] = [];
    }
    else if (output[_OF] != null && output[_OF][_Fi] != null) {
        contents[_OF] = de_InventoryOptionalFields(__getArrayIfSingleItem(output[_OF][_Fi]), context);
    }
    if (output[_Sc] != null) {
        contents[_Sc] = de_InventorySchedule(output[_Sc], context);
    }
    return contents;
};
const de_InventoryConfigurationList = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_InventoryConfiguration(entry, context);
    });
};
const de_InventoryDestination = (output, context) => {
    const contents = {};
    if (output[_SBD] != null) {
        contents[_SBD] = de_InventoryS3BucketDestination(output[_SBD], context);
    }
    return contents;
};
const de_InventoryEncryption = (output, context) => {
    const contents = {};
    if (output[_SS] != null) {
        contents[_SSES] = de_SSES3(output[_SS], context);
    }
    if (output[_SK] != null) {
        contents[_SSEKMS] = de_SSEKMS(output[_SK], context);
    }
    return contents;
};
const de_InventoryFilter = (output, context) => {
    const contents = {};
    if (output[_P] != null) {
        contents[_P] = __expectString(output[_P]);
    }
    return contents;
};
const de_InventoryOptionalFields = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
};
const de_InventoryS3BucketDestination = (output, context) => {
    const contents = {};
    if (output[_AIc] != null) {
        contents[_AIc] = __expectString(output[_AIc]);
    }
    if (output[_B] != null) {
        contents[_B] = __expectString(output[_B]);
    }
    if (output[_Fo] != null) {
        contents[_Fo] = __expectString(output[_Fo]);
    }
    if (output[_P] != null) {
        contents[_P] = __expectString(output[_P]);
    }
    if (output[_En] != null) {
        contents[_En] = de_InventoryEncryption(output[_En], context);
    }
    return contents;
};
const de_InventorySchedule = (output, context) => {
    const contents = {};
    if (output[_Fr] != null) {
        contents[_Fr] = __expectString(output[_Fr]);
    }
    return contents;
};
const de_LambdaFunctionConfiguration = (output, context) => {
    const contents = {};
    if (output[_I] != null) {
        contents[_I] = __expectString(output[_I]);
    }
    if (output[_CF] != null) {
        contents[_LFA] = __expectString(output[_CF]);
    }
    if (output.Event === "") {
        contents[_Eve] = [];
    }
    else if (output[_Ev] != null) {
        contents[_Eve] = de_EventList(__getArrayIfSingleItem(output[_Ev]), context);
    }
    if (output[_F] != null) {
        contents[_F] = de_NotificationConfigurationFilter(output[_F], context);
    }
    return contents;
};
const de_LambdaFunctionConfigurationList = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_LambdaFunctionConfiguration(entry, context);
    });
};
const de_LifecycleExpiration = (output, context) => {
    const contents = {};
    if (output[_Dat] != null) {
        contents[_Dat] = __expectNonNull(__parseRfc3339DateTimeWithOffset(output[_Dat]));
    }
    if (output[_Da] != null) {
        contents[_Da] = __strictParseInt32(output[_Da]);
    }
    if (output[_EODM] != null) {
        contents[_EODM] = __parseBoolean(output[_EODM]);
    }
    return contents;
};
const de_LifecycleRule = (output, context) => {
    const contents = {};
    if (output[_Exp] != null) {
        contents[_Exp] = de_LifecycleExpiration(output[_Exp], context);
    }
    if (output[_ID_] != null) {
        contents[_ID_] = __expectString(output[_ID_]);
    }
    if (output[_P] != null) {
        contents[_P] = __expectString(output[_P]);
    }
    if (output[_F] != null) {
        contents[_F] = de_LifecycleRuleFilter(output[_F], context);
    }
    if (output[_S] != null) {
        contents[_S] = __expectString(output[_S]);
    }
    if (output.Transition === "") {
        contents[_Tr] = [];
    }
    else if (output[_Tra] != null) {
        contents[_Tr] = de_TransitionList(__getArrayIfSingleItem(output[_Tra]), context);
    }
    if (output.NoncurrentVersionTransition === "") {
        contents[_NVT] = [];
    }
    else if (output[_NVTo] != null) {
        contents[_NVT] = de_NoncurrentVersionTransitionList(__getArrayIfSingleItem(output[_NVTo]), context);
    }
    if (output[_NVE] != null) {
        contents[_NVE] = de_NoncurrentVersionExpiration(output[_NVE], context);
    }
    if (output[_AIMU] != null) {
        contents[_AIMU] = de_AbortIncompleteMultipartUpload(output[_AIMU], context);
    }
    return contents;
};
const de_LifecycleRuleAndOperator = (output, context) => {
    const contents = {};
    if (output[_P] != null) {
        contents[_P] = __expectString(output[_P]);
    }
    if (output.Tag === "") {
        contents[_Tag] = [];
    }
    else if (output[_Ta] != null) {
        contents[_Tag] = de_TagSet(__getArrayIfSingleItem(output[_Ta]), context);
    }
    if (output[_OSGT] != null) {
        contents[_OSGT] = __strictParseLong(output[_OSGT]);
    }
    if (output[_OSLT] != null) {
        contents[_OSLT] = __strictParseLong(output[_OSLT]);
    }
    return contents;
};
const de_LifecycleRuleFilter = (output, context) => {
    const contents = {};
    if (output[_P] != null) {
        contents[_P] = __expectString(output[_P]);
    }
    if (output[_Ta] != null) {
        contents[_Ta] = de_Tag(output[_Ta], context);
    }
    if (output[_OSGT] != null) {
        contents[_OSGT] = __strictParseLong(output[_OSGT]);
    }
    if (output[_OSLT] != null) {
        contents[_OSLT] = __strictParseLong(output[_OSLT]);
    }
    if (output[_A] != null) {
        contents[_A] = de_LifecycleRuleAndOperator(output[_A], context);
    }
    return contents;
};
const de_LifecycleRules = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_LifecycleRule(entry, context);
    });
};
const de_LoggingEnabled = (output, context) => {
    const contents = {};
    if (output[_TB] != null) {
        contents[_TB] = __expectString(output[_TB]);
    }
    if (output.TargetGrants === "") {
        contents[_TG] = [];
    }
    else if (output[_TG] != null && output[_TG][_G] != null) {
        contents[_TG] = de_TargetGrants(__getArrayIfSingleItem(output[_TG][_G]), context);
    }
    if (output[_TP] != null) {
        contents[_TP] = __expectString(output[_TP]);
    }
    if (output[_TOKF] != null) {
        contents[_TOKF] = de_TargetObjectKeyFormat(output[_TOKF], context);
    }
    return contents;
};
const de_MetadataTableConfigurationResult = (output, context) => {
    const contents = {};
    if (output[_STDR] != null) {
        contents[_STDR] = de_S3TablesDestinationResult(output[_STDR], context);
    }
    return contents;
};
const de_Metrics = (output, context) => {
    const contents = {};
    if (output[_S] != null) {
        contents[_S] = __expectString(output[_S]);
    }
    if (output[_ETv] != null) {
        contents[_ETv] = de_ReplicationTimeValue(output[_ETv], context);
    }
    return contents;
};
const de_MetricsAndOperator = (output, context) => {
    const contents = {};
    if (output[_P] != null) {
        contents[_P] = __expectString(output[_P]);
    }
    if (output.Tag === "") {
        contents[_Tag] = [];
    }
    else if (output[_Ta] != null) {
        contents[_Tag] = de_TagSet(__getArrayIfSingleItem(output[_Ta]), context);
    }
    if (output[_APAc] != null) {
        contents[_APAc] = __expectString(output[_APAc]);
    }
    return contents;
};
const de_MetricsConfiguration = (output, context) => {
    const contents = {};
    if (output[_I] != null) {
        contents[_I] = __expectString(output[_I]);
    }
    if (output.Filter === "") {
    }
    else if (output[_F] != null) {
        contents[_F] = de_MetricsFilter(__expectUnion(output[_F]), context);
    }
    return contents;
};
const de_MetricsConfigurationList = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_MetricsConfiguration(entry, context);
    });
};
const de_MetricsFilter = (output, context) => {
    if (output[_P] != null) {
        return {
            Prefix: __expectString(output[_P]),
        };
    }
    if (output[_Ta] != null) {
        return {
            Tag: de_Tag(output[_Ta], context),
        };
    }
    if (output[_APAc] != null) {
        return {
            AccessPointArn: __expectString(output[_APAc]),
        };
    }
    if (output[_A] != null) {
        return {
            And: de_MetricsAndOperator(output[_A], context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_MultipartUpload = (output, context) => {
    const contents = {};
    if (output[_UI] != null) {
        contents[_UI] = __expectString(output[_UI]);
    }
    if (output[_K] != null) {
        contents[_K] = __expectString(output[_K]);
    }
    if (output[_Ini] != null) {
        contents[_Ini] = __expectNonNull(__parseRfc3339DateTimeWithOffset(output[_Ini]));
    }
    if (output[_SC] != null) {
        contents[_SC] = __expectString(output[_SC]);
    }
    if (output[_O] != null) {
        contents[_O] = de_Owner(output[_O], context);
    }
    if (output[_In] != null) {
        contents[_In] = de_Initiator(output[_In], context);
    }
    if (output[_CA] != null) {
        contents[_CA] = __expectString(output[_CA]);
    }
    if (output[_CT] != null) {
        contents[_CT] = __expectString(output[_CT]);
    }
    return contents;
};
const de_MultipartUploadList = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_MultipartUpload(entry, context);
    });
};
const de_NoncurrentVersionExpiration = (output, context) => {
    const contents = {};
    if (output[_ND] != null) {
        contents[_ND] = __strictParseInt32(output[_ND]);
    }
    if (output[_NNV] != null) {
        contents[_NNV] = __strictParseInt32(output[_NNV]);
    }
    return contents;
};
const de_NoncurrentVersionTransition = (output, context) => {
    const contents = {};
    if (output[_ND] != null) {
        contents[_ND] = __strictParseInt32(output[_ND]);
    }
    if (output[_SC] != null) {
        contents[_SC] = __expectString(output[_SC]);
    }
    if (output[_NNV] != null) {
        contents[_NNV] = __strictParseInt32(output[_NNV]);
    }
    return contents;
};
const de_NoncurrentVersionTransitionList = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_NoncurrentVersionTransition(entry, context);
    });
};
const de_NotificationConfigurationFilter = (output, context) => {
    const contents = {};
    if (output[_SKe] != null) {
        contents[_K] = de_S3KeyFilter(output[_SKe], context);
    }
    return contents;
};
const de__Object = (output, context) => {
    const contents = {};
    if (output[_K] != null) {
        contents[_K] = __expectString(output[_K]);
    }
    if (output[_LM] != null) {
        contents[_LM] = __expectNonNull(__parseRfc3339DateTimeWithOffset(output[_LM]));
    }
    if (output[_ETa] != null) {
        contents[_ETa] = __expectString(output[_ETa]);
    }
    if (output.ChecksumAlgorithm === "") {
        contents[_CA] = [];
    }
    else if (output[_CA] != null) {
        contents[_CA] = de_ChecksumAlgorithmList(__getArrayIfSingleItem(output[_CA]), context);
    }
    if (output[_CT] != null) {
        contents[_CT] = __expectString(output[_CT]);
    }
    if (output[_Si] != null) {
        contents[_Si] = __strictParseLong(output[_Si]);
    }
    if (output[_SC] != null) {
        contents[_SC] = __expectString(output[_SC]);
    }
    if (output[_O] != null) {
        contents[_O] = de_Owner(output[_O], context);
    }
    if (output[_RSe] != null) {
        contents[_RSe] = de_RestoreStatus(output[_RSe], context);
    }
    return contents;
};
const de_ObjectList = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de__Object(entry, context);
    });
};
const de_ObjectLockConfiguration = (output, context) => {
    const contents = {};
    if (output[_OLE] != null) {
        contents[_OLE] = __expectString(output[_OLE]);
    }
    if (output[_Ru] != null) {
        contents[_Ru] = de_ObjectLockRule(output[_Ru], context);
    }
    return contents;
};
const de_ObjectLockLegalHold = (output, context) => {
    const contents = {};
    if (output[_S] != null) {
        contents[_S] = __expectString(output[_S]);
    }
    return contents;
};
const de_ObjectLockRetention = (output, context) => {
    const contents = {};
    if (output[_Mo] != null) {
        contents[_Mo] = __expectString(output[_Mo]);
    }
    if (output[_RUD] != null) {
        contents[_RUD] = __expectNonNull(__parseRfc3339DateTimeWithOffset(output[_RUD]));
    }
    return contents;
};
const de_ObjectLockRule = (output, context) => {
    const contents = {};
    if (output[_DRe] != null) {
        contents[_DRe] = de_DefaultRetention(output[_DRe], context);
    }
    return contents;
};
const de_ObjectPart = (output, context) => {
    const contents = {};
    if (output[_PN] != null) {
        contents[_PN] = __strictParseInt32(output[_PN]);
    }
    if (output[_Si] != null) {
        contents[_Si] = __strictParseLong(output[_Si]);
    }
    if (output[_CCRC] != null) {
        contents[_CCRC] = __expectString(output[_CCRC]);
    }
    if (output[_CCRCC] != null) {
        contents[_CCRCC] = __expectString(output[_CCRCC]);
    }
    if (output[_CCRCNVME] != null) {
        contents[_CCRCNVME] = __expectString(output[_CCRCNVME]);
    }
    if (output[_CSHA] != null) {
        contents[_CSHA] = __expectString(output[_CSHA]);
    }
    if (output[_CSHAh] != null) {
        contents[_CSHAh] = __expectString(output[_CSHAh]);
    }
    return contents;
};
const de_ObjectVersion = (output, context) => {
    const contents = {};
    if (output[_ETa] != null) {
        contents[_ETa] = __expectString(output[_ETa]);
    }
    if (output.ChecksumAlgorithm === "") {
        contents[_CA] = [];
    }
    else if (output[_CA] != null) {
        contents[_CA] = de_ChecksumAlgorithmList(__getArrayIfSingleItem(output[_CA]), context);
    }
    if (output[_CT] != null) {
        contents[_CT] = __expectString(output[_CT]);
    }
    if (output[_Si] != null) {
        contents[_Si] = __strictParseLong(output[_Si]);
    }
    if (output[_SC] != null) {
        contents[_SC] = __expectString(output[_SC]);
    }
    if (output[_K] != null) {
        contents[_K] = __expectString(output[_K]);
    }
    if (output[_VI] != null) {
        contents[_VI] = __expectString(output[_VI]);
    }
    if (output[_IL] != null) {
        contents[_IL] = __parseBoolean(output[_IL]);
    }
    if (output[_LM] != null) {
        contents[_LM] = __expectNonNull(__parseRfc3339DateTimeWithOffset(output[_LM]));
    }
    if (output[_O] != null) {
        contents[_O] = de_Owner(output[_O], context);
    }
    if (output[_RSe] != null) {
        contents[_RSe] = de_RestoreStatus(output[_RSe], context);
    }
    return contents;
};
const de_ObjectVersionList = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ObjectVersion(entry, context);
    });
};
const de_Owner = (output, context) => {
    const contents = {};
    if (output[_DN] != null) {
        contents[_DN] = __expectString(output[_DN]);
    }
    if (output[_ID_] != null) {
        contents[_ID_] = __expectString(output[_ID_]);
    }
    return contents;
};
const de_OwnershipControls = (output, context) => {
    const contents = {};
    if (output.Rule === "") {
        contents[_Rul] = [];
    }
    else if (output[_Ru] != null) {
        contents[_Rul] = de_OwnershipControlsRules(__getArrayIfSingleItem(output[_Ru]), context);
    }
    return contents;
};
const de_OwnershipControlsRule = (output, context) => {
    const contents = {};
    if (output[_OO] != null) {
        contents[_OO] = __expectString(output[_OO]);
    }
    return contents;
};
const de_OwnershipControlsRules = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_OwnershipControlsRule(entry, context);
    });
};
const de_Part = (output, context) => {
    const contents = {};
    if (output[_PN] != null) {
        contents[_PN] = __strictParseInt32(output[_PN]);
    }
    if (output[_LM] != null) {
        contents[_LM] = __expectNonNull(__parseRfc3339DateTimeWithOffset(output[_LM]));
    }
    if (output[_ETa] != null) {
        contents[_ETa] = __expectString(output[_ETa]);
    }
    if (output[_Si] != null) {
        contents[_Si] = __strictParseLong(output[_Si]);
    }
    if (output[_CCRC] != null) {
        contents[_CCRC] = __expectString(output[_CCRC]);
    }
    if (output[_CCRCC] != null) {
        contents[_CCRCC] = __expectString(output[_CCRCC]);
    }
    if (output[_CCRCNVME] != null) {
        contents[_CCRCNVME] = __expectString(output[_CCRCNVME]);
    }
    if (output[_CSHA] != null) {
        contents[_CSHA] = __expectString(output[_CSHA]);
    }
    if (output[_CSHAh] != null) {
        contents[_CSHAh] = __expectString(output[_CSHAh]);
    }
    return contents;
};
const de_PartitionedPrefix = (output, context) => {
    const contents = {};
    if (output[_PDS] != null) {
        contents[_PDS] = __expectString(output[_PDS]);
    }
    return contents;
};
const de_Parts = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Part(entry, context);
    });
};
const de_PartsList = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ObjectPart(entry, context);
    });
};
const de_PolicyStatus = (output, context) => {
    const contents = {};
    if (output[_IP] != null) {
        contents[_IP] = __parseBoolean(output[_IP]);
    }
    return contents;
};
const de_Progress = (output, context) => {
    const contents = {};
    if (output[_BS] != null) {
        contents[_BS] = __strictParseLong(output[_BS]);
    }
    if (output[_BP] != null) {
        contents[_BP] = __strictParseLong(output[_BP]);
    }
    if (output[_BRy] != null) {
        contents[_BRy] = __strictParseLong(output[_BRy]);
    }
    return contents;
};
const de_PublicAccessBlockConfiguration = (output, context) => {
    const contents = {};
    if (output[_BPA] != null) {
        contents[_BPA] = __parseBoolean(output[_BPA]);
    }
    if (output[_IPA] != null) {
        contents[_IPA] = __parseBoolean(output[_IPA]);
    }
    if (output[_BPP] != null) {
        contents[_BPP] = __parseBoolean(output[_BPP]);
    }
    if (output[_RPB] != null) {
        contents[_RPB] = __parseBoolean(output[_RPB]);
    }
    return contents;
};
const de_QueueConfiguration = (output, context) => {
    const contents = {};
    if (output[_I] != null) {
        contents[_I] = __expectString(output[_I]);
    }
    if (output[_Qu] != null) {
        contents[_QA] = __expectString(output[_Qu]);
    }
    if (output.Event === "") {
        contents[_Eve] = [];
    }
    else if (output[_Ev] != null) {
        contents[_Eve] = de_EventList(__getArrayIfSingleItem(output[_Ev]), context);
    }
    if (output[_F] != null) {
        contents[_F] = de_NotificationConfigurationFilter(output[_F], context);
    }
    return contents;
};
const de_QueueConfigurationList = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_QueueConfiguration(entry, context);
    });
};
const de_Redirect = (output, context) => {
    const contents = {};
    if (output[_HN] != null) {
        contents[_HN] = __expectString(output[_HN]);
    }
    if (output[_HRC] != null) {
        contents[_HRC] = __expectString(output[_HRC]);
    }
    if (output[_Pr] != null) {
        contents[_Pr] = __expectString(output[_Pr]);
    }
    if (output[_RKPW] != null) {
        contents[_RKPW] = __expectString(output[_RKPW]);
    }
    if (output[_RKW] != null) {
        contents[_RKW] = __expectString(output[_RKW]);
    }
    return contents;
};
const de_RedirectAllRequestsTo = (output, context) => {
    const contents = {};
    if (output[_HN] != null) {
        contents[_HN] = __expectString(output[_HN]);
    }
    if (output[_Pr] != null) {
        contents[_Pr] = __expectString(output[_Pr]);
    }
    return contents;
};
const de_ReplicaModifications = (output, context) => {
    const contents = {};
    if (output[_S] != null) {
        contents[_S] = __expectString(output[_S]);
    }
    return contents;
};
const de_ReplicationConfiguration = (output, context) => {
    const contents = {};
    if (output[_Ro] != null) {
        contents[_Ro] = __expectString(output[_Ro]);
    }
    if (output.Rule === "") {
        contents[_Rul] = [];
    }
    else if (output[_Ru] != null) {
        contents[_Rul] = de_ReplicationRules(__getArrayIfSingleItem(output[_Ru]), context);
    }
    return contents;
};
const de_ReplicationRule = (output, context) => {
    const contents = {};
    if (output[_ID_] != null) {
        contents[_ID_] = __expectString(output[_ID_]);
    }
    if (output[_Pri] != null) {
        contents[_Pri] = __strictParseInt32(output[_Pri]);
    }
    if (output[_P] != null) {
        contents[_P] = __expectString(output[_P]);
    }
    if (output[_F] != null) {
        contents[_F] = de_ReplicationRuleFilter(output[_F], context);
    }
    if (output[_S] != null) {
        contents[_S] = __expectString(output[_S]);
    }
    if (output[_SSC] != null) {
        contents[_SSC] = de_SourceSelectionCriteria(output[_SSC], context);
    }
    if (output[_EOR] != null) {
        contents[_EOR] = de_ExistingObjectReplication(output[_EOR], context);
    }
    if (output[_Des] != null) {
        contents[_Des] = de_Destination(output[_Des], context);
    }
    if (output[_DMR] != null) {
        contents[_DMR] = de_DeleteMarkerReplication(output[_DMR], context);
    }
    return contents;
};
const de_ReplicationRuleAndOperator = (output, context) => {
    const contents = {};
    if (output[_P] != null) {
        contents[_P] = __expectString(output[_P]);
    }
    if (output.Tag === "") {
        contents[_Tag] = [];
    }
    else if (output[_Ta] != null) {
        contents[_Tag] = de_TagSet(__getArrayIfSingleItem(output[_Ta]), context);
    }
    return contents;
};
const de_ReplicationRuleFilter = (output, context) => {
    const contents = {};
    if (output[_P] != null) {
        contents[_P] = __expectString(output[_P]);
    }
    if (output[_Ta] != null) {
        contents[_Ta] = de_Tag(output[_Ta], context);
    }
    if (output[_A] != null) {
        contents[_A] = de_ReplicationRuleAndOperator(output[_A], context);
    }
    return contents;
};
const de_ReplicationRules = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ReplicationRule(entry, context);
    });
};
const de_ReplicationTime = (output, context) => {
    const contents = {};
    if (output[_S] != null) {
        contents[_S] = __expectString(output[_S]);
    }
    if (output[_Tim] != null) {
        contents[_Tim] = de_ReplicationTimeValue(output[_Tim], context);
    }
    return contents;
};
const de_ReplicationTimeValue = (output, context) => {
    const contents = {};
    if (output[_Mi] != null) {
        contents[_Mi] = __strictParseInt32(output[_Mi]);
    }
    return contents;
};
const de_RestoreStatus = (output, context) => {
    const contents = {};
    if (output[_IRIP] != null) {
        contents[_IRIP] = __parseBoolean(output[_IRIP]);
    }
    if (output[_RED] != null) {
        contents[_RED] = __expectNonNull(__parseRfc3339DateTimeWithOffset(output[_RED]));
    }
    return contents;
};
const de_RoutingRule = (output, context) => {
    const contents = {};
    if (output[_Con] != null) {
        contents[_Con] = de_Condition(output[_Con], context);
    }
    if (output[_Red] != null) {
        contents[_Red] = de_Redirect(output[_Red], context);
    }
    return contents;
};
const de_RoutingRules = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_RoutingRule(entry, context);
    });
};
const de_S3KeyFilter = (output, context) => {
    const contents = {};
    if (output.FilterRule === "") {
        contents[_FRi] = [];
    }
    else if (output[_FR] != null) {
        contents[_FRi] = de_FilterRuleList(__getArrayIfSingleItem(output[_FR]), context);
    }
    return contents;
};
const de_S3TablesDestinationResult = (output, context) => {
    const contents = {};
    if (output[_TBA] != null) {
        contents[_TBA] = __expectString(output[_TBA]);
    }
    if (output[_TN] != null) {
        contents[_TN] = __expectString(output[_TN]);
    }
    if (output[_TAa] != null) {
        contents[_TAa] = __expectString(output[_TAa]);
    }
    if (output[_TNa] != null) {
        contents[_TNa] = __expectString(output[_TNa]);
    }
    return contents;
};
const de_ServerSideEncryptionByDefault = (output, context) => {
    const contents = {};
    if (output[_SSEA] != null) {
        contents[_SSEA] = __expectString(output[_SSEA]);
    }
    if (output[_KMSMKID] != null) {
        contents[_KMSMKID] = __expectString(output[_KMSMKID]);
    }
    return contents;
};
const de_ServerSideEncryptionConfiguration = (output, context) => {
    const contents = {};
    if (output.Rule === "") {
        contents[_Rul] = [];
    }
    else if (output[_Ru] != null) {
        contents[_Rul] = de_ServerSideEncryptionRules(__getArrayIfSingleItem(output[_Ru]), context);
    }
    return contents;
};
const de_ServerSideEncryptionRule = (output, context) => {
    const contents = {};
    if (output[_ASSEBD] != null) {
        contents[_ASSEBD] = de_ServerSideEncryptionByDefault(output[_ASSEBD], context);
    }
    if (output[_BKE] != null) {
        contents[_BKE] = __parseBoolean(output[_BKE]);
    }
    return contents;
};
const de_ServerSideEncryptionRules = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ServerSideEncryptionRule(entry, context);
    });
};
const de_SessionCredentials = (output, context) => {
    const contents = {};
    if (output[_AKI] != null) {
        contents[_AKI] = __expectString(output[_AKI]);
    }
    if (output[_SAK] != null) {
        contents[_SAK] = __expectString(output[_SAK]);
    }
    if (output[_ST] != null) {
        contents[_ST] = __expectString(output[_ST]);
    }
    if (output[_Exp] != null) {
        contents[_Exp] = __expectNonNull(__parseRfc3339DateTimeWithOffset(output[_Exp]));
    }
    return contents;
};
const de_SimplePrefix = (output, context) => {
    const contents = {};
    return contents;
};
const de_SourceSelectionCriteria = (output, context) => {
    const contents = {};
    if (output[_SKEO] != null) {
        contents[_SKEO] = de_SseKmsEncryptedObjects(output[_SKEO], context);
    }
    if (output[_RM] != null) {
        contents[_RM] = de_ReplicaModifications(output[_RM], context);
    }
    return contents;
};
const de_SSEKMS = (output, context) => {
    const contents = {};
    if (output[_KI] != null) {
        contents[_KI] = __expectString(output[_KI]);
    }
    return contents;
};
const de_SseKmsEncryptedObjects = (output, context) => {
    const contents = {};
    if (output[_S] != null) {
        contents[_S] = __expectString(output[_S]);
    }
    return contents;
};
const de_SSES3 = (output, context) => {
    const contents = {};
    return contents;
};
const de_Stats = (output, context) => {
    const contents = {};
    if (output[_BS] != null) {
        contents[_BS] = __strictParseLong(output[_BS]);
    }
    if (output[_BP] != null) {
        contents[_BP] = __strictParseLong(output[_BP]);
    }
    if (output[_BRy] != null) {
        contents[_BRy] = __strictParseLong(output[_BRy]);
    }
    return contents;
};
const de_StorageClassAnalysis = (output, context) => {
    const contents = {};
    if (output[_DE] != null) {
        contents[_DE] = de_StorageClassAnalysisDataExport(output[_DE], context);
    }
    return contents;
};
const de_StorageClassAnalysisDataExport = (output, context) => {
    const contents = {};
    if (output[_OSV] != null) {
        contents[_OSV] = __expectString(output[_OSV]);
    }
    if (output[_Des] != null) {
        contents[_Des] = de_AnalyticsExportDestination(output[_Des], context);
    }
    return contents;
};
const de_Tag = (output, context) => {
    const contents = {};
    if (output[_K] != null) {
        contents[_K] = __expectString(output[_K]);
    }
    if (output[_Va] != null) {
        contents[_Va] = __expectString(output[_Va]);
    }
    return contents;
};
const de_TagSet = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Tag(entry, context);
    });
};
const de_TargetGrant = (output, context) => {
    const contents = {};
    if (output[_Gra] != null) {
        contents[_Gra] = de_Grantee(output[_Gra], context);
    }
    if (output[_Pe] != null) {
        contents[_Pe] = __expectString(output[_Pe]);
    }
    return contents;
};
const de_TargetGrants = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_TargetGrant(entry, context);
    });
};
const de_TargetObjectKeyFormat = (output, context) => {
    const contents = {};
    if (output[_SPi] != null) {
        contents[_SPi] = de_SimplePrefix(output[_SPi], context);
    }
    if (output[_PP] != null) {
        contents[_PP] = de_PartitionedPrefix(output[_PP], context);
    }
    return contents;
};
const de_Tiering = (output, context) => {
    const contents = {};
    if (output[_Da] != null) {
        contents[_Da] = __strictParseInt32(output[_Da]);
    }
    if (output[_AT] != null) {
        contents[_AT] = __expectString(output[_AT]);
    }
    return contents;
};
const de_TieringList = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Tiering(entry, context);
    });
};
const de_TopicConfiguration = (output, context) => {
    const contents = {};
    if (output[_I] != null) {
        contents[_I] = __expectString(output[_I]);
    }
    if (output[_Top] != null) {
        contents[_TA] = __expectString(output[_Top]);
    }
    if (output.Event === "") {
        contents[_Eve] = [];
    }
    else if (output[_Ev] != null) {
        contents[_Eve] = de_EventList(__getArrayIfSingleItem(output[_Ev]), context);
    }
    if (output[_F] != null) {
        contents[_F] = de_NotificationConfigurationFilter(output[_F], context);
    }
    return contents;
};
const de_TopicConfigurationList = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_TopicConfiguration(entry, context);
    });
};
const de_Transition = (output, context) => {
    const contents = {};
    if (output[_Dat] != null) {
        contents[_Dat] = __expectNonNull(__parseRfc3339DateTimeWithOffset(output[_Dat]));
    }
    if (output[_Da] != null) {
        contents[_Da] = __strictParseInt32(output[_Da]);
    }
    if (output[_SC] != null) {
        contents[_SC] = __expectString(output[_SC]);
    }
    return contents;
};
const de_TransitionList = (output, context) => {
    return (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Transition(entry, context);
    });
};
const deserializeMetadata = (output) => ({
    httpStatusCode: output.statusCode,
    requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
    extendedRequestId: output.headers["x-amz-id-2"],
    cfId: output.headers["x-amz-cf-id"],
});
const collectBodyString = (streamBody, context) => collectBody(streamBody, context).then((body) => context.utf8Encoder(body));
const _A = "And";
const _AAO = "AnalyticsAndOperator";
const _AC = "AnalyticsConfiguration";
const _ACL = "ACL";
const _ACLc = "AccessControlList";
const _ACLn = "AnalyticsConfigurationList";
const _ACP = "AccessControlPolicy";
const _ACT = "AccessControlTranslation";
const _ACc = "AccelerateConfiguration";
const _AD = "AbortDate";
const _AED = "AnalyticsExportDestination";
const _AF = "AnalyticsFilter";
const _AH = "AllowedHeader";
const _AHl = "AllowedHeaders";
const _AI = "AnalyticsId";
const _AIMU = "AbortIncompleteMultipartUpload";
const _AIc = "AccountId";
const _AKI = "AccessKeyId";
const _AM = "AllowedMethod";
const _AMl = "AllowedMethods";
const _AO = "AllowedOrigin";
const _AOl = "AllowedOrigins";
const _APA = "AccessPointAlias";
const _APAc = "AccessPointArn";
const _AQRD = "AllowQuotedRecordDelimiter";
const _AR = "AcceptRanges";
const _ARI = "AbortRuleId";
const _AS = "ArchiveStatus";
const _ASBD = "AnalyticsS3BucketDestination";
const _ASEFF = "AnalyticsS3ExportFileFormat";
const _ASSEBD = "ApplyServerSideEncryptionByDefault";
const _AT = "AccessTier";
const _Ac = "Account";
const _B = "Bucket";
const _BAI = "BucketAccountId";
const _BAS = "BucketAccelerateStatus";
const _BGR = "BypassGovernanceRetention";
const _BI = "BucketInfo";
const _BKE = "BucketKeyEnabled";
const _BLC = "BucketLifecycleConfiguration";
const _BLCu = "BucketLocationConstraint";
const _BLN = "BucketLocationName";
const _BLP = "BucketLogsPermission";
const _BLS = "BucketLoggingStatus";
const _BLT = "BucketLocationType";
const _BN = "BucketName";
const _BP = "BytesProcessed";
const _BPA = "BlockPublicAcls";
const _BPP = "BlockPublicPolicy";
const _BR = "BucketRegion";
const _BRy = "BytesReturned";
const _BS = "BytesScanned";
const _BT = "BucketType";
const _BVS = "BucketVersioningStatus";
const _Bu = "Buckets";
const _C = "Credentials";
const _CA = "ChecksumAlgorithm";
const _CACL = "CannedACL";
const _CBC = "CreateBucketConfiguration";
const _CC = "CacheControl";
const _CCRC = "ChecksumCRC32";
const _CCRCC = "ChecksumCRC32C";
const _CCRCNVME = "ChecksumCRC64NVME";
const _CD = "ContentDisposition";
const _CDr = "CreationDate";
const _CE = "ContentEncoding";
const _CF = "CloudFunction";
const _CFC = "CloudFunctionConfiguration";
const _CL = "ContentLanguage";
const _CLo = "ContentLength";
const _CM = "ChecksumMode";
const _CMD = "ContentMD5";
const _CMU = "CompletedMultipartUpload";
const _CORSC = "CORSConfiguration";
const _CORSR = "CORSRule";
const _CORSRu = "CORSRules";
const _CP = "CommonPrefixes";
const _CPo = "CompletedPart";
const _CR = "ContentRange";
const _CRSBA = "ConfirmRemoveSelfBucketAccess";
const _CS = "CopySource";
const _CSHA = "ChecksumSHA1";
const _CSHAh = "ChecksumSHA256";
const _CSIM = "CopySourceIfMatch";
const _CSIMS = "CopySourceIfModifiedSince";
const _CSINM = "CopySourceIfNoneMatch";
const _CSIUS = "CopySourceIfUnmodifiedSince";
const _CSR = "CopySourceRange";
const _CSSSECA = "CopySourceSSECustomerAlgorithm";
const _CSSSECK = "CopySourceSSECustomerKey";
const _CSSSECKMD = "CopySourceSSECustomerKeyMD5";
const _CSV = "CSV";
const _CSVI = "CopySourceVersionId";
const _CSVIn = "CSVInput";
const _CSVO = "CSVOutput";
const _CT = "ChecksumType";
const _CTo = "ContentType";
const _CTom = "CompressionType";
const _CTon = "ContinuationToken";
const _Ch = "Checksum";
const _Co = "Contents";
const _Cod = "Code";
const _Com = "Comments";
const _Con = "Condition";
const _D = "Delimiter";
const _DAI = "DaysAfterInitiation";
const _DE = "DataExport";
const _DM = "DeleteMarker";
const _DMR = "DeleteMarkerReplication";
const _DMRS = "DeleteMarkerReplicationStatus";
const _DMVI = "DeleteMarkerVersionId";
const _DMe = "DeleteMarkers";
const _DN = "DisplayName";
const _DR = "DataRedundancy";
const _DRe = "DefaultRetention";
const _Da = "Days";
const _Dat = "Date";
const _De = "Deleted";
const _Del = "Delete";
const _Des = "Destination";
const _Desc = "Description";
const _E = "Expires";
const _EA = "EmailAddress";
const _EBC = "EventBridgeConfiguration";
const _EBO = "ExpectedBucketOwner";
const _EC = "ErrorCode";
const _ECn = "EncryptionConfiguration";
const _ED = "ErrorDocument";
const _EH = "ExposeHeaders";
const _EHx = "ExposeHeader";
const _EM = "ErrorMessage";
const _EODM = "ExpiredObjectDeleteMarker";
const _EOR = "ExistingObjectReplication";
const _EORS = "ExistingObjectReplicationStatus";
const _ERP = "EnableRequestProgress";
const _ES = "ExpiresString";
const _ESBO = "ExpectedSourceBucketOwner";
const _ESx = "ExpirationStatus";
const _ET = "EncodingType";
const _ETa = "ETag";
const _ETn = "EncryptionType";
const _ETv = "EventThreshold";
const _ETx = "ExpressionType";
const _En = "Encryption";
const _Ena = "Enabled";
const _End = "End";
const _Er = "Error";
const _Err = "Errors";
const _Ev = "Event";
const _Eve = "Events";
const _Ex = "Expression";
const _Exp = "Expiration";
const _F = "Filter";
const _FD = "FieldDelimiter";
const _FHI = "FileHeaderInfo";
const _FO = "FetchOwner";
const _FR = "FilterRule";
const _FRN = "FilterRuleName";
const _FRV = "FilterRuleValue";
const _FRi = "FilterRules";
const _Fi = "Field";
const _Fo = "Format";
const _Fr = "Frequency";
const _G = "Grant";
const _GFC = "GrantFullControl";
const _GJP = "GlacierJobParameters";
const _GR = "GrantRead";
const _GRACP = "GrantReadACP";
const _GW = "GrantWrite";
const _GWACP = "GrantWriteACP";
const _Gr = "Grants";
const _Gra = "Grantee";
const _HECRE = "HttpErrorCodeReturnedEquals";
const _HN = "HostName";
const _HRC = "HttpRedirectCode";
const _I = "Id";
const _IC = "InventoryConfiguration";
const _ICL = "InventoryConfigurationList";
const _ID = "IndexDocument";
const _ID_ = "ID";
const _IDn = "InventoryDestination";
const _IE = "IsEnabled";
const _IEn = "InventoryEncryption";
const _IF = "InventoryFilter";
const _IFn = "InventoryFormat";
const _IFnv = "InventoryFrequency";
const _II = "InventoryId";
const _IIOV = "InventoryIncludedObjectVersions";
const _IL = "IsLatest";
const _IM = "IfMatch";
const _IMIT = "IfMatchInitiatedTime";
const _IMLMT = "IfMatchLastModifiedTime";
const _IMS = "IfMatchSize";
const _IMSf = "IfModifiedSince";
const _INM = "IfNoneMatch";
const _IOF = "InventoryOptionalField";
const _IOV = "IncludedObjectVersions";
const _IP = "IsPublic";
const _IPA = "IgnorePublicAcls";
const _IRIP = "IsRestoreInProgress";
const _IS = "InputSerialization";
const _ISBD = "InventoryS3BucketDestination";
const _ISn = "InventorySchedule";
const _IT = "IsTruncated";
const _ITAO = "IntelligentTieringAndOperator";
const _ITAT = "IntelligentTieringAccessTier";
const _ITC = "IntelligentTieringConfiguration";
const _ITCL = "IntelligentTieringConfigurationList";
const _ITD = "IntelligentTieringDays";
const _ITF = "IntelligentTieringFilter";
const _ITI = "IntelligentTieringId";
const _ITS = "IntelligentTieringStatus";
const _IUS = "IfUnmodifiedSince";
const _In = "Initiator";
const _Ini = "Initiated";
const _JSON = "JSON";
const _JSONI = "JSONInput";
const _JSONO = "JSONOutput";
const _JSONT = "JSONType";
const _K = "Key";
const _KC = "KeyCount";
const _KI = "KeyId";
const _KM = "KeyMarker";
const _KMSC = "KMSContext";
const _KMSKI = "KMSKeyId";
const _KMSMKID = "KMSMasterKeyID";
const _KPE = "KeyPrefixEquals";
const _L = "Location";
const _LC = "LocationConstraint";
const _LE = "LoggingEnabled";
const _LEi = "LifecycleExpiration";
const _LFA = "LambdaFunctionArn";
const _LFC = "LambdaFunctionConfigurations";
const _LFCa = "LambdaFunctionConfiguration";
const _LI = "LocationInfo";
const _LM = "LastModified";
const _LMT = "LastModifiedTime";
const _LNAS = "LocationNameAsString";
const _LP = "LocationPrefix";
const _LR = "LifecycleRule";
const _LRAO = "LifecycleRuleAndOperator";
const _LRF = "LifecycleRuleFilter";
const _LT = "LocationType";
const _M = "Marker";
const _MAO = "MetricsAndOperator";
const _MAS = "MaxAgeSeconds";
const _MB = "MaxBuckets";
const _MC = "MetricsConfiguration";
const _MCL = "MetricsConfigurationList";
const _MD = "MetadataDirective";
const _MDB = "MaxDirectoryBuckets";
const _MDf = "MfaDelete";
const _ME = "MetadataEntry";
const _MF = "MetricsFilter";
const _MFA = "MFA";
const _MFAD = "MFADelete";
const _MI = "MetricsId";
const _MK = "MaxKeys";
const _MKe = "MetadataKey";
const _MM = "MissingMeta";
const _MOS = "MpuObjectSize";
const _MP = "MaxParts";
const _MS = "MetricsStatus";
const _MTC = "MetadataTableConfiguration";
const _MTCR = "MetadataTableConfigurationResult";
const _MU = "MaxUploads";
const _MV = "MetadataValue";
const _Me = "Metrics";
const _Mes = "Message";
const _Mi = "Minutes";
const _Mo = "Mode";
const _N = "Name";
const _NC = "NotificationConfiguration";
const _NCF = "NotificationConfigurationFilter";
const _NCT = "NextContinuationToken";
const _ND = "NoncurrentDays";
const _NI = "NotificationId";
const _NKM = "NextKeyMarker";
const _NM = "NextMarker";
const _NNV = "NewerNoncurrentVersions";
const _NPNM = "NextPartNumberMarker";
const _NUIM = "NextUploadIdMarker";
const _NVE = "NoncurrentVersionExpiration";
const _NVIM = "NextVersionIdMarker";
const _NVT = "NoncurrentVersionTransitions";
const _NVTo = "NoncurrentVersionTransition";
const _O = "Owner";
const _OA = "ObjectAttributes";
const _OC = "OwnershipControls";
const _OCACL = "ObjectCannedACL";
const _OCR = "OwnershipControlsRule";
const _OF = "OptionalFields";
const _OI = "ObjectIdentifier";
const _OK = "ObjectKey";
const _OL = "OutputLocation";
const _OLC = "ObjectLockConfiguration";
const _OLE = "ObjectLockEnabled";
const _OLEFB = "ObjectLockEnabledForBucket";
const _OLLH = "ObjectLockLegalHold";
const _OLLHS = "ObjectLockLegalHoldStatus";
const _OLM = "ObjectLockMode";
const _OLR = "ObjectLockRetention";
const _OLRM = "ObjectLockRetentionMode";
const _OLRUD = "ObjectLockRetainUntilDate";
const _OLRb = "ObjectLockRule";
const _OO = "ObjectOwnership";
const _OOA = "OptionalObjectAttributes";
const _OOw = "OwnerOverride";
const _OP = "ObjectParts";
const _OS = "OutputSerialization";
const _OSGT = "ObjectSizeGreaterThan";
const _OSGTB = "ObjectSizeGreaterThanBytes";
const _OSLT = "ObjectSizeLessThan";
const _OSLTB = "ObjectSizeLessThanBytes";
const _OSV = "OutputSchemaVersion";
const _OSb = "ObjectSize";
const _OVI = "ObjectVersionId";
const _Ob = "Objects";
const _P = "Prefix";
const _PABC = "PublicAccessBlockConfiguration";
const _PC = "PartsCount";
const _PDS = "PartitionDateSource";
const _PI = "ParquetInput";
const _PN = "PartNumber";
const _PNM = "PartNumberMarker";
const _PP = "PartitionedPrefix";
const _Pa = "Payer";
const _Par = "Part";
const _Parq = "Parquet";
const _Part = "Parts";
const _Pe = "Permission";
const _Pr = "Protocol";
const _Pri = "Priority";
const _Q = "Quiet";
const _QA = "QueueArn";
const _QC = "QueueConfiguration";
const _QCu = "QueueConfigurations";
const _QCuo = "QuoteCharacter";
const _QEC = "QuoteEscapeCharacter";
const _QF = "QuoteFields";
const _Qu = "Queue";
const _R = "Range";
const _RART = "RedirectAllRequestsTo";
const _RC = "RequestCharged";
const _RCC = "ResponseCacheControl";
const _RCD = "ResponseContentDisposition";
const _RCE = "ResponseContentEncoding";
const _RCL = "ResponseContentLanguage";
const _RCT = "ResponseContentType";
const _RCe = "ReplicationConfiguration";
const _RD = "RecordDelimiter";
const _RE = "ResponseExpires";
const _RED = "RestoreExpiryDate";
const _RKKID = "ReplicaKmsKeyID";
const _RKPW = "ReplaceKeyPrefixWith";
const _RKW = "ReplaceKeyWith";
const _RM = "ReplicaModifications";
const _RMS = "ReplicaModificationsStatus";
const _ROP = "RestoreOutputPath";
const _RP = "RequestPayer";
const _RPB = "RestrictPublicBuckets";
const _RPC = "RequestPaymentConfiguration";
const _RPe = "RequestProgress";
const _RR = "RequestRoute";
const _RRAO = "ReplicationRuleAndOperator";
const _RRF = "ReplicationRuleFilter";
const _RRS = "ReplicationRuleStatus";
const _RRT = "RestoreRequestType";
const _RRe = "ReplicationRule";
const _RRes = "RestoreRequest";
const _RRo = "RoutingRules";
const _RRou = "RoutingRule";
const _RS = "ReplicationStatus";
const _RSe = "RestoreStatus";
const _RT = "RequestToken";
const _RTS = "ReplicationTimeStatus";
const _RTV = "ReplicationTimeValue";
const _RTe = "ReplicationTime";
const _RUD = "RetainUntilDate";
const _Re = "Restore";
const _Red = "Redirect";
const _Ro = "Role";
const _Ru = "Rule";
const _Rul = "Rules";
const _S = "Status";
const _SA = "StartAfter";
const _SAK = "SecretAccessKey";
const _SBD = "S3BucketDestination";
const _SC = "StorageClass";
const _SCA = "StorageClassAnalysis";
const _SCADE = "StorageClassAnalysisDataExport";
const _SCASV = "StorageClassAnalysisSchemaVersion";
const _SCt = "StatusCode";
const _SDV = "SkipDestinationValidation";
const _SK = "SSE-KMS";
const _SKEO = "SseKmsEncryptedObjects";
const _SKEOS = "SseKmsEncryptedObjectsStatus";
const _SKF = "S3KeyFilter";
const _SKe = "S3Key";
const _SL = "S3Location";
const _SM = "SessionMode";
const _SOCR = "SelectObjectContentRequest";
const _SP = "SelectParameters";
const _SPi = "SimplePrefix";
const _SR = "ScanRange";
const _SS = "SSE-S3";
const _SSC = "SourceSelectionCriteria";
const _SSE = "ServerSideEncryption";
const _SSEA = "SSEAlgorithm";
const _SSEBD = "ServerSideEncryptionByDefault";
const _SSEC = "ServerSideEncryptionConfiguration";
const _SSECA = "SSECustomerAlgorithm";
const _SSECK = "SSECustomerKey";
const _SSECKMD = "SSECustomerKeyMD5";
const _SSEKMS = "SSEKMS";
const _SSEKMSEC = "SSEKMSEncryptionContext";
const _SSEKMSKI = "SSEKMSKeyId";
const _SSER = "ServerSideEncryptionRule";
const _SSES = "SSES3";
const _ST = "SessionToken";
const _STBA = "S3TablesBucketArn";
const _STD = "S3TablesDestination";
const _STDR = "S3TablesDestinationResult";
const _STN = "S3TablesName";
const _S_ = "S3";
const _Sc = "Schedule";
const _Se = "Setting";
const _Si = "Size";
const _St = "Start";
const _Su = "Suffix";
const _T = "Tagging";
const _TA = "TopicArn";
const _TAa = "TableArn";
const _TB = "TargetBucket";
const _TBA = "TableBucketArn";
const _TC = "TagCount";
const _TCo = "TopicConfiguration";
const _TCop = "TopicConfigurations";
const _TD = "TaggingDirective";
const _TDMOS = "TransitionDefaultMinimumObjectSize";
const _TG = "TargetGrants";
const _TGa = "TargetGrant";
const _TN = "TableName";
const _TNa = "TableNamespace";
const _TOKF = "TargetObjectKeyFormat";
const _TP = "TargetPrefix";
const _TPC = "TotalPartsCount";
const _TS = "TagSet";
const _TSC = "TransitionStorageClass";
const _Ta = "Tag";
const _Tag = "Tags";
const _Ti = "Tier";
const _Tie = "Tierings";
const _Tier = "Tiering";
const _Tim = "Time";
const _To = "Token";
const _Top = "Topic";
const _Tr = "Transitions";
const _Tra = "Transition";
const _Ty = "Type";
const _U = "Upload";
const _UI = "UploadId";
const _UIM = "UploadIdMarker";
const _UM = "UserMetadata";
const _URI = "URI";
const _Up = "Uploads";
const _V = "Version";
const _VC = "VersionCount";
const _VCe = "VersioningConfiguration";
const _VI = "VersionId";
const _VIM = "VersionIdMarker";
const _Va = "Value";
const _Ve = "Versions";
const _WC = "WebsiteConfiguration";
const _WOB = "WriteOffsetBytes";
const _WRL = "WebsiteRedirectLocation";
const _Y = "Years";
const _a = "analytics";
const _ac = "accelerate";
const _acl = "acl";
const _ar = "accept-ranges";
const _at = "attributes";
const _br = "bucket-region";
const _c = "cors";
const _cc = "cache-control";
const _cd = "content-disposition";
const _ce = "content-encoding";
const _cl = "content-language";
const _cl_ = "content-length";
const _cm = "content-md5";
const _cr = "content-range";
const _ct = "content-type";
const _ct_ = "continuation-token";
const _d = "delete";
const _de = "delimiter";
const _e = "expires";
const _en = "encryption";
const _et = "encoding-type";
const _eta = "etag";
const _ex = "expiresstring";
const _fo = "fetch-owner";
const _i = "id";
const _im = "if-match";
const _ims = "if-modified-since";
const _in = "inventory";
const _inm = "if-none-match";
const _it = "intelligent-tiering";
const _ius = "if-unmodified-since";
const _km = "key-marker";
const _l = "lifecycle";
const _lh = "legal-hold";
const _lm = "last-modified";
const _lo = "location";
const _log = "logging";
const _lt = "list-type";
const _m = "metrics";
const _mT = "metadataTable";
const _ma = "marker";
const _mb = "max-buckets";
const _mdb = "max-directory-buckets";
const _me = "member";
const _mk = "max-keys";
const _mp = "max-parts";
const _mu = "max-uploads";
const _n = "notification";
const _oC = "ownershipControls";
const _ol = "object-lock";
const _p = "policy";
const _pAB = "publicAccessBlock";
const _pN = "partNumber";
const _pS = "policyStatus";
const _pnm = "part-number-marker";
const _pr = "prefix";
const _r = "replication";
const _rP = "requestPayment";
const _ra = "range";
const _rcc = "response-cache-control";
const _rcd = "response-content-disposition";
const _rce = "response-content-encoding";
const _rcl = "response-content-language";
const _rct = "response-content-type";
const _re = "response-expires";
const _res = "restore";
const _ret = "retention";
const _s = "session";
const _sa = "start-after";
const _se = "select";
const _st = "select-type";
const _t = "tagging";
const _to = "torrent";
const _u = "uploads";
const _uI = "uploadId";
const _uim = "upload-id-marker";
const _v = "versioning";
const _vI = "versionId";
const _ve = '<?xml version="1.0" encoding="UTF-8"?>';
const _ver = "versions";
const _vim = "version-id-marker";
const _w = "website";
const _x = "xsi:type";
const _xaa = "x-amz-acl";
const _xaad = "x-amz-abort-date";
const _xaapa = "x-amz-access-point-alias";
const _xaari = "x-amz-abort-rule-id";
const _xaas = "x-amz-archive-status";
const _xabgr = "x-amz-bypass-governance-retention";
const _xabln = "x-amz-bucket-location-name";
const _xablt = "x-amz-bucket-location-type";
const _xabole = "x-amz-bucket-object-lock-enabled";
const _xabolt = "x-amz-bucket-object-lock-token";
const _xabr = "x-amz-bucket-region";
const _xaca = "x-amz-checksum-algorithm";
const _xacc = "x-amz-checksum-crc32";
const _xacc_ = "x-amz-checksum-crc32c";
const _xacc__ = "x-amz-checksum-crc64nvme";
const _xacm = "x-amz-checksum-mode";
const _xacrsba = "x-amz-confirm-remove-self-bucket-access";
const _xacs = "x-amz-checksum-sha1";
const _xacs_ = "x-amz-checksum-sha256";
const _xacs__ = "x-amz-copy-source";
const _xacsim = "x-amz-copy-source-if-match";
const _xacsims = "x-amz-copy-source-if-modified-since";
const _xacsinm = "x-amz-copy-source-if-none-match";
const _xacsius = "x-amz-copy-source-if-unmodified-since";
const _xacsm = "x-amz-create-session-mode";
const _xacsr = "x-amz-copy-source-range";
const _xacssseca = "x-amz-copy-source-server-side-encryption-customer-algorithm";
const _xacssseck = "x-amz-copy-source-server-side-encryption-customer-key";
const _xacssseckm = "x-amz-copy-source-server-side-encryption-customer-key-md5";
const _xacsvi = "x-amz-copy-source-version-id";
const _xact = "x-amz-checksum-type";
const _xadm = "x-amz-delete-marker";
const _xae = "x-amz-expiration";
const _xaebo = "x-amz-expected-bucket-owner";
const _xafec = "x-amz-fwd-error-code";
const _xafem = "x-amz-fwd-error-message";
const _xafhar = "x-amz-fwd-header-accept-ranges";
const _xafhcc = "x-amz-fwd-header-cache-control";
const _xafhcd = "x-amz-fwd-header-content-disposition";
const _xafhce = "x-amz-fwd-header-content-encoding";
const _xafhcl = "x-amz-fwd-header-content-language";
const _xafhcr = "x-amz-fwd-header-content-range";
const _xafhct = "x-amz-fwd-header-content-type";
const _xafhe = "x-amz-fwd-header-etag";
const _xafhe_ = "x-amz-fwd-header-expires";
const _xafhlm = "x-amz-fwd-header-last-modified";
const _xafhxacc = "x-amz-fwd-header-x-amz-checksum-crc32";
const _xafhxacc_ = "x-amz-fwd-header-x-amz-checksum-crc32c";
const _xafhxacc__ = "x-amz-fwd-header-x-amz-checksum-crc64nvme";
const _xafhxacs = "x-amz-fwd-header-x-amz-checksum-sha1";
const _xafhxacs_ = "x-amz-fwd-header-x-amz-checksum-sha256";
const _xafhxadm = "x-amz-fwd-header-x-amz-delete-marker";
const _xafhxae = "x-amz-fwd-header-x-amz-expiration";
const _xafhxamm = "x-amz-fwd-header-x-amz-missing-meta";
const _xafhxampc = "x-amz-fwd-header-x-amz-mp-parts-count";
const _xafhxaollh = "x-amz-fwd-header-x-amz-object-lock-legal-hold";
const _xafhxaolm = "x-amz-fwd-header-x-amz-object-lock-mode";
const _xafhxaolrud = "x-amz-fwd-header-x-amz-object-lock-retain-until-date";
const _xafhxar = "x-amz-fwd-header-x-amz-restore";
const _xafhxarc = "x-amz-fwd-header-x-amz-request-charged";
const _xafhxars = "x-amz-fwd-header-x-amz-replication-status";
const _xafhxasc = "x-amz-fwd-header-x-amz-storage-class";
const _xafhxasse = "x-amz-fwd-header-x-amz-server-side-encryption";
const _xafhxasseakki = "x-amz-fwd-header-x-amz-server-side-encryption-aws-kms-key-id";
const _xafhxassebke = "x-amz-fwd-header-x-amz-server-side-encryption-bucket-key-enabled";
const _xafhxasseca = "x-amz-fwd-header-x-amz-server-side-encryption-customer-algorithm";
const _xafhxasseckm = "x-amz-fwd-header-x-amz-server-side-encryption-customer-key-md5";
const _xafhxatc = "x-amz-fwd-header-x-amz-tagging-count";
const _xafhxavi = "x-amz-fwd-header-x-amz-version-id";
const _xafs = "x-amz-fwd-status";
const _xagfc = "x-amz-grant-full-control";
const _xagr = "x-amz-grant-read";
const _xagra = "x-amz-grant-read-acp";
const _xagw = "x-amz-grant-write";
const _xagwa = "x-amz-grant-write-acp";
const _xaimit = "x-amz-if-match-initiated-time";
const _xaimlmt = "x-amz-if-match-last-modified-time";
const _xaims = "x-amz-if-match-size";
const _xam = "x-amz-mfa";
const _xamd = "x-amz-metadata-directive";
const _xamm = "x-amz-missing-meta";
const _xamos = "x-amz-mp-object-size";
const _xamp = "x-amz-max-parts";
const _xampc = "x-amz-mp-parts-count";
const _xaoa = "x-amz-object-attributes";
const _xaollh = "x-amz-object-lock-legal-hold";
const _xaolm = "x-amz-object-lock-mode";
const _xaolrud = "x-amz-object-lock-retain-until-date";
const _xaoo = "x-amz-object-ownership";
const _xaooa = "x-amz-optional-object-attributes";
const _xaos = "x-amz-object-size";
const _xapnm = "x-amz-part-number-marker";
const _xar = "x-amz-restore";
const _xarc = "x-amz-request-charged";
const _xarop = "x-amz-restore-output-path";
const _xarp = "x-amz-request-payer";
const _xarr = "x-amz-request-route";
const _xars = "x-amz-replication-status";
const _xart = "x-amz-request-token";
const _xasc = "x-amz-storage-class";
const _xasca = "x-amz-sdk-checksum-algorithm";
const _xasdv = "x-amz-skip-destination-validation";
const _xasebo = "x-amz-source-expected-bucket-owner";
const _xasse = "x-amz-server-side-encryption";
const _xasseakki = "x-amz-server-side-encryption-aws-kms-key-id";
const _xassebke = "x-amz-server-side-encryption-bucket-key-enabled";
const _xassec = "x-amz-server-side-encryption-context";
const _xasseca = "x-amz-server-side-encryption-customer-algorithm";
const _xasseck = "x-amz-server-side-encryption-customer-key";
const _xasseckm = "x-amz-server-side-encryption-customer-key-md5";
const _xat = "x-amz-tagging";
const _xatc = "x-amz-tagging-count";
const _xatd = "x-amz-tagging-directive";
const _xatdmos = "x-amz-transition-default-minimum-object-size";
const _xavi = "x-amz-version-id";
const _xawob = "x-amz-write-offset-bytes";
const _xawrl = "x-amz-website-redirect-location";
const _xi = "x-id";
