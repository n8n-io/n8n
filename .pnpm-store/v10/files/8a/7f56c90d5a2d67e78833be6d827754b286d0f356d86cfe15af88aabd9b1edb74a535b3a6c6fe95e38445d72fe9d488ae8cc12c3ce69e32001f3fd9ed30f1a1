import type { FromSchema } from 'json-schema-to-ts';
import type { parameter, operationMethod, sourceDescriptionSchema, infoObject, requestBody, replacement, criteriaObject, step, workflow, reusableObject, onSuccessObject, onFailureObject, extendedOperation } from './arazzo-schema';
import type { Faker } from './modules/faker';
import type { OperationDetails } from './modules/description-parser';
import type { RuleSeverity } from '@redocly/openapi-core/lib/config/types';
import type { ApiFetcher } from './utils/api-fetcher';
import type { RespectOptions } from './handlers/run';
import type { Config } from '@redocly/openapi-core';
import type { CollectFn } from '@redocly/openapi-core/src/utils';
export type OperationMethod = FromSchema<typeof operationMethod>;
export type ResponseContext = {
    statusCode: number;
    body: any;
    header: Record<string, string>;
    contentType?: string;
    time?: number;
} & Record<string, any>;
export type SourceDescription = FromSchema<typeof sourceDescriptionSchema>;
type ArazzoParameter = FromSchema<typeof parameter>;
export type InfoObject = FromSchema<typeof infoObject>;
export type RequestBody = FromSchema<typeof requestBody>;
export type Replacement = FromSchema<typeof replacement>;
export type CriteriaObject = FromSchema<typeof criteriaObject>;
export type ReusableObject = FromSchema<typeof reusableObject>;
export type OnSuccessObject = FromSchema<typeof onSuccessObject>;
export type OnFailureObject = FromSchema<typeof onFailureObject>;
export type ExtendedOperation = FromSchema<typeof extendedOperation>;
type ArazzoStep = FromSchema<typeof step>;
type ArazzoWorkflow = FromSchema<typeof workflow> & {
    steps: Step[];
};
export type AdditionalParameterProperties = {
    style?: string;
    target?: string;
    required?: boolean;
    schema?: Record<string, any>;
    example?: unknown;
    examples?: Record<string, any> | unknown;
};
type ExtendedParameter<T> = T & AdditionalParameterProperties;
export type Parameter = ExtendedParameter<ArazzoParameter>;
export type ResolvedParameter = Parameter & {
    in?: 'header' | 'query' | 'path' | 'cookie';
    name: string;
};
export type VerboseLog = {
    method: OperationMethod;
    path: string;
    host: string;
    body?: any;
    headerParams?: Record<string, string>;
    statusCode?: number;
    responseTime?: number;
};
type AdditionalStepProps = {
    verboseLog?: VerboseLog;
    response: ResponseContext;
    checks: Check[];
    retriesLeft?: number;
};
export type Step = ArazzoStep & AdditionalStepProps;
export type Workflow = Omit<ArazzoWorkflow, 'steps'> & {
    steps: Step[];
    time?: number;
};
export type RunArgv = Omit<RespectOptions, 'files'> & {
    file: string;
    testDescription?: TestDescription;
    input?: string | string[];
    server?: string | string[];
    severity?: string | string[];
};
export type CommandArgs<T> = {
    argv: T;
    config: Config;
    version: string;
    collectSpecData?: CollectFn;
};
export interface RequestContext {
    body: any;
    header: Record<string, string | number | boolean>;
    path?: Record<string, string | number | boolean>;
    method?: string;
    url?: string;
    query?: Record<string, string | number | boolean>;
}
export type ParsedParameters = {
    queryParams: Record<string, string>;
    pathParams: Record<string, string | number>;
    headerParams: Record<string, string>;
};
export type AppOptions = {
    workflowPath: string;
    workflow?: string | string[];
    skip?: string | string[];
    verbose?: boolean;
    harOutput?: string;
    jsonOutput?: string;
    metadata?: Record<string, any>;
    input?: string | string[];
    server?: string | string[];
    severity?: string | string[];
    mutualTls?: Partial<TestContext['mtlsCerts']>;
};
export type RegexpSuccessCriteria = {
    condition: string;
    context: string;
    type: 'regex';
};
export type JsonPathVerison = 'draft-goessner-dispatch-jsonpath-00';
export type JsonPathSuccessCriterionObject = {
    type: 'jsonpath';
    version: JsonPathVerison;
};
export type JsonPathSuccessCriteria = {
    condition: string;
    context: string;
    type: 'jsonpath' | JsonPathSuccessCriterionObject;
};
export type Ref = {
    $ref: string;
};
export type PublicWorkflow = {
    outputs?: Record<string, any>;
    inputs?: Record<string, any>;
    steps: Record<string, PublicWorkflowStep>;
};
export type PublicStep = {
    outputs?: Record<string, any>;
};
export type PublicWorkflowStep = {
    outputs?: Record<string, any>;
    request?: RequestContext;
    response?: ResponseContext;
};
export interface InputSchema {
    type: string;
    properties?: {
        [key: string]: any;
    };
    format?: string;
}
export type StepInnerContext = {
    $response: ResponseContext | undefined;
    $request: RequestContext | undefined;
    $outputs: Record<string, any>;
};
export type WorkflowInnerContext = {
    $steps: Record<string, PublicWorkflowStep>;
    $outputs: Record<string, any>;
};
export type RuntimeExpressionContext = {
    $workflows: Record<string, PublicWorkflow>;
    $sourceDescriptions: Record<string, any>;
    $faker: Faker;
    $steps: Record<string, PublicStep>;
    $response?: Partial<ResponseContext>;
    $request?: Partial<RequestContext>;
    $outputs?: Record<string, any>;
    $inputs?: Record<string, any>;
    $components?: Record<string, any>;
    $url?: string;
    $method?: string;
    $statusCode?: number;
};
export type RunWorkflowInput = {
    workflowInput: Workflow | string;
    ctx: TestContext;
    fromStepId?: string;
    parentStepId?: string;
    skipLineSeparator?: boolean;
    invocationContext?: string;
};
export type ArrazoItemExecutionResult = StepExecutionResult | WorkflowExecutionResult;
export type ExecutionStatus = 'success' | 'error' | 'warn';
export interface StepExecutionResult {
    type: 'step';
    stepId: string;
    workflowId: string;
    totalTimeMs: number;
    retriesLeft?: number;
    status: ExecutionStatus;
    invocationContext?: string;
    request?: {
        method: string;
        url: string;
        headers: Record<string, string | number | boolean>;
        body: any;
    };
    response?: {
        statusCode: number;
        body: any;
        headers: Record<string, string | number | boolean>;
        time: number;
    };
    checks: (Check & {
        status: ExecutionStatus;
    })[];
}
export interface WorkflowExecutionResult {
    type: 'workflow';
    workflowId: string;
    stepId?: string;
    sourceDescriptionName?: string;
    startTime: number;
    endTime: number;
    totalTimeMs: number;
    executedSteps: (Step | WorkflowExecutionResult)[];
    invocationContext?: string;
    ctx: TestContext;
    globalTimeoutError: boolean;
}
export type WorkflowExecutionResultJson = Omit<WorkflowExecutionResult, 'executedSteps' | 'ctx'> & {
    executedSteps: (StepExecutionResult | WorkflowExecutionResultJson)[];
    status: ExecutionStatus;
    totalRequests: number;
    globalTimeoutError: boolean;
};
export type TestContext = RuntimeExpressionContext & {
    executedSteps: (Step | WorkflowExecutionResult)[];
    arazzo: string;
    info: InfoObject & Record<string, any>;
    sourceDescriptions?: SourceDescription[];
    workflows: Workflow[];
    options: AppOptions;
    testDescription: TestDescription;
    harLogs: any;
    components?: Record<string, any>;
    secretFields?: Set<string>;
    severity: Record<string, RuleSeverity>;
    mtlsCerts?: {
        clientCert?: string;
        clientKey?: string;
        caCert?: string;
    };
    apiClient: ApiFetcher;
};
export type TestDescription = Partial<Pick<TestContext & WorkflowInnerContext & StepInnerContext, 'workflows' | 'arazzo' | 'info' | 'sourceDescriptions' | '$outputs' | 'components'>>;
export type Check = {
    severity: RuleSeverity;
    passed: boolean;
    name: string;
    message?: string;
    condition?: string;
};
export interface ResultsOfTests {
    passed: number;
    failed: number;
    total: number;
    warnings: number;
    skipped: number;
}
export type CalculatedResults = {
    workflows: ResultsOfTests;
    steps: ResultsOfTests;
    checks: ResultsOfTests;
    totalRequests: number;
};
export type StepCallContext = {
    $response?: ResponseContext;
    $request?: RequestContext;
    $inputs?: Record<string, any>;
};
export type JsonLogs = {
    files: Record<string, {
        totalRequests: number;
        executedWorkflows: WorkflowExecutionResultJson[];
    }>;
    status: string;
    totalTime: number;
    globalTimeoutError: boolean;
};
export type DescriptionChecks = {
    checks: Check[];
    descriptionOperation: OperationDetails;
    $response: ResponseContext;
};
export {};
//# sourceMappingURL=types.d.ts.map