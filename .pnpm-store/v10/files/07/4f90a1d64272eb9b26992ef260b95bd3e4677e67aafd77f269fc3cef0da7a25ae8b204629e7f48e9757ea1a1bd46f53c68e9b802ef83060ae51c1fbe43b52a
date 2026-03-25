import { loadRestJsonErrorCode, parseJsonBody as parseBody, parseJsonErrorBody as parseErrorBody } from "@aws-sdk/core";
import { requestBuilder as rb } from "@smithy/core";
import { _json, collectBody, decorateServiceException as __decorateServiceException, expectBoolean as __expectBoolean, expectInt32 as __expectInt32, expectLong as __expectLong, expectNonNull as __expectNonNull, expectNumber as __expectNumber, expectObject as __expectObject, expectString as __expectString, limitedParseDouble as __limitedParseDouble, map, parseEpochTimestamp as __parseEpochTimestamp, serializeDateTime as __serializeDateTime, take, withBaseException, } from "@smithy/smithy-client";
import { AccountSuspendedException, AlreadyExistsException, BadRequestException, ConcurrentModificationException, ConflictException, InternalServiceErrorException, InvalidNextTokenException, LimitExceededException, MailFromDomainNotVerifiedException, MessageRejected, NotFoundException, SendingPausedException, TooManyRequestsException, } from "../models/models_0";
import { SESv2ServiceException as __BaseException } from "../models/SESv2ServiceException";
export const se_BatchGetMetricDataCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/metrics/batch");
    let body;
    body = JSON.stringify(take(input, {
        Queries: (_) => se_BatchGetMetricDataQueries(_, context),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_CancelExportJobCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/export-jobs/{JobId}/cancel");
    b.p("JobId", () => input.JobId, "{JobId}", false);
    let body;
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_CreateConfigurationSetCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/configuration-sets");
    let body;
    body = JSON.stringify(take(input, {
        ArchivingOptions: (_) => _json(_),
        ConfigurationSetName: [],
        DeliveryOptions: (_) => _json(_),
        ReputationOptions: (_) => se_ReputationOptions(_, context),
        SendingOptions: (_) => _json(_),
        SuppressionOptions: (_) => _json(_),
        Tags: (_) => _json(_),
        TrackingOptions: (_) => _json(_),
        VdmOptions: (_) => _json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_CreateConfigurationSetEventDestinationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/event-destinations");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    body = JSON.stringify(take(input, {
        EventDestination: (_) => _json(_),
        EventDestinationName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_CreateContactCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/contact-lists/{ContactListName}/contacts");
    b.p("ContactListName", () => input.ContactListName, "{ContactListName}", false);
    let body;
    body = JSON.stringify(take(input, {
        AttributesData: [],
        EmailAddress: [],
        TopicPreferences: (_) => _json(_),
        UnsubscribeAll: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_CreateContactListCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/contact-lists");
    let body;
    body = JSON.stringify(take(input, {
        ContactListName: [],
        Description: [],
        Tags: (_) => _json(_),
        Topics: (_) => _json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_CreateCustomVerificationEmailTemplateCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/custom-verification-email-templates");
    let body;
    body = JSON.stringify(take(input, {
        FailureRedirectionURL: [],
        FromEmailAddress: [],
        SuccessRedirectionURL: [],
        TemplateContent: [],
        TemplateName: [],
        TemplateSubject: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_CreateDedicatedIpPoolCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/dedicated-ip-pools");
    let body;
    body = JSON.stringify(take(input, {
        PoolName: [],
        ScalingMode: [],
        Tags: (_) => _json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_CreateDeliverabilityTestReportCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/deliverability-dashboard/test");
    let body;
    body = JSON.stringify(take(input, {
        Content: (_) => se_EmailContent(_, context),
        FromEmailAddress: [],
        ReportName: [],
        Tags: (_) => _json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_CreateEmailIdentityCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/identities");
    let body;
    body = JSON.stringify(take(input, {
        ConfigurationSetName: [],
        DkimSigningAttributes: (_) => _json(_),
        EmailIdentity: [],
        Tags: (_) => _json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_CreateEmailIdentityPolicyCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/identities/{EmailIdentity}/policies/{PolicyName}");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    b.p("PolicyName", () => input.PolicyName, "{PolicyName}", false);
    let body;
    body = JSON.stringify(take(input, {
        Policy: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_CreateEmailTemplateCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/templates");
    let body;
    body = JSON.stringify(take(input, {
        TemplateContent: (_) => _json(_),
        TemplateName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_CreateExportJobCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/export-jobs");
    let body;
    body = JSON.stringify(take(input, {
        ExportDataSource: (_) => se_ExportDataSource(_, context),
        ExportDestination: (_) => _json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_CreateImportJobCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/import-jobs");
    let body;
    body = JSON.stringify(take(input, {
        ImportDataSource: (_) => _json(_),
        ImportDestination: (_) => _json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_CreateMultiRegionEndpointCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/multi-region-endpoints");
    let body;
    body = JSON.stringify(take(input, {
        Details: (_) => _json(_),
        EndpointName: [],
        Tags: (_) => _json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_CreateTenantCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/tenants");
    let body;
    body = JSON.stringify(take(input, {
        Tags: (_) => _json(_),
        TenantName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_CreateTenantResourceAssociationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/tenants/resources");
    let body;
    body = JSON.stringify(take(input, {
        ResourceArn: [],
        TenantName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_DeleteConfigurationSetCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
export const se_DeleteConfigurationSetEventDestinationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/event-destinations/{EventDestinationName}");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    b.p("EventDestinationName", () => input.EventDestinationName, "{EventDestinationName}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
export const se_DeleteContactCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/contact-lists/{ContactListName}/contacts/{EmailAddress}");
    b.p("ContactListName", () => input.ContactListName, "{ContactListName}", false);
    b.p("EmailAddress", () => input.EmailAddress, "{EmailAddress}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
export const se_DeleteContactListCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/contact-lists/{ContactListName}");
    b.p("ContactListName", () => input.ContactListName, "{ContactListName}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
export const se_DeleteCustomVerificationEmailTemplateCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/custom-verification-email-templates/{TemplateName}");
    b.p("TemplateName", () => input.TemplateName, "{TemplateName}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
export const se_DeleteDedicatedIpPoolCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/dedicated-ip-pools/{PoolName}");
    b.p("PoolName", () => input.PoolName, "{PoolName}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
export const se_DeleteEmailIdentityCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/identities/{EmailIdentity}");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
export const se_DeleteEmailIdentityPolicyCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/identities/{EmailIdentity}/policies/{PolicyName}");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    b.p("PolicyName", () => input.PolicyName, "{PolicyName}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
export const se_DeleteEmailTemplateCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/templates/{TemplateName}");
    b.p("TemplateName", () => input.TemplateName, "{TemplateName}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
export const se_DeleteMultiRegionEndpointCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/multi-region-endpoints/{EndpointName}");
    b.p("EndpointName", () => input.EndpointName, "{EndpointName}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
export const se_DeleteSuppressedDestinationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/suppression/addresses/{EmailAddress}");
    b.p("EmailAddress", () => input.EmailAddress, "{EmailAddress}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
export const se_DeleteTenantCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/tenants/delete");
    let body;
    body = JSON.stringify(take(input, {
        TenantName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_DeleteTenantResourceAssociationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/tenants/resources/delete");
    let body;
    body = JSON.stringify(take(input, {
        ResourceArn: [],
        TenantName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_GetAccountCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/account");
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_GetBlacklistReportsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/deliverability-dashboard/blacklist-report");
    const query = map({
        [_BIN]: [__expectNonNull(input.BlacklistItemNames, `BlacklistItemNames`) != null, () => input[_BIN] || []],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetConfigurationSetCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_GetConfigurationSetEventDestinationsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/event-destinations");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_GetContactCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/contact-lists/{ContactListName}/contacts/{EmailAddress}");
    b.p("ContactListName", () => input.ContactListName, "{ContactListName}", false);
    b.p("EmailAddress", () => input.EmailAddress, "{EmailAddress}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_GetContactListCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/contact-lists/{ContactListName}");
    b.p("ContactListName", () => input.ContactListName, "{ContactListName}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_GetCustomVerificationEmailTemplateCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/custom-verification-email-templates/{TemplateName}");
    b.p("TemplateName", () => input.TemplateName, "{TemplateName}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_GetDedicatedIpCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/dedicated-ips/{Ip}");
    b.p("Ip", () => input.Ip, "{Ip}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_GetDedicatedIpPoolCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/dedicated-ip-pools/{PoolName}");
    b.p("PoolName", () => input.PoolName, "{PoolName}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_GetDedicatedIpsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/dedicated-ips");
    const query = map({
        [_PN]: [, input[_PN]],
        [_NT]: [, input[_NT]],
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetDeliverabilityDashboardOptionsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/deliverability-dashboard");
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_GetDeliverabilityTestReportCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/deliverability-dashboard/test-reports/{ReportId}");
    b.p("ReportId", () => input.ReportId, "{ReportId}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_GetDomainDeliverabilityCampaignCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/deliverability-dashboard/campaigns/{CampaignId}");
    b.p("CampaignId", () => input.CampaignId, "{CampaignId}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_GetDomainStatisticsReportCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/deliverability-dashboard/statistics-report/{Domain}");
    b.p("Domain", () => input.Domain, "{Domain}", false);
    const query = map({
        [_SD]: [__expectNonNull(input.StartDate, `StartDate`) != null, () => __serializeDateTime(input[_SD]).toString()],
        [_ED]: [__expectNonNull(input.EndDate, `EndDate`) != null, () => __serializeDateTime(input[_ED]).toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetEmailIdentityCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/identities/{EmailIdentity}");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_GetEmailIdentityPoliciesCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/identities/{EmailIdentity}/policies");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_GetEmailTemplateCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/templates/{TemplateName}");
    b.p("TemplateName", () => input.TemplateName, "{TemplateName}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_GetExportJobCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/export-jobs/{JobId}");
    b.p("JobId", () => input.JobId, "{JobId}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_GetImportJobCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/import-jobs/{JobId}");
    b.p("JobId", () => input.JobId, "{JobId}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_GetMessageInsightsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/insights/{MessageId}");
    b.p("MessageId", () => input.MessageId, "{MessageId}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_GetMultiRegionEndpointCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/multi-region-endpoints/{EndpointName}");
    b.p("EndpointName", () => input.EndpointName, "{EndpointName}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_GetReputationEntityCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/reputation/entities/{ReputationEntityType}/{ReputationEntityReference}");
    b.p("ReputationEntityReference", () => input.ReputationEntityReference, "{ReputationEntityReference}", false);
    b.p("ReputationEntityType", () => input.ReputationEntityType, "{ReputationEntityType}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_GetSuppressedDestinationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/suppression/addresses/{EmailAddress}");
    b.p("EmailAddress", () => input.EmailAddress, "{EmailAddress}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_GetTenantCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/tenants/get");
    let body;
    body = JSON.stringify(take(input, {
        TenantName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_ListConfigurationSetsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/configuration-sets");
    const query = map({
        [_NT]: [, input[_NT]],
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListContactListsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/contact-lists");
    const query = map({
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
        [_NT]: [, input[_NT]],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListContactsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/contact-lists/{ContactListName}/contacts/list");
    b.p("ContactListName", () => input.ContactListName, "{ContactListName}", false);
    let body;
    body = JSON.stringify(take(input, {
        Filter: (_) => _json(_),
        NextToken: [],
        PageSize: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_ListCustomVerificationEmailTemplatesCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/custom-verification-email-templates");
    const query = map({
        [_NT]: [, input[_NT]],
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListDedicatedIpPoolsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/dedicated-ip-pools");
    const query = map({
        [_NT]: [, input[_NT]],
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListDeliverabilityTestReportsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/deliverability-dashboard/test-reports");
    const query = map({
        [_NT]: [, input[_NT]],
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListDomainDeliverabilityCampaignsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/deliverability-dashboard/domains/{SubscribedDomain}/campaigns");
    b.p("SubscribedDomain", () => input.SubscribedDomain, "{SubscribedDomain}", false);
    const query = map({
        [_SD]: [__expectNonNull(input.StartDate, `StartDate`) != null, () => __serializeDateTime(input[_SD]).toString()],
        [_ED]: [__expectNonNull(input.EndDate, `EndDate`) != null, () => __serializeDateTime(input[_ED]).toString()],
        [_NT]: [, input[_NT]],
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListEmailIdentitiesCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/identities");
    const query = map({
        [_NT]: [, input[_NT]],
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListEmailTemplatesCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/templates");
    const query = map({
        [_NT]: [, input[_NT]],
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListExportJobsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/list-export-jobs");
    let body;
    body = JSON.stringify(take(input, {
        ExportSourceType: [],
        JobStatus: [],
        NextToken: [],
        PageSize: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_ListImportJobsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/import-jobs/list");
    let body;
    body = JSON.stringify(take(input, {
        ImportDestinationType: [],
        NextToken: [],
        PageSize: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_ListMultiRegionEndpointsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/multi-region-endpoints");
    const query = map({
        [_NT]: [, input[_NT]],
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListRecommendationsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/vdm/recommendations");
    let body;
    body = JSON.stringify(take(input, {
        Filter: (_) => _json(_),
        NextToken: [],
        PageSize: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_ListReputationEntitiesCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/reputation/entities");
    let body;
    body = JSON.stringify(take(input, {
        Filter: (_) => _json(_),
        NextToken: [],
        PageSize: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_ListResourceTenantsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/resources/tenants/list");
    let body;
    body = JSON.stringify(take(input, {
        NextToken: [],
        PageSize: [],
        ResourceArn: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_ListSuppressedDestinationsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/suppression/addresses");
    const query = map({
        [_Re]: [() => input.Reasons !== void 0, () => input[_R] || []],
        [_SD]: [() => input.StartDate !== void 0, () => __serializeDateTime(input[_SD]).toString()],
        [_ED]: [() => input.EndDate !== void 0, () => __serializeDateTime(input[_ED]).toString()],
        [_NT]: [, input[_NT]],
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListTagsForResourceCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/tags");
    const query = map({
        [_RA]: [, __expectNonNull(input[_RA], `ResourceArn`)],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListTenantResourcesCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/tenants/resources/list");
    let body;
    body = JSON.stringify(take(input, {
        Filter: (_) => _json(_),
        NextToken: [],
        PageSize: [],
        TenantName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_ListTenantsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/tenants/list");
    let body;
    body = JSON.stringify(take(input, {
        NextToken: [],
        PageSize: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_PutAccountDedicatedIpWarmupAttributesCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/account/dedicated-ips/warmup");
    let body;
    body = JSON.stringify(take(input, {
        AutoWarmupEnabled: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_PutAccountDetailsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/account/details");
    let body;
    body = JSON.stringify(take(input, {
        AdditionalContactEmailAddresses: (_) => _json(_),
        ContactLanguage: [],
        MailType: [],
        ProductionAccessEnabled: [],
        UseCaseDescription: [],
        WebsiteURL: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_PutAccountSendingAttributesCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/account/sending");
    let body;
    body = JSON.stringify(take(input, {
        SendingEnabled: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_PutAccountSuppressionAttributesCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/account/suppression");
    let body;
    body = JSON.stringify(take(input, {
        SuppressedReasons: (_) => _json(_),
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_PutAccountVdmAttributesCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/account/vdm");
    let body;
    body = JSON.stringify(take(input, {
        VdmAttributes: (_) => _json(_),
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_PutConfigurationSetArchivingOptionsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/archiving-options");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    body = JSON.stringify(take(input, {
        ArchiveArn: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_PutConfigurationSetDeliveryOptionsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/delivery-options");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    body = JSON.stringify(take(input, {
        MaxDeliverySeconds: [],
        SendingPoolName: [],
        TlsPolicy: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_PutConfigurationSetReputationOptionsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/reputation-options");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    body = JSON.stringify(take(input, {
        ReputationMetricsEnabled: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_PutConfigurationSetSendingOptionsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/sending");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    body = JSON.stringify(take(input, {
        SendingEnabled: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_PutConfigurationSetSuppressionOptionsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/suppression-options");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    body = JSON.stringify(take(input, {
        SuppressedReasons: (_) => _json(_),
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_PutConfigurationSetTrackingOptionsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/tracking-options");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    body = JSON.stringify(take(input, {
        CustomRedirectDomain: [],
        HttpsPolicy: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_PutConfigurationSetVdmOptionsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/vdm-options");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    body = JSON.stringify(take(input, {
        VdmOptions: (_) => _json(_),
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_PutDedicatedIpInPoolCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/dedicated-ips/{Ip}/pool");
    b.p("Ip", () => input.Ip, "{Ip}", false);
    let body;
    body = JSON.stringify(take(input, {
        DestinationPoolName: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_PutDedicatedIpPoolScalingAttributesCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/dedicated-ip-pools/{PoolName}/scaling");
    b.p("PoolName", () => input.PoolName, "{PoolName}", false);
    let body;
    body = JSON.stringify(take(input, {
        ScalingMode: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_PutDedicatedIpWarmupAttributesCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/dedicated-ips/{Ip}/warmup");
    b.p("Ip", () => input.Ip, "{Ip}", false);
    let body;
    body = JSON.stringify(take(input, {
        WarmupPercentage: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_PutDeliverabilityDashboardOptionCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/deliverability-dashboard");
    let body;
    body = JSON.stringify(take(input, {
        DashboardEnabled: [],
        SubscribedDomains: (_) => se_DomainDeliverabilityTrackingOptions(_, context),
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_PutEmailIdentityConfigurationSetAttributesCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/identities/{EmailIdentity}/configuration-set");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    let body;
    body = JSON.stringify(take(input, {
        ConfigurationSetName: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_PutEmailIdentityDkimAttributesCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/identities/{EmailIdentity}/dkim");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    let body;
    body = JSON.stringify(take(input, {
        SigningEnabled: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_PutEmailIdentityDkimSigningAttributesCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v1/email/identities/{EmailIdentity}/dkim/signing");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    let body;
    body = JSON.stringify(take(input, {
        SigningAttributes: (_) => _json(_),
        SigningAttributesOrigin: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_PutEmailIdentityFeedbackAttributesCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/identities/{EmailIdentity}/feedback");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    let body;
    body = JSON.stringify(take(input, {
        EmailForwardingEnabled: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_PutEmailIdentityMailFromAttributesCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/identities/{EmailIdentity}/mail-from");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    let body;
    body = JSON.stringify(take(input, {
        BehaviorOnMxFailure: [],
        MailFromDomain: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_PutSuppressedDestinationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/suppression/addresses");
    let body;
    body = JSON.stringify(take(input, {
        EmailAddress: [],
        Reason: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_SendBulkEmailCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/outbound-bulk-emails");
    let body;
    body = JSON.stringify(take(input, {
        BulkEmailEntries: (_) => _json(_),
        ConfigurationSetName: [],
        DefaultContent: (_) => se_BulkEmailContent(_, context),
        DefaultEmailTags: (_) => _json(_),
        EndpointId: [],
        FeedbackForwardingEmailAddress: [],
        FeedbackForwardingEmailAddressIdentityArn: [],
        FromEmailAddress: [],
        FromEmailAddressIdentityArn: [],
        ReplyToAddresses: (_) => _json(_),
        TenantName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_SendCustomVerificationEmailCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/outbound-custom-verification-emails");
    let body;
    body = JSON.stringify(take(input, {
        ConfigurationSetName: [],
        EmailAddress: [],
        TemplateName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_SendEmailCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/outbound-emails");
    let body;
    body = JSON.stringify(take(input, {
        ConfigurationSetName: [],
        Content: (_) => se_EmailContent(_, context),
        Destination: (_) => _json(_),
        EmailTags: (_) => _json(_),
        EndpointId: [],
        FeedbackForwardingEmailAddress: [],
        FeedbackForwardingEmailAddressIdentityArn: [],
        FromEmailAddress: [],
        FromEmailAddressIdentityArn: [],
        ListManagementOptions: (_) => _json(_),
        ReplyToAddresses: (_) => _json(_),
        TenantName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_TagResourceCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/tags");
    let body;
    body = JSON.stringify(take(input, {
        ResourceArn: [],
        Tags: (_) => _json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_TestRenderEmailTemplateCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/templates/{TemplateName}/render");
    b.p("TemplateName", () => input.TemplateName, "{TemplateName}", false);
    let body;
    body = JSON.stringify(take(input, {
        TemplateData: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_UntagResourceCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/v2/email/tags");
    const query = map({
        [_RA]: [, __expectNonNull(input[_RA], `ResourceArn`)],
        [_TK]: [__expectNonNull(input.TagKeys, `TagKeys`) != null, () => input[_TK] || []],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
export const se_UpdateConfigurationSetEventDestinationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/event-destinations/{EventDestinationName}");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    b.p("EventDestinationName", () => input.EventDestinationName, "{EventDestinationName}", false);
    let body;
    body = JSON.stringify(take(input, {
        EventDestination: (_) => _json(_),
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_UpdateContactCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/contact-lists/{ContactListName}/contacts/{EmailAddress}");
    b.p("ContactListName", () => input.ContactListName, "{ContactListName}", false);
    b.p("EmailAddress", () => input.EmailAddress, "{EmailAddress}", false);
    let body;
    body = JSON.stringify(take(input, {
        AttributesData: [],
        TopicPreferences: (_) => _json(_),
        UnsubscribeAll: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_UpdateContactListCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/contact-lists/{ContactListName}");
    b.p("ContactListName", () => input.ContactListName, "{ContactListName}", false);
    let body;
    body = JSON.stringify(take(input, {
        Description: [],
        Topics: (_) => _json(_),
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_UpdateCustomVerificationEmailTemplateCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/custom-verification-email-templates/{TemplateName}");
    b.p("TemplateName", () => input.TemplateName, "{TemplateName}", false);
    let body;
    body = JSON.stringify(take(input, {
        FailureRedirectionURL: [],
        FromEmailAddress: [],
        SuccessRedirectionURL: [],
        TemplateContent: [],
        TemplateSubject: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_UpdateEmailIdentityPolicyCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/identities/{EmailIdentity}/policies/{PolicyName}");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    b.p("PolicyName", () => input.PolicyName, "{PolicyName}", false);
    let body;
    body = JSON.stringify(take(input, {
        Policy: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_UpdateEmailTemplateCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/templates/{TemplateName}");
    b.p("TemplateName", () => input.TemplateName, "{TemplateName}", false);
    let body;
    body = JSON.stringify(take(input, {
        TemplateContent: (_) => _json(_),
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_UpdateReputationEntityCustomerManagedStatusCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/reputation/entities/{ReputationEntityType}/{ReputationEntityReference}/customer-managed-status");
    b.p("ReputationEntityType", () => input.ReputationEntityType, "{ReputationEntityType}", false);
    b.p("ReputationEntityReference", () => input.ReputationEntityReference, "{ReputationEntityReference}", false);
    let body;
    body = JSON.stringify(take(input, {
        SendingStatus: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_UpdateReputationEntityPolicyCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/reputation/entities/{ReputationEntityType}/{ReputationEntityReference}/policy");
    b.p("ReputationEntityType", () => input.ReputationEntityType, "{ReputationEntityType}", false);
    b.p("ReputationEntityReference", () => input.ReputationEntityReference, "{ReputationEntityReference}", false);
    let body;
    body = JSON.stringify(take(input, {
        ReputationEntityPolicy: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const de_BatchGetMetricDataCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        Errors: _json,
        Results: (_) => de_MetricDataResultList(_, context),
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_CancelExportJobCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_CreateConfigurationSetCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_CreateConfigurationSetEventDestinationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_CreateContactCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_CreateContactListCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_CreateCustomVerificationEmailTemplateCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_CreateDedicatedIpPoolCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_CreateDeliverabilityTestReportCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        DeliverabilityTestStatus: __expectString,
        ReportId: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_CreateEmailIdentityCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        DkimAttributes: (_) => de_DkimAttributes(_, context),
        IdentityType: __expectString,
        VerifiedForSendingStatus: __expectBoolean,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_CreateEmailIdentityPolicyCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_CreateEmailTemplateCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_CreateExportJobCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        JobId: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_CreateImportJobCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        JobId: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_CreateMultiRegionEndpointCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        EndpointId: __expectString,
        Status: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_CreateTenantCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        CreatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        SendingStatus: __expectString,
        Tags: _json,
        TenantArn: __expectString,
        TenantId: __expectString,
        TenantName: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_CreateTenantResourceAssociationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteConfigurationSetCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteConfigurationSetEventDestinationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteContactCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteContactListCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteCustomVerificationEmailTemplateCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteDedicatedIpPoolCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteEmailIdentityCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteEmailIdentityPolicyCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteEmailTemplateCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteMultiRegionEndpointCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        Status: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_DeleteSuppressedDestinationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteTenantCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteTenantResourceAssociationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_GetAccountCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        DedicatedIpAutoWarmupEnabled: __expectBoolean,
        Details: _json,
        EnforcementStatus: __expectString,
        ProductionAccessEnabled: __expectBoolean,
        SendQuota: (_) => de_SendQuota(_, context),
        SendingEnabled: __expectBoolean,
        SuppressionAttributes: _json,
        VdmAttributes: _json,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetBlacklistReportsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        BlacklistReport: (_) => de_BlacklistReport(_, context),
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetConfigurationSetCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        ArchivingOptions: _json,
        ConfigurationSetName: __expectString,
        DeliveryOptions: _json,
        ReputationOptions: (_) => de_ReputationOptions(_, context),
        SendingOptions: _json,
        SuppressionOptions: _json,
        Tags: _json,
        TrackingOptions: _json,
        VdmOptions: _json,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetConfigurationSetEventDestinationsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        EventDestinations: _json,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetContactCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        AttributesData: __expectString,
        ContactListName: __expectString,
        CreatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EmailAddress: __expectString,
        LastUpdatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        TopicDefaultPreferences: _json,
        TopicPreferences: _json,
        UnsubscribeAll: __expectBoolean,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetContactListCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        ContactListName: __expectString,
        CreatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        LastUpdatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Tags: _json,
        Topics: _json,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetCustomVerificationEmailTemplateCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        FailureRedirectionURL: __expectString,
        FromEmailAddress: __expectString,
        SuccessRedirectionURL: __expectString,
        TemplateContent: __expectString,
        TemplateName: __expectString,
        TemplateSubject: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetDedicatedIpCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        DedicatedIp: _json,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetDedicatedIpPoolCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        DedicatedIpPool: _json,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetDedicatedIpsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        DedicatedIps: _json,
        NextToken: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetDeliverabilityDashboardOptionsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        AccountStatus: __expectString,
        ActiveSubscribedDomains: (_) => de_DomainDeliverabilityTrackingOptions(_, context),
        DashboardEnabled: __expectBoolean,
        PendingExpirationSubscribedDomains: (_) => de_DomainDeliverabilityTrackingOptions(_, context),
        SubscriptionExpiryDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetDeliverabilityTestReportCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        DeliverabilityTestReport: (_) => de_DeliverabilityTestReport(_, context),
        IspPlacements: (_) => de_IspPlacements(_, context),
        Message: __expectString,
        OverallPlacement: (_) => de_PlacementStatistics(_, context),
        Tags: _json,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetDomainDeliverabilityCampaignCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        DomainDeliverabilityCampaign: (_) => de_DomainDeliverabilityCampaign(_, context),
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetDomainStatisticsReportCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        DailyVolumes: (_) => de_DailyVolumes(_, context),
        OverallVolume: (_) => de_OverallVolume(_, context),
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetEmailIdentityCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        ConfigurationSetName: __expectString,
        DkimAttributes: (_) => de_DkimAttributes(_, context),
        FeedbackForwardingStatus: __expectBoolean,
        IdentityType: __expectString,
        MailFromAttributes: _json,
        Policies: _json,
        Tags: _json,
        VerificationInfo: (_) => de_VerificationInfo(_, context),
        VerificationStatus: __expectString,
        VerifiedForSendingStatus: __expectBoolean,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetEmailIdentityPoliciesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        Policies: _json,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetEmailTemplateCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        TemplateContent: _json,
        TemplateName: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetExportJobCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        CompletedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        CreatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ExportDataSource: (_) => de_ExportDataSource(_, context),
        ExportDestination: _json,
        ExportSourceType: __expectString,
        FailureInfo: _json,
        JobId: __expectString,
        JobStatus: __expectString,
        Statistics: _json,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetImportJobCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        CompletedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        CreatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailedRecordsCount: __expectInt32,
        FailureInfo: _json,
        ImportDataSource: _json,
        ImportDestination: _json,
        JobId: __expectString,
        JobStatus: __expectString,
        ProcessedRecordsCount: __expectInt32,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetMessageInsightsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        EmailTags: _json,
        FromEmailAddress: __expectString,
        Insights: (_) => de_EmailInsightsList(_, context),
        MessageId: __expectString,
        Subject: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetMultiRegionEndpointCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        CreatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EndpointId: __expectString,
        EndpointName: __expectString,
        LastUpdatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Routes: _json,
        Status: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetReputationEntityCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        ReputationEntity: (_) => de_ReputationEntity(_, context),
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetSuppressedDestinationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        SuppressedDestination: (_) => de_SuppressedDestination(_, context),
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetTenantCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        Tenant: (_) => de_Tenant(_, context),
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListConfigurationSetsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        ConfigurationSets: _json,
        NextToken: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListContactListsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        ContactLists: (_) => de_ListOfContactLists(_, context),
        NextToken: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListContactsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        Contacts: (_) => de_ListOfContacts(_, context),
        NextToken: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListCustomVerificationEmailTemplatesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        CustomVerificationEmailTemplates: _json,
        NextToken: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListDedicatedIpPoolsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        DedicatedIpPools: _json,
        NextToken: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListDeliverabilityTestReportsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        DeliverabilityTestReports: (_) => de_DeliverabilityTestReports(_, context),
        NextToken: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListDomainDeliverabilityCampaignsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        DomainDeliverabilityCampaigns: (_) => de_DomainDeliverabilityCampaignList(_, context),
        NextToken: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListEmailIdentitiesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        EmailIdentities: _json,
        NextToken: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListEmailTemplatesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        NextToken: __expectString,
        TemplatesMetadata: (_) => de_EmailTemplateMetadataList(_, context),
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListExportJobsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        ExportJobs: (_) => de_ExportJobSummaryList(_, context),
        NextToken: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListImportJobsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        ImportJobs: (_) => de_ImportJobSummaryList(_, context),
        NextToken: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListMultiRegionEndpointsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        MultiRegionEndpoints: (_) => de_MultiRegionEndpoints(_, context),
        NextToken: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListRecommendationsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        NextToken: __expectString,
        Recommendations: (_) => de_RecommendationsList(_, context),
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListReputationEntitiesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        NextToken: __expectString,
        ReputationEntities: (_) => de_ReputationEntitiesList(_, context),
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListResourceTenantsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        NextToken: __expectString,
        ResourceTenants: (_) => de_ResourceTenantMetadataList(_, context),
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListSuppressedDestinationsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        NextToken: __expectString,
        SuppressedDestinationSummaries: (_) => de_SuppressedDestinationSummaries(_, context),
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListTagsForResourceCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        Tags: _json,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListTenantResourcesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        NextToken: __expectString,
        TenantResources: _json,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListTenantsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        NextToken: __expectString,
        Tenants: (_) => de_TenantInfoList(_, context),
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_PutAccountDedicatedIpWarmupAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutAccountDetailsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutAccountSendingAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutAccountSuppressionAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutAccountVdmAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutConfigurationSetArchivingOptionsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutConfigurationSetDeliveryOptionsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutConfigurationSetReputationOptionsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutConfigurationSetSendingOptionsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutConfigurationSetSuppressionOptionsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutConfigurationSetTrackingOptionsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutConfigurationSetVdmOptionsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutDedicatedIpInPoolCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutDedicatedIpPoolScalingAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutDedicatedIpWarmupAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutDeliverabilityDashboardOptionCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutEmailIdentityConfigurationSetAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutEmailIdentityDkimAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutEmailIdentityDkimSigningAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        DkimStatus: __expectString,
        DkimTokens: _json,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_PutEmailIdentityFeedbackAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutEmailIdentityMailFromAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_PutSuppressedDestinationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_SendBulkEmailCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        BulkEmailEntryResults: _json,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_SendCustomVerificationEmailCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        MessageId: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_SendEmailCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        MessageId: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_TagResourceCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_TestRenderEmailTemplateCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        RenderedTemplate: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_UntagResourceCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_UpdateConfigurationSetEventDestinationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_UpdateContactCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_UpdateContactListCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_UpdateCustomVerificationEmailTemplateCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_UpdateEmailIdentityPolicyCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_UpdateEmailTemplateCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_UpdateReputationEntityCustomerManagedStatusCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_UpdateReputationEntityPolicyCommand = async (output, context) => {
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
    const errorCode = loadRestJsonErrorCode(output, parsedOutput.body);
    switch (errorCode) {
        case "BadRequestException":
        case "com.amazonaws.sesv2#BadRequestException":
            throw await de_BadRequestExceptionRes(parsedOutput, context);
        case "InternalServiceErrorException":
        case "com.amazonaws.sesv2#InternalServiceErrorException":
            throw await de_InternalServiceErrorExceptionRes(parsedOutput, context);
        case "NotFoundException":
        case "com.amazonaws.sesv2#NotFoundException":
            throw await de_NotFoundExceptionRes(parsedOutput, context);
        case "TooManyRequestsException":
        case "com.amazonaws.sesv2#TooManyRequestsException":
            throw await de_TooManyRequestsExceptionRes(parsedOutput, context);
        case "AlreadyExistsException":
        case "com.amazonaws.sesv2#AlreadyExistsException":
            throw await de_AlreadyExistsExceptionRes(parsedOutput, context);
        case "ConcurrentModificationException":
        case "com.amazonaws.sesv2#ConcurrentModificationException":
            throw await de_ConcurrentModificationExceptionRes(parsedOutput, context);
        case "LimitExceededException":
        case "com.amazonaws.sesv2#LimitExceededException":
            throw await de_LimitExceededExceptionRes(parsedOutput, context);
        case "AccountSuspendedException":
        case "com.amazonaws.sesv2#AccountSuspendedException":
            throw await de_AccountSuspendedExceptionRes(parsedOutput, context);
        case "MailFromDomainNotVerifiedException":
        case "com.amazonaws.sesv2#MailFromDomainNotVerifiedException":
            throw await de_MailFromDomainNotVerifiedExceptionRes(parsedOutput, context);
        case "MessageRejected":
        case "com.amazonaws.sesv2#MessageRejected":
            throw await de_MessageRejectedRes(parsedOutput, context);
        case "SendingPausedException":
        case "com.amazonaws.sesv2#SendingPausedException":
            throw await de_SendingPausedExceptionRes(parsedOutput, context);
        case "InvalidNextTokenException":
        case "com.amazonaws.sesv2#InvalidNextTokenException":
            throw await de_InvalidNextTokenExceptionRes(parsedOutput, context);
        case "ConflictException":
        case "com.amazonaws.sesv2#ConflictException":
            throw await de_ConflictExceptionRes(parsedOutput, context);
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
const de_AccountSuspendedExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new AccountSuspendedException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_AlreadyExistsExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new AlreadyExistsException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_BadRequestExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new BadRequestException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_ConcurrentModificationExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new ConcurrentModificationException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_ConflictExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new ConflictException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_InternalServiceErrorExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new InternalServiceErrorException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_InvalidNextTokenExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new InvalidNextTokenException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_LimitExceededExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new LimitExceededException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_MailFromDomainNotVerifiedExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new MailFromDomainNotVerifiedException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_MessageRejectedRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new MessageRejected({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_NotFoundExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new NotFoundException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_SendingPausedExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new SendingPausedException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_TooManyRequestsExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new TooManyRequestsException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const se_Attachment = (input, context) => {
    return take(input, {
        ContentDescription: [],
        ContentDisposition: [],
        ContentId: [],
        ContentTransferEncoding: [],
        ContentType: [],
        FileName: [],
        RawContent: context.base64Encoder,
    });
};
const se_AttachmentList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_Attachment(entry, context);
    });
};
const se_BatchGetMetricDataQueries = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_BatchGetMetricDataQuery(entry, context);
    });
};
const se_BatchGetMetricDataQuery = (input, context) => {
    return take(input, {
        Dimensions: _json,
        EndDate: (_) => _.getTime() / 1_000,
        Id: [],
        Metric: [],
        Namespace: [],
        StartDate: (_) => _.getTime() / 1_000,
    });
};
const se_BulkEmailContent = (input, context) => {
    return take(input, {
        Template: (_) => se_Template(_, context),
    });
};
const se_DomainDeliverabilityTrackingOption = (input, context) => {
    return take(input, {
        Domain: [],
        InboxPlacementTrackingOption: _json,
        SubscriptionStartDate: (_) => _.getTime() / 1_000,
    });
};
const se_DomainDeliverabilityTrackingOptions = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_DomainDeliverabilityTrackingOption(entry, context);
    });
};
const se_EmailContent = (input, context) => {
    return take(input, {
        Raw: (_) => se_RawMessage(_, context),
        Simple: (_) => se_Message(_, context),
        Template: (_) => se_Template(_, context),
    });
};
const se_ExportDataSource = (input, context) => {
    return take(input, {
        MessageInsightsDataSource: (_) => se_MessageInsightsDataSource(_, context),
        MetricsDataSource: (_) => se_MetricsDataSource(_, context),
    });
};
const se_Message = (input, context) => {
    return take(input, {
        Attachments: (_) => se_AttachmentList(_, context),
        Body: _json,
        Headers: _json,
        Subject: _json,
    });
};
const se_MessageInsightsDataSource = (input, context) => {
    return take(input, {
        EndDate: (_) => _.getTime() / 1_000,
        Exclude: _json,
        Include: _json,
        MaxResults: [],
        StartDate: (_) => _.getTime() / 1_000,
    });
};
const se_MetricsDataSource = (input, context) => {
    return take(input, {
        Dimensions: _json,
        EndDate: (_) => _.getTime() / 1_000,
        Metrics: _json,
        Namespace: [],
        StartDate: (_) => _.getTime() / 1_000,
    });
};
const se_RawMessage = (input, context) => {
    return take(input, {
        Data: context.base64Encoder,
    });
};
const se_ReputationOptions = (input, context) => {
    return take(input, {
        LastFreshStart: (_) => _.getTime() / 1_000,
        ReputationMetricsEnabled: [],
    });
};
const se_Template = (input, context) => {
    return take(input, {
        Attachments: (_) => se_AttachmentList(_, context),
        Headers: _json,
        TemplateArn: [],
        TemplateContent: _json,
        TemplateData: [],
        TemplateName: [],
    });
};
const de_BlacklistEntries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_BlacklistEntry(entry, context);
    });
    return retVal;
};
const de_BlacklistEntry = (output, context) => {
    return take(output, {
        Description: __expectString,
        ListingTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        RblName: __expectString,
    });
};
const de_BlacklistReport = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = de_BlacklistEntries(value, context);
        return acc;
    }, {});
};
const de_Contact = (output, context) => {
    return take(output, {
        EmailAddress: __expectString,
        LastUpdatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        TopicDefaultPreferences: _json,
        TopicPreferences: _json,
        UnsubscribeAll: __expectBoolean,
    });
};
const de_ContactList = (output, context) => {
    return take(output, {
        ContactListName: __expectString,
        LastUpdatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_DailyVolume = (output, context) => {
    return take(output, {
        DomainIspPlacements: (_) => de_DomainIspPlacements(_, context),
        StartDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        VolumeStatistics: _json,
    });
};
const de_DailyVolumes = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DailyVolume(entry, context);
    });
    return retVal;
};
const de_DeliverabilityTestReport = (output, context) => {
    return take(output, {
        CreateDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DeliverabilityTestStatus: __expectString,
        FromEmailAddress: __expectString,
        ReportId: __expectString,
        ReportName: __expectString,
        Subject: __expectString,
    });
};
const de_DeliverabilityTestReports = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DeliverabilityTestReport(entry, context);
    });
    return retVal;
};
const de_DkimAttributes = (output, context) => {
    return take(output, {
        CurrentSigningKeyLength: __expectString,
        LastKeyGenerationTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        NextSigningKeyLength: __expectString,
        SigningAttributesOrigin: __expectString,
        SigningEnabled: __expectBoolean,
        Status: __expectString,
        Tokens: _json,
    });
};
const de_DomainDeliverabilityCampaign = (output, context) => {
    return take(output, {
        CampaignId: __expectString,
        DeleteRate: __limitedParseDouble,
        Esps: _json,
        FirstSeenDateTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FromAddress: __expectString,
        ImageUrl: __expectString,
        InboxCount: __expectLong,
        LastSeenDateTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ProjectedVolume: __expectLong,
        ReadDeleteRate: __limitedParseDouble,
        ReadRate: __limitedParseDouble,
        SendingIps: _json,
        SpamCount: __expectLong,
        Subject: __expectString,
    });
};
const de_DomainDeliverabilityCampaignList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DomainDeliverabilityCampaign(entry, context);
    });
    return retVal;
};
const de_DomainDeliverabilityTrackingOption = (output, context) => {
    return take(output, {
        Domain: __expectString,
        InboxPlacementTrackingOption: _json,
        SubscriptionStartDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_DomainDeliverabilityTrackingOptions = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DomainDeliverabilityTrackingOption(entry, context);
    });
    return retVal;
};
const de_DomainIspPlacement = (output, context) => {
    return take(output, {
        InboxPercentage: __limitedParseDouble,
        InboxRawCount: __expectLong,
        IspName: __expectString,
        SpamPercentage: __limitedParseDouble,
        SpamRawCount: __expectLong,
    });
};
const de_DomainIspPlacements = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DomainIspPlacement(entry, context);
    });
    return retVal;
};
const de_EmailInsights = (output, context) => {
    return take(output, {
        Destination: __expectString,
        Events: (_) => de_InsightsEvents(_, context),
        Isp: __expectString,
    });
};
const de_EmailInsightsList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_EmailInsights(entry, context);
    });
    return retVal;
};
const de_EmailTemplateMetadata = (output, context) => {
    return take(output, {
        CreatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        TemplateName: __expectString,
    });
};
const de_EmailTemplateMetadataList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_EmailTemplateMetadata(entry, context);
    });
    return retVal;
};
const de_ExportDataSource = (output, context) => {
    return take(output, {
        MessageInsightsDataSource: (_) => de_MessageInsightsDataSource(_, context),
        MetricsDataSource: (_) => de_MetricsDataSource(_, context),
    });
};
const de_ExportJobSummary = (output, context) => {
    return take(output, {
        CompletedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        CreatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ExportSourceType: __expectString,
        JobId: __expectString,
        JobStatus: __expectString,
    });
};
const de_ExportJobSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ExportJobSummary(entry, context);
    });
    return retVal;
};
const de_ImportJobSummary = (output, context) => {
    return take(output, {
        CreatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailedRecordsCount: __expectInt32,
        ImportDestination: _json,
        JobId: __expectString,
        JobStatus: __expectString,
        ProcessedRecordsCount: __expectInt32,
    });
};
const de_ImportJobSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ImportJobSummary(entry, context);
    });
    return retVal;
};
const de_InsightsEvent = (output, context) => {
    return take(output, {
        Details: _json,
        Timestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Type: __expectString,
    });
};
const de_InsightsEvents = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_InsightsEvent(entry, context);
    });
    return retVal;
};
const de_IspPlacement = (output, context) => {
    return take(output, {
        IspName: __expectString,
        PlacementStatistics: (_) => de_PlacementStatistics(_, context),
    });
};
const de_IspPlacements = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_IspPlacement(entry, context);
    });
    return retVal;
};
const de_ListOfContactLists = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ContactList(entry, context);
    });
    return retVal;
};
const de_ListOfContacts = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Contact(entry, context);
    });
    return retVal;
};
const de_MessageInsightsDataSource = (output, context) => {
    return take(output, {
        EndDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Exclude: _json,
        Include: _json,
        MaxResults: __expectInt32,
        StartDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_MetricDataResult = (output, context) => {
    return take(output, {
        Id: __expectString,
        Timestamps: (_) => de_TimestampList(_, context),
        Values: _json,
    });
};
const de_MetricDataResultList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_MetricDataResult(entry, context);
    });
    return retVal;
};
const de_MetricsDataSource = (output, context) => {
    return take(output, {
        Dimensions: _json,
        EndDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Metrics: _json,
        Namespace: __expectString,
        StartDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_MultiRegionEndpoint = (output, context) => {
    return take(output, {
        CreatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EndpointId: __expectString,
        EndpointName: __expectString,
        LastUpdatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Regions: _json,
        Status: __expectString,
    });
};
const de_MultiRegionEndpoints = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_MultiRegionEndpoint(entry, context);
    });
    return retVal;
};
const de_OverallVolume = (output, context) => {
    return take(output, {
        DomainIspPlacements: (_) => de_DomainIspPlacements(_, context),
        ReadRatePercent: __limitedParseDouble,
        VolumeStatistics: _json,
    });
};
const de_PlacementStatistics = (output, context) => {
    return take(output, {
        DkimPercentage: __limitedParseDouble,
        InboxPercentage: __limitedParseDouble,
        MissingPercentage: __limitedParseDouble,
        SpamPercentage: __limitedParseDouble,
        SpfPercentage: __limitedParseDouble,
    });
};
const de_Recommendation = (output, context) => {
    return take(output, {
        CreatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        Impact: __expectString,
        LastUpdatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ResourceArn: __expectString,
        Status: __expectString,
        Type: __expectString,
    });
};
const de_RecommendationsList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Recommendation(entry, context);
    });
    return retVal;
};
const de_ReputationEntitiesList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ReputationEntity(entry, context);
    });
    return retVal;
};
const de_ReputationEntity = (output, context) => {
    return take(output, {
        AwsSesManagedStatus: (_) => de_StatusRecord(_, context),
        CustomerManagedStatus: (_) => de_StatusRecord(_, context),
        ReputationEntityReference: __expectString,
        ReputationEntityType: __expectString,
        ReputationImpact: __expectString,
        ReputationManagementPolicy: __expectString,
        SendingStatusAggregate: __expectString,
    });
};
const de_ReputationOptions = (output, context) => {
    return take(output, {
        LastFreshStart: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ReputationMetricsEnabled: __expectBoolean,
    });
};
const de_ResourceTenantMetadata = (output, context) => {
    return take(output, {
        AssociatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ResourceArn: __expectString,
        TenantId: __expectString,
        TenantName: __expectString,
    });
};
const de_ResourceTenantMetadataList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ResourceTenantMetadata(entry, context);
    });
    return retVal;
};
const de_SendQuota = (output, context) => {
    return take(output, {
        Max24HourSend: __limitedParseDouble,
        MaxSendRate: __limitedParseDouble,
        SentLast24Hours: __limitedParseDouble,
    });
};
const de_StatusRecord = (output, context) => {
    return take(output, {
        Cause: __expectString,
        LastUpdatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Status: __expectString,
    });
};
const de_SuppressedDestination = (output, context) => {
    return take(output, {
        Attributes: _json,
        EmailAddress: __expectString,
        LastUpdateTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Reason: __expectString,
    });
};
const de_SuppressedDestinationSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_SuppressedDestinationSummary(entry, context);
    });
    return retVal;
};
const de_SuppressedDestinationSummary = (output, context) => {
    return take(output, {
        EmailAddress: __expectString,
        LastUpdateTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Reason: __expectString,
    });
};
const de_Tenant = (output, context) => {
    return take(output, {
        CreatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        SendingStatus: __expectString,
        Tags: _json,
        TenantArn: __expectString,
        TenantId: __expectString,
        TenantName: __expectString,
    });
};
const de_TenantInfo = (output, context) => {
    return take(output, {
        CreatedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        TenantArn: __expectString,
        TenantId: __expectString,
        TenantName: __expectString,
    });
};
const de_TenantInfoList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_TenantInfo(entry, context);
    });
    return retVal;
};
const de_TimestampList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectNonNull(__parseEpochTimestamp(__expectNumber(entry)));
    });
    return retVal;
};
const de_VerificationInfo = (output, context) => {
    return take(output, {
        ErrorType: __expectString,
        LastCheckedTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastSuccessTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        SOARecord: _json,
    });
};
const deserializeMetadata = (output) => ({
    httpStatusCode: output.statusCode,
    requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
    extendedRequestId: output.headers["x-amz-id-2"],
    cfId: output.headers["x-amz-cf-id"],
});
const collectBodyString = (streamBody, context) => collectBody(streamBody, context).then((body) => context.utf8Encoder(body));
const _BIN = "BlacklistItemNames";
const _ED = "EndDate";
const _NT = "NextToken";
const _PN = "PoolName";
const _PS = "PageSize";
const _R = "Reasons";
const _RA = "ResourceArn";
const _Re = "Reason";
const _SD = "StartDate";
const _TK = "TagKeys";
