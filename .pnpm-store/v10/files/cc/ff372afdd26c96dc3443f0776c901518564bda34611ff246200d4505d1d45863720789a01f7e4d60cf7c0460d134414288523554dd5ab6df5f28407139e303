import { awsExpectUnion as __expectUnion, loadRestJsonErrorCode, parseJsonBody as parseBody, parseJsonErrorBody as parseErrorBody, } from "@aws-sdk/core";
import { requestBuilder as rb } from "@smithy/core";
import { _json, collectBody, decorateServiceException as __decorateServiceException, expectInt32 as __expectInt32, expectNonNull as __expectNonNull, expectObject as __expectObject, expectString as __expectString, isSerializableHeaderValue, limitedParseDouble as __limitedParseDouble, limitedParseFloat32 as __limitedParseFloat32, map, parseRfc3339DateTimeWithOffset as __parseRfc3339DateTimeWithOffset, serializeDateTime as __serializeDateTime, serializeFloat as __serializeFloat, take, withBaseException, } from "@smithy/smithy-client";
import { BedrockAgentRuntimeServiceException as __BaseException } from "../models/BedrockAgentRuntimeServiceException";
import { AccessDeniedException, BadGatewayException, BedrockSessionContentBlock, ConflictException, DependencyFailedException, FlowInputContent, ImageInputSource, ImageSource, InternalServerException, InvocationResultMember, InvocationStepPayload, ModelNotReadyException, ResourceNotFoundException, ServiceQuotaExceededException, ThrottlingException, ValidationException, } from "../models/models_0";
import { RetrievalFilter, } from "../models/models_1";
export const se_CreateInvocationCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/sessions/{sessionIdentifier}/invocations");
    b.p("sessionIdentifier", () => input.sessionIdentifier, "{sessionIdentifier}", false);
    let body;
    body = JSON.stringify(take(input, {
        description: [],
        invocationId: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_CreateSessionCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/sessions");
    let body;
    body = JSON.stringify(take(input, {
        encryptionKeyArn: [],
        sessionMetadata: (_) => _json(_),
        tags: (_) => _json(_),
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_DeleteAgentMemoryCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/agents/{agentId}/agentAliases/{agentAliasId}/memories");
    b.p("agentId", () => input.agentId, "{agentId}", false);
    b.p("agentAliasId", () => input.agentAliasId, "{agentAliasId}", false);
    const query = map({
        [_mI]: [, input[_mI]],
        [_sI]: [, input[_sI]],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
export const se_DeleteSessionCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/sessions/{sessionIdentifier}");
    b.p("sessionIdentifier", () => input.sessionIdentifier, "{sessionIdentifier}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
export const se_EndSessionCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/sessions/{sessionIdentifier}");
    b.p("sessionIdentifier", () => input.sessionIdentifier, "{sessionIdentifier}", false);
    let body;
    b.m("PATCH").h(headers).b(body);
    return b.build();
};
export const se_GenerateQueryCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/generateQuery");
    let body;
    body = JSON.stringify(take(input, {
        queryGenerationInput: (_) => _json(_),
        transformationConfiguration: (_) => _json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_GetAgentMemoryCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/agents/{agentId}/agentAliases/{agentAliasId}/memories");
    b.p("agentId", () => input.agentId, "{agentId}", false);
    b.p("agentAliasId", () => input.agentAliasId, "{agentAliasId}", false);
    const query = map({
        [_nT]: [, input[_nT]],
        [_mIa]: [() => input.maxItems !== void 0, () => input[_mIa].toString()],
        [_mT]: [, __expectNonNull(input[_mT], `memoryType`)],
        [_mI]: [, __expectNonNull(input[_mI], `memoryId`)],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
export const se_GetInvocationStepCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/sessions/{sessionIdentifier}/invocationSteps/{invocationStepId}");
    b.p("invocationStepId", () => input.invocationStepId, "{invocationStepId}", false);
    b.p("sessionIdentifier", () => input.sessionIdentifier, "{sessionIdentifier}", false);
    let body;
    body = JSON.stringify(take(input, {
        invocationIdentifier: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_GetSessionCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/sessions/{sessionIdentifier}");
    b.p("sessionIdentifier", () => input.sessionIdentifier, "{sessionIdentifier}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_InvokeAgentCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = map({}, isSerializableHeaderValue, {
        "content-type": "application/json",
        [_xasa]: input[_sA],
    });
    b.bp("/agents/{agentId}/agentAliases/{agentAliasId}/sessions/{sessionId}/text");
    b.p("agentId", () => input.agentId, "{agentId}", false);
    b.p("agentAliasId", () => input.agentAliasId, "{agentAliasId}", false);
    b.p("sessionId", () => input.sessionId, "{sessionId}", false);
    let body;
    body = JSON.stringify(take(input, {
        bedrockModelConfigurations: (_) => _json(_),
        enableTrace: [],
        endSession: [],
        inputText: [],
        memoryId: [],
        sessionState: (_) => se_SessionState(_, context),
        streamingConfigurations: (_) => _json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_InvokeFlowCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/flows/{flowIdentifier}/aliases/{flowAliasIdentifier}");
    b.p("flowIdentifier", () => input.flowIdentifier, "{flowIdentifier}", false);
    b.p("flowAliasIdentifier", () => input.flowAliasIdentifier, "{flowAliasIdentifier}", false);
    let body;
    body = JSON.stringify(take(input, {
        enableTrace: [],
        executionId: [],
        inputs: (_) => se_FlowInputs(_, context),
        modelPerformanceConfiguration: (_) => _json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_InvokeInlineAgentCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/agents/{sessionId}");
    b.p("sessionId", () => input.sessionId, "{sessionId}", false);
    let body;
    body = JSON.stringify(take(input, {
        actionGroups: (_) => _json(_),
        agentCollaboration: [],
        agentName: [],
        bedrockModelConfigurations: (_) => _json(_),
        collaboratorConfigurations: (_) => _json(_),
        collaborators: (_) => se_Collaborators(_, context),
        customOrchestration: (_) => _json(_),
        customerEncryptionKeyArn: [],
        enableTrace: [],
        endSession: [],
        foundationModel: [],
        guardrailConfiguration: (_) => _json(_),
        idleSessionTTLInSeconds: [],
        inlineSessionState: (_) => se_InlineSessionState(_, context),
        inputText: [],
        instruction: [],
        knowledgeBases: (_) => se_KnowledgeBases(_, context),
        orchestrationType: [],
        promptOverrideConfiguration: (_) => se_PromptOverrideConfiguration(_, context),
        streamingConfigurations: (_) => _json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_ListInvocationsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/sessions/{sessionIdentifier}/invocations");
    b.p("sessionIdentifier", () => input.sessionIdentifier, "{sessionIdentifier}", false);
    const query = map({
        [_nT]: [, input[_nT]],
        [_mR]: [() => input.maxResults !== void 0, () => input[_mR].toString()],
    });
    let body;
    b.m("POST").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListInvocationStepsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/sessions/{sessionIdentifier}/invocationSteps");
    b.p("sessionIdentifier", () => input.sessionIdentifier, "{sessionIdentifier}", false);
    const query = map({
        [_nT]: [, input[_nT]],
        [_mR]: [() => input.maxResults !== void 0, () => input[_mR].toString()],
    });
    let body;
    body = JSON.stringify(take(input, {
        invocationIdentifier: [],
    }));
    b.m("POST").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListSessionsCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/sessions");
    const query = map({
        [_mR]: [() => input.maxResults !== void 0, () => input[_mR].toString()],
        [_nT]: [, input[_nT]],
    });
    let body;
    b.m("POST").h(headers).q(query).b(body);
    return b.build();
};
export const se_ListTagsForResourceCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/tags/{resourceArn}");
    b.p("resourceArn", () => input.resourceArn, "{resourceArn}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
export const se_OptimizePromptCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/optimize-prompt");
    let body;
    body = JSON.stringify(take(input, {
        input: (_) => _json(_),
        targetModelId: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_PutInvocationStepCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/sessions/{sessionIdentifier}/invocationSteps");
    b.p("sessionIdentifier", () => input.sessionIdentifier, "{sessionIdentifier}", false);
    let body;
    body = JSON.stringify(take(input, {
        invocationIdentifier: [],
        invocationStepId: [],
        invocationStepTime: (_) => __serializeDateTime(_),
        payload: (_) => se_InvocationStepPayload(_, context),
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const se_RerankCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/rerank");
    let body;
    body = JSON.stringify(take(input, {
        nextToken: [],
        queries: (_) => _json(_),
        rerankingConfiguration: (_) => se_RerankingConfiguration(_, context),
        sources: (_) => se_RerankSourcesList(_, context),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_RetrieveCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/knowledgebases/{knowledgeBaseId}/retrieve");
    b.p("knowledgeBaseId", () => input.knowledgeBaseId, "{knowledgeBaseId}", false);
    let body;
    body = JSON.stringify(take(input, {
        guardrailConfiguration: (_) => _json(_),
        nextToken: [],
        retrievalConfiguration: (_) => se_KnowledgeBaseRetrievalConfiguration(_, context),
        retrievalQuery: (_) => _json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_RetrieveAndGenerateCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/retrieveAndGenerate");
    let body;
    body = JSON.stringify(take(input, {
        input: (_) => _json(_),
        retrieveAndGenerateConfiguration: (_) => se_RetrieveAndGenerateConfiguration(_, context),
        sessionConfiguration: (_) => _json(_),
        sessionId: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_RetrieveAndGenerateStreamCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/retrieveAndGenerateStream");
    let body;
    body = JSON.stringify(take(input, {
        input: (_) => _json(_),
        retrieveAndGenerateConfiguration: (_) => se_RetrieveAndGenerateConfiguration(_, context),
        sessionConfiguration: (_) => _json(_),
        sessionId: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_TagResourceCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/tags/{resourceArn}");
    b.p("resourceArn", () => input.resourceArn, "{resourceArn}", false);
    let body;
    body = JSON.stringify(take(input, {
        tags: (_) => _json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
export const se_UntagResourceCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {};
    b.bp("/tags/{resourceArn}");
    b.p("resourceArn", () => input.resourceArn, "{resourceArn}", false);
    const query = map({
        [_tK]: [__expectNonNull(input.tagKeys, `tagKeys`) != null, () => input[_tK] || []],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
export const se_UpdateSessionCommand = async (input, context) => {
    const b = rb(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/sessions/{sessionIdentifier}");
    b.p("sessionIdentifier", () => input.sessionIdentifier, "{sessionIdentifier}", false);
    let body;
    body = JSON.stringify(take(input, {
        sessionMetadata: (_) => _json(_),
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
export const de_CreateInvocationCommand = async (output, context) => {
    if (output.statusCode !== 201 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        createdAt: (_) => __expectNonNull(__parseRfc3339DateTimeWithOffset(_)),
        invocationId: __expectString,
        sessionId: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_CreateSessionCommand = async (output, context) => {
    if (output.statusCode !== 201 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        createdAt: (_) => __expectNonNull(__parseRfc3339DateTimeWithOffset(_)),
        sessionArn: __expectString,
        sessionId: __expectString,
        sessionStatus: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_DeleteAgentMemoryCommand = async (output, context) => {
    if (output.statusCode !== 202 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_DeleteSessionCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    await collectBody(output.body, context);
    return contents;
};
export const de_EndSessionCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        sessionArn: __expectString,
        sessionId: __expectString,
        sessionStatus: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GenerateQueryCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        queries: _json,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetAgentMemoryCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        memoryContents: (_) => de_Memories(_, context),
        nextToken: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetInvocationStepCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        invocationStep: (_) => de_InvocationStep(_, context),
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_GetSessionCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        createdAt: (_) => __expectNonNull(__parseRfc3339DateTimeWithOffset(_)),
        encryptionKeyArn: __expectString,
        lastUpdatedAt: (_) => __expectNonNull(__parseRfc3339DateTimeWithOffset(_)),
        sessionArn: __expectString,
        sessionId: __expectString,
        sessionMetadata: _json,
        sessionStatus: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_InvokeAgentCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_cT]: [, output.headers[_xabact]],
        [_sI]: [, output.headers[_xabasi]],
        [_mI]: [, output.headers[_xabami]],
    });
    const data = output.body;
    contents.completion = de_ResponseStream(data, context);
    return contents;
};
export const de_InvokeFlowCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_eI]: [, output.headers[_xabfei]],
    });
    const data = output.body;
    contents.responseStream = de_FlowResponseStream(data, context);
    return contents;
};
export const de_InvokeInlineAgentCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_cT]: [, output.headers[_xabact]],
        [_sI]: [, output.headers[_xabasi]],
    });
    const data = output.body;
    contents.completion = de_InlineAgentResponseStream(data, context);
    return contents;
};
export const de_ListInvocationsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        invocationSummaries: (_) => de_InvocationSummaries(_, context),
        nextToken: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListInvocationStepsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        invocationStepSummaries: (_) => de_InvocationStepSummaries(_, context),
        nextToken: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_ListSessionsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        nextToken: __expectString,
        sessionSummaries: (_) => de_SessionSummaries(_, context),
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
        tags: _json,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_OptimizePromptCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = output.body;
    contents.optimizedPrompt = de_OptimizedPromptStream(data, context);
    return contents;
};
export const de_PutInvocationStepCommand = async (output, context) => {
    if (output.statusCode !== 201 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        invocationStepId: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_RerankCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        nextToken: __expectString,
        results: (_) => de_RerankResultsList(_, context),
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_RetrieveCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        guardrailAction: __expectString,
        nextToken: __expectString,
        retrievalResults: (_) => de_KnowledgeBaseRetrievalResults(_, context),
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_RetrieveAndGenerateCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        citations: (_) => de_Citations(_, context),
        guardrailAction: __expectString,
        output: _json,
        sessionId: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
export const de_RetrieveAndGenerateStreamCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
        [_sI]: [, output.headers[_xabkbsi]],
    });
    const data = output.body;
    contents.stream = de_RetrieveAndGenerateStreamResponseOutput(data, context);
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
export const de_UpdateSessionCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = map({
        $metadata: deserializeMetadata(output),
    });
    const data = __expectNonNull(__expectObject(await parseBody(output.body, context)), "body");
    const doc = take(data, {
        createdAt: (_) => __expectNonNull(__parseRfc3339DateTimeWithOffset(_)),
        lastUpdatedAt: (_) => __expectNonNull(__parseRfc3339DateTimeWithOffset(_)),
        sessionArn: __expectString,
        sessionId: __expectString,
        sessionStatus: __expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_CommandError = async (output, context) => {
    const parsedOutput = {
        ...output,
        body: await parseErrorBody(output.body, context),
    };
    const errorCode = loadRestJsonErrorCode(output, parsedOutput.body);
    switch (errorCode) {
        case "AccessDeniedException":
        case "com.amazonaws.bedrockagentruntime#AccessDeniedException":
            throw await de_AccessDeniedExceptionRes(parsedOutput, context);
        case "ConflictException":
        case "com.amazonaws.bedrockagentruntime#ConflictException":
            throw await de_ConflictExceptionRes(parsedOutput, context);
        case "InternalServerException":
        case "com.amazonaws.bedrockagentruntime#InternalServerException":
            throw await de_InternalServerExceptionRes(parsedOutput, context);
        case "ResourceNotFoundException":
        case "com.amazonaws.bedrockagentruntime#ResourceNotFoundException":
            throw await de_ResourceNotFoundExceptionRes(parsedOutput, context);
        case "ServiceQuotaExceededException":
        case "com.amazonaws.bedrockagentruntime#ServiceQuotaExceededException":
            throw await de_ServiceQuotaExceededExceptionRes(parsedOutput, context);
        case "ThrottlingException":
        case "com.amazonaws.bedrockagentruntime#ThrottlingException":
            throw await de_ThrottlingExceptionRes(parsedOutput, context);
        case "ValidationException":
        case "com.amazonaws.bedrockagentruntime#ValidationException":
            throw await de_ValidationExceptionRes(parsedOutput, context);
        case "BadGatewayException":
        case "com.amazonaws.bedrockagentruntime#BadGatewayException":
            throw await de_BadGatewayExceptionRes(parsedOutput, context);
        case "DependencyFailedException":
        case "com.amazonaws.bedrockagentruntime#DependencyFailedException":
            throw await de_DependencyFailedExceptionRes(parsedOutput, context);
        case "ModelNotReadyException":
        case "com.amazonaws.bedrockagentruntime#ModelNotReadyException":
            throw await de_ModelNotReadyExceptionRes(parsedOutput, context);
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
const de_AccessDeniedExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new AccessDeniedException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_BadGatewayExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
        resourceName: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new BadGatewayException({
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
const de_DependencyFailedExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
        resourceName: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new DependencyFailedException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_InternalServerExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
        reason: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new InternalServerException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_ModelNotReadyExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new ModelNotReadyException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_ResourceNotFoundExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new ResourceNotFoundException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_ServiceQuotaExceededExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new ServiceQuotaExceededException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_ThrottlingExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new ThrottlingException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_ValidationExceptionRes = async (parsedOutput, context) => {
    const contents = map({});
    const data = parsedOutput.body;
    const doc = take(data, {
        message: __expectString,
    });
    Object.assign(contents, doc);
    const exception = new ValidationException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return __decorateServiceException(exception, parsedOutput.body);
};
const de_FlowResponseStream = (output, context) => {
    return context.eventStreamMarshaller.deserialize(output, async (event) => {
        if (event["flowOutputEvent"] != null) {
            return {
                flowOutputEvent: await de_FlowOutputEvent_event(event["flowOutputEvent"], context),
            };
        }
        if (event["flowCompletionEvent"] != null) {
            return {
                flowCompletionEvent: await de_FlowCompletionEvent_event(event["flowCompletionEvent"], context),
            };
        }
        if (event["flowTraceEvent"] != null) {
            return {
                flowTraceEvent: await de_FlowTraceEvent_event(event["flowTraceEvent"], context),
            };
        }
        if (event["internalServerException"] != null) {
            return {
                internalServerException: await de_InternalServerException_event(event["internalServerException"], context),
            };
        }
        if (event["validationException"] != null) {
            return {
                validationException: await de_ValidationException_event(event["validationException"], context),
            };
        }
        if (event["resourceNotFoundException"] != null) {
            return {
                resourceNotFoundException: await de_ResourceNotFoundException_event(event["resourceNotFoundException"], context),
            };
        }
        if (event["serviceQuotaExceededException"] != null) {
            return {
                serviceQuotaExceededException: await de_ServiceQuotaExceededException_event(event["serviceQuotaExceededException"], context),
            };
        }
        if (event["throttlingException"] != null) {
            return {
                throttlingException: await de_ThrottlingException_event(event["throttlingException"], context),
            };
        }
        if (event["accessDeniedException"] != null) {
            return {
                accessDeniedException: await de_AccessDeniedException_event(event["accessDeniedException"], context),
            };
        }
        if (event["conflictException"] != null) {
            return {
                conflictException: await de_ConflictException_event(event["conflictException"], context),
            };
        }
        if (event["dependencyFailedException"] != null) {
            return {
                dependencyFailedException: await de_DependencyFailedException_event(event["dependencyFailedException"], context),
            };
        }
        if (event["badGatewayException"] != null) {
            return {
                badGatewayException: await de_BadGatewayException_event(event["badGatewayException"], context),
            };
        }
        if (event["flowMultiTurnInputRequestEvent"] != null) {
            return {
                flowMultiTurnInputRequestEvent: await de_FlowMultiTurnInputRequestEvent_event(event["flowMultiTurnInputRequestEvent"], context),
            };
        }
        return { $unknown: output };
    });
};
const de_InlineAgentResponseStream = (output, context) => {
    return context.eventStreamMarshaller.deserialize(output, async (event) => {
        if (event["chunk"] != null) {
            return {
                chunk: await de_InlineAgentPayloadPart_event(event["chunk"], context),
            };
        }
        if (event["trace"] != null) {
            return {
                trace: await de_InlineAgentTracePart_event(event["trace"], context),
            };
        }
        if (event["returnControl"] != null) {
            return {
                returnControl: await de_InlineAgentReturnControlPayload_event(event["returnControl"], context),
            };
        }
        if (event["internalServerException"] != null) {
            return {
                internalServerException: await de_InternalServerException_event(event["internalServerException"], context),
            };
        }
        if (event["validationException"] != null) {
            return {
                validationException: await de_ValidationException_event(event["validationException"], context),
            };
        }
        if (event["resourceNotFoundException"] != null) {
            return {
                resourceNotFoundException: await de_ResourceNotFoundException_event(event["resourceNotFoundException"], context),
            };
        }
        if (event["serviceQuotaExceededException"] != null) {
            return {
                serviceQuotaExceededException: await de_ServiceQuotaExceededException_event(event["serviceQuotaExceededException"], context),
            };
        }
        if (event["throttlingException"] != null) {
            return {
                throttlingException: await de_ThrottlingException_event(event["throttlingException"], context),
            };
        }
        if (event["accessDeniedException"] != null) {
            return {
                accessDeniedException: await de_AccessDeniedException_event(event["accessDeniedException"], context),
            };
        }
        if (event["conflictException"] != null) {
            return {
                conflictException: await de_ConflictException_event(event["conflictException"], context),
            };
        }
        if (event["dependencyFailedException"] != null) {
            return {
                dependencyFailedException: await de_DependencyFailedException_event(event["dependencyFailedException"], context),
            };
        }
        if (event["badGatewayException"] != null) {
            return {
                badGatewayException: await de_BadGatewayException_event(event["badGatewayException"], context),
            };
        }
        if (event["files"] != null) {
            return {
                files: await de_InlineAgentFilePart_event(event["files"], context),
            };
        }
        return { $unknown: output };
    });
};
const de_OptimizedPromptStream = (output, context) => {
    return context.eventStreamMarshaller.deserialize(output, async (event) => {
        if (event["optimizedPromptEvent"] != null) {
            return {
                optimizedPromptEvent: await de_OptimizedPromptEvent_event(event["optimizedPromptEvent"], context),
            };
        }
        if (event["analyzePromptEvent"] != null) {
            return {
                analyzePromptEvent: await de_AnalyzePromptEvent_event(event["analyzePromptEvent"], context),
            };
        }
        if (event["internalServerException"] != null) {
            return {
                internalServerException: await de_InternalServerException_event(event["internalServerException"], context),
            };
        }
        if (event["throttlingException"] != null) {
            return {
                throttlingException: await de_ThrottlingException_event(event["throttlingException"], context),
            };
        }
        if (event["validationException"] != null) {
            return {
                validationException: await de_ValidationException_event(event["validationException"], context),
            };
        }
        if (event["dependencyFailedException"] != null) {
            return {
                dependencyFailedException: await de_DependencyFailedException_event(event["dependencyFailedException"], context),
            };
        }
        if (event["accessDeniedException"] != null) {
            return {
                accessDeniedException: await de_AccessDeniedException_event(event["accessDeniedException"], context),
            };
        }
        if (event["badGatewayException"] != null) {
            return {
                badGatewayException: await de_BadGatewayException_event(event["badGatewayException"], context),
            };
        }
        return { $unknown: output };
    });
};
const de_ResponseStream = (output, context) => {
    return context.eventStreamMarshaller.deserialize(output, async (event) => {
        if (event["chunk"] != null) {
            return {
                chunk: await de_PayloadPart_event(event["chunk"], context),
            };
        }
        if (event["trace"] != null) {
            return {
                trace: await de_TracePart_event(event["trace"], context),
            };
        }
        if (event["returnControl"] != null) {
            return {
                returnControl: await de_ReturnControlPayload_event(event["returnControl"], context),
            };
        }
        if (event["internalServerException"] != null) {
            return {
                internalServerException: await de_InternalServerException_event(event["internalServerException"], context),
            };
        }
        if (event["validationException"] != null) {
            return {
                validationException: await de_ValidationException_event(event["validationException"], context),
            };
        }
        if (event["resourceNotFoundException"] != null) {
            return {
                resourceNotFoundException: await de_ResourceNotFoundException_event(event["resourceNotFoundException"], context),
            };
        }
        if (event["serviceQuotaExceededException"] != null) {
            return {
                serviceQuotaExceededException: await de_ServiceQuotaExceededException_event(event["serviceQuotaExceededException"], context),
            };
        }
        if (event["throttlingException"] != null) {
            return {
                throttlingException: await de_ThrottlingException_event(event["throttlingException"], context),
            };
        }
        if (event["accessDeniedException"] != null) {
            return {
                accessDeniedException: await de_AccessDeniedException_event(event["accessDeniedException"], context),
            };
        }
        if (event["conflictException"] != null) {
            return {
                conflictException: await de_ConflictException_event(event["conflictException"], context),
            };
        }
        if (event["dependencyFailedException"] != null) {
            return {
                dependencyFailedException: await de_DependencyFailedException_event(event["dependencyFailedException"], context),
            };
        }
        if (event["badGatewayException"] != null) {
            return {
                badGatewayException: await de_BadGatewayException_event(event["badGatewayException"], context),
            };
        }
        if (event["modelNotReadyException"] != null) {
            return {
                modelNotReadyException: await de_ModelNotReadyException_event(event["modelNotReadyException"], context),
            };
        }
        if (event["files"] != null) {
            return {
                files: await de_FilePart_event(event["files"], context),
            };
        }
        return { $unknown: output };
    });
};
const de_RetrieveAndGenerateStreamResponseOutput = (output, context) => {
    return context.eventStreamMarshaller.deserialize(output, async (event) => {
        if (event["output"] != null) {
            return {
                output: await de_RetrieveAndGenerateOutputEvent_event(event["output"], context),
            };
        }
        if (event["citation"] != null) {
            return {
                citation: await de_CitationEvent_event(event["citation"], context),
            };
        }
        if (event["guardrail"] != null) {
            return {
                guardrail: await de_GuardrailEvent_event(event["guardrail"], context),
            };
        }
        if (event["internalServerException"] != null) {
            return {
                internalServerException: await de_InternalServerException_event(event["internalServerException"], context),
            };
        }
        if (event["validationException"] != null) {
            return {
                validationException: await de_ValidationException_event(event["validationException"], context),
            };
        }
        if (event["resourceNotFoundException"] != null) {
            return {
                resourceNotFoundException: await de_ResourceNotFoundException_event(event["resourceNotFoundException"], context),
            };
        }
        if (event["serviceQuotaExceededException"] != null) {
            return {
                serviceQuotaExceededException: await de_ServiceQuotaExceededException_event(event["serviceQuotaExceededException"], context),
            };
        }
        if (event["throttlingException"] != null) {
            return {
                throttlingException: await de_ThrottlingException_event(event["throttlingException"], context),
            };
        }
        if (event["accessDeniedException"] != null) {
            return {
                accessDeniedException: await de_AccessDeniedException_event(event["accessDeniedException"], context),
            };
        }
        if (event["conflictException"] != null) {
            return {
                conflictException: await de_ConflictException_event(event["conflictException"], context),
            };
        }
        if (event["dependencyFailedException"] != null) {
            return {
                dependencyFailedException: await de_DependencyFailedException_event(event["dependencyFailedException"], context),
            };
        }
        if (event["badGatewayException"] != null) {
            return {
                badGatewayException: await de_BadGatewayException_event(event["badGatewayException"], context),
            };
        }
        return { $unknown: output };
    });
};
const de_AccessDeniedException_event = async (output, context) => {
    const parsedOutput = {
        ...output,
        body: await parseBody(output.body, context),
    };
    return de_AccessDeniedExceptionRes(parsedOutput, context);
};
const de_AnalyzePromptEvent_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    Object.assign(contents, _json(data));
    return contents;
};
const de_BadGatewayException_event = async (output, context) => {
    const parsedOutput = {
        ...output,
        body: await parseBody(output.body, context),
    };
    return de_BadGatewayExceptionRes(parsedOutput, context);
};
const de_CitationEvent_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    Object.assign(contents, de_CitationEvent(data, context));
    return contents;
};
const de_ConflictException_event = async (output, context) => {
    const parsedOutput = {
        ...output,
        body: await parseBody(output.body, context),
    };
    return de_ConflictExceptionRes(parsedOutput, context);
};
const de_DependencyFailedException_event = async (output, context) => {
    const parsedOutput = {
        ...output,
        body: await parseBody(output.body, context),
    };
    return de_DependencyFailedExceptionRes(parsedOutput, context);
};
const de_FilePart_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    Object.assign(contents, de_FilePart(data, context));
    return contents;
};
const de_FlowCompletionEvent_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    Object.assign(contents, _json(data));
    return contents;
};
const de_FlowMultiTurnInputRequestEvent_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    Object.assign(contents, de_FlowMultiTurnInputRequestEvent(data, context));
    return contents;
};
const de_FlowOutputEvent_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    Object.assign(contents, de_FlowOutputEvent(data, context));
    return contents;
};
const de_FlowTraceEvent_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    Object.assign(contents, de_FlowTraceEvent(data, context));
    return contents;
};
const de_GuardrailEvent_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    Object.assign(contents, _json(data));
    return contents;
};
const de_InlineAgentFilePart_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    Object.assign(contents, de_InlineAgentFilePart(data, context));
    return contents;
};
const de_InlineAgentPayloadPart_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    Object.assign(contents, de_InlineAgentPayloadPart(data, context));
    return contents;
};
const de_InlineAgentReturnControlPayload_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    Object.assign(contents, _json(data));
    return contents;
};
const de_InlineAgentTracePart_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    Object.assign(contents, de_InlineAgentTracePart(data, context));
    return contents;
};
const de_InternalServerException_event = async (output, context) => {
    const parsedOutput = {
        ...output,
        body: await parseBody(output.body, context),
    };
    return de_InternalServerExceptionRes(parsedOutput, context);
};
const de_ModelNotReadyException_event = async (output, context) => {
    const parsedOutput = {
        ...output,
        body: await parseBody(output.body, context),
    };
    return de_ModelNotReadyExceptionRes(parsedOutput, context);
};
const de_OptimizedPromptEvent_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    Object.assign(contents, _json(data));
    return contents;
};
const de_PayloadPart_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    Object.assign(contents, de_PayloadPart(data, context));
    return contents;
};
const de_ResourceNotFoundException_event = async (output, context) => {
    const parsedOutput = {
        ...output,
        body: await parseBody(output.body, context),
    };
    return de_ResourceNotFoundExceptionRes(parsedOutput, context);
};
const de_RetrieveAndGenerateOutputEvent_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    Object.assign(contents, _json(data));
    return contents;
};
const de_ReturnControlPayload_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    Object.assign(contents, _json(data));
    return contents;
};
const de_ServiceQuotaExceededException_event = async (output, context) => {
    const parsedOutput = {
        ...output,
        body: await parseBody(output.body, context),
    };
    return de_ServiceQuotaExceededExceptionRes(parsedOutput, context);
};
const de_ThrottlingException_event = async (output, context) => {
    const parsedOutput = {
        ...output,
        body: await parseBody(output.body, context),
    };
    return de_ThrottlingExceptionRes(parsedOutput, context);
};
const de_TracePart_event = async (output, context) => {
    const contents = {};
    const data = await parseBody(output.body, context);
    Object.assign(contents, de_TracePart(data, context));
    return contents;
};
const de_ValidationException_event = async (output, context) => {
    const parsedOutput = {
        ...output,
        body: await parseBody(output.body, context),
    };
    return de_ValidationExceptionRes(parsedOutput, context);
};
const se_AdditionalModelRequestFields = (input, context) => {
    return Object.entries(input).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = se_AdditionalModelRequestFieldsValue(value, context);
        return acc;
    }, {});
};
const se_AdditionalModelRequestFieldsValue = (input, context) => {
    return input;
};
const se_ApiResult = (input, context) => {
    return take(input, {
        actionGroup: [],
        agentId: [],
        apiPath: [],
        confirmationState: [],
        httpMethod: [],
        httpStatusCode: [],
        responseBody: (_) => se_ResponseBody(_, context),
        responseState: [],
    });
};
const se_BedrockRerankingConfiguration = (input, context) => {
    return take(input, {
        modelConfiguration: (_) => se_BedrockRerankingModelConfiguration(_, context),
        numberOfResults: [],
    });
};
const se_BedrockRerankingModelConfiguration = (input, context) => {
    return take(input, {
        additionalModelRequestFields: (_) => se_AdditionalModelRequestFields(_, context),
        modelArn: [],
    });
};
const se_BedrockSessionContentBlock = (input, context) => {
    return BedrockSessionContentBlock.visit(input, {
        image: (value) => ({ image: se_ImageBlock(value, context) }),
        text: (value) => ({ text: value }),
        _: (name, value) => ({ [name]: value }),
    });
};
const se_BedrockSessionContentBlocks = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_BedrockSessionContentBlock(entry, context);
    });
};
const se_ByteContentDoc = (input, context) => {
    return take(input, {
        contentType: [],
        data: context.base64Encoder,
        identifier: [],
    });
};
const se_ByteContentFile = (input, context) => {
    return take(input, {
        data: context.base64Encoder,
        mediaType: [],
    });
};
const se_Collaborator = (input, context) => {
    return take(input, {
        actionGroups: _json,
        agentCollaboration: [],
        agentName: [],
        collaboratorConfigurations: _json,
        customerEncryptionKeyArn: [],
        foundationModel: [],
        guardrailConfiguration: _json,
        idleSessionTTLInSeconds: [],
        instruction: [],
        knowledgeBases: (_) => se_KnowledgeBases(_, context),
        promptOverrideConfiguration: (_) => se_PromptOverrideConfiguration(_, context),
    });
};
const se_Collaborators = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_Collaborator(entry, context);
    });
};
const se_ContentBody = (input, context) => {
    return take(input, {
        body: [],
        images: (_) => se_ImageInputs(_, context),
    });
};
const se_ExternalSource = (input, context) => {
    return take(input, {
        byteContent: (_) => se_ByteContentDoc(_, context),
        s3Location: _json,
        sourceType: [],
    });
};
const se_ExternalSources = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_ExternalSource(entry, context);
    });
};
const se_ExternalSourcesGenerationConfiguration = (input, context) => {
    return take(input, {
        additionalModelRequestFields: (_) => se_AdditionalModelRequestFields(_, context),
        guardrailConfiguration: _json,
        inferenceConfig: (_) => se_InferenceConfig(_, context),
        performanceConfig: _json,
        promptTemplate: _json,
    });
};
const se_ExternalSourcesRetrieveAndGenerateConfiguration = (input, context) => {
    return take(input, {
        generationConfiguration: (_) => se_ExternalSourcesGenerationConfiguration(_, context),
        modelArn: [],
        sources: (_) => se_ExternalSources(_, context),
    });
};
const se_FileSource = (input, context) => {
    return take(input, {
        byteContent: (_) => se_ByteContentFile(_, context),
        s3Location: _json,
        sourceType: [],
    });
};
const se_FilterAttribute = (input, context) => {
    return take(input, {
        key: [],
        value: (_) => se_FilterValue(_, context),
    });
};
const se_FilterValue = (input, context) => {
    return input;
};
const se_FlowInput = (input, context) => {
    return take(input, {
        content: (_) => se_FlowInputContent(_, context),
        nodeInputName: [],
        nodeName: [],
        nodeOutputName: [],
    });
};
const se_FlowInputContent = (input, context) => {
    return FlowInputContent.visit(input, {
        document: (value) => ({ document: se_Document(value, context) }),
        _: (name, value) => ({ [name]: value }),
    });
};
const se_FlowInputs = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_FlowInput(entry, context);
    });
};
const se_FunctionResult = (input, context) => {
    return take(input, {
        actionGroup: [],
        agentId: [],
        confirmationState: [],
        function: [],
        responseBody: (_) => se_ResponseBody(_, context),
        responseState: [],
    });
};
const se_GenerationConfiguration = (input, context) => {
    return take(input, {
        additionalModelRequestFields: (_) => se_AdditionalModelRequestFields(_, context),
        guardrailConfiguration: _json,
        inferenceConfig: (_) => se_InferenceConfig(_, context),
        performanceConfig: _json,
        promptTemplate: _json,
    });
};
const se_ImageBlock = (input, context) => {
    return take(input, {
        format: [],
        source: (_) => se_ImageSource(_, context),
    });
};
const se_ImageInput = (input, context) => {
    return take(input, {
        format: [],
        source: (_) => se_ImageInputSource(_, context),
    });
};
const se_ImageInputs = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_ImageInput(entry, context);
    });
};
const se_ImageInputSource = (input, context) => {
    return ImageInputSource.visit(input, {
        bytes: (value) => ({ bytes: context.base64Encoder(value) }),
        _: (name, value) => ({ [name]: value }),
    });
};
const se_ImageSource = (input, context) => {
    return ImageSource.visit(input, {
        bytes: (value) => ({ bytes: context.base64Encoder(value) }),
        s3Location: (value) => ({ s3Location: _json(value) }),
        _: (name, value) => ({ [name]: value }),
    });
};
const se_InferenceConfig = (input, context) => {
    return take(input, {
        textInferenceConfig: (_) => se_TextInferenceConfig(_, context),
    });
};
const se_InferenceConfiguration = (input, context) => {
    return take(input, {
        maximumLength: [],
        stopSequences: _json,
        temperature: __serializeFloat,
        topK: [],
        topP: __serializeFloat,
    });
};
const se_InlineSessionState = (input, context) => {
    return take(input, {
        conversationHistory: _json,
        files: (_) => se_InputFiles(_, context),
        invocationId: [],
        promptSessionAttributes: _json,
        returnControlInvocationResults: (_) => se_ReturnControlInvocationResults(_, context),
        sessionAttributes: _json,
    });
};
const se_InputFile = (input, context) => {
    return take(input, {
        name: [],
        source: (_) => se_FileSource(_, context),
        useCase: [],
    });
};
const se_InputFiles = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_InputFile(entry, context);
    });
};
const se_InvocationResultMember = (input, context) => {
    return InvocationResultMember.visit(input, {
        apiResult: (value) => ({ apiResult: se_ApiResult(value, context) }),
        functionResult: (value) => ({ functionResult: se_FunctionResult(value, context) }),
        _: (name, value) => ({ [name]: value }),
    });
};
const se_InvocationStepPayload = (input, context) => {
    return InvocationStepPayload.visit(input, {
        contentBlocks: (value) => ({ contentBlocks: se_BedrockSessionContentBlocks(value, context) }),
        _: (name, value) => ({ [name]: value }),
    });
};
const se_KnowledgeBase = (input, context) => {
    return take(input, {
        description: [],
        knowledgeBaseId: [],
        retrievalConfiguration: (_) => se_KnowledgeBaseRetrievalConfiguration(_, context),
    });
};
const se_KnowledgeBaseConfiguration = (input, context) => {
    return take(input, {
        knowledgeBaseId: [],
        retrievalConfiguration: (_) => se_KnowledgeBaseRetrievalConfiguration(_, context),
    });
};
const se_KnowledgeBaseConfigurations = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_KnowledgeBaseConfiguration(entry, context);
    });
};
const se_KnowledgeBaseRetrievalConfiguration = (input, context) => {
    return take(input, {
        vectorSearchConfiguration: (_) => se_KnowledgeBaseVectorSearchConfiguration(_, context),
    });
};
const se_KnowledgeBaseRetrieveAndGenerateConfiguration = (input, context) => {
    return take(input, {
        generationConfiguration: (_) => se_GenerationConfiguration(_, context),
        knowledgeBaseId: [],
        modelArn: [],
        orchestrationConfiguration: (_) => se_OrchestrationConfiguration(_, context),
        retrievalConfiguration: (_) => se_KnowledgeBaseRetrievalConfiguration(_, context),
    });
};
const se_KnowledgeBases = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_KnowledgeBase(entry, context);
    });
};
const se_KnowledgeBaseVectorSearchConfiguration = (input, context) => {
    return take(input, {
        filter: (_) => se_RetrievalFilter(_, context),
        implicitFilterConfiguration: _json,
        numberOfResults: [],
        overrideSearchType: [],
        rerankingConfiguration: (_) => se_VectorSearchRerankingConfiguration(_, context),
    });
};
const se_OrchestrationConfiguration = (input, context) => {
    return take(input, {
        additionalModelRequestFields: (_) => se_AdditionalModelRequestFields(_, context),
        inferenceConfig: (_) => se_InferenceConfig(_, context),
        performanceConfig: _json,
        promptTemplate: _json,
        queryTransformationConfiguration: _json,
    });
};
const se_PromptConfiguration = (input, context) => {
    return take(input, {
        additionalModelRequestFields: (_) => se_Document(_, context),
        basePromptTemplate: [],
        foundationModel: [],
        inferenceConfiguration: (_) => se_InferenceConfiguration(_, context),
        parserMode: [],
        promptCreationMode: [],
        promptState: [],
        promptType: [],
    });
};
const se_PromptConfigurations = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_PromptConfiguration(entry, context);
    });
};
const se_PromptOverrideConfiguration = (input, context) => {
    return take(input, {
        overrideLambda: [],
        promptConfigurations: (_) => se_PromptConfigurations(_, context),
    });
};
const se_RerankDocument = (input, context) => {
    return take(input, {
        jsonDocument: (_) => se_Document(_, context),
        textDocument: _json,
        type: [],
    });
};
const se_RerankingConfiguration = (input, context) => {
    return take(input, {
        bedrockRerankingConfiguration: (_) => se_BedrockRerankingConfiguration(_, context),
        type: [],
    });
};
const se_RerankSource = (input, context) => {
    return take(input, {
        inlineDocumentSource: (_) => se_RerankDocument(_, context),
        type: [],
    });
};
const se_RerankSourcesList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_RerankSource(entry, context);
    });
};
const se_ResponseBody = (input, context) => {
    return Object.entries(input).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = se_ContentBody(value, context);
        return acc;
    }, {});
};
const se_RetrievalFilter = (input, context) => {
    return RetrievalFilter.visit(input, {
        andAll: (value) => ({ andAll: se_RetrievalFilterList(value, context) }),
        equals: (value) => ({ equals: se_FilterAttribute(value, context) }),
        greaterThan: (value) => ({ greaterThan: se_FilterAttribute(value, context) }),
        greaterThanOrEquals: (value) => ({ greaterThanOrEquals: se_FilterAttribute(value, context) }),
        in: (value) => ({ in: se_FilterAttribute(value, context) }),
        lessThan: (value) => ({ lessThan: se_FilterAttribute(value, context) }),
        lessThanOrEquals: (value) => ({ lessThanOrEquals: se_FilterAttribute(value, context) }),
        listContains: (value) => ({ listContains: se_FilterAttribute(value, context) }),
        notEquals: (value) => ({ notEquals: se_FilterAttribute(value, context) }),
        notIn: (value) => ({ notIn: se_FilterAttribute(value, context) }),
        orAll: (value) => ({ orAll: se_RetrievalFilterList(value, context) }),
        startsWith: (value) => ({ startsWith: se_FilterAttribute(value, context) }),
        stringContains: (value) => ({ stringContains: se_FilterAttribute(value, context) }),
        _: (name, value) => ({ [name]: value }),
    });
};
const se_RetrievalFilterList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_RetrievalFilter(entry, context);
    });
};
const se_RetrieveAndGenerateConfiguration = (input, context) => {
    return take(input, {
        externalSourcesConfiguration: (_) => se_ExternalSourcesRetrieveAndGenerateConfiguration(_, context),
        knowledgeBaseConfiguration: (_) => se_KnowledgeBaseRetrieveAndGenerateConfiguration(_, context),
        type: [],
    });
};
const se_ReturnControlInvocationResults = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_InvocationResultMember(entry, context);
    });
};
const se_SessionState = (input, context) => {
    return take(input, {
        conversationHistory: _json,
        files: (_) => se_InputFiles(_, context),
        invocationId: [],
        knowledgeBaseConfigurations: (_) => se_KnowledgeBaseConfigurations(_, context),
        promptSessionAttributes: _json,
        returnControlInvocationResults: (_) => se_ReturnControlInvocationResults(_, context),
        sessionAttributes: _json,
    });
};
const se_TextInferenceConfig = (input, context) => {
    return take(input, {
        maxTokens: [],
        stopSequences: _json,
        temperature: __serializeFloat,
        topP: __serializeFloat,
    });
};
const se_VectorSearchBedrockRerankingConfiguration = (input, context) => {
    return take(input, {
        metadataConfiguration: _json,
        modelConfiguration: (_) => se_VectorSearchBedrockRerankingModelConfiguration(_, context),
        numberOfRerankedResults: [],
    });
};
const se_VectorSearchBedrockRerankingModelConfiguration = (input, context) => {
    return take(input, {
        additionalModelRequestFields: (_) => se_AdditionalModelRequestFields(_, context),
        modelArn: [],
    });
};
const se_VectorSearchRerankingConfiguration = (input, context) => {
    return take(input, {
        bedrockRerankingConfiguration: (_) => se_VectorSearchBedrockRerankingConfiguration(_, context),
        type: [],
    });
};
const se_Document = (input, context) => {
    return input;
};
const de_AgentCollaboratorInputPayload = (output, context) => {
    return take(output, {
        returnControlResults: (_) => de_ReturnControlResults(_, context),
        text: __expectString,
        type: __expectString,
    });
};
const de_AgentCollaboratorInvocationInput = (output, context) => {
    return take(output, {
        agentCollaboratorAliasArn: __expectString,
        agentCollaboratorName: __expectString,
        input: (_) => de_AgentCollaboratorInputPayload(_, context),
    });
};
const de_AgentCollaboratorInvocationOutput = (output, context) => {
    return take(output, {
        agentCollaboratorAliasArn: __expectString,
        agentCollaboratorName: __expectString,
        output: _json,
    });
};
const de_ApiResult = (output, context) => {
    return take(output, {
        actionGroup: __expectString,
        agentId: __expectString,
        apiPath: __expectString,
        confirmationState: __expectString,
        httpMethod: __expectString,
        httpStatusCode: __expectInt32,
        responseBody: (_) => de_ResponseBody(_, context),
        responseState: __expectString,
    });
};
const de_Attribution = (output, context) => {
    return take(output, {
        citations: (_) => de_Citations(_, context),
    });
};
const de_BedrockSessionContentBlock = (output, context) => {
    if (output.image != null) {
        return {
            image: de_ImageBlock(output.image, context),
        };
    }
    if (__expectString(output.text) !== undefined) {
        return { text: __expectString(output.text) };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_BedrockSessionContentBlocks = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_BedrockSessionContentBlock(__expectUnion(entry), context);
    });
    return retVal;
};
const de_Citation = (output, context) => {
    return take(output, {
        generatedResponsePart: _json,
        retrievedReferences: (_) => de_RetrievedReferences(_, context),
    });
};
const de_CitationEvent = (output, context) => {
    return take(output, {
        citation: (_) => de_Citation(_, context),
        generatedResponsePart: _json,
        retrievedReferences: (_) => de_RetrievedReferences(_, context),
    });
};
const de_Citations = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Citation(entry, context);
    });
    return retVal;
};
const de_ContentBody = (output, context) => {
    return take(output, {
        body: __expectString,
        images: (_) => de_ImageInputs(_, context),
    });
};
const de_FilePart = (output, context) => {
    return take(output, {
        files: (_) => de_OutputFiles(_, context),
    });
};
const de_FlowMultiTurnInputContent = (output, context) => {
    if (output.document != null) {
        return {
            document: de_Document(output.document, context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_FlowMultiTurnInputRequestEvent = (output, context) => {
    return take(output, {
        content: (_) => de_FlowMultiTurnInputContent(__expectUnion(_), context),
        nodeName: __expectString,
        nodeType: __expectString,
    });
};
const de_FlowOutputContent = (output, context) => {
    if (output.document != null) {
        return {
            document: de_Document(output.document, context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_FlowOutputEvent = (output, context) => {
    return take(output, {
        content: (_) => de_FlowOutputContent(__expectUnion(_), context),
        nodeName: __expectString,
        nodeType: __expectString,
    });
};
const de_FlowTrace = (output, context) => {
    if (output.conditionNodeResultTrace != null) {
        return {
            conditionNodeResultTrace: de_FlowTraceConditionNodeResultEvent(output.conditionNodeResultTrace, context),
        };
    }
    if (output.nodeActionTrace != null) {
        return {
            nodeActionTrace: de_FlowTraceNodeActionEvent(output.nodeActionTrace, context),
        };
    }
    if (output.nodeInputTrace != null) {
        return {
            nodeInputTrace: de_FlowTraceNodeInputEvent(output.nodeInputTrace, context),
        };
    }
    if (output.nodeOutputTrace != null) {
        return {
            nodeOutputTrace: de_FlowTraceNodeOutputEvent(output.nodeOutputTrace, context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_FlowTraceConditionNodeResultEvent = (output, context) => {
    return take(output, {
        nodeName: __expectString,
        satisfiedConditions: _json,
        timestamp: (_) => __expectNonNull(__parseRfc3339DateTimeWithOffset(_)),
    });
};
const de_FlowTraceEvent = (output, context) => {
    return take(output, {
        trace: (_) => de_FlowTrace(__expectUnion(_), context),
    });
};
const de_FlowTraceNodeActionEvent = (output, context) => {
    return take(output, {
        nodeName: __expectString,
        operationName: __expectString,
        requestId: __expectString,
        serviceName: __expectString,
        timestamp: (_) => __expectNonNull(__parseRfc3339DateTimeWithOffset(_)),
    });
};
const de_FlowTraceNodeInputContent = (output, context) => {
    if (output.document != null) {
        return {
            document: de_Document(output.document, context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_FlowTraceNodeInputEvent = (output, context) => {
    return take(output, {
        fields: (_) => de_FlowTraceNodeInputFields(_, context),
        nodeName: __expectString,
        timestamp: (_) => __expectNonNull(__parseRfc3339DateTimeWithOffset(_)),
    });
};
const de_FlowTraceNodeInputField = (output, context) => {
    return take(output, {
        content: (_) => de_FlowTraceNodeInputContent(__expectUnion(_), context),
        nodeInputName: __expectString,
    });
};
const de_FlowTraceNodeInputFields = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_FlowTraceNodeInputField(entry, context);
    });
    return retVal;
};
const de_FlowTraceNodeOutputContent = (output, context) => {
    if (output.document != null) {
        return {
            document: de_Document(output.document, context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_FlowTraceNodeOutputEvent = (output, context) => {
    return take(output, {
        fields: (_) => de_FlowTraceNodeOutputFields(_, context),
        nodeName: __expectString,
        timestamp: (_) => __expectNonNull(__parseRfc3339DateTimeWithOffset(_)),
    });
};
const de_FlowTraceNodeOutputField = (output, context) => {
    return take(output, {
        content: (_) => de_FlowTraceNodeOutputContent(__expectUnion(_), context),
        nodeOutputName: __expectString,
    });
};
const de_FlowTraceNodeOutputFields = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_FlowTraceNodeOutputField(entry, context);
    });
    return retVal;
};
const de_FunctionResult = (output, context) => {
    return take(output, {
        actionGroup: __expectString,
        agentId: __expectString,
        confirmationState: __expectString,
        function: __expectString,
        responseBody: (_) => de_ResponseBody(_, context),
        responseState: __expectString,
    });
};
const de_ImageBlock = (output, context) => {
    return take(output, {
        format: __expectString,
        source: (_) => de_ImageSource(__expectUnion(_), context),
    });
};
const de_ImageInput = (output, context) => {
    return take(output, {
        format: __expectString,
        source: (_) => de_ImageInputSource(__expectUnion(_), context),
    });
};
const de_ImageInputs = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ImageInput(entry, context);
    });
    return retVal;
};
const de_ImageInputSource = (output, context) => {
    if (output.bytes != null) {
        return {
            bytes: context.base64Decoder(output.bytes),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_ImageSource = (output, context) => {
    if (output.bytes != null) {
        return {
            bytes: context.base64Decoder(output.bytes),
        };
    }
    if (output.s3Location != null) {
        return {
            s3Location: _json(output.s3Location),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_InferenceConfiguration = (output, context) => {
    return take(output, {
        maximumLength: __expectInt32,
        stopSequences: _json,
        temperature: __limitedParseFloat32,
        topK: __expectInt32,
        topP: __limitedParseFloat32,
    });
};
const de_InlineAgentFilePart = (output, context) => {
    return take(output, {
        files: (_) => de_OutputFiles(_, context),
    });
};
const de_InlineAgentPayloadPart = (output, context) => {
    return take(output, {
        attribution: (_) => de_Attribution(_, context),
        bytes: context.base64Decoder,
    });
};
const de_InlineAgentTracePart = (output, context) => {
    return take(output, {
        callerChain: _json,
        collaboratorName: __expectString,
        eventTime: (_) => __expectNonNull(__parseRfc3339DateTimeWithOffset(_)),
        sessionId: __expectString,
        trace: (_) => de_Trace(__expectUnion(_), context),
    });
};
const de_InvocationInput = (output, context) => {
    return take(output, {
        actionGroupInvocationInput: _json,
        agentCollaboratorInvocationInput: (_) => de_AgentCollaboratorInvocationInput(_, context),
        codeInterpreterInvocationInput: _json,
        invocationType: __expectString,
        knowledgeBaseLookupInput: _json,
        traceId: __expectString,
    });
};
const de_InvocationResultMember = (output, context) => {
    if (output.apiResult != null) {
        return {
            apiResult: de_ApiResult(output.apiResult, context),
        };
    }
    if (output.functionResult != null) {
        return {
            functionResult: de_FunctionResult(output.functionResult, context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_InvocationStep = (output, context) => {
    return take(output, {
        invocationId: __expectString,
        invocationStepId: __expectString,
        invocationStepTime: (_) => __expectNonNull(__parseRfc3339DateTimeWithOffset(_)),
        payload: (_) => de_InvocationStepPayload(__expectUnion(_), context),
        sessionId: __expectString,
    });
};
const de_InvocationStepPayload = (output, context) => {
    if (output.contentBlocks != null) {
        return {
            contentBlocks: de_BedrockSessionContentBlocks(output.contentBlocks, context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_InvocationStepSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_InvocationStepSummary(entry, context);
    });
    return retVal;
};
const de_InvocationStepSummary = (output, context) => {
    return take(output, {
        invocationId: __expectString,
        invocationStepId: __expectString,
        invocationStepTime: (_) => __expectNonNull(__parseRfc3339DateTimeWithOffset(_)),
        sessionId: __expectString,
    });
};
const de_InvocationSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_InvocationSummary(entry, context);
    });
    return retVal;
};
const de_InvocationSummary = (output, context) => {
    return take(output, {
        createdAt: (_) => __expectNonNull(__parseRfc3339DateTimeWithOffset(_)),
        invocationId: __expectString,
        sessionId: __expectString,
    });
};
const de_KnowledgeBaseLookupOutput = (output, context) => {
    return take(output, {
        retrievedReferences: (_) => de_RetrievedReferences(_, context),
    });
};
const de_KnowledgeBaseRetrievalResult = (output, context) => {
    return take(output, {
        content: _json,
        location: _json,
        metadata: (_) => de_RetrievalResultMetadata(_, context),
        score: __limitedParseDouble,
    });
};
const de_KnowledgeBaseRetrievalResults = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_KnowledgeBaseRetrievalResult(entry, context);
    });
    return retVal;
};
const de_Memories = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Memory(__expectUnion(entry), context);
    });
    return retVal;
};
const de_Memory = (output, context) => {
    if (output.sessionSummary != null) {
        return {
            sessionSummary: de_MemorySessionSummary(output.sessionSummary, context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_MemorySessionSummary = (output, context) => {
    return take(output, {
        memoryId: __expectString,
        sessionExpiryTime: (_) => __expectNonNull(__parseRfc3339DateTimeWithOffset(_)),
        sessionId: __expectString,
        sessionStartTime: (_) => __expectNonNull(__parseRfc3339DateTimeWithOffset(_)),
        summaryText: __expectString,
    });
};
const de_ModelInvocationInput = (output, context) => {
    return take(output, {
        foundationModel: __expectString,
        inferenceConfiguration: (_) => de_InferenceConfiguration(_, context),
        overrideLambda: __expectString,
        parserMode: __expectString,
        promptCreationMode: __expectString,
        text: __expectString,
        traceId: __expectString,
        type: __expectString,
    });
};
const de_Observation = (output, context) => {
    return take(output, {
        actionGroupInvocationOutput: _json,
        agentCollaboratorInvocationOutput: (_) => de_AgentCollaboratorInvocationOutput(_, context),
        codeInterpreterInvocationOutput: _json,
        finalResponse: _json,
        knowledgeBaseLookupOutput: (_) => de_KnowledgeBaseLookupOutput(_, context),
        repromptResponse: _json,
        traceId: __expectString,
        type: __expectString,
    });
};
const de_OrchestrationModelInvocationOutput = (output, context) => {
    return take(output, {
        metadata: _json,
        rawResponse: _json,
        reasoningContent: (_) => de_ReasoningContentBlock(__expectUnion(_), context),
        traceId: __expectString,
    });
};
const de_OrchestrationTrace = (output, context) => {
    if (output.invocationInput != null) {
        return {
            invocationInput: de_InvocationInput(output.invocationInput, context),
        };
    }
    if (output.modelInvocationInput != null) {
        return {
            modelInvocationInput: de_ModelInvocationInput(output.modelInvocationInput, context),
        };
    }
    if (output.modelInvocationOutput != null) {
        return {
            modelInvocationOutput: de_OrchestrationModelInvocationOutput(output.modelInvocationOutput, context),
        };
    }
    if (output.observation != null) {
        return {
            observation: de_Observation(output.observation, context),
        };
    }
    if (output.rationale != null) {
        return {
            rationale: _json(output.rationale),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_OutputFile = (output, context) => {
    return take(output, {
        bytes: context.base64Decoder,
        name: __expectString,
        type: __expectString,
    });
};
const de_OutputFiles = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_OutputFile(entry, context);
    });
    return retVal;
};
const de_PayloadPart = (output, context) => {
    return take(output, {
        attribution: (_) => de_Attribution(_, context),
        bytes: context.base64Decoder,
    });
};
const de_PostProcessingModelInvocationOutput = (output, context) => {
    return take(output, {
        metadata: _json,
        parsedResponse: _json,
        rawResponse: _json,
        reasoningContent: (_) => de_ReasoningContentBlock(__expectUnion(_), context),
        traceId: __expectString,
    });
};
const de_PostProcessingTrace = (output, context) => {
    if (output.modelInvocationInput != null) {
        return {
            modelInvocationInput: de_ModelInvocationInput(output.modelInvocationInput, context),
        };
    }
    if (output.modelInvocationOutput != null) {
        return {
            modelInvocationOutput: de_PostProcessingModelInvocationOutput(output.modelInvocationOutput, context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_PreProcessingModelInvocationOutput = (output, context) => {
    return take(output, {
        metadata: _json,
        parsedResponse: _json,
        rawResponse: _json,
        reasoningContent: (_) => de_ReasoningContentBlock(__expectUnion(_), context),
        traceId: __expectString,
    });
};
const de_PreProcessingTrace = (output, context) => {
    if (output.modelInvocationInput != null) {
        return {
            modelInvocationInput: de_ModelInvocationInput(output.modelInvocationInput, context),
        };
    }
    if (output.modelInvocationOutput != null) {
        return {
            modelInvocationOutput: de_PreProcessingModelInvocationOutput(output.modelInvocationOutput, context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_ReasoningContentBlock = (output, context) => {
    if (output.reasoningText != null) {
        return {
            reasoningText: _json(output.reasoningText),
        };
    }
    if (output.redactedContent != null) {
        return {
            redactedContent: context.base64Decoder(output.redactedContent),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_RerankDocument = (output, context) => {
    return take(output, {
        jsonDocument: (_) => de_Document(_, context),
        textDocument: _json,
        type: __expectString,
    });
};
const de_RerankResult = (output, context) => {
    return take(output, {
        document: (_) => de_RerankDocument(_, context),
        index: __expectInt32,
        relevanceScore: __limitedParseFloat32,
    });
};
const de_RerankResultsList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_RerankResult(entry, context);
    });
    return retVal;
};
const de_ResponseBody = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = de_ContentBody(value, context);
        return acc;
    }, {});
};
const de_RetrievalResultMetadata = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = de_RetrievalResultMetadataValue(value, context);
        return acc;
    }, {});
};
const de_RetrievalResultMetadataValue = (output, context) => {
    return output;
};
const de_RetrievedReference = (output, context) => {
    return take(output, {
        content: _json,
        location: _json,
        metadata: (_) => de_RetrievalResultMetadata(_, context),
    });
};
const de_RetrievedReferences = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_RetrievedReference(entry, context);
    });
    return retVal;
};
const de_ReturnControlInvocationResults = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_InvocationResultMember(__expectUnion(entry), context);
    });
    return retVal;
};
const de_ReturnControlResults = (output, context) => {
    return take(output, {
        invocationId: __expectString,
        returnControlInvocationResults: (_) => de_ReturnControlInvocationResults(_, context),
    });
};
const de_RoutingClassifierTrace = (output, context) => {
    if (output.invocationInput != null) {
        return {
            invocationInput: de_InvocationInput(output.invocationInput, context),
        };
    }
    if (output.modelInvocationInput != null) {
        return {
            modelInvocationInput: de_ModelInvocationInput(output.modelInvocationInput, context),
        };
    }
    if (output.modelInvocationOutput != null) {
        return {
            modelInvocationOutput: _json(output.modelInvocationOutput),
        };
    }
    if (output.observation != null) {
        return {
            observation: de_Observation(output.observation, context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_SessionSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_SessionSummary(entry, context);
    });
    return retVal;
};
const de_SessionSummary = (output, context) => {
    return take(output, {
        createdAt: (_) => __expectNonNull(__parseRfc3339DateTimeWithOffset(_)),
        lastUpdatedAt: (_) => __expectNonNull(__parseRfc3339DateTimeWithOffset(_)),
        sessionArn: __expectString,
        sessionId: __expectString,
        sessionStatus: __expectString,
    });
};
const de_Trace = (output, context) => {
    if (output.customOrchestrationTrace != null) {
        return {
            customOrchestrationTrace: _json(output.customOrchestrationTrace),
        };
    }
    if (output.failureTrace != null) {
        return {
            failureTrace: _json(output.failureTrace),
        };
    }
    if (output.guardrailTrace != null) {
        return {
            guardrailTrace: _json(output.guardrailTrace),
        };
    }
    if (output.orchestrationTrace != null) {
        return {
            orchestrationTrace: de_OrchestrationTrace(__expectUnion(output.orchestrationTrace), context),
        };
    }
    if (output.postProcessingTrace != null) {
        return {
            postProcessingTrace: de_PostProcessingTrace(__expectUnion(output.postProcessingTrace), context),
        };
    }
    if (output.preProcessingTrace != null) {
        return {
            preProcessingTrace: de_PreProcessingTrace(__expectUnion(output.preProcessingTrace), context),
        };
    }
    if (output.routingClassifierTrace != null) {
        return {
            routingClassifierTrace: de_RoutingClassifierTrace(__expectUnion(output.routingClassifierTrace), context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_TracePart = (output, context) => {
    return take(output, {
        agentAliasId: __expectString,
        agentId: __expectString,
        agentVersion: __expectString,
        callerChain: _json,
        collaboratorName: __expectString,
        eventTime: (_) => __expectNonNull(__parseRfc3339DateTimeWithOffset(_)),
        sessionId: __expectString,
        trace: (_) => de_Trace(__expectUnion(_), context),
    });
};
const de_Document = (output, context) => {
    return output;
};
const deserializeMetadata = (output) => ({
    httpStatusCode: output.statusCode,
    requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
    extendedRequestId: output.headers["x-amz-id-2"],
    cfId: output.headers["x-amz-cf-id"],
});
const collectBodyString = (streamBody, context) => collectBody(streamBody, context).then((body) => context.utf8Encoder(body));
const _cT = "contentType";
const _eI = "executionId";
const _mI = "memoryId";
const _mIa = "maxItems";
const _mR = "maxResults";
const _mT = "memoryType";
const _nT = "nextToken";
const _sA = "sourceArn";
const _sI = "sessionId";
const _tK = "tagKeys";
const _xabact = "x-amzn-bedrock-agent-content-type";
const _xabami = "x-amz-bedrock-agent-memory-id";
const _xabasi = "x-amz-bedrock-agent-session-id";
const _xabfei = "x-amz-bedrock-flow-execution-id";
const _xabkbsi = "x-amzn-bedrock-knowledge-base-session-id";
const _xasa = "x-amz-source-arn";
