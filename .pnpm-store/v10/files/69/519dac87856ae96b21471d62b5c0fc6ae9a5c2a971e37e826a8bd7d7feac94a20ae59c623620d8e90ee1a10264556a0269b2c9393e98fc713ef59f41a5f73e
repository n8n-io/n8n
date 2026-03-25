import { loadRestJsonErrorCode, parseJsonBody as parseBody, parseJsonErrorBody as parseErrorBody } from "@aws-sdk/core";
import { HttpRequest as __HttpRequest } from "@smithy/protocol-http";
import { _json, collectBody, decorateServiceException as __decorateServiceException, expectBoolean as __expectBoolean, expectInt32 as __expectInt32, expectLong as __expectLong, expectNonNull as __expectNonNull, expectNumber as __expectNumber, expectString as __expectString, limitedParseFloat32 as __limitedParseFloat32, parseEpochTimestamp as __parseEpochTimestamp, serializeFloat as __serializeFloat, take, withBaseException, } from "@smithy/smithy-client";
import { v4 as generateIdempotencyToken } from "uuid";
import { KendraServiceException as __BaseException } from "../models/KendraServiceException";
import { AccessDeniedException, ConflictException, FeaturedResultsConflictException, InternalServerException, InvalidRequestException, ResourceAlreadyExistException, ResourceNotFoundException, ResourceUnavailableException, ServiceQuotaExceededException, ThrottlingException, ValidationException, } from "../models/models_0";
import { ResourceInUseException, } from "../models/models_1";
export const se_AssociateEntitiesToExperienceCommand = async (input, context) => {
    const headers = sharedHeaders("AssociateEntitiesToExperience");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_AssociatePersonasToEntitiesCommand = async (input, context) => {
    const headers = sharedHeaders("AssociatePersonasToEntities");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_BatchDeleteDocumentCommand = async (input, context) => {
    const headers = sharedHeaders("BatchDeleteDocument");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_BatchDeleteFeaturedResultsSetCommand = async (input, context) => {
    const headers = sharedHeaders("BatchDeleteFeaturedResultsSet");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_BatchGetDocumentStatusCommand = async (input, context) => {
    const headers = sharedHeaders("BatchGetDocumentStatus");
    let body;
    body = JSON.stringify(se_BatchGetDocumentStatusRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_BatchPutDocumentCommand = async (input, context) => {
    const headers = sharedHeaders("BatchPutDocument");
    let body;
    body = JSON.stringify(se_BatchPutDocumentRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ClearQuerySuggestionsCommand = async (input, context) => {
    const headers = sharedHeaders("ClearQuerySuggestions");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateAccessControlConfigurationCommand = async (input, context) => {
    const headers = sharedHeaders("CreateAccessControlConfiguration");
    let body;
    body = JSON.stringify(se_CreateAccessControlConfigurationRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateDataSourceCommand = async (input, context) => {
    const headers = sharedHeaders("CreateDataSource");
    let body;
    body = JSON.stringify(se_CreateDataSourceRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateExperienceCommand = async (input, context) => {
    const headers = sharedHeaders("CreateExperience");
    let body;
    body = JSON.stringify(se_CreateExperienceRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateFaqCommand = async (input, context) => {
    const headers = sharedHeaders("CreateFaq");
    let body;
    body = JSON.stringify(se_CreateFaqRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateFeaturedResultsSetCommand = async (input, context) => {
    const headers = sharedHeaders("CreateFeaturedResultsSet");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateIndexCommand = async (input, context) => {
    const headers = sharedHeaders("CreateIndex");
    let body;
    body = JSON.stringify(se_CreateIndexRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateQuerySuggestionsBlockListCommand = async (input, context) => {
    const headers = sharedHeaders("CreateQuerySuggestionsBlockList");
    let body;
    body = JSON.stringify(se_CreateQuerySuggestionsBlockListRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateThesaurusCommand = async (input, context) => {
    const headers = sharedHeaders("CreateThesaurus");
    let body;
    body = JSON.stringify(se_CreateThesaurusRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteAccessControlConfigurationCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteAccessControlConfiguration");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteDataSourceCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteDataSource");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteExperienceCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteExperience");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteFaqCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteFaq");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteIndexCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteIndex");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeletePrincipalMappingCommand = async (input, context) => {
    const headers = sharedHeaders("DeletePrincipalMapping");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteQuerySuggestionsBlockListCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteQuerySuggestionsBlockList");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteThesaurusCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteThesaurus");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeAccessControlConfigurationCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeAccessControlConfiguration");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeDataSourceCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeDataSource");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeExperienceCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeExperience");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeFaqCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeFaq");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeFeaturedResultsSetCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeFeaturedResultsSet");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeIndexCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeIndex");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribePrincipalMappingCommand = async (input, context) => {
    const headers = sharedHeaders("DescribePrincipalMapping");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeQuerySuggestionsBlockListCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeQuerySuggestionsBlockList");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeQuerySuggestionsConfigCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeQuerySuggestionsConfig");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeThesaurusCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeThesaurus");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DisassociateEntitiesFromExperienceCommand = async (input, context) => {
    const headers = sharedHeaders("DisassociateEntitiesFromExperience");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DisassociatePersonasFromEntitiesCommand = async (input, context) => {
    const headers = sharedHeaders("DisassociatePersonasFromEntities");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_GetQuerySuggestionsCommand = async (input, context) => {
    const headers = sharedHeaders("GetQuerySuggestions");
    let body;
    body = JSON.stringify(se_GetQuerySuggestionsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_GetSnapshotsCommand = async (input, context) => {
    const headers = sharedHeaders("GetSnapshots");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListAccessControlConfigurationsCommand = async (input, context) => {
    const headers = sharedHeaders("ListAccessControlConfigurations");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListDataSourcesCommand = async (input, context) => {
    const headers = sharedHeaders("ListDataSources");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListDataSourceSyncJobsCommand = async (input, context) => {
    const headers = sharedHeaders("ListDataSourceSyncJobs");
    let body;
    body = JSON.stringify(se_ListDataSourceSyncJobsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListEntityPersonasCommand = async (input, context) => {
    const headers = sharedHeaders("ListEntityPersonas");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListExperienceEntitiesCommand = async (input, context) => {
    const headers = sharedHeaders("ListExperienceEntities");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListExperiencesCommand = async (input, context) => {
    const headers = sharedHeaders("ListExperiences");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListFaqsCommand = async (input, context) => {
    const headers = sharedHeaders("ListFaqs");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListFeaturedResultsSetsCommand = async (input, context) => {
    const headers = sharedHeaders("ListFeaturedResultsSets");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListGroupsOlderThanOrderingIdCommand = async (input, context) => {
    const headers = sharedHeaders("ListGroupsOlderThanOrderingId");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListIndicesCommand = async (input, context) => {
    const headers = sharedHeaders("ListIndices");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListQuerySuggestionsBlockListsCommand = async (input, context) => {
    const headers = sharedHeaders("ListQuerySuggestionsBlockLists");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListTagsForResourceCommand = async (input, context) => {
    const headers = sharedHeaders("ListTagsForResource");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListThesauriCommand = async (input, context) => {
    const headers = sharedHeaders("ListThesauri");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_PutPrincipalMappingCommand = async (input, context) => {
    const headers = sharedHeaders("PutPrincipalMapping");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_QueryCommand = async (input, context) => {
    const headers = sharedHeaders("Query");
    let body;
    body = JSON.stringify(se_QueryRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_RetrieveCommand = async (input, context) => {
    const headers = sharedHeaders("Retrieve");
    let body;
    body = JSON.stringify(se_RetrieveRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StartDataSourceSyncJobCommand = async (input, context) => {
    const headers = sharedHeaders("StartDataSourceSyncJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StopDataSourceSyncJobCommand = async (input, context) => {
    const headers = sharedHeaders("StopDataSourceSyncJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_SubmitFeedbackCommand = async (input, context) => {
    const headers = sharedHeaders("SubmitFeedback");
    let body;
    body = JSON.stringify(se_SubmitFeedbackRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_TagResourceCommand = async (input, context) => {
    const headers = sharedHeaders("TagResource");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UntagResourceCommand = async (input, context) => {
    const headers = sharedHeaders("UntagResource");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateAccessControlConfigurationCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateAccessControlConfiguration");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateDataSourceCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateDataSource");
    let body;
    body = JSON.stringify(se_UpdateDataSourceRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateExperienceCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateExperience");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateFeaturedResultsSetCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateFeaturedResultsSet");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateIndexCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateIndex");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateQuerySuggestionsBlockListCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateQuerySuggestionsBlockList");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateQuerySuggestionsConfigCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateQuerySuggestionsConfig");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateThesaurusCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateThesaurus");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const de_AssociateEntitiesToExperienceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_AssociatePersonasToEntitiesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_BatchDeleteDocumentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_BatchDeleteFeaturedResultsSetCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_BatchGetDocumentStatusCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_BatchPutDocumentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ClearQuerySuggestionsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_CreateAccessControlConfigurationCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateDataSourceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateExperienceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateFaqCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateFeaturedResultsSetCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateIndexCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateQuerySuggestionsBlockListCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateThesaurusCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteAccessControlConfigurationCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteDataSourceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteExperienceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteFaqCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteIndexCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeletePrincipalMappingCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteQuerySuggestionsBlockListCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteThesaurusCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DescribeAccessControlConfigurationCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeDataSourceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeDataSourceResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeExperienceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeExperienceResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeFaqCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeFaqResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeFeaturedResultsSetCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeIndexCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeIndexResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribePrincipalMappingCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribePrincipalMappingResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeQuerySuggestionsBlockListCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeQuerySuggestionsBlockListResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeQuerySuggestionsConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeQuerySuggestionsConfigResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeThesaurusCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeThesaurusResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DisassociateEntitiesFromExperienceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DisassociatePersonasFromEntitiesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_GetQuerySuggestionsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_GetQuerySuggestionsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_GetSnapshotsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_GetSnapshotsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListAccessControlConfigurationsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListDataSourcesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListDataSourcesResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListDataSourceSyncJobsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListDataSourceSyncJobsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListEntityPersonasCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListEntityPersonasResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListExperienceEntitiesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListExperiencesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListExperiencesResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListFaqsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListFaqsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListFeaturedResultsSetsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListGroupsOlderThanOrderingIdCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListIndicesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListIndicesResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListQuerySuggestionsBlockListsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListQuerySuggestionsBlockListsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListTagsForResourceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListThesauriCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListThesauriResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_PutPrincipalMappingCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_QueryCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_QueryResult(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_RetrieveCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_RetrieveResult(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_StartDataSourceSyncJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_StopDataSourceSyncJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_SubmitFeedbackCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_TagResourceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UntagResourceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateAccessControlConfigurationCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateDataSourceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_UpdateExperienceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_UpdateFeaturedResultsSetCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = _json(data);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateIndexCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_UpdateQuerySuggestionsBlockListCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_UpdateQuerySuggestionsConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_UpdateThesaurusCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
const de_CommandError = async (output, context) => {
    const parsedOutput = {
        ...output,
        body: await parseErrorBody(output.body, context),
    };
    const errorCode = loadRestJsonErrorCode(output, parsedOutput.body);
    switch (errorCode) {
        case "AccessDeniedException":
        case "com.amazonaws.kendra#AccessDeniedException":
            throw await de_AccessDeniedExceptionRes(parsedOutput, context);
        case "InternalServerException":
        case "com.amazonaws.kendra#InternalServerException":
            throw await de_InternalServerExceptionRes(parsedOutput, context);
        case "ResourceAlreadyExistException":
        case "com.amazonaws.kendra#ResourceAlreadyExistException":
            throw await de_ResourceAlreadyExistExceptionRes(parsedOutput, context);
        case "ResourceNotFoundException":
        case "com.amazonaws.kendra#ResourceNotFoundException":
            throw await de_ResourceNotFoundExceptionRes(parsedOutput, context);
        case "ThrottlingException":
        case "com.amazonaws.kendra#ThrottlingException":
            throw await de_ThrottlingExceptionRes(parsedOutput, context);
        case "ValidationException":
        case "com.amazonaws.kendra#ValidationException":
            throw await de_ValidationExceptionRes(parsedOutput, context);
        case "ConflictException":
        case "com.amazonaws.kendra#ConflictException":
            throw await de_ConflictExceptionRes(parsedOutput, context);
        case "ServiceQuotaExceededException":
        case "com.amazonaws.kendra#ServiceQuotaExceededException":
            throw await de_ServiceQuotaExceededExceptionRes(parsedOutput, context);
        case "FeaturedResultsConflictException":
        case "com.amazonaws.kendra#FeaturedResultsConflictException":
            throw await de_FeaturedResultsConflictExceptionRes(parsedOutput, context);
        case "InvalidRequestException":
        case "com.amazonaws.kendra#InvalidRequestException":
            throw await de_InvalidRequestExceptionRes(parsedOutput, context);
        case "ResourceUnavailableException":
        case "com.amazonaws.kendra#ResourceUnavailableException":
            throw await de_ResourceUnavailableExceptionRes(parsedOutput, context);
        case "ResourceInUseException":
        case "com.amazonaws.kendra#ResourceInUseException":
            throw await de_ResourceInUseExceptionRes(parsedOutput, context);
        default:
            const parsedBody = parsedOutput.body;
            return throwDefaultError({
                output,
                parsedBody,
                errorCode,
            });
    }
};
const de_AccessDeniedExceptionRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new AccessDeniedException({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_ConflictExceptionRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new ConflictException({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_FeaturedResultsConflictExceptionRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new FeaturedResultsConflictException({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_InternalServerExceptionRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new InternalServerException({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_InvalidRequestExceptionRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new InvalidRequestException({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_ResourceAlreadyExistExceptionRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new ResourceAlreadyExistException({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_ResourceInUseExceptionRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new ResourceInUseException({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_ResourceNotFoundExceptionRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new ResourceNotFoundException({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_ResourceUnavailableExceptionRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new ResourceUnavailableException({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_ServiceQuotaExceededExceptionRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new ServiceQuotaExceededException({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_ThrottlingExceptionRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new ThrottlingException({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_ValidationExceptionRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new ValidationException({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const se_AttributeFilter = (input, context) => {
    return take(input, {
        AndAllFilters: (_) => se_AttributeFilterList(_, context),
        ContainsAll: (_) => se_DocumentAttribute(_, context),
        ContainsAny: (_) => se_DocumentAttribute(_, context),
        EqualsTo: (_) => se_DocumentAttribute(_, context),
        GreaterThan: (_) => se_DocumentAttribute(_, context),
        GreaterThanOrEquals: (_) => se_DocumentAttribute(_, context),
        LessThan: (_) => se_DocumentAttribute(_, context),
        LessThanOrEquals: (_) => se_DocumentAttribute(_, context),
        NotFilter: (_) => se_AttributeFilter(_, context),
        OrAllFilters: (_) => se_AttributeFilterList(_, context),
    });
};
const se_AttributeFilterList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_AttributeFilter(entry, context);
    });
};
const se_AttributeSuggestionsGetConfig = (input, context) => {
    return take(input, {
        AdditionalResponseAttributes: _json,
        AttributeFilter: (_) => se_AttributeFilter(_, context),
        SuggestionAttributes: _json,
        UserContext: _json,
    });
};
const se_BatchGetDocumentStatusRequest = (input, context) => {
    return take(input, {
        DocumentInfoList: (_) => se_DocumentInfoList(_, context),
        IndexId: [],
    });
};
const se_BatchPutDocumentRequest = (input, context) => {
    return take(input, {
        CustomDocumentEnrichmentConfiguration: (_) => se_CustomDocumentEnrichmentConfiguration(_, context),
        Documents: (_) => se_DocumentList(_, context),
        IndexId: [],
        RoleArn: [],
    });
};
const se_ClickFeedback = (input, context) => {
    return take(input, {
        ClickTime: (_) => _.getTime() / 1_000,
        ResultId: [],
    });
};
const se_ClickFeedbackList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_ClickFeedback(entry, context);
    });
};
const se_CreateAccessControlConfigurationRequest = (input, context) => {
    return take(input, {
        AccessControlList: _json,
        ClientToken: [true, (_) => _ ?? generateIdempotencyToken()],
        Description: [],
        HierarchicalAccessControlList: _json,
        IndexId: [],
        Name: [],
    });
};
const se_CreateDataSourceRequest = (input, context) => {
    return take(input, {
        ClientToken: [true, (_) => _ ?? generateIdempotencyToken()],
        Configuration: (_) => se_DataSourceConfiguration(_, context),
        CustomDocumentEnrichmentConfiguration: (_) => se_CustomDocumentEnrichmentConfiguration(_, context),
        Description: [],
        IndexId: [],
        LanguageCode: [],
        Name: [],
        RoleArn: [],
        Schedule: [],
        Tags: _json,
        Type: [],
        VpcConfiguration: _json,
    });
};
const se_CreateExperienceRequest = (input, context) => {
    return take(input, {
        ClientToken: [true, (_) => _ ?? generateIdempotencyToken()],
        Configuration: _json,
        Description: [],
        IndexId: [],
        Name: [],
        RoleArn: [],
    });
};
const se_CreateFaqRequest = (input, context) => {
    return take(input, {
        ClientToken: [true, (_) => _ ?? generateIdempotencyToken()],
        Description: [],
        FileFormat: [],
        IndexId: [],
        LanguageCode: [],
        Name: [],
        RoleArn: [],
        S3Path: _json,
        Tags: _json,
    });
};
const se_CreateIndexRequest = (input, context) => {
    return take(input, {
        ClientToken: [true, (_) => _ ?? generateIdempotencyToken()],
        Description: [],
        Edition: [],
        Name: [],
        RoleArn: [],
        ServerSideEncryptionConfiguration: _json,
        Tags: _json,
        UserContextPolicy: [],
        UserGroupResolutionConfiguration: _json,
        UserTokenConfigurations: _json,
    });
};
const se_CreateQuerySuggestionsBlockListRequest = (input, context) => {
    return take(input, {
        ClientToken: [true, (_) => _ ?? generateIdempotencyToken()],
        Description: [],
        IndexId: [],
        Name: [],
        RoleArn: [],
        SourceS3Path: _json,
        Tags: _json,
    });
};
const se_CreateThesaurusRequest = (input, context) => {
    return take(input, {
        ClientToken: [true, (_) => _ ?? generateIdempotencyToken()],
        Description: [],
        IndexId: [],
        Name: [],
        RoleArn: [],
        SourceS3Path: _json,
        Tags: _json,
    });
};
const se_CustomDocumentEnrichmentConfiguration = (input, context) => {
    return take(input, {
        InlineConfigurations: (_) => se_InlineCustomDocumentEnrichmentConfigurationList(_, context),
        PostExtractionHookConfiguration: (_) => se_HookConfiguration(_, context),
        PreExtractionHookConfiguration: (_) => se_HookConfiguration(_, context),
        RoleArn: [],
    });
};
const se_DataSourceConfiguration = (input, context) => {
    return take(input, {
        AlfrescoConfiguration: _json,
        BoxConfiguration: _json,
        ConfluenceConfiguration: _json,
        DatabaseConfiguration: _json,
        FsxConfiguration: _json,
        GitHubConfiguration: _json,
        GoogleDriveConfiguration: _json,
        JiraConfiguration: _json,
        OneDriveConfiguration: _json,
        QuipConfiguration: _json,
        S3Configuration: _json,
        SalesforceConfiguration: _json,
        ServiceNowConfiguration: _json,
        SharePointConfiguration: _json,
        SlackConfiguration: _json,
        TemplateConfiguration: (_) => se_TemplateConfiguration(_, context),
        WebCrawlerConfiguration: (_) => se_WebCrawlerConfiguration(_, context),
        WorkDocsConfiguration: _json,
    });
};
const se_Document = (input, context) => {
    return take(input, {
        AccessControlConfigurationId: [],
        AccessControlList: _json,
        Attributes: (_) => se_DocumentAttributeList(_, context),
        Blob: context.base64Encoder,
        ContentType: [],
        HierarchicalAccessControlList: _json,
        Id: [],
        S3Path: _json,
        Title: [],
    });
};
const se_DocumentAttribute = (input, context) => {
    return take(input, {
        Key: [],
        Value: (_) => se_DocumentAttributeValue(_, context),
    });
};
const se_DocumentAttributeCondition = (input, context) => {
    return take(input, {
        ConditionDocumentAttributeKey: [],
        ConditionOnValue: (_) => se_DocumentAttributeValue(_, context),
        Operator: [],
    });
};
const se_DocumentAttributeList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_DocumentAttribute(entry, context);
    });
};
const se_DocumentAttributeTarget = (input, context) => {
    return take(input, {
        TargetDocumentAttributeKey: [],
        TargetDocumentAttributeValue: (_) => se_DocumentAttributeValue(_, context),
        TargetDocumentAttributeValueDeletion: [],
    });
};
const se_DocumentAttributeValue = (input, context) => {
    return take(input, {
        DateValue: (_) => _.getTime() / 1_000,
        LongValue: [],
        StringListValue: _json,
        StringValue: [],
    });
};
const se_DocumentInfo = (input, context) => {
    return take(input, {
        Attributes: (_) => se_DocumentAttributeList(_, context),
        DocumentId: [],
    });
};
const se_DocumentInfoList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_DocumentInfo(entry, context);
    });
};
const se_DocumentList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_Document(entry, context);
    });
};
const se_Facet = (input, context) => {
    return take(input, {
        DocumentAttributeKey: [],
        Facets: (_) => se_FacetList(_, context),
        MaxResults: [],
    });
};
const se_FacetList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_Facet(entry, context);
    });
};
const se_GetQuerySuggestionsRequest = (input, context) => {
    return take(input, {
        AttributeSuggestionsConfig: (_) => se_AttributeSuggestionsGetConfig(_, context),
        IndexId: [],
        MaxSuggestionsCount: [],
        QueryText: [],
        SuggestionTypes: _json,
    });
};
const se_HookConfiguration = (input, context) => {
    return take(input, {
        InvocationCondition: (_) => se_DocumentAttributeCondition(_, context),
        LambdaArn: [],
        S3Bucket: [],
    });
};
const se_InlineCustomDocumentEnrichmentConfiguration = (input, context) => {
    return take(input, {
        Condition: (_) => se_DocumentAttributeCondition(_, context),
        DocumentContentDeletion: [],
        Target: (_) => se_DocumentAttributeTarget(_, context),
    });
};
const se_InlineCustomDocumentEnrichmentConfigurationList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_InlineCustomDocumentEnrichmentConfiguration(entry, context);
    });
};
const se_ListDataSourceSyncJobsRequest = (input, context) => {
    return take(input, {
        Id: [],
        IndexId: [],
        MaxResults: [],
        NextToken: [],
        StartTimeFilter: (_) => se_TimeRange(_, context),
        StatusFilter: [],
    });
};
const se_QueryRequest = (input, context) => {
    return take(input, {
        AttributeFilter: (_) => se_AttributeFilter(_, context),
        CollapseConfiguration: _json,
        DocumentRelevanceOverrideConfigurations: _json,
        Facets: (_) => se_FacetList(_, context),
        IndexId: [],
        PageNumber: [],
        PageSize: [],
        QueryResultTypeFilter: [],
        QueryText: [],
        RequestedDocumentAttributes: _json,
        SortingConfiguration: _json,
        SortingConfigurations: _json,
        SpellCorrectionConfiguration: _json,
        UserContext: _json,
        VisitorId: [],
    });
};
const se_RetrieveRequest = (input, context) => {
    return take(input, {
        AttributeFilter: (_) => se_AttributeFilter(_, context),
        DocumentRelevanceOverrideConfigurations: _json,
        IndexId: [],
        PageNumber: [],
        PageSize: [],
        QueryText: [],
        RequestedDocumentAttributes: _json,
        UserContext: _json,
    });
};
const se_SubmitFeedbackRequest = (input, context) => {
    return take(input, {
        ClickFeedbackItems: (_) => se_ClickFeedbackList(_, context),
        IndexId: [],
        QueryId: [],
        RelevanceFeedbackItems: _json,
    });
};
const se_Template = (input, context) => {
    return input;
};
const se_TemplateConfiguration = (input, context) => {
    return take(input, {
        Template: (_) => se_Template(_, context),
    });
};
const se_TimeRange = (input, context) => {
    return take(input, {
        EndTime: (_) => _.getTime() / 1_000,
        StartTime: (_) => _.getTime() / 1_000,
    });
};
const se_UpdateDataSourceRequest = (input, context) => {
    return take(input, {
        Configuration: (_) => se_DataSourceConfiguration(_, context),
        CustomDocumentEnrichmentConfiguration: (_) => se_CustomDocumentEnrichmentConfiguration(_, context),
        Description: [],
        Id: [],
        IndexId: [],
        LanguageCode: [],
        Name: [],
        RoleArn: [],
        Schedule: [],
        VpcConfiguration: _json,
    });
};
const se_WebCrawlerConfiguration = (input, context) => {
    return take(input, {
        AuthenticationConfiguration: _json,
        CrawlDepth: [],
        MaxContentSizePerPageInMegaBytes: __serializeFloat,
        MaxLinksPerPage: [],
        MaxUrlsPerMinuteCrawlRate: [],
        ProxyConfiguration: _json,
        UrlExclusionPatterns: _json,
        UrlInclusionPatterns: _json,
        Urls: _json,
    });
};
const de_CollapsedResultDetail = (output, context) => {
    return take(output, {
        DocumentAttribute: (_) => de_DocumentAttribute(_, context),
        ExpandedResults: (_) => de_ExpandedResultList(_, context),
    });
};
const de_CustomDocumentEnrichmentConfiguration = (output, context) => {
    return take(output, {
        InlineConfigurations: (_) => de_InlineCustomDocumentEnrichmentConfigurationList(_, context),
        PostExtractionHookConfiguration: (_) => de_HookConfiguration(_, context),
        PreExtractionHookConfiguration: (_) => de_HookConfiguration(_, context),
        RoleArn: __expectString,
    });
};
const de_DataSourceConfiguration = (output, context) => {
    return take(output, {
        AlfrescoConfiguration: _json,
        BoxConfiguration: _json,
        ConfluenceConfiguration: _json,
        DatabaseConfiguration: _json,
        FsxConfiguration: _json,
        GitHubConfiguration: _json,
        GoogleDriveConfiguration: _json,
        JiraConfiguration: _json,
        OneDriveConfiguration: _json,
        QuipConfiguration: _json,
        S3Configuration: _json,
        SalesforceConfiguration: _json,
        ServiceNowConfiguration: _json,
        SharePointConfiguration: _json,
        SlackConfiguration: _json,
        TemplateConfiguration: (_) => de_TemplateConfiguration(_, context),
        WebCrawlerConfiguration: (_) => de_WebCrawlerConfiguration(_, context),
        WorkDocsConfiguration: _json,
    });
};
const de_DataSourceSummary = (output, context) => {
    return take(output, {
        CreatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Id: __expectString,
        LanguageCode: __expectString,
        Name: __expectString,
        Status: __expectString,
        Type: __expectString,
        UpdatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_DataSourceSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DataSourceSummary(entry, context);
    });
    return retVal;
};
const de_DataSourceSyncJob = (output, context) => {
    return take(output, {
        DataSourceErrorCode: __expectString,
        EndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ErrorCode: __expectString,
        ErrorMessage: __expectString,
        ExecutionId: __expectString,
        Metrics: _json,
        StartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Status: __expectString,
    });
};
const de_DataSourceSyncJobHistoryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DataSourceSyncJob(entry, context);
    });
    return retVal;
};
const de_DescribeDataSourceResponse = (output, context) => {
    return take(output, {
        Configuration: (_) => de_DataSourceConfiguration(_, context),
        CreatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        CustomDocumentEnrichmentConfiguration: (_) => de_CustomDocumentEnrichmentConfiguration(_, context),
        Description: __expectString,
        ErrorMessage: __expectString,
        Id: __expectString,
        IndexId: __expectString,
        LanguageCode: __expectString,
        Name: __expectString,
        RoleArn: __expectString,
        Schedule: __expectString,
        Status: __expectString,
        Type: __expectString,
        UpdatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        VpcConfiguration: _json,
    });
};
const de_DescribeExperienceResponse = (output, context) => {
    return take(output, {
        Configuration: _json,
        CreatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        Endpoints: _json,
        ErrorMessage: __expectString,
        Id: __expectString,
        IndexId: __expectString,
        Name: __expectString,
        RoleArn: __expectString,
        Status: __expectString,
        UpdatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_DescribeFaqResponse = (output, context) => {
    return take(output, {
        CreatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        ErrorMessage: __expectString,
        FileFormat: __expectString,
        Id: __expectString,
        IndexId: __expectString,
        LanguageCode: __expectString,
        Name: __expectString,
        RoleArn: __expectString,
        S3Path: _json,
        Status: __expectString,
        UpdatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_DescribeIndexResponse = (output, context) => {
    return take(output, {
        CapacityUnits: _json,
        CreatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        DocumentMetadataConfigurations: _json,
        Edition: __expectString,
        ErrorMessage: __expectString,
        Id: __expectString,
        IndexStatistics: _json,
        Name: __expectString,
        RoleArn: __expectString,
        ServerSideEncryptionConfiguration: _json,
        Status: __expectString,
        UpdatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        UserContextPolicy: __expectString,
        UserGroupResolutionConfiguration: _json,
        UserTokenConfigurations: _json,
    });
};
const de_DescribePrincipalMappingResponse = (output, context) => {
    return take(output, {
        DataSourceId: __expectString,
        GroupId: __expectString,
        GroupOrderingIdSummaries: (_) => de_GroupOrderingIdSummaries(_, context),
        IndexId: __expectString,
    });
};
const de_DescribeQuerySuggestionsBlockListResponse = (output, context) => {
    return take(output, {
        CreatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        ErrorMessage: __expectString,
        FileSizeBytes: __expectLong,
        Id: __expectString,
        IndexId: __expectString,
        ItemCount: __expectInt32,
        Name: __expectString,
        RoleArn: __expectString,
        SourceS3Path: _json,
        Status: __expectString,
        UpdatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_DescribeQuerySuggestionsConfigResponse = (output, context) => {
    return take(output, {
        AttributeSuggestionsConfig: _json,
        IncludeQueriesWithoutUserInformation: __expectBoolean,
        LastClearTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastSuggestionsBuildTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        MinimumNumberOfQueryingUsers: __expectInt32,
        MinimumQueryCount: __expectInt32,
        Mode: __expectString,
        QueryLogLookBackWindowInDays: __expectInt32,
        Status: __expectString,
        TotalSuggestionsCount: __expectInt32,
    });
};
const de_DescribeThesaurusResponse = (output, context) => {
    return take(output, {
        CreatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        ErrorMessage: __expectString,
        FileSizeBytes: __expectLong,
        Id: __expectString,
        IndexId: __expectString,
        Name: __expectString,
        RoleArn: __expectString,
        SourceS3Path: _json,
        Status: __expectString,
        SynonymRuleCount: __expectLong,
        TermCount: __expectLong,
        UpdatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_DocumentAttribute = (output, context) => {
    return take(output, {
        Key: __expectString,
        Value: (_) => de_DocumentAttributeValue(_, context),
    });
};
const de_DocumentAttributeCondition = (output, context) => {
    return take(output, {
        ConditionDocumentAttributeKey: __expectString,
        ConditionOnValue: (_) => de_DocumentAttributeValue(_, context),
        Operator: __expectString,
    });
};
const de_DocumentAttributeList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DocumentAttribute(entry, context);
    });
    return retVal;
};
const de_DocumentAttributeTarget = (output, context) => {
    return take(output, {
        TargetDocumentAttributeKey: __expectString,
        TargetDocumentAttributeValue: (_) => de_DocumentAttributeValue(_, context),
        TargetDocumentAttributeValueDeletion: __expectBoolean,
    });
};
const de_DocumentAttributeValue = (output, context) => {
    return take(output, {
        DateValue: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LongValue: __expectLong,
        StringListValue: _json,
        StringValue: __expectString,
    });
};
const de_DocumentAttributeValueCountPair = (output, context) => {
    return take(output, {
        Count: __expectInt32,
        DocumentAttributeValue: (_) => de_DocumentAttributeValue(_, context),
        FacetResults: (_) => de_FacetResultList(_, context),
    });
};
const de_DocumentAttributeValueCountPairList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DocumentAttributeValueCountPair(entry, context);
    });
    return retVal;
};
const de_ExpandedResultItem = (output, context) => {
    return take(output, {
        DocumentAttributes: (_) => de_DocumentAttributeList(_, context),
        DocumentExcerpt: _json,
        DocumentId: __expectString,
        DocumentTitle: _json,
        DocumentURI: __expectString,
        Id: __expectString,
    });
};
const de_ExpandedResultList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ExpandedResultItem(entry, context);
    });
    return retVal;
};
const de_ExperiencesSummary = (output, context) => {
    return take(output, {
        CreatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Endpoints: _json,
        Id: __expectString,
        Name: __expectString,
        Status: __expectString,
    });
};
const de_ExperiencesSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ExperiencesSummary(entry, context);
    });
    return retVal;
};
const de_FacetResult = (output, context) => {
    return take(output, {
        DocumentAttributeKey: __expectString,
        DocumentAttributeValueCountPairs: (_) => de_DocumentAttributeValueCountPairList(_, context),
        DocumentAttributeValueType: __expectString,
    });
};
const de_FacetResultList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_FacetResult(entry, context);
    });
    return retVal;
};
const de_FaqSummary = (output, context) => {
    return take(output, {
        CreatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FileFormat: __expectString,
        Id: __expectString,
        LanguageCode: __expectString,
        Name: __expectString,
        Status: __expectString,
        UpdatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_FaqSummaryItems = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_FaqSummary(entry, context);
    });
    return retVal;
};
const de_FeaturedResultsItem = (output, context) => {
    return take(output, {
        AdditionalAttributes: _json,
        DocumentAttributes: (_) => de_DocumentAttributeList(_, context),
        DocumentExcerpt: _json,
        DocumentId: __expectString,
        DocumentTitle: _json,
        DocumentURI: __expectString,
        FeedbackToken: __expectString,
        Id: __expectString,
        Type: __expectString,
    });
};
const de_FeaturedResultsItemList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_FeaturedResultsItem(entry, context);
    });
    return retVal;
};
const de_GetQuerySuggestionsResponse = (output, context) => {
    return take(output, {
        QuerySuggestionsId: __expectString,
        Suggestions: (_) => de_SuggestionList(_, context),
    });
};
const de_GetSnapshotsResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        SnapShotTimeFilter: (_) => de_TimeRange(_, context),
        SnapshotsData: _json,
        SnapshotsDataHeader: _json,
    });
};
const de_GroupOrderingIdSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_GroupOrderingIdSummary(entry, context);
    });
    return retVal;
};
const de_GroupOrderingIdSummary = (output, context) => {
    return take(output, {
        FailureReason: __expectString,
        LastUpdatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        OrderingId: __expectLong,
        ReceivedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Status: __expectString,
    });
};
const de_HookConfiguration = (output, context) => {
    return take(output, {
        InvocationCondition: (_) => de_DocumentAttributeCondition(_, context),
        LambdaArn: __expectString,
        S3Bucket: __expectString,
    });
};
const de_IndexConfigurationSummary = (output, context) => {
    return take(output, {
        CreatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Edition: __expectString,
        Id: __expectString,
        Name: __expectString,
        Status: __expectString,
        UpdatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_IndexConfigurationSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_IndexConfigurationSummary(entry, context);
    });
    return retVal;
};
const de_InlineCustomDocumentEnrichmentConfiguration = (output, context) => {
    return take(output, {
        Condition: (_) => de_DocumentAttributeCondition(_, context),
        DocumentContentDeletion: __expectBoolean,
        Target: (_) => de_DocumentAttributeTarget(_, context),
    });
};
const de_InlineCustomDocumentEnrichmentConfigurationList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_InlineCustomDocumentEnrichmentConfiguration(entry, context);
    });
    return retVal;
};
const de_ListDataSourcesResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        SummaryItems: (_) => de_DataSourceSummaryList(_, context),
    });
};
const de_ListDataSourceSyncJobsResponse = (output, context) => {
    return take(output, {
        History: (_) => de_DataSourceSyncJobHistoryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListEntityPersonasResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        SummaryItems: (_) => de_PersonasSummaryList(_, context),
    });
};
const de_ListExperiencesResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        SummaryItems: (_) => de_ExperiencesSummaryList(_, context),
    });
};
const de_ListFaqsResponse = (output, context) => {
    return take(output, {
        FaqSummaryItems: (_) => de_FaqSummaryItems(_, context),
        NextToken: __expectString,
    });
};
const de_ListIndicesResponse = (output, context) => {
    return take(output, {
        IndexConfigurationSummaryItems: (_) => de_IndexConfigurationSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListQuerySuggestionsBlockListsResponse = (output, context) => {
    return take(output, {
        BlockListSummaryItems: (_) => de_QuerySuggestionsBlockListSummaryItems(_, context),
        NextToken: __expectString,
    });
};
const de_ListThesauriResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        ThesaurusSummaryItems: (_) => de_ThesaurusSummaryItems(_, context),
    });
};
const de_PersonasSummary = (output, context) => {
    return take(output, {
        CreatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EntityId: __expectString,
        Persona: __expectString,
        UpdatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_PersonasSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_PersonasSummary(entry, context);
    });
    return retVal;
};
const de_QueryResult = (output, context) => {
    return take(output, {
        FacetResults: (_) => de_FacetResultList(_, context),
        FeaturedResultsItems: (_) => de_FeaturedResultsItemList(_, context),
        QueryId: __expectString,
        ResultItems: (_) => de_QueryResultItemList(_, context),
        SpellCorrectedQueries: _json,
        TotalNumberOfResults: __expectInt32,
        Warnings: _json,
    });
};
const de_QueryResultItem = (output, context) => {
    return take(output, {
        AdditionalAttributes: _json,
        CollapsedResultDetail: (_) => de_CollapsedResultDetail(_, context),
        DocumentAttributes: (_) => de_DocumentAttributeList(_, context),
        DocumentExcerpt: _json,
        DocumentId: __expectString,
        DocumentTitle: _json,
        DocumentURI: __expectString,
        FeedbackToken: __expectString,
        Format: __expectString,
        Id: __expectString,
        ScoreAttributes: _json,
        TableExcerpt: _json,
        Type: __expectString,
    });
};
const de_QueryResultItemList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_QueryResultItem(entry, context);
    });
    return retVal;
};
const de_QuerySuggestionsBlockListSummary = (output, context) => {
    return take(output, {
        CreatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Id: __expectString,
        ItemCount: __expectInt32,
        Name: __expectString,
        Status: __expectString,
        UpdatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_QuerySuggestionsBlockListSummaryItems = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_QuerySuggestionsBlockListSummary(entry, context);
    });
    return retVal;
};
const de_RetrieveResult = (output, context) => {
    return take(output, {
        QueryId: __expectString,
        ResultItems: (_) => de_RetrieveResultItemList(_, context),
    });
};
const de_RetrieveResultItem = (output, context) => {
    return take(output, {
        Content: __expectString,
        DocumentAttributes: (_) => de_DocumentAttributeList(_, context),
        DocumentId: __expectString,
        DocumentTitle: __expectString,
        DocumentURI: __expectString,
        Id: __expectString,
        ScoreAttributes: _json,
    });
};
const de_RetrieveResultItemList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_RetrieveResultItem(entry, context);
    });
    return retVal;
};
const de_SourceDocument = (output, context) => {
    return take(output, {
        AdditionalAttributes: (_) => de_DocumentAttributeList(_, context),
        DocumentId: __expectString,
        SuggestionAttributes: _json,
    });
};
const de_SourceDocuments = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_SourceDocument(entry, context);
    });
    return retVal;
};
const de_Suggestion = (output, context) => {
    return take(output, {
        Id: __expectString,
        SourceDocuments: (_) => de_SourceDocuments(_, context),
        Value: _json,
    });
};
const de_SuggestionList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Suggestion(entry, context);
    });
    return retVal;
};
const de_Template = (output, context) => {
    return output;
};
const de_TemplateConfiguration = (output, context) => {
    return take(output, {
        Template: (_) => de_Template(_, context),
    });
};
const de_ThesaurusSummary = (output, context) => {
    return take(output, {
        CreatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Id: __expectString,
        Name: __expectString,
        Status: __expectString,
        UpdatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_ThesaurusSummaryItems = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ThesaurusSummary(entry, context);
    });
    return retVal;
};
const de_TimeRange = (output, context) => {
    return take(output, {
        EndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        StartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_WebCrawlerConfiguration = (output, context) => {
    return take(output, {
        AuthenticationConfiguration: _json,
        CrawlDepth: __expectInt32,
        MaxContentSizePerPageInMegaBytes: __limitedParseFloat32,
        MaxLinksPerPage: __expectInt32,
        MaxUrlsPerMinuteCrawlRate: __expectInt32,
        ProxyConfiguration: _json,
        UrlExclusionPatterns: _json,
        UrlInclusionPatterns: _json,
        Urls: _json,
    });
};
const deserializeMetadata = (output) => ({
    httpStatusCode: output.statusCode,
    requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
    extendedRequestId: output.headers["x-amz-id-2"],
    cfId: output.headers["x-amz-cf-id"],
});
const collectBodyString = (streamBody, context) => collectBody(streamBody, context).then((body) => context.utf8Encoder(body));
const throwDefaultError = withBaseException(__BaseException);
const buildHttpRpcRequest = async (context, headers, path, resolvedHostname, body) => {
    const { hostname, protocol = "https", port, path: basePath } = await context.endpoint();
    const contents = {
        protocol,
        hostname,
        port,
        method: "POST",
        path: basePath.endsWith("/") ? basePath.slice(0, -1) + path : basePath + path,
        headers,
    };
    if (resolvedHostname !== undefined) {
        contents.hostname = resolvedHostname;
    }
    if (body !== undefined) {
        contents.body = body;
    }
    return new __HttpRequest(contents);
};
function sharedHeaders(operation) {
    return {
        "content-type": "application/x-amz-json-1.1",
        "x-amz-target": `AWSKendraFrontendService.${operation}`,
    };
}
