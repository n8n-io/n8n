import { SENSITIVE_STRING } from "@smithy/smithy-client";
import { ModelPackageModelCardFilterSensitiveLog, } from "./models_1";
import { OidcConfigFilterSensitiveLog, } from "./models_2";
export const VariantPropertyType = {
    DataCaptureConfig: "DataCaptureConfig",
    DesiredInstanceCount: "DesiredInstanceCount",
    DesiredWeight: "DesiredWeight",
};
export const UpdateModelCardRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.Content && { Content: SENSITIVE_STRING }),
});
export const UpdateModelPackageInputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.ModelCard && { ModelCard: ModelPackageModelCardFilterSensitiveLog(obj.ModelCard) }),
});
export const UpdateWorkforceRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.OidcConfig && { OidcConfig: OidcConfigFilterSensitiveLog(obj.OidcConfig) }),
});
