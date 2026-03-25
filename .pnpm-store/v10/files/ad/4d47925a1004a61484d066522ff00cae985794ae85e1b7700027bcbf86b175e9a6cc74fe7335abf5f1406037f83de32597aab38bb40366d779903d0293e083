import { loadRestJsonErrorCode, parseJsonBody as parseBody, parseJsonErrorBody as parseErrorBody } from "@aws-sdk/core";
import { HttpRequest as __HttpRequest } from "@smithy/protocol-http";
import { _json, collectBody, decorateServiceException as __decorateServiceException, expectBoolean as __expectBoolean, expectNonNull as __expectNonNull, expectNumber as __expectNumber, expectString as __expectString, parseEpochTimestamp as __parseEpochTimestamp, take, withBaseException, } from "@smithy/smithy-client";
import { v4 as generateIdempotencyToken } from "uuid";
import { DecryptionFailure, EncryptionFailure, InternalServiceError, InvalidNextTokenException, InvalidParameterException, InvalidRequestException, LimitExceededException, MalformedPolicyDocumentException, PreconditionNotMetException, PublicPolicyException, ResourceExistsException, ResourceNotFoundException, } from "../models/models_0";
import { SecretsManagerServiceException as __BaseException } from "../models/SecretsManagerServiceException";
export const se_BatchGetSecretValueCommand = async (input, context) => {
    const headers = sharedHeaders("BatchGetSecretValue");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CancelRotateSecretCommand = async (input, context) => {
    const headers = sharedHeaders("CancelRotateSecret");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateSecretCommand = async (input, context) => {
    const headers = sharedHeaders("CreateSecret");
    let body;
    body = JSON.stringify(se_CreateSecretRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteResourcePolicyCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteResourcePolicy");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteSecretCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteSecret");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeSecretCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeSecret");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_GetRandomPasswordCommand = async (input, context) => {
    const headers = sharedHeaders("GetRandomPassword");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_GetResourcePolicyCommand = async (input, context) => {
    const headers = sharedHeaders("GetResourcePolicy");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_GetSecretValueCommand = async (input, context) => {
    const headers = sharedHeaders("GetSecretValue");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListSecretsCommand = async (input, context) => {
    const headers = sharedHeaders("ListSecrets");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListSecretVersionIdsCommand = async (input, context) => {
    const headers = sharedHeaders("ListSecretVersionIds");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_PutResourcePolicyCommand = async (input, context) => {
    const headers = sharedHeaders("PutResourcePolicy");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_PutSecretValueCommand = async (input, context) => {
    const headers = sharedHeaders("PutSecretValue");
    let body;
    body = JSON.stringify(se_PutSecretValueRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_RemoveRegionsFromReplicationCommand = async (input, context) => {
    const headers = sharedHeaders("RemoveRegionsFromReplication");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ReplicateSecretToRegionsCommand = async (input, context) => {
    const headers = sharedHeaders("ReplicateSecretToRegions");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_RestoreSecretCommand = async (input, context) => {
    const headers = sharedHeaders("RestoreSecret");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_RotateSecretCommand = async (input, context) => {
    const headers = sharedHeaders("RotateSecret");
    let body;
    body = JSON.stringify(se_RotateSecretRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StopReplicationToReplicaCommand = async (input, context) => {
    const headers = sharedHeaders("StopReplicationToReplica");
    let body;
    body = JSON.stringify(_json(input));
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
export const se_UpdateSecretCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateSecret");
    let body;
    body = JSON.stringify(se_UpdateSecretRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateSecretVersionStageCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateSecretVersionStage");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ValidateResourcePolicyCommand = async (input, context) => {
    const headers = sharedHeaders("ValidateResourcePolicy");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const de_BatchGetSecretValueCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_BatchGetSecretValueResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CancelRotateSecretCommand = async (output, context) => {
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
export const de_CreateSecretCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateSecretResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteResourcePolicyCommand = async (output, context) => {
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
export const de_DeleteSecretCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DeleteSecretResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeSecretCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeSecretResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_GetRandomPasswordCommand = async (output, context) => {
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
export const de_GetResourcePolicyCommand = async (output, context) => {
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
export const de_GetSecretValueCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_GetSecretValueResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListSecretsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListSecretsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListSecretVersionIdsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListSecretVersionIdsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_PutResourcePolicyCommand = async (output, context) => {
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
export const de_PutSecretValueCommand = async (output, context) => {
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
export const de_RemoveRegionsFromReplicationCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_RemoveRegionsFromReplicationResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ReplicateSecretToRegionsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ReplicateSecretToRegionsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_RestoreSecretCommand = async (output, context) => {
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
export const de_RotateSecretCommand = async (output, context) => {
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
export const de_StopReplicationToReplicaCommand = async (output, context) => {
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
export const de_TagResourceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_UntagResourceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_UpdateSecretCommand = async (output, context) => {
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
export const de_UpdateSecretVersionStageCommand = async (output, context) => {
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
export const de_ValidateResourcePolicyCommand = async (output, context) => {
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
const de_CommandError = async (output, context) => {
    const parsedOutput = {
        ...output,
        body: await parseErrorBody(output.body, context),
    };
    const errorCode = loadRestJsonErrorCode(output, parsedOutput.body);
    switch (errorCode) {
        case "DecryptionFailure":
        case "com.amazonaws.secretsmanager#DecryptionFailure":
            throw await de_DecryptionFailureRes(parsedOutput, context);
        case "InternalServiceError":
        case "com.amazonaws.secretsmanager#InternalServiceError":
            throw await de_InternalServiceErrorRes(parsedOutput, context);
        case "InvalidNextTokenException":
        case "com.amazonaws.secretsmanager#InvalidNextTokenException":
            throw await de_InvalidNextTokenExceptionRes(parsedOutput, context);
        case "InvalidParameterException":
        case "com.amazonaws.secretsmanager#InvalidParameterException":
            throw await de_InvalidParameterExceptionRes(parsedOutput, context);
        case "InvalidRequestException":
        case "com.amazonaws.secretsmanager#InvalidRequestException":
            throw await de_InvalidRequestExceptionRes(parsedOutput, context);
        case "ResourceNotFoundException":
        case "com.amazonaws.secretsmanager#ResourceNotFoundException":
            throw await de_ResourceNotFoundExceptionRes(parsedOutput, context);
        case "EncryptionFailure":
        case "com.amazonaws.secretsmanager#EncryptionFailure":
            throw await de_EncryptionFailureRes(parsedOutput, context);
        case "LimitExceededException":
        case "com.amazonaws.secretsmanager#LimitExceededException":
            throw await de_LimitExceededExceptionRes(parsedOutput, context);
        case "MalformedPolicyDocumentException":
        case "com.amazonaws.secretsmanager#MalformedPolicyDocumentException":
            throw await de_MalformedPolicyDocumentExceptionRes(parsedOutput, context);
        case "PreconditionNotMetException":
        case "com.amazonaws.secretsmanager#PreconditionNotMetException":
            throw await de_PreconditionNotMetExceptionRes(parsedOutput, context);
        case "ResourceExistsException":
        case "com.amazonaws.secretsmanager#ResourceExistsException":
            throw await de_ResourceExistsExceptionRes(parsedOutput, context);
        case "PublicPolicyException":
        case "com.amazonaws.secretsmanager#PublicPolicyException":
            throw await de_PublicPolicyExceptionRes(parsedOutput, context);
        default:
            const parsedBody = parsedOutput.body;
            return throwDefaultError({
                output,
                parsedBody,
                errorCode,
            });
    }
};
const de_DecryptionFailureRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new DecryptionFailure({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_EncryptionFailureRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new EncryptionFailure({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_InternalServiceErrorRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new InternalServiceError({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_InvalidNextTokenExceptionRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new InvalidNextTokenException({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_InvalidParameterExceptionRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new InvalidParameterException({
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
const de_LimitExceededExceptionRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new LimitExceededException({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_MalformedPolicyDocumentExceptionRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new MalformedPolicyDocumentException({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_PreconditionNotMetExceptionRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new PreconditionNotMetException({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_PublicPolicyExceptionRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new PublicPolicyException({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_ResourceExistsExceptionRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new ResourceExistsException({
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
const se_CreateSecretRequest = (input, context) => {
    return take(input, {
        AddReplicaRegions: _json,
        ClientRequestToken: [true, (_) => _ ?? generateIdempotencyToken()],
        Description: [],
        ForceOverwriteReplicaSecret: [],
        KmsKeyId: [],
        Name: [],
        SecretBinary: context.base64Encoder,
        SecretString: [],
        Tags: _json,
    });
};
const se_PutSecretValueRequest = (input, context) => {
    return take(input, {
        ClientRequestToken: [true, (_) => _ ?? generateIdempotencyToken()],
        RotationToken: [],
        SecretBinary: context.base64Encoder,
        SecretId: [],
        SecretString: [],
        VersionStages: _json,
    });
};
const se_RotateSecretRequest = (input, context) => {
    return take(input, {
        ClientRequestToken: [true, (_) => _ ?? generateIdempotencyToken()],
        RotateImmediately: [],
        RotationLambdaARN: [],
        RotationRules: _json,
        SecretId: [],
    });
};
const se_UpdateSecretRequest = (input, context) => {
    return take(input, {
        ClientRequestToken: [true, (_) => _ ?? generateIdempotencyToken()],
        Description: [],
        KmsKeyId: [],
        SecretBinary: context.base64Encoder,
        SecretId: [],
        SecretString: [],
    });
};
const de_BatchGetSecretValueResponse = (output, context) => {
    return take(output, {
        Errors: _json,
        NextToken: __expectString,
        SecretValues: (_) => de_SecretValuesType(_, context),
    });
};
const de_CreateSecretResponse = (output, context) => {
    return take(output, {
        ARN: __expectString,
        Name: __expectString,
        ReplicationStatus: (_) => de_ReplicationStatusListType(_, context),
        VersionId: __expectString,
    });
};
const de_DeleteSecretResponse = (output, context) => {
    return take(output, {
        ARN: __expectString,
        DeletionDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Name: __expectString,
    });
};
const de_DescribeSecretResponse = (output, context) => {
    return take(output, {
        ARN: __expectString,
        CreatedDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DeletedDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        KmsKeyId: __expectString,
        LastAccessedDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastChangedDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastRotatedDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Name: __expectString,
        NextRotationDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        OwningService: __expectString,
        PrimaryRegion: __expectString,
        ReplicationStatus: (_) => de_ReplicationStatusListType(_, context),
        RotationEnabled: __expectBoolean,
        RotationLambdaARN: __expectString,
        RotationRules: _json,
        Tags: _json,
        VersionIdsToStages: _json,
    });
};
const de_GetSecretValueResponse = (output, context) => {
    return take(output, {
        ARN: __expectString,
        CreatedDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Name: __expectString,
        SecretBinary: context.base64Decoder,
        SecretString: __expectString,
        VersionId: __expectString,
        VersionStages: _json,
    });
};
const de_ListSecretsResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        SecretList: (_) => de_SecretListType(_, context),
    });
};
const de_ListSecretVersionIdsResponse = (output, context) => {
    return take(output, {
        ARN: __expectString,
        Name: __expectString,
        NextToken: __expectString,
        Versions: (_) => de_SecretVersionsListType(_, context),
    });
};
const de_RemoveRegionsFromReplicationResponse = (output, context) => {
    return take(output, {
        ARN: __expectString,
        ReplicationStatus: (_) => de_ReplicationStatusListType(_, context),
    });
};
const de_ReplicateSecretToRegionsResponse = (output, context) => {
    return take(output, {
        ARN: __expectString,
        ReplicationStatus: (_) => de_ReplicationStatusListType(_, context),
    });
};
const de_ReplicationStatusListType = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ReplicationStatusType(entry, context);
    });
    return retVal;
};
const de_ReplicationStatusType = (output, context) => {
    return take(output, {
        KmsKeyId: __expectString,
        LastAccessedDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Region: __expectString,
        Status: __expectString,
        StatusMessage: __expectString,
    });
};
const de_SecretListEntry = (output, context) => {
    return take(output, {
        ARN: __expectString,
        CreatedDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DeletedDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        KmsKeyId: __expectString,
        LastAccessedDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastChangedDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastRotatedDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Name: __expectString,
        NextRotationDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        OwningService: __expectString,
        PrimaryRegion: __expectString,
        RotationEnabled: __expectBoolean,
        RotationLambdaARN: __expectString,
        RotationRules: _json,
        SecretVersionsToStages: _json,
        Tags: _json,
    });
};
const de_SecretListType = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_SecretListEntry(entry, context);
    });
    return retVal;
};
const de_SecretValueEntry = (output, context) => {
    return take(output, {
        ARN: __expectString,
        CreatedDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Name: __expectString,
        SecretBinary: context.base64Decoder,
        SecretString: __expectString,
        VersionId: __expectString,
        VersionStages: _json,
    });
};
const de_SecretValuesType = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_SecretValueEntry(entry, context);
    });
    return retVal;
};
const de_SecretVersionsListEntry = (output, context) => {
    return take(output, {
        CreatedDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        KmsKeyIds: _json,
        LastAccessedDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        VersionId: __expectString,
        VersionStages: _json,
    });
};
const de_SecretVersionsListType = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_SecretVersionsListEntry(entry, context);
    });
    return retVal;
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
        "x-amz-target": `secretsmanager.${operation}`,
    };
}
