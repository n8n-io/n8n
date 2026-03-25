import { SENSITIVE_STRING } from "@smithy/smithy-client";
import { DkimSigningAttributesFilterSensitiveLog, } from "./models_0";
export const ListTenantResourcesFilterKey = {
    RESOURCE_TYPE: "RESOURCE_TYPE",
};
export const ResourceType = {
    CONFIGURATION_SET: "CONFIGURATION_SET",
    EMAIL_IDENTITY: "EMAIL_IDENTITY",
    EMAIL_TEMPLATE: "EMAIL_TEMPLATE",
};
export const PutAccountDetailsRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.WebsiteURL && { WebsiteURL: SENSITIVE_STRING }),
    ...(obj.UseCaseDescription && { UseCaseDescription: SENSITIVE_STRING }),
    ...(obj.AdditionalContactEmailAddresses && { AdditionalContactEmailAddresses: SENSITIVE_STRING }),
});
export const PutEmailIdentityDkimSigningAttributesRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.SigningAttributes && { SigningAttributes: DkimSigningAttributesFilterSensitiveLog(obj.SigningAttributes) }),
});
