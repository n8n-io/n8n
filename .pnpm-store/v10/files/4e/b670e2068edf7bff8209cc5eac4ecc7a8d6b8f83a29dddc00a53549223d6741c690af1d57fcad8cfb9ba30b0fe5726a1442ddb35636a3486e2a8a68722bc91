import { SENSITIVE_STRING } from "@smithy/smithy-client";
import { InventoryConfigurationFilterSensitiveLog, ServerSideEncryptionConfigurationFilterSensitiveLog, } from "./models_0";
import { S3ServiceException as __BaseException } from "./S3ServiceException";
export const MFADelete = {
    Disabled: "Disabled",
    Enabled: "Enabled",
};
export class EncryptionTypeMismatch extends __BaseException {
    name = "EncryptionTypeMismatch";
    $fault = "client";
    constructor(opts) {
        super({
            name: "EncryptionTypeMismatch",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, EncryptionTypeMismatch.prototype);
    }
}
export class InvalidRequest extends __BaseException {
    name = "InvalidRequest";
    $fault = "client";
    constructor(opts) {
        super({
            name: "InvalidRequest",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidRequest.prototype);
    }
}
export class InvalidWriteOffset extends __BaseException {
    name = "InvalidWriteOffset";
    $fault = "client";
    constructor(opts) {
        super({
            name: "InvalidWriteOffset",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidWriteOffset.prototype);
    }
}
export class TooManyParts extends __BaseException {
    name = "TooManyParts";
    $fault = "client";
    constructor(opts) {
        super({
            name: "TooManyParts",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, TooManyParts.prototype);
    }
}
export class ObjectAlreadyInActiveTierError extends __BaseException {
    name = "ObjectAlreadyInActiveTierError";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ObjectAlreadyInActiveTierError",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ObjectAlreadyInActiveTierError.prototype);
    }
}
export const Tier = {
    Bulk: "Bulk",
    Expedited: "Expedited",
    Standard: "Standard",
};
export const ExpressionType = {
    SQL: "SQL",
};
export const CompressionType = {
    BZIP2: "BZIP2",
    GZIP: "GZIP",
    NONE: "NONE",
};
export const FileHeaderInfo = {
    IGNORE: "IGNORE",
    NONE: "NONE",
    USE: "USE",
};
export const JSONType = {
    DOCUMENT: "DOCUMENT",
    LINES: "LINES",
};
export const QuoteFields = {
    ALWAYS: "ALWAYS",
    ASNEEDED: "ASNEEDED",
};
export const RestoreRequestType = {
    SELECT: "SELECT",
};
export var SelectObjectContentEventStream;
(function (SelectObjectContentEventStream) {
    SelectObjectContentEventStream.visit = (value, visitor) => {
        if (value.Records !== undefined)
            return visitor.Records(value.Records);
        if (value.Stats !== undefined)
            return visitor.Stats(value.Stats);
        if (value.Progress !== undefined)
            return visitor.Progress(value.Progress);
        if (value.Cont !== undefined)
            return visitor.Cont(value.Cont);
        if (value.End !== undefined)
            return visitor.End(value.End);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(SelectObjectContentEventStream || (SelectObjectContentEventStream = {}));
export const PutBucketEncryptionRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.ServerSideEncryptionConfiguration && {
        ServerSideEncryptionConfiguration: ServerSideEncryptionConfigurationFilterSensitiveLog(obj.ServerSideEncryptionConfiguration),
    }),
});
export const PutBucketInventoryConfigurationRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.InventoryConfiguration && {
        InventoryConfiguration: InventoryConfigurationFilterSensitiveLog(obj.InventoryConfiguration),
    }),
});
export const PutObjectOutputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.SSEKMSKeyId && { SSEKMSKeyId: SENSITIVE_STRING }),
    ...(obj.SSEKMSEncryptionContext && { SSEKMSEncryptionContext: SENSITIVE_STRING }),
});
export const PutObjectRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.SSECustomerKey && { SSECustomerKey: SENSITIVE_STRING }),
    ...(obj.SSEKMSKeyId && { SSEKMSKeyId: SENSITIVE_STRING }),
    ...(obj.SSEKMSEncryptionContext && { SSEKMSEncryptionContext: SENSITIVE_STRING }),
});
export const EncryptionFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.KMSKeyId && { KMSKeyId: SENSITIVE_STRING }),
});
export const S3LocationFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.Encryption && { Encryption: EncryptionFilterSensitiveLog(obj.Encryption) }),
});
export const OutputLocationFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.S3 && { S3: S3LocationFilterSensitiveLog(obj.S3) }),
});
export const RestoreRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.OutputLocation && { OutputLocation: OutputLocationFilterSensitiveLog(obj.OutputLocation) }),
});
export const RestoreObjectRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.RestoreRequest && { RestoreRequest: RestoreRequestFilterSensitiveLog(obj.RestoreRequest) }),
});
export const SelectObjectContentEventStreamFilterSensitiveLog = (obj) => {
    if (obj.Records !== undefined)
        return { Records: obj.Records };
    if (obj.Stats !== undefined)
        return { Stats: obj.Stats };
    if (obj.Progress !== undefined)
        return { Progress: obj.Progress };
    if (obj.Cont !== undefined)
        return { Cont: obj.Cont };
    if (obj.End !== undefined)
        return { End: obj.End };
    if (obj.$unknown !== undefined)
        return { [obj.$unknown[0]]: "UNKNOWN" };
};
export const SelectObjectContentOutputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.Payload && { Payload: "STREAMING_CONTENT" }),
});
export const SelectObjectContentRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.SSECustomerKey && { SSECustomerKey: SENSITIVE_STRING }),
});
export const UploadPartOutputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.SSEKMSKeyId && { SSEKMSKeyId: SENSITIVE_STRING }),
});
export const UploadPartRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.SSECustomerKey && { SSECustomerKey: SENSITIVE_STRING }),
});
export const UploadPartCopyOutputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.SSEKMSKeyId && { SSEKMSKeyId: SENSITIVE_STRING }),
});
export const UploadPartCopyRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.SSECustomerKey && { SSECustomerKey: SENSITIVE_STRING }),
    ...(obj.CopySourceSSECustomerKey && { CopySourceSSECustomerKey: SENSITIVE_STRING }),
});
export const WriteGetObjectResponseRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.SSEKMSKeyId && { SSEKMSKeyId: SENSITIVE_STRING }),
});
