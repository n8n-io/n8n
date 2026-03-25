import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { DocumentType as __DocumentType } from "@smithy/types";
import { BedrockAgentRuntimeServiceException as __BaseException } from "./BedrockAgentRuntimeServiceException";
/**
 * <p>The request is denied because of missing access permissions. Check your permissions and retry your request.</p>
 * @public
 */
export declare class AccessDeniedException extends __BaseException {
    readonly name: "AccessDeniedException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<AccessDeniedException, __BaseException>);
}
/**
 * @public
 * @enum
 */
export declare const CustomControlMethod: {
    readonly RETURN_CONTROL: "RETURN_CONTROL";
};
/**
 * @public
 */
export type CustomControlMethod = (typeof CustomControlMethod)[keyof typeof CustomControlMethod];
/**
 * <p> Contains details about the Lambda function containing the business logic that is carried out upon invoking the action or the custom control method for handling the information elicited from the user. </p>
 * @public
 */
export type ActionGroupExecutor = ActionGroupExecutor.CustomControlMember | ActionGroupExecutor.LambdaMember | ActionGroupExecutor.$UnknownMember;
/**
 * @public
 */
export declare namespace ActionGroupExecutor {
    /**
     * <p> The Amazon Resource Name (ARN) of the Lambda function containing the business logic that is carried out upon invoking the action. </p>
     * @public
     */
    interface LambdaMember {
        lambda: string;
        customControl?: never;
        $unknown?: never;
    }
    /**
     * <p> To return the action group invocation results directly in the <code>InvokeInlineAgent</code> response, specify <code>RETURN_CONTROL</code>. </p>
     * @public
     */
    interface CustomControlMember {
        lambda?: never;
        customControl: CustomControlMethod;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        lambda?: never;
        customControl?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        lambda: (value: string) => T;
        customControl: (value: CustomControlMethod) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: ActionGroupExecutor, visitor: Visitor<T>) => T;
}
/**
 * @public
 * @enum
 */
export declare const ExecutionType: {
    readonly LAMBDA: "LAMBDA";
    readonly RETURN_CONTROL: "RETURN_CONTROL";
};
/**
 * @public
 */
export type ExecutionType = (typeof ExecutionType)[keyof typeof ExecutionType];
/**
 * <p>A parameter for the API request or function.</p>
 * @public
 */
export interface Parameter {
    /**
     * <p>The name of the parameter.</p>
     * @public
     */
    name?: string | undefined;
    /**
     * <p>The type of the parameter.</p>
     * @public
     */
    type?: string | undefined;
    /**
     * <p>The value of the parameter.</p>
     * @public
     */
    value?: string | undefined;
}
/**
 * <p>The parameters in the API request body.</p>
 * @public
 */
export interface RequestBody {
    /**
     * <p>The content in the request body.</p>
     * @public
     */
    content?: Record<string, Parameter[]> | undefined;
}
/**
 * <p>Contains information about the action group being invoked. For more information about the possible structures, see the InvocationInput tab in <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/trace-orchestration.html">OrchestrationTrace</a> in the <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-service.html">Amazon Bedrock User Guide</a>.</p>
 * @public
 */
export interface ActionGroupInvocationInput {
    /**
     * <p>The name of the action group.</p>
     * @public
     */
    actionGroupName?: string | undefined;
    /**
     * <p>The API method being used, based off the action group.</p>
     * @public
     */
    verb?: string | undefined;
    /**
     * <p>The path to the API to call, based off the action group.</p>
     * @public
     */
    apiPath?: string | undefined;
    /**
     * <p>The parameters in the Lambda input event.</p>
     * @public
     */
    parameters?: Parameter[] | undefined;
    /**
     * <p>The parameters in the request body for the Lambda input event.</p>
     * @public
     */
    requestBody?: RequestBody | undefined;
    /**
     * <p>The function in the action group to call.</p>
     * @public
     */
    function?: string | undefined;
    /**
     * <p>How fulfillment of the action is handled. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/action-handle.html">Handling fulfillment of the action</a>.</p>
     * @public
     */
    executionType?: ExecutionType | undefined;
    /**
     * <p>The unique identifier of the invocation. Only returned if the <code>executionType</code> is <code>RETURN_CONTROL</code>.</p>
     * @public
     */
    invocationId?: string | undefined;
}
/**
 * <p>Contains the JSON-formatted string returned by the API invoked by the action group.</p>
 * @public
 */
export interface ActionGroupInvocationOutput {
    /**
     * <p>The JSON-formatted string returned by the API invoked by the action group.</p>
     * @public
     */
    text?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ActionGroupSignature: {
    readonly AMAZON_CODEINTERPRETER: "AMAZON.CodeInterpreter";
    readonly AMAZON_USERINPUT: "AMAZON.UserInput";
    readonly ANTHROPIC_BASH: "ANTHROPIC.Bash";
    readonly ANTHROPIC_COMPUTER: "ANTHROPIC.Computer";
    readonly ANTHROPIC_TEXTEDITOR: "ANTHROPIC.TextEditor";
};
/**
 * @public
 */
export type ActionGroupSignature = (typeof ActionGroupSignature)[keyof typeof ActionGroupSignature];
/**
 * @public
 * @enum
 */
export declare const ActionInvocationType: {
    readonly RESULT: "RESULT";
    readonly USER_CONFIRMATION: "USER_CONFIRMATION";
    readonly USER_CONFIRMATION_AND_RESULT: "USER_CONFIRMATION_AND_RESULT";
};
/**
 * @public
 */
export type ActionInvocationType = (typeof ActionInvocationType)[keyof typeof ActionInvocationType];
/**
 * <p> The identifier information for an Amazon S3 bucket. </p>
 * @public
 */
export interface S3Identifier {
    /**
     * <p> The name of the S3 bucket. </p>
     * @public
     */
    s3BucketName?: string | undefined;
    /**
     * <p> The S3 object key for the S3 resource. </p>
     * @public
     */
    s3ObjectKey?: string | undefined;
}
/**
 * <p> Contains details about the OpenAPI schema for the action group. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-api-schema.html">Action group OpenAPI schemas</a>. You can either include the schema directly in the payload field or you can upload it to an S3 bucket and specify the S3 bucket location in the s3 field. </p>
 * @public
 */
export type APISchema = APISchema.PayloadMember | APISchema.S3Member | APISchema.$UnknownMember;
/**
 * @public
 */
export declare namespace APISchema {
    /**
     * <p> Contains details about the S3 object containing the OpenAPI schema for the action group. </p>
     * @public
     */
    interface S3Member {
        s3: S3Identifier;
        payload?: never;
        $unknown?: never;
    }
    /**
     * <p> The JSON or YAML-formatted payload defining the OpenAPI schema for the action group. </p>
     * @public
     */
    interface PayloadMember {
        s3?: never;
        payload: string;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        s3?: never;
        payload?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        s3: (value: S3Identifier) => T;
        payload: (value: string) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: APISchema, visitor: Visitor<T>) => T;
}
/**
 * @public
 * @enum
 */
export declare const ParameterType: {
    readonly ARRAY: "array";
    readonly BOOLEAN: "boolean";
    readonly INTEGER: "integer";
    readonly NUMBER: "number";
    readonly STRING: "string";
};
/**
 * @public
 */
export type ParameterType = (typeof ParameterType)[keyof typeof ParameterType];
/**
 * <p> Contains details about a parameter in a function for an action group. </p>
 * @public
 */
export interface ParameterDetail {
    /**
     * <p> A description of the parameter. Helps the foundation model determine how to elicit the parameters from the user. </p>
     * @public
     */
    description?: string | undefined;
    /**
     * <p> The data type of the parameter. </p>
     * @public
     */
    type: ParameterType | undefined;
    /**
     * <p> Whether the parameter is required for the agent to complete the function for action group invocation. </p>
     * @public
     */
    required?: boolean | undefined;
}
/**
 * @public
 * @enum
 */
export declare const RequireConfirmation: {
    readonly DISABLED: "DISABLED";
    readonly ENABLED: "ENABLED";
};
/**
 * @public
 */
export type RequireConfirmation = (typeof RequireConfirmation)[keyof typeof RequireConfirmation];
/**
 * <p> Defines parameters that the agent needs to invoke from the user to complete the function. Corresponds to an action in an action group. </p>
 * @public
 */
export interface FunctionDefinition {
    /**
     * <p> A name for the function. </p>
     * @public
     */
    name: string | undefined;
    /**
     * <p> A description of the function and its purpose. </p>
     * @public
     */
    description?: string | undefined;
    /**
     * <p> The parameters that the agent elicits from the user to fulfill the function. </p>
     * @public
     */
    parameters?: Record<string, ParameterDetail> | undefined;
    /**
     * <p> Contains information if user confirmation is required to invoke the function. </p>
     * @public
     */
    requireConfirmation?: RequireConfirmation | undefined;
}
/**
 * <p> Contains details about the function schema for the action group or the JSON or YAML-formatted payload defining the schema. </p>
 * @public
 */
export type FunctionSchema = FunctionSchema.FunctionsMember | FunctionSchema.$UnknownMember;
/**
 * @public
 */
export declare namespace FunctionSchema {
    /**
     * <p> A list of functions that each define an action in the action group. </p>
     * @public
     */
    interface FunctionsMember {
        functions: FunctionDefinition[];
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        functions?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        functions: (value: FunctionDefinition[]) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: FunctionSchema, visitor: Visitor<T>) => T;
}
/**
 * <p> Contains details of the inline agent's action group. </p>
 * @public
 */
export interface AgentActionGroup {
    /**
     * <p> The name of the action group. </p>
     * @public
     */
    actionGroupName: string | undefined;
    /**
     * <p> A description of the action group. </p>
     * @public
     */
    description?: string | undefined;
    /**
     * <p>Specify a built-in or computer use action for this action group. If you specify a value, you must leave the <code>description</code>, <code>apiSchema</code>, and <code>actionGroupExecutor</code> fields empty for this action group. </p> <ul> <li> <p>To allow your agent to request the user for additional information when trying to complete a task, set this field to <code>AMAZON.UserInput</code>. </p> </li> <li> <p>To allow your agent to generate, run, and troubleshoot code when trying to complete a task, set this field to <code>AMAZON.CodeInterpreter</code>.</p> </li> <li> <p>To allow your agent to use an Anthropic computer use tool, specify one of the following values. </p> <important> <p> Computer use is a new Anthropic Claude model capability (in beta) available with Anthropic Claude 3.7 Sonnet and Claude 3.5 Sonnet v2 only. When operating computer use functionality, we recommend taking additional security precautions, such as executing computer actions in virtual environments with restricted data access and limited internet connectivity. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agent-computer-use.html">Configure an Amazon Bedrock Agent to complete tasks with computer use tools</a>. </p> </important> <ul> <li> <p> <code>ANTHROPIC.Computer</code> - Gives the agent permission to use the mouse and keyboard and take screenshots.</p> </li> <li> <p> <code>ANTHROPIC.TextEditor</code> - Gives the agent permission to view, create and edit files.</p> </li> <li> <p> <code>ANTHROPIC.Bash</code> - Gives the agent permission to run commands in a bash shell.</p> </li> </ul> </li> </ul>
     * @public
     */
    parentActionGroupSignature?: ActionGroupSignature | undefined;
    /**
     * <p> The Amazon Resource Name (ARN) of the Lambda function containing the business logic that is carried out upon invoking the action or the custom control method for handling the information elicited from the user. </p>
     * @public
     */
    actionGroupExecutor?: ActionGroupExecutor | undefined;
    /**
     * <p> Contains either details about the S3 object containing the OpenAPI schema for the action group or the JSON or YAML-formatted payload defining the schema. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-api-schema.html">Action group OpenAPI schemas</a>. </p>
     * @public
     */
    apiSchema?: APISchema | undefined;
    /**
     * <p> Contains details about the function schema for the action group or the JSON or YAML-formatted payload defining the schema. </p>
     * @public
     */
    functionSchema?: FunctionSchema | undefined;
    /**
     * <p> The configuration settings for a computer use action. </p> <important> <p>Computer use is a new Anthropic Claude model capability (in beta) available with Claude 3.7 Sonnet and Claude 3.5 Sonnet v2 only. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agent-computer-use.html">Configure an Amazon Bedrock Agent to complete tasks with computer use tools</a>.</p> </important>
     * @public
     */
    parentActionGroupSignatureParams?: Record<string, string> | undefined;
}
/**
 * @public
 * @enum
 */
export declare const AgentCollaboration: {
    readonly DISABLED: "DISABLED";
    readonly SUPERVISOR: "SUPERVISOR";
    readonly SUPERVISOR_ROUTER: "SUPERVISOR_ROUTER";
};
/**
 * @public
 */
export type AgentCollaboration = (typeof AgentCollaboration)[keyof typeof AgentCollaboration];
/**
 * @public
 * @enum
 */
export declare const ConfirmationState: {
    readonly CONFIRM: "CONFIRM";
    readonly DENY: "DENY";
};
/**
 * @public
 */
export type ConfirmationState = (typeof ConfirmationState)[keyof typeof ConfirmationState];
/**
 * @public
 * @enum
 */
export declare const ImageInputFormat: {
    readonly GIF: "gif";
    readonly JPEG: "jpeg";
    readonly PNG: "png";
    readonly WEBP: "webp";
};
/**
 * @public
 */
export type ImageInputFormat = (typeof ImageInputFormat)[keyof typeof ImageInputFormat];
/**
 * <p>Details about the source of an input image in the result from a function in the action group invocation.</p>
 * @public
 */
export type ImageInputSource = ImageInputSource.BytesMember | ImageInputSource.$UnknownMember;
/**
 * @public
 */
export declare namespace ImageInputSource {
    /**
     * <p> The raw image bytes for the image. If you use an Amazon Web Services SDK, you don't need to encode the image bytes in base64.</p>
     * @public
     */
    interface BytesMember {
        bytes: Uint8Array;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        bytes?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        bytes: (value: Uint8Array) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: ImageInputSource, visitor: Visitor<T>) => T;
}
/**
 * <p>Details about an image in the result from a function in the action group invocation. You can specify images only when the function is a computer use action. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agent-computer-use.html">Configure an Amazon Bedrock Agent to complete tasks with computer use tools</a>.</p>
 * @public
 */
export interface ImageInput {
    /**
     * <p>The type of image in the result.</p>
     * @public
     */
    format: ImageInputFormat | undefined;
    /**
     * <p>The source of the image in the result.</p>
     * @public
     */
    source: ImageInputSource | undefined;
}
/**
 * <p>Contains the body of the API response.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p>In the <code>returnControlInvocationResults</code> field of the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html#API_agent-runtime_InvokeAgent_RequestSyntax">InvokeAgent request</a> </p> </li> </ul>
 * @public
 */
export interface ContentBody {
    /**
     * <p>The body of the API response.</p>
     * @public
     */
    body?: string | undefined;
    /**
     * <p>Lists details, including format and source, for the image in the response from the function call. You can specify only one image and the function in the <code>returnControlInvocationResults</code> must be a computer use action. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agent-computer-use.html">Configure an Amazon Bedrock Agent to complete tasks with computer use tools</a>. </p>
     * @public
     */
    images?: ImageInput[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ResponseState: {
    readonly FAILURE: "FAILURE";
    readonly REPROMPT: "REPROMPT";
};
/**
 * @public
 */
export type ResponseState = (typeof ResponseState)[keyof typeof ResponseState];
/**
 * <p>Contains information about the API operation that was called from the action group and the response body that was returned.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p>In the <code>returnControlInvocationResults</code> of the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html#API_agent-runtime_InvokeAgent_RequestSyntax">InvokeAgent request</a> </p> </li> </ul>
 * @public
 */
export interface ApiResult {
    /**
     * <p>The action group that the API operation belongs to.</p>
     * @public
     */
    actionGroup: string | undefined;
    /**
     * <p>The HTTP method for the API operation.</p>
     * @public
     */
    httpMethod?: string | undefined;
    /**
     * <p>The path to the API operation.</p>
     * @public
     */
    apiPath?: string | undefined;
    /**
     * <p>Controls the API operations or functions to invoke based on the user confirmation.</p>
     * @public
     */
    confirmationState?: ConfirmationState | undefined;
    /**
     * <p>Controls the final response state returned to end user when API/Function execution failed. When this state is FAILURE, the request would fail with dependency failure exception. When this state is REPROMPT, the API/function response will be sent to model for re-prompt</p>
     * @public
     */
    responseState?: ResponseState | undefined;
    /**
     * <p>http status code from API execution response (for example: 200, 400, 500).</p>
     * @public
     */
    httpStatusCode?: number | undefined;
    /**
     * <p>The response body from the API operation. The key of the object is the content type (currently, only <code>TEXT</code> is supported). The response may be returned directly or from the Lambda function.</p>
     * @public
     */
    responseBody?: Record<string, ContentBody> | undefined;
    /**
     * <p>The agent's ID.</p>
     * @public
     */
    agentId?: string | undefined;
}
/**
 * <p>Contains information about the function that was called from the action group and the response that was returned.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p>In the <code>returnControlInvocationResults</code> of the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html#API_agent-runtime_InvokeAgent_RequestSyntax">InvokeAgent request</a> </p> </li> </ul>
 * @public
 */
export interface FunctionResult {
    /**
     * <p>The action group that the function belongs to.</p>
     * @public
     */
    actionGroup: string | undefined;
    /**
     * <p>Contains the user confirmation information about the function that was called.</p>
     * @public
     */
    confirmationState?: ConfirmationState | undefined;
    /**
     * <p>The name of the function that was called.</p>
     * @public
     */
    function?: string | undefined;
    /**
     * <p>The response from the function call using the parameters. The response might be returned directly or from the Lambda function. Specify <code>TEXT</code> or <code>IMAGES</code>. The key of the object is the content type. You can only specify one type. If you specify <code>IMAGES</code>, you can specify only one image. You can specify images only when the function in the <code>returnControlInvocationResults</code> is a computer use action. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agent-computer-use.html">Configure an Amazon Bedrock Agent to complete tasks with computer use tools</a>.</p>
     * @public
     */
    responseBody?: Record<string, ContentBody> | undefined;
    /**
     * <p>Controls the final response state returned to end user when API/Function execution failed. When this state is FAILURE, the request would fail with dependency failure exception. When this state is REPROMPT, the API/function response will be sent to model for re-prompt</p>
     * @public
     */
    responseState?: ResponseState | undefined;
    /**
     * <p>The agent's ID.</p>
     * @public
     */
    agentId?: string | undefined;
}
/**
 * <p>A result from the invocation of an action. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-returncontrol.html">Return control to the agent developer</a> and <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-session-state.html">Control session context</a>.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html#API_agent-runtime_InvokeAgent_RequestSyntax">InvokeAgent request</a> </p> </li> </ul>
 * @public
 */
export type InvocationResultMember = InvocationResultMember.ApiResultMember | InvocationResultMember.FunctionResultMember | InvocationResultMember.$UnknownMember;
/**
 * @public
 */
export declare namespace InvocationResultMember {
    /**
     * <p>The result from the API response from the action group invocation.</p>
     * @public
     */
    interface ApiResultMember {
        apiResult: ApiResult;
        functionResult?: never;
        $unknown?: never;
    }
    /**
     * <p>The result from the function from the action group invocation.</p>
     * @public
     */
    interface FunctionResultMember {
        apiResult?: never;
        functionResult: FunctionResult;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        apiResult?: never;
        functionResult?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        apiResult: (value: ApiResult) => T;
        functionResult: (value: FunctionResult) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: InvocationResultMember, visitor: Visitor<T>) => T;
}
/**
 * <p>An action invocation result.</p>
 * @public
 */
export interface ReturnControlResults {
    /**
     * <p>The action's invocation ID.</p>
     * @public
     */
    invocationId?: string | undefined;
    /**
     * <p>The action invocation result.</p>
     * @public
     */
    returnControlInvocationResults?: InvocationResultMember[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const PayloadType: {
    readonly RETURN_CONTROL: "RETURN_CONTROL";
    readonly TEXT: "TEXT";
};
/**
 * @public
 */
export type PayloadType = (typeof PayloadType)[keyof typeof PayloadType];
/**
 * <p>Input for an agent collaborator. The input can be text or an action invocation result.</p>
 * @public
 */
export interface AgentCollaboratorInputPayload {
    /**
     * <p>The input type.</p>
     * @public
     */
    type?: PayloadType | undefined;
    /**
     * <p>Input text.</p>
     * @public
     */
    text?: string | undefined;
    /**
     * <p>An action invocation result.</p>
     * @public
     */
    returnControlResults?: ReturnControlResults | undefined;
}
/**
 * <p>An agent collaborator invocation input.</p>
 * @public
 */
export interface AgentCollaboratorInvocationInput {
    /**
     * <p>The collaborator's name.</p>
     * @public
     */
    agentCollaboratorName?: string | undefined;
    /**
     * <p>The collaborator's alias ARN.</p>
     * @public
     */
    agentCollaboratorAliasArn?: string | undefined;
    /**
     * <p>Text or action invocation result input for the collaborator.</p>
     * @public
     */
    input?: AgentCollaboratorInputPayload | undefined;
}
/**
 * <p>Information about a parameter to provide to the API request.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html#API_agent-runtime_InvokeAgent_ResponseSyntax">InvokeAgent response</a> </p> </li> </ul>
 * @public
 */
export interface ApiParameter {
    /**
     * <p>The name of the parameter.</p>
     * @public
     */
    name?: string | undefined;
    /**
     * <p>The data type for the parameter.</p>
     * @public
     */
    type?: string | undefined;
    /**
     * <p>The value of the parameter.</p>
     * @public
     */
    value?: string | undefined;
}
/**
 * <p>Contains the parameters in the request body.</p>
 * @public
 */
export interface PropertyParameters {
    /**
     * <p>A list of parameters in the request body.</p>
     * @public
     */
    properties?: Parameter[] | undefined;
}
/**
 * <p>The request body to provide for the API request, as the agent elicited from the user.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html#API_agent-runtime_InvokeAgent_ResponseSyntax">InvokeAgent response</a> </p> </li> </ul>
 * @public
 */
export interface ApiRequestBody {
    /**
     * <p>The content of the request body. The key of the object in this field is a media type defining the format of the request body.</p>
     * @public
     */
    content?: Record<string, PropertyParameters> | undefined;
}
/**
 * <p>Contains information about the API operation that the agent predicts should be called.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p>In the <code>returnControl</code> field of the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html#API_agent-runtime_InvokeAgent_ResponseSyntax">InvokeAgent response</a> </p> </li> </ul>
 * @public
 */
export interface ApiInvocationInput {
    /**
     * <p>The action group that the API operation belongs to.</p>
     * @public
     */
    actionGroup: string | undefined;
    /**
     * <p>The HTTP method of the API operation.</p>
     * @public
     */
    httpMethod?: string | undefined;
    /**
     * <p>The path to the API operation.</p>
     * @public
     */
    apiPath?: string | undefined;
    /**
     * <p>The parameters to provide for the API request, as the agent elicited from the user.</p>
     * @public
     */
    parameters?: ApiParameter[] | undefined;
    /**
     * <p>The request body to provide for the API request, as the agent elicited from the user.</p>
     * @public
     */
    requestBody?: ApiRequestBody | undefined;
    /**
     * <p>Contains information about the API operation to invoke.</p>
     * @public
     */
    actionInvocationType?: ActionInvocationType | undefined;
    /**
     * <p>The agent's ID.</p>
     * @public
     */
    agentId?: string | undefined;
    /**
     * <p>The agent collaborator's name.</p>
     * @public
     */
    collaboratorName?: string | undefined;
}
/**
 * <p>Contains information about a parameter of the function.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p>In the <code>returnControl</code> field of the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html#API_agent-runtime_InvokeAgent_ResponseSyntax">InvokeAgent response</a> </p> </li> </ul>
 * @public
 */
export interface FunctionParameter {
    /**
     * <p>The name of the parameter.</p>
     * @public
     */
    name?: string | undefined;
    /**
     * <p>The data type of the parameter.</p>
     * @public
     */
    type?: string | undefined;
    /**
     * <p>The value of the parameter.</p>
     * @public
     */
    value?: string | undefined;
}
/**
 * <p>Contains information about the function that the agent predicts should be called.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p>In the <code>returnControl</code> field of the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html#API_agent-runtime_InvokeAgent_ResponseSyntax">InvokeAgent response</a> </p> </li> </ul>
 * @public
 */
export interface FunctionInvocationInput {
    /**
     * <p>The action group that the function belongs to.</p>
     * @public
     */
    actionGroup: string | undefined;
    /**
     * <p>A list of parameters of the function.</p>
     * @public
     */
    parameters?: FunctionParameter[] | undefined;
    /**
     * <p>The name of the function.</p>
     * @public
     */
    function?: string | undefined;
    /**
     * <p>Contains information about the function to invoke,</p>
     * @public
     */
    actionInvocationType?: ActionInvocationType | undefined;
    /**
     * <p>The agent's ID.</p>
     * @public
     */
    agentId?: string | undefined;
    /**
     * <p>The collaborator's name.</p>
     * @public
     */
    collaboratorName?: string | undefined;
}
/**
 * <p>Contains details about the API operation or function that the agent predicts should be called. </p> <p>This data type is used in the following API operations:</p> <ul> <li> <p>In the <code>returnControl</code> field of the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html#API_agent-runtime_InvokeAgent_ResponseSyntax">InvokeAgent response</a> </p> </li> </ul>
 * @public
 */
export type InvocationInputMember = InvocationInputMember.ApiInvocationInputMember | InvocationInputMember.FunctionInvocationInputMember | InvocationInputMember.$UnknownMember;
/**
 * @public
 */
export declare namespace InvocationInputMember {
    /**
     * <p>Contains information about the API operation that the agent predicts should be called.</p>
     * @public
     */
    interface ApiInvocationInputMember {
        apiInvocationInput: ApiInvocationInput;
        functionInvocationInput?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains information about the function that the agent predicts should be called.</p>
     * @public
     */
    interface FunctionInvocationInputMember {
        apiInvocationInput?: never;
        functionInvocationInput: FunctionInvocationInput;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        apiInvocationInput?: never;
        functionInvocationInput?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        apiInvocationInput: (value: ApiInvocationInput) => T;
        functionInvocationInput: (value: FunctionInvocationInput) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: InvocationInputMember, visitor: Visitor<T>) => T;
}
/**
 * <p>Contains information to return from the action group that the agent has predicted to invoke.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html#API_agent-runtime_InvokeAgent_ResponseSyntax">InvokeAgent response</a> </p> </li> </ul>
 * @public
 */
export interface ReturnControlPayload {
    /**
     * <p>A list of objects that contain information about the parameters and inputs that need to be sent into the API operation or function, based on what the agent determines from its session with the user.</p>
     * @public
     */
    invocationInputs?: InvocationInputMember[] | undefined;
    /**
     * <p>The identifier of the action group invocation.</p>
     * @public
     */
    invocationId?: string | undefined;
}
/**
 * <p>Output from an agent collaborator. The output can be text or an action invocation result.</p>
 * @public
 */
export interface AgentCollaboratorOutputPayload {
    /**
     * <p>The type of output.</p>
     * @public
     */
    type?: PayloadType | undefined;
    /**
     * <p>Text output.</p>
     * @public
     */
    text?: string | undefined;
    /**
     * <p>An action invocation result.</p>
     * @public
     */
    returnControlPayload?: ReturnControlPayload | undefined;
}
/**
 * <p>Output from an agent collaborator.</p>
 * @public
 */
export interface AgentCollaboratorInvocationOutput {
    /**
     * <p>The output's agent collaborator name.</p>
     * @public
     */
    agentCollaboratorName?: string | undefined;
    /**
     * <p>The output's agent collaborator alias ARN.</p>
     * @public
     */
    agentCollaboratorAliasArn?: string | undefined;
    /**
     * <p>The output's output.</p>
     * @public
     */
    output?: AgentCollaboratorOutputPayload | undefined;
}
/**
 * <p>There was an issue with a dependency due to a server issue. Retry your request.</p>
 * @public
 */
export declare class BadGatewayException extends __BaseException {
    readonly name: "BadGatewayException";
    readonly $fault: "server";
    /**
     * <p>The name of the dependency that caused the issue, such as Amazon Bedrock, Lambda, or STS.</p>
     * @public
     */
    resourceName?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<BadGatewayException, __BaseException>);
}
/**
 * <p>There was a conflict performing an operation. Resolve the conflict and retry your request.</p>
 * @public
 */
export declare class ConflictException extends __BaseException {
    readonly name: "ConflictException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ConflictException, __BaseException>);
}
/**
 * <p>There was an issue with a dependency. Check the resource configurations and retry the request.</p>
 * @public
 */
export declare class DependencyFailedException extends __BaseException {
    readonly name: "DependencyFailedException";
    readonly $fault: "client";
    /**
     * <p>The name of the dependency that caused the issue, such as Amazon Bedrock, Lambda, or STS.</p>
     * @public
     */
    resourceName?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<DependencyFailedException, __BaseException>);
}
/**
 * <p>An internal server error occurred. Retry your request.</p>
 * @public
 */
export declare class InternalServerException extends __BaseException {
    readonly name: "InternalServerException";
    readonly $fault: "server";
    /**
     * <p>The reason for the exception. If the reason is <code>BEDROCK_MODEL_INVOCATION_SERVICE_UNAVAILABLE</code>, the model invocation service is unavailable. Retry your request.</p>
     * @public
     */
    reason?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InternalServerException, __BaseException>);
}
/**
 * <p>Contains information about an input into the flow.</p>
 * @public
 */
export type FlowInputContent = FlowInputContent.DocumentMember | FlowInputContent.$UnknownMember;
/**
 * @public
 */
export declare namespace FlowInputContent {
    /**
     * <p>The input to send to the prompt flow input node.</p>
     * @public
     */
    interface DocumentMember {
        document: __DocumentType;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        document?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        document: (value: __DocumentType) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: FlowInputContent, visitor: Visitor<T>) => T;
}
/**
 * <p>Contains information about an input into the prompt flow and where to send it.</p>
 * @public
 */
export interface FlowInput {
    /**
     * <p>The name of the flow input node that begins the prompt flow.</p>
     * @public
     */
    nodeName: string | undefined;
    /**
     * <p>The name of the output from the flow input node that begins the prompt flow.</p>
     * @public
     */
    nodeOutputName?: string | undefined;
    /**
     * <p>Contains information about an input into the prompt flow.</p>
     * @public
     */
    content: FlowInputContent | undefined;
    /**
     * <p>The name of the input from the flow input node.</p>
     * @public
     */
    nodeInputName?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const PerformanceConfigLatency: {
    readonly OPTIMIZED: "optimized";
    readonly STANDARD: "standard";
};
/**
 * @public
 */
export type PerformanceConfigLatency = (typeof PerformanceConfigLatency)[keyof typeof PerformanceConfigLatency];
/**
 * <p>Performance settings for a model.</p>
 * @public
 */
export interface PerformanceConfiguration {
    /**
     * <p>To use a latency-optimized version of the model, set to <code>optimized</code>.</p>
     * @public
     */
    latency?: PerformanceConfigLatency | undefined;
}
/**
 * <p>The performance configuration for a model called with <a>InvokeFlow</a>.</p>
 * @public
 */
export interface ModelPerformanceConfiguration {
    /**
     * <p>The latency configuration for the model.</p>
     * @public
     */
    performanceConfig?: PerformanceConfiguration | undefined;
}
/**
 * @public
 */
export interface InvokeFlowRequest {
    /**
     * <p>The unique identifier of the flow.</p>
     * @public
     */
    flowIdentifier: string | undefined;
    /**
     * <p>The unique identifier of the flow alias.</p>
     * @public
     */
    flowAliasIdentifier: string | undefined;
    /**
     * <p>A list of objects, each containing information about an input into the flow.</p>
     * @public
     */
    inputs: FlowInput[] | undefined;
    /**
     * <p>Specifies whether to return the trace for the flow or not. Traces track inputs and outputs for nodes in the flow. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/flows-trace.html">Track each step in your prompt flow by viewing its trace in Amazon Bedrock</a>.</p>
     * @public
     */
    enableTrace?: boolean | undefined;
    /**
     * <p>Model performance settings for the request.</p>
     * @public
     */
    modelPerformanceConfiguration?: ModelPerformanceConfiguration | undefined;
    /**
     * <p>The unique identifier for the current flow execution. If you don't provide a value, Amazon Bedrock creates the identifier for you. </p>
     * @public
     */
    executionId?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const FlowCompletionReason: {
    readonly INPUT_REQUIRED: "INPUT_REQUIRED";
    readonly SUCCESS: "SUCCESS";
};
/**
 * @public
 */
export type FlowCompletionReason = (typeof FlowCompletionReason)[keyof typeof FlowCompletionReason];
/**
 * <p>Contains information about why a flow completed.</p>
 * @public
 */
export interface FlowCompletionEvent {
    /**
     * <p>The reason that the flow completed.</p>
     * @public
     */
    completionReason: FlowCompletionReason | undefined;
}
/**
 * <p>The content structure containing input information for multi-turn flow interactions.</p>
 * @public
 */
export type FlowMultiTurnInputContent = FlowMultiTurnInputContent.DocumentMember | FlowMultiTurnInputContent.$UnknownMember;
/**
 * @public
 */
export declare namespace FlowMultiTurnInputContent {
    /**
     * <p>The requested additional input to send back to the multi-turn flow node.</p>
     * @public
     */
    interface DocumentMember {
        document: __DocumentType;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        document?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        document: (value: __DocumentType) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: FlowMultiTurnInputContent, visitor: Visitor<T>) => T;
}
/**
 * @public
 * @enum
 */
export declare const NodeType: {
    readonly CONDITION_NODE: "ConditionNode";
    readonly FLOW_INPUT_NODE: "FlowInputNode";
    readonly FLOW_OUTPUT_NODE: "FlowOutputNode";
    readonly KNOWLEDGE_BASE_NODE: "KnowledgeBaseNode";
    readonly LAMBDA_FUNCTION_NODE: "LambdaFunctionNode";
    readonly LEX_NODE: "LexNode";
    readonly PROMPT_NODE: "PromptNode";
};
/**
 * @public
 */
export type NodeType = (typeof NodeType)[keyof typeof NodeType];
/**
 * <p>Response object from the flow multi-turn node requesting additional information.</p>
 * @public
 */
export interface FlowMultiTurnInputRequestEvent {
    /**
     * <p>The name of the node in the flow that is requesting the input.</p>
     * @public
     */
    nodeName: string | undefined;
    /**
     * <p>The type of the node in the flow that is requesting the input.</p>
     * @public
     */
    nodeType: NodeType | undefined;
    /**
     * <p>The content payload containing the input request details for the multi-turn interaction.</p>
     * @public
     */
    content: FlowMultiTurnInputContent | undefined;
}
/**
 * <p>Contains information about the content in an output from prompt flow invocation.</p>
 * @public
 */
export type FlowOutputContent = FlowOutputContent.DocumentMember | FlowOutputContent.$UnknownMember;
/**
 * @public
 */
export declare namespace FlowOutputContent {
    /**
     * <p>The content in the output.</p>
     * @public
     */
    interface DocumentMember {
        document: __DocumentType;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        document?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        document: (value: __DocumentType) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: FlowOutputContent, visitor: Visitor<T>) => T;
}
/**
 * <p>Contains information about an output from prompt flow invoction.</p>
 * @public
 */
export interface FlowOutputEvent {
    /**
     * <p>The name of the flow output node that the output is from.</p>
     * @public
     */
    nodeName: string | undefined;
    /**
     * <p>The type of the node that the output is from.</p>
     * @public
     */
    nodeType: NodeType | undefined;
    /**
     * <p>The content in the output.</p>
     * @public
     */
    content: FlowOutputContent | undefined;
}
/**
 * <p>Contains information about a condition that was satisfied. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/flows-trace.html">Track each step in your prompt flow by viewing its trace in Amazon Bedrock</a>.</p>
 * @public
 */
export interface FlowTraceCondition {
    /**
     * <p>The name of the condition.</p>
     * @public
     */
    conditionName: string | undefined;
}
/**
 * <p>Contains information about an output from a condition node. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/flows-trace.html">Track each step in your prompt flow by viewing its trace in Amazon Bedrock</a>.</p>
 * @public
 */
export interface FlowTraceConditionNodeResultEvent {
    /**
     * <p>The name of the condition node.</p>
     * @public
     */
    nodeName: string | undefined;
    /**
     * <p>The date and time that the trace was returned.</p>
     * @public
     */
    timestamp: Date | undefined;
    /**
     * <p>An array of objects containing information about the conditions that were satisfied.</p>
     * @public
     */
    satisfiedConditions: FlowTraceCondition[] | undefined;
}
/**
 * <p>Contains information about an action (operation) called by a node in an Amazon Bedrock flow. The service generates action events for calls made by prompt nodes, agent nodes, and Amazon Web Services Lambda nodes. </p>
 * @public
 */
export interface FlowTraceNodeActionEvent {
    /**
     * <p>The name of the node that called the operation.</p>
     * @public
     */
    nodeName: string | undefined;
    /**
     * <p>The date and time that the operation was called.</p>
     * @public
     */
    timestamp: Date | undefined;
    /**
     * <p>The ID of the request that the node made to the operation.</p>
     * @public
     */
    requestId: string | undefined;
    /**
     * <p>The name of the service that the node called.</p>
     * @public
     */
    serviceName: string | undefined;
    /**
     * <p>The name of the operation that the node called.</p>
     * @public
     */
    operationName: string | undefined;
}
/**
 * <p>Contains the content of the node input. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/flows-trace.html">Track each step in your prompt flow by viewing its trace in Amazon Bedrock</a>.</p>
 * @public
 */
export type FlowTraceNodeInputContent = FlowTraceNodeInputContent.DocumentMember | FlowTraceNodeInputContent.$UnknownMember;
/**
 * @public
 */
export declare namespace FlowTraceNodeInputContent {
    /**
     * <p>The content of the node input.</p>
     * @public
     */
    interface DocumentMember {
        document: __DocumentType;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        document?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        document: (value: __DocumentType) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: FlowTraceNodeInputContent, visitor: Visitor<T>) => T;
}
/**
 * <p>Contains information about a field in the input into a node. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/flows-trace.html">Track each step in your prompt flow by viewing its trace in Amazon Bedrock</a>.</p>
 * @public
 */
export interface FlowTraceNodeInputField {
    /**
     * <p>The name of the node input.</p>
     * @public
     */
    nodeInputName: string | undefined;
    /**
     * <p>The content of the node input.</p>
     * @public
     */
    content: FlowTraceNodeInputContent | undefined;
}
/**
 * <p>Contains information about the input into a node. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/flows-trace.html">Track each step in your prompt flow by viewing its trace in Amazon Bedrock</a>.</p>
 * @public
 */
export interface FlowTraceNodeInputEvent {
    /**
     * <p>The name of the node that received the input.</p>
     * @public
     */
    nodeName: string | undefined;
    /**
     * <p>The date and time that the trace was returned.</p>
     * @public
     */
    timestamp: Date | undefined;
    /**
     * <p>An array of objects containing information about each field in the input.</p>
     * @public
     */
    fields: FlowTraceNodeInputField[] | undefined;
}
/**
 * <p>Contains the content of the node output. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/flows-trace.html">Track each step in your prompt flow by viewing its trace in Amazon Bedrock</a>.</p>
 * @public
 */
export type FlowTraceNodeOutputContent = FlowTraceNodeOutputContent.DocumentMember | FlowTraceNodeOutputContent.$UnknownMember;
/**
 * @public
 */
export declare namespace FlowTraceNodeOutputContent {
    /**
     * <p>The content of the node output.</p>
     * @public
     */
    interface DocumentMember {
        document: __DocumentType;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        document?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        document: (value: __DocumentType) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: FlowTraceNodeOutputContent, visitor: Visitor<T>) => T;
}
/**
 * <p>Contains information about a field in the output from a node. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/flows-trace.html">Track each step in your prompt flow by viewing its trace in Amazon Bedrock</a>.</p>
 * @public
 */
export interface FlowTraceNodeOutputField {
    /**
     * <p>The name of the node output.</p>
     * @public
     */
    nodeOutputName: string | undefined;
    /**
     * <p>The content of the node output.</p>
     * @public
     */
    content: FlowTraceNodeOutputContent | undefined;
}
/**
 * <p>Contains information about the output from a node. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/flows-trace.html">Track each step in your prompt flow by viewing its trace in Amazon Bedrock</a>.</p>
 * @public
 */
export interface FlowTraceNodeOutputEvent {
    /**
     * <p>The name of the node that yielded the output.</p>
     * @public
     */
    nodeName: string | undefined;
    /**
     * <p>The date and time that the trace was returned.</p>
     * @public
     */
    timestamp: Date | undefined;
    /**
     * <p>An array of objects containing information about each field in the output.</p>
     * @public
     */
    fields: FlowTraceNodeOutputField[] | undefined;
}
/**
 * <p>Contains information about an input or output for a node in the flow. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/flows-trace.html">Track each step in your prompt flow by viewing its trace in Amazon Bedrock</a>.</p>
 * @public
 */
export type FlowTrace = FlowTrace.ConditionNodeResultTraceMember | FlowTrace.NodeActionTraceMember | FlowTrace.NodeInputTraceMember | FlowTrace.NodeOutputTraceMember | FlowTrace.$UnknownMember;
/**
 * @public
 */
export declare namespace FlowTrace {
    /**
     * <p>Contains information about the input into a node.</p>
     * @public
     */
    interface NodeInputTraceMember {
        nodeInputTrace: FlowTraceNodeInputEvent;
        nodeOutputTrace?: never;
        conditionNodeResultTrace?: never;
        nodeActionTrace?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains information about the output from a node.</p>
     * @public
     */
    interface NodeOutputTraceMember {
        nodeInputTrace?: never;
        nodeOutputTrace: FlowTraceNodeOutputEvent;
        conditionNodeResultTrace?: never;
        nodeActionTrace?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains information about an output from a condition node.</p>
     * @public
     */
    interface ConditionNodeResultTraceMember {
        nodeInputTrace?: never;
        nodeOutputTrace?: never;
        conditionNodeResultTrace: FlowTraceConditionNodeResultEvent;
        nodeActionTrace?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains information about an action (operation) called by a node. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/flows-trace.html">Track each step in your prompt flow by viewing its trace in Amazon Bedrock</a>.</p>
     * @public
     */
    interface NodeActionTraceMember {
        nodeInputTrace?: never;
        nodeOutputTrace?: never;
        conditionNodeResultTrace?: never;
        nodeActionTrace: FlowTraceNodeActionEvent;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        nodeInputTrace?: never;
        nodeOutputTrace?: never;
        conditionNodeResultTrace?: never;
        nodeActionTrace?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        nodeInputTrace: (value: FlowTraceNodeInputEvent) => T;
        nodeOutputTrace: (value: FlowTraceNodeOutputEvent) => T;
        conditionNodeResultTrace: (value: FlowTraceConditionNodeResultEvent) => T;
        nodeActionTrace: (value: FlowTraceNodeActionEvent) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: FlowTrace, visitor: Visitor<T>) => T;
}
/**
 * <p>Contains information about a trace, which tracks an input or output for a node in the flow. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/flows-trace.html">Track each step in your prompt flow by viewing its trace in Amazon Bedrock</a>.</p>
 * @public
 */
export interface FlowTraceEvent {
    /**
     * <p>The trace object containing information about an input or output for a node in the flow.</p>
     * @public
     */
    trace: FlowTrace | undefined;
}
/**
 * <p>The specified resource Amazon Resource Name (ARN) was not found. Check the Amazon Resource Name (ARN) and try your request again.</p>
 * @public
 */
export declare class ResourceNotFoundException extends __BaseException {
    readonly name: "ResourceNotFoundException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ResourceNotFoundException, __BaseException>);
}
/**
 * <p>The number of requests exceeds the service quota. Resubmit your request later.</p>
 * @public
 */
export declare class ServiceQuotaExceededException extends __BaseException {
    readonly name: "ServiceQuotaExceededException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ServiceQuotaExceededException, __BaseException>);
}
/**
 * <p>The number of requests exceeds the limit. Resubmit your request later.</p>
 * @public
 */
export declare class ThrottlingException extends __BaseException {
    readonly name: "ThrottlingException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ThrottlingException, __BaseException>);
}
/**
 * <p>Input validation failed. Check your request parameters and retry the request.</p>
 * @public
 */
export declare class ValidationException extends __BaseException {
    readonly name: "ValidationException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ValidationException, __BaseException>);
}
/**
 * <p>The output of the flow.</p>
 * @public
 */
export type FlowResponseStream = FlowResponseStream.AccessDeniedExceptionMember | FlowResponseStream.BadGatewayExceptionMember | FlowResponseStream.ConflictExceptionMember | FlowResponseStream.DependencyFailedExceptionMember | FlowResponseStream.FlowCompletionEventMember | FlowResponseStream.FlowMultiTurnInputRequestEventMember | FlowResponseStream.FlowOutputEventMember | FlowResponseStream.FlowTraceEventMember | FlowResponseStream.InternalServerExceptionMember | FlowResponseStream.ResourceNotFoundExceptionMember | FlowResponseStream.ServiceQuotaExceededExceptionMember | FlowResponseStream.ThrottlingExceptionMember | FlowResponseStream.ValidationExceptionMember | FlowResponseStream.$UnknownMember;
/**
 * @public
 */
export declare namespace FlowResponseStream {
    /**
     * <p>Contains information about an output from flow invocation.</p>
     * @public
     */
    interface FlowOutputEventMember {
        flowOutputEvent: FlowOutputEvent;
        flowCompletionEvent?: never;
        flowTraceEvent?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        flowMultiTurnInputRequestEvent?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains information about why the flow completed.</p>
     * @public
     */
    interface FlowCompletionEventMember {
        flowOutputEvent?: never;
        flowCompletionEvent: FlowCompletionEvent;
        flowTraceEvent?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        flowMultiTurnInputRequestEvent?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains information about a trace, which tracks an input or output for a node in the flow.</p>
     * @public
     */
    interface FlowTraceEventMember {
        flowOutputEvent?: never;
        flowCompletionEvent?: never;
        flowTraceEvent: FlowTraceEvent;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        flowMultiTurnInputRequestEvent?: never;
        $unknown?: never;
    }
    /**
     * <p>An internal server error occurred. Retry your request.</p>
     * @public
     */
    interface InternalServerExceptionMember {
        flowOutputEvent?: never;
        flowCompletionEvent?: never;
        flowTraceEvent?: never;
        internalServerException: InternalServerException;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        flowMultiTurnInputRequestEvent?: never;
        $unknown?: never;
    }
    /**
     * <p>Input validation failed. Check your request parameters and retry the request.</p>
     * @public
     */
    interface ValidationExceptionMember {
        flowOutputEvent?: never;
        flowCompletionEvent?: never;
        flowTraceEvent?: never;
        internalServerException?: never;
        validationException: ValidationException;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        flowMultiTurnInputRequestEvent?: never;
        $unknown?: never;
    }
    /**
     * <p>The specified resource Amazon Resource Name (ARN) was not found. Check the Amazon Resource Name (ARN) and try your request again.</p>
     * @public
     */
    interface ResourceNotFoundExceptionMember {
        flowOutputEvent?: never;
        flowCompletionEvent?: never;
        flowTraceEvent?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException: ResourceNotFoundException;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        flowMultiTurnInputRequestEvent?: never;
        $unknown?: never;
    }
    /**
     * <p>The number of requests exceeds the service quota. Resubmit your request later.</p>
     * @public
     */
    interface ServiceQuotaExceededExceptionMember {
        flowOutputEvent?: never;
        flowCompletionEvent?: never;
        flowTraceEvent?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException: ServiceQuotaExceededException;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        flowMultiTurnInputRequestEvent?: never;
        $unknown?: never;
    }
    /**
     * <p>The number of requests exceeds the limit. Resubmit your request later.</p>
     * @public
     */
    interface ThrottlingExceptionMember {
        flowOutputEvent?: never;
        flowCompletionEvent?: never;
        flowTraceEvent?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException: ThrottlingException;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        flowMultiTurnInputRequestEvent?: never;
        $unknown?: never;
    }
    /**
     * <p>The request is denied because of missing access permissions. Check your permissions and retry your request.</p>
     * @public
     */
    interface AccessDeniedExceptionMember {
        flowOutputEvent?: never;
        flowCompletionEvent?: never;
        flowTraceEvent?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException: AccessDeniedException;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        flowMultiTurnInputRequestEvent?: never;
        $unknown?: never;
    }
    /**
     * <p>There was a conflict performing an operation. Resolve the conflict and retry your request.</p>
     * @public
     */
    interface ConflictExceptionMember {
        flowOutputEvent?: never;
        flowCompletionEvent?: never;
        flowTraceEvent?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException: ConflictException;
        dependencyFailedException?: never;
        badGatewayException?: never;
        flowMultiTurnInputRequestEvent?: never;
        $unknown?: never;
    }
    /**
     * <p>There was an issue with a dependency. Check the resource configurations and retry the request.</p>
     * @public
     */
    interface DependencyFailedExceptionMember {
        flowOutputEvent?: never;
        flowCompletionEvent?: never;
        flowTraceEvent?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException: DependencyFailedException;
        badGatewayException?: never;
        flowMultiTurnInputRequestEvent?: never;
        $unknown?: never;
    }
    /**
     * <p>There was an issue with a dependency due to a server issue. Retry your request.</p>
     * @public
     */
    interface BadGatewayExceptionMember {
        flowOutputEvent?: never;
        flowCompletionEvent?: never;
        flowTraceEvent?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException: BadGatewayException;
        flowMultiTurnInputRequestEvent?: never;
        $unknown?: never;
    }
    /**
     * <p>The event stream containing the multi-turn input request information from the flow.</p>
     * @public
     */
    interface FlowMultiTurnInputRequestEventMember {
        flowOutputEvent?: never;
        flowCompletionEvent?: never;
        flowTraceEvent?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        flowMultiTurnInputRequestEvent: FlowMultiTurnInputRequestEvent;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        flowOutputEvent?: never;
        flowCompletionEvent?: never;
        flowTraceEvent?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        flowMultiTurnInputRequestEvent?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        flowOutputEvent: (value: FlowOutputEvent) => T;
        flowCompletionEvent: (value: FlowCompletionEvent) => T;
        flowTraceEvent: (value: FlowTraceEvent) => T;
        internalServerException: (value: InternalServerException) => T;
        validationException: (value: ValidationException) => T;
        resourceNotFoundException: (value: ResourceNotFoundException) => T;
        serviceQuotaExceededException: (value: ServiceQuotaExceededException) => T;
        throttlingException: (value: ThrottlingException) => T;
        accessDeniedException: (value: AccessDeniedException) => T;
        conflictException: (value: ConflictException) => T;
        dependencyFailedException: (value: DependencyFailedException) => T;
        badGatewayException: (value: BadGatewayException) => T;
        flowMultiTurnInputRequestEvent: (value: FlowMultiTurnInputRequestEvent) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: FlowResponseStream, visitor: Visitor<T>) => T;
}
/**
 * @public
 */
export interface InvokeFlowResponse {
    /**
     * <p>The output of the flow, returned as a stream. If there's an error, the error is returned.</p>
     * @public
     */
    responseStream: AsyncIterable<FlowResponseStream> | undefined;
    /**
     * <p>The unique identifier for the current flow execution.</p>
     * @public
     */
    executionId?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const InputQueryType: {
    readonly TEXT: "TEXT";
};
/**
 * @public
 */
export type InputQueryType = (typeof InputQueryType)[keyof typeof InputQueryType];
/**
 * <p>Contains information about a natural language query to transform into SQL.</p>
 * @public
 */
export interface QueryGenerationInput {
    /**
     * <p>The type of the query.</p>
     * @public
     */
    type: InputQueryType | undefined;
    /**
     * <p>The text of the query.</p>
     * @public
     */
    text: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const QueryTransformationMode: {
    readonly TEXT_TO_SQL: "TEXT_TO_SQL";
};
/**
 * @public
 */
export type QueryTransformationMode = (typeof QueryTransformationMode)[keyof typeof QueryTransformationMode];
/**
 * <p>Contains configurations for a knowledge base to use in transformation.</p>
 * @public
 */
export interface TextToSqlKnowledgeBaseConfiguration {
    /**
     * <p>The ARN of the knowledge base</p>
     * @public
     */
    knowledgeBaseArn: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const TextToSqlConfigurationType: {
    readonly KNOWLEDGE_BASE: "KNOWLEDGE_BASE";
};
/**
 * @public
 */
export type TextToSqlConfigurationType = (typeof TextToSqlConfigurationType)[keyof typeof TextToSqlConfigurationType];
/**
 * <p>Contains configurations for transforming text to SQL.</p>
 * @public
 */
export interface TextToSqlConfiguration {
    /**
     * <p>The type of resource to use in transformation.</p>
     * @public
     */
    type: TextToSqlConfigurationType | undefined;
    /**
     * <p>Specifies configurations for a knowledge base to use in transformation.</p>
     * @public
     */
    knowledgeBaseConfiguration?: TextToSqlKnowledgeBaseConfiguration | undefined;
}
/**
 * <p>Contains configurations for transforming the natural language query into SQL.</p>
 * @public
 */
export interface TransformationConfiguration {
    /**
     * <p>The mode of the transformation.</p>
     * @public
     */
    mode: QueryTransformationMode | undefined;
    /**
     * <p>Specifies configurations for transforming text to SQL.</p>
     * @public
     */
    textToSqlConfiguration?: TextToSqlConfiguration | undefined;
}
/**
 * @public
 */
export interface GenerateQueryRequest {
    /**
     * <p>Specifies information about a natural language query to transform into SQL.</p>
     * @public
     */
    queryGenerationInput: QueryGenerationInput | undefined;
    /**
     * <p>Specifies configurations for transforming the natural language query into SQL.</p>
     * @public
     */
    transformationConfiguration: TransformationConfiguration | undefined;
}
/**
 * @public
 * @enum
 */
export declare const GeneratedQueryType: {
    readonly REDSHIFT_SQL: "REDSHIFT_SQL";
};
/**
 * @public
 */
export type GeneratedQueryType = (typeof GeneratedQueryType)[keyof typeof GeneratedQueryType];
/**
 * <p>Contains information about a query generated for a natural language query.</p>
 * @public
 */
export interface GeneratedQuery {
    /**
     * <p>The type of transformed query.</p>
     * @public
     */
    type?: GeneratedQueryType | undefined;
    /**
     * <p>An SQL query that corresponds to the natural language query.</p>
     * @public
     */
    sql?: string | undefined;
}
/**
 * @public
 */
export interface GenerateQueryResponse {
    /**
     * <p>A list of objects, each of which defines a generated query that can correspond to the natural language queries.</p>
     * @public
     */
    queries?: GeneratedQuery[] | undefined;
}
/**
 * <p>Settings for a model called with <a>InvokeAgent</a>.</p>
 * @public
 */
export interface BedrockModelConfigurations {
    /**
     * <p>The performance configuration for the model.</p>
     * @public
     */
    performanceConfig?: PerformanceConfiguration | undefined;
}
/**
 * <p>A content block.</p>
 * @public
 */
export type ContentBlock = ContentBlock.TextMember | ContentBlock.$UnknownMember;
/**
 * @public
 */
export declare namespace ContentBlock {
    /**
     * <p>The block's text.</p>
     * @public
     */
    interface TextMember {
        text: string;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        text?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        text: (value: string) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: ContentBlock, visitor: Visitor<T>) => T;
}
/**
 * @public
 * @enum
 */
export declare const ConversationRole: {
    readonly ASSISTANT: "assistant";
    readonly USER: "user";
};
/**
 * @public
 */
export type ConversationRole = (typeof ConversationRole)[keyof typeof ConversationRole];
/**
 * <p>Details about a message.</p>
 * @public
 */
export interface Message {
    /**
     * <p>The message's role.</p>
     * @public
     */
    role: ConversationRole | undefined;
    /**
     * <p>The message's content.</p>
     * @public
     */
    content: ContentBlock[] | undefined;
}
/**
 * <p>A conversation history.</p>
 * @public
 */
export interface ConversationHistory {
    /**
     * <p>The conversation's messages.</p>
     * @public
     */
    messages?: Message[] | undefined;
}
/**
 * <p>The property contains the file to chat with, along with its attributes.</p>
 * @public
 */
export interface ByteContentFile {
    /**
     * <p>The MIME type of data contained in the file used for chat.</p>
     * @public
     */
    mediaType: string | undefined;
    /**
     * <p>The raw bytes of the file to attach. The maximum size of all files that is attached is 10MB. You can attach a maximum of 5 files. </p>
     * @public
     */
    data: Uint8Array | undefined;
}
/**
 * <p>Contains details of the s3 object where the source file is located.</p>
 * @public
 */
export interface S3ObjectFile {
    /**
     * <p>The uri of the s3 object.</p>
     * @public
     */
    uri: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const FileSourceType: {
    readonly BYTE_CONTENT: "BYTE_CONTENT";
    readonly S3: "S3";
};
/**
 * @public
 */
export type FileSourceType = (typeof FileSourceType)[keyof typeof FileSourceType];
/**
 * <p>The source file of the content contained in the wrapper object.</p>
 * @public
 */
export interface FileSource {
    /**
     * <p>The source type of the files to attach.</p>
     * @public
     */
    sourceType: FileSourceType | undefined;
    /**
     * <p>The s3 location of the files to attach.</p>
     * @public
     */
    s3Location?: S3ObjectFile | undefined;
    /**
     * <p>The data and the text of the attached files.</p>
     * @public
     */
    byteContent?: ByteContentFile | undefined;
}
/**
 * @public
 * @enum
 */
export declare const FileUseCase: {
    readonly CHAT: "CHAT";
    readonly CODE_INTERPRETER: "CODE_INTERPRETER";
};
/**
 * @public
 */
export type FileUseCase = (typeof FileUseCase)[keyof typeof FileUseCase];
/**
 * <p>Contains details of the source files.</p>
 * @public
 */
export interface InputFile {
    /**
     * <p>The name of the source file.</p>
     * @public
     */
    name: string | undefined;
    /**
     * <p>Specifies where the files are located.</p>
     * @public
     */
    source: FileSource | undefined;
    /**
     * <p>Specifies how the source files will be used by the code interpreter.</p>
     * @public
     */
    useCase: FileUseCase | undefined;
}
/**
 * <p>Specifies the name that the metadata attribute must match and the value to which to compare the value of the metadata attribute. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html">Query configurations</a>.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html#API_agent-runtime_RetrieveAndGenerate_RequestSyntax">RetrieveAndGenerate request</a> </p> </li> </ul>
 * @public
 */
export interface FilterAttribute {
    /**
     * <p>The name that the metadata attribute must match.</p>
     * @public
     */
    key: string | undefined;
    /**
     * <p>The value to whcih to compare the value of the metadata attribute.</p>
     * @public
     */
    value: __DocumentType | undefined;
}
/**
 * @public
 * @enum
 */
export declare const AttributeType: {
    readonly BOOLEAN: "BOOLEAN";
    readonly NUMBER: "NUMBER";
    readonly STRING: "STRING";
    readonly STRING_LIST: "STRING_LIST";
};
/**
 * @public
 */
export type AttributeType = (typeof AttributeType)[keyof typeof AttributeType];
/**
 * <p>Details about a metadata attribute.</p>
 * @public
 */
export interface MetadataAttributeSchema {
    /**
     * <p>The attribute's key.</p>
     * @public
     */
    key: string | undefined;
    /**
     * <p>The attribute's type.</p>
     * @public
     */
    type: AttributeType | undefined;
    /**
     * <p>The attribute's description.</p>
     * @public
     */
    description: string | undefined;
}
/**
 * <p>Settings for implicit filtering, where a model generates a metadata filter based on the prompt.</p>
 * @public
 */
export interface ImplicitFilterConfiguration {
    /**
     * <p>Metadata that can be used in a filter.</p>
     * @public
     */
    metadataAttributes: MetadataAttributeSchema[] | undefined;
    /**
     * <p>The model that generates the filter.</p>
     * @public
     */
    modelArn: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SearchType: {
    readonly HYBRID: "HYBRID";
    readonly SEMANTIC: "SEMANTIC";
};
/**
 * @public
 */
export type SearchType = (typeof SearchType)[keyof typeof SearchType];
/**
 * @public
 * @enum
 */
export declare const RerankingMetadataSelectionMode: {
    readonly ALL: "ALL";
    readonly SELECTIVE: "SELECTIVE";
};
/**
 * @public
 */
export type RerankingMetadataSelectionMode = (typeof RerankingMetadataSelectionMode)[keyof typeof RerankingMetadataSelectionMode];
/**
 * <p>Contains information for a metadata field to include in or exclude from consideration when reranking.</p>
 * @public
 */
export interface FieldForReranking {
    /**
     * <p>The name of a metadata field to include in or exclude from consideration when reranking.</p>
     * @public
     */
    fieldName: string | undefined;
}
/**
 * <p>Contains configurations for the metadata fields to include or exclude when considering reranking. If you include the <code>fieldsToExclude</code> field, the reranker ignores all the metadata fields that you specify. If you include the <code>fieldsToInclude</code> field, the reranker uses only the metadata fields that you specify and ignores all others. You can include only one of these fields.</p>
 * @public
 */
export type RerankingMetadataSelectiveModeConfiguration = RerankingMetadataSelectiveModeConfiguration.FieldsToExcludeMember | RerankingMetadataSelectiveModeConfiguration.FieldsToIncludeMember | RerankingMetadataSelectiveModeConfiguration.$UnknownMember;
/**
 * @public
 */
export declare namespace RerankingMetadataSelectiveModeConfiguration {
    /**
     * <p>An array of objects, each of which specifies a metadata field to include in consideration when reranking. The remaining metadata fields are ignored.</p>
     * @public
     */
    interface FieldsToIncludeMember {
        fieldsToInclude: FieldForReranking[];
        fieldsToExclude?: never;
        $unknown?: never;
    }
    /**
     * <p>An array of objects, each of which specifies a metadata field to exclude from consideration when reranking.</p>
     * @public
     */
    interface FieldsToExcludeMember {
        fieldsToInclude?: never;
        fieldsToExclude: FieldForReranking[];
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        fieldsToInclude?: never;
        fieldsToExclude?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        fieldsToInclude: (value: FieldForReranking[]) => T;
        fieldsToExclude: (value: FieldForReranking[]) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: RerankingMetadataSelectiveModeConfiguration, visitor: Visitor<T>) => T;
}
/**
 * <p>Contains configurations for the metadata to use in reranking.</p>
 * @public
 */
export interface MetadataConfigurationForReranking {
    /**
     * <p>Specifies whether to consider all metadata when reranking, or only the metadata that you select. If you specify <code>SELECTIVE</code>, include the <code>selectiveModeConfiguration</code> field.</p>
     * @public
     */
    selectionMode: RerankingMetadataSelectionMode | undefined;
    /**
     * <p>Contains configurations for the metadata fields to include or exclude when considering reranking.</p>
     * @public
     */
    selectiveModeConfiguration?: RerankingMetadataSelectiveModeConfiguration | undefined;
}
/**
 * <p>Contains configurations for an Amazon Bedrock reranker model.</p>
 * @public
 */
export interface VectorSearchBedrockRerankingModelConfiguration {
    /**
     * <p>The ARN of the reranker model to use.</p>
     * @public
     */
    modelArn: string | undefined;
    /**
     * <p>A JSON object whose keys are request fields for the model and whose values are values for those fields.</p>
     * @public
     */
    additionalModelRequestFields?: Record<string, __DocumentType> | undefined;
}
/**
 * <p>Contains configurations for reranking with an Amazon Bedrock reranker model.</p>
 * @public
 */
export interface VectorSearchBedrockRerankingConfiguration {
    /**
     * <p>Contains configurations for the reranker model.</p>
     * @public
     */
    modelConfiguration: VectorSearchBedrockRerankingModelConfiguration | undefined;
    /**
     * <p>The number of results to return after reranking.</p>
     * @public
     */
    numberOfRerankedResults?: number | undefined;
    /**
     * <p>Contains configurations for the metadata to use in reranking.</p>
     * @public
     */
    metadataConfiguration?: MetadataConfigurationForReranking | undefined;
}
/**
 * @public
 * @enum
 */
export declare const VectorSearchRerankingConfigurationType: {
    readonly BEDROCK_RERANKING_MODEL: "BEDROCK_RERANKING_MODEL";
};
/**
 * @public
 */
export type VectorSearchRerankingConfigurationType = (typeof VectorSearchRerankingConfigurationType)[keyof typeof VectorSearchRerankingConfigurationType];
/**
 * <p>Contains configurations for reranking the retrieved results.</p>
 * @public
 */
export interface VectorSearchRerankingConfiguration {
    /**
     * <p>The type of reranker model.</p>
     * @public
     */
    type: VectorSearchRerankingConfigurationType | undefined;
    /**
     * <p>Contains configurations for an Amazon Bedrock reranker model.</p>
     * @public
     */
    bedrockRerankingConfiguration?: VectorSearchBedrockRerankingConfiguration | undefined;
}
/**
 * <p>Configurations for streaming.</p>
 * @public
 */
export interface StreamingConfigurations {
    /**
     * <p> Specifies whether to enable streaming for the final response. This is set to <code>false</code> by default. </p>
     * @public
     */
    streamFinalResponse?: boolean | undefined;
    /**
     * <p> The guardrail interval to apply as response is generated. By default, the guardrail interval is set to 50 characters. If a larger interval is specified, the response will be generated in larger chunks with fewer <code>ApplyGuardrail</code> calls. The following examples show the response generated for <i>Hello, I am an agent</i> input string.</p> <p> <b>Example response in chunks: Interval set to 3 characters</b> </p> <p> <code>'Hel', 'lo, ','I am', ' an', ' Age', 'nt'</code> </p> <p>Each chunk has at least 3 characters except for the last chunk</p> <p> <b>Example response in chunks: Interval set to 20 or more characters</b> </p> <p> <code>Hello, I am an Agent</code> </p>
     * @public
     */
    applyGuardrailInterval?: number | undefined;
}
/**
 * <p>Contains information about where the text with a citation begins and ends in the generated output.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html#API_agent-runtime_RetrieveAndGenerate_ResponseSyntax">RetrieveAndGenerate response</a> – in the <code>span</code> field</p> </li> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html#API_agent-runtime_InvokeAgent_ResponseSyntax">InvokeAgent response</a> – in the <code>span</code> field</p> </li> </ul>
 * @public
 */
export interface Span {
    /**
     * <p>Where the text with a citation starts in the generated output.</p>
     * @public
     */
    start?: number | undefined;
    /**
     * <p>Where the text with a citation ends in the generated output.</p>
     * @public
     */
    end?: number | undefined;
}
/**
 * <p>Contains the part of the generated text that contains a citation, alongside where it begins and ends.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html#API_agent-runtime_RetrieveAndGenerate_ResponseSyntax">RetrieveAndGenerate response</a> – in the <code>textResponsePart</code> field</p> </li> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html#API_agent-runtime_InvokeAgent_ResponseSyntax">InvokeAgent response</a> – in the <code>textResponsePart</code> field</p> </li> </ul>
 * @public
 */
export interface TextResponsePart {
    /**
     * <p>The part of the generated text that contains a citation.</p>
     * @public
     */
    text?: string | undefined;
    /**
     * <p>Contains information about where the text with a citation begins and ends in the generated output.</p>
     * @public
     */
    span?: Span | undefined;
}
/**
 * <p>Contains metadata about a part of the generated response that is accompanied by a citation.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html#API_agent-runtime_InvokeAgent_ResponseSyntax">InvokeAgent response</a> – in the <code>generatedResponsePart</code> field</p> </li> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html#API_agent-runtime_RetrieveAndGenerate_ResponseSyntax">RetrieveAndGenerate response</a> – in the <code>generatedResponsePart</code> field</p> </li> </ul>
 * @public
 */
export interface GeneratedResponsePart {
    /**
     * <p>Contains metadata about a textual part of the generated response that is accompanied by a citation.</p>
     * @public
     */
    textResponsePart?: TextResponsePart | undefined;
}
/**
 * @public
 * @enum
 */
export declare const RetrievalResultContentColumnType: {
    readonly BLOB: "BLOB";
    readonly BOOLEAN: "BOOLEAN";
    readonly DOUBLE: "DOUBLE";
    readonly LONG: "LONG";
    readonly NULL: "NULL";
    readonly STRING: "STRING";
};
/**
 * @public
 */
export type RetrievalResultContentColumnType = (typeof RetrievalResultContentColumnType)[keyof typeof RetrievalResultContentColumnType];
/**
 * <p>Contains information about a column with a cell to return in retrieval.</p>
 * @public
 */
export interface RetrievalResultContentColumn {
    /**
     * <p>The name of the column.</p>
     * @public
     */
    columnName?: string | undefined;
    /**
     * <p>The value in the column.</p>
     * @public
     */
    columnValue?: string | undefined;
    /**
     * <p>The data type of the value.</p>
     * @public
     */
    type?: RetrievalResultContentColumnType | undefined;
}
/**
 * @public
 * @enum
 */
export declare const RetrievalResultContentType: {
    readonly IMAGE: "IMAGE";
    readonly ROW: "ROW";
    readonly TEXT: "TEXT";
};
/**
 * @public
 */
export type RetrievalResultContentType = (typeof RetrievalResultContentType)[keyof typeof RetrievalResultContentType];
/**
 * <p>Contains information about a chunk of text from a data source in the knowledge base. If the result is from a structured data source, the cell in the database and the type of the value is also identified.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_Retrieve.html#API_agent-runtime_Retrieve_ResponseSyntax">Retrieve response</a> – in the <code>content</code> field</p> </li> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html#API_agent-runtime_RetrieveAndGenerate_ResponseSyntax">RetrieveAndGenerate response</a> – in the <code>content</code> field</p> </li> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html#API_agent-runtime_InvokeAgent_ResponseSyntax">InvokeAgent response</a> – in the <code>content</code> field</p> </li> </ul>
 * @public
 */
export interface RetrievalResultContent {
    /**
     * <p>The type of content in the retrieval result.</p>
     * @public
     */
    type?: RetrievalResultContentType | undefined;
    /**
     * <p>The cited text from the data source.</p>
     * @public
     */
    text?: string | undefined;
    /**
     * <p>A data URI with base64-encoded content from the data source. The URI is in the following format: returned in the following format: <code>data:image/jpeg;base64,$\{base64-encoded string\}</code>.</p>
     * @public
     */
    byteContent?: string | undefined;
    /**
     * <p>Specifies information about the rows with the cells to return in retrieval.</p>
     * @public
     */
    row?: RetrievalResultContentColumn[] | undefined;
}
/**
 * <p>The Confluence data source location.</p>
 * @public
 */
export interface RetrievalResultConfluenceLocation {
    /**
     * <p>The Confluence host URL for the data source location.</p>
     * @public
     */
    url?: string | undefined;
}
/**
 * <p>Contains information about the location of a document in a custom data source.</p>
 * @public
 */
export interface RetrievalResultCustomDocumentLocation {
    /**
     * <p>The ID of the document.</p>
     * @public
     */
    id?: string | undefined;
}
/**
 * <p>The location of a result in Amazon Kendra.</p>
 * @public
 */
export interface RetrievalResultKendraDocumentLocation {
    /**
     * <p>The document's uri.</p>
     * @public
     */
    uri?: string | undefined;
}
/**
 * <p>The S3 data source location.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_Retrieve.html#API_agent-runtime_Retrieve_ResponseSyntax">Retrieve response</a> – in the <code>s3Location</code> field</p> </li> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html#API_agent-runtime_RetrieveAndGenerate_ResponseSyntax">RetrieveAndGenerate response</a> – in the <code>s3Location</code> field</p> </li> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html#API_agent-runtime_InvokeAgent_ResponseSyntax">InvokeAgent response</a> – in the <code>s3Location</code> field</p> </li> </ul>
 * @public
 */
export interface RetrievalResultS3Location {
    /**
     * <p>The S3 URI for the data source location.</p>
     * @public
     */
    uri?: string | undefined;
}
/**
 * <p>The Salesforce data source location.</p>
 * @public
 */
export interface RetrievalResultSalesforceLocation {
    /**
     * <p>The Salesforce host URL for the data source location.</p>
     * @public
     */
    url?: string | undefined;
}
/**
 * <p>The SharePoint data source location.</p>
 * @public
 */
export interface RetrievalResultSharePointLocation {
    /**
     * <p>The SharePoint site URL for the data source location.</p>
     * @public
     */
    url?: string | undefined;
}
/**
 * <p>Contains information about the SQL query used to retrieve the result.</p>
 * @public
 */
export interface RetrievalResultSqlLocation {
    /**
     * <p>The SQL query used to retrieve the result.</p>
     * @public
     */
    query?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const RetrievalResultLocationType: {
    readonly CONFLUENCE: "CONFLUENCE";
    readonly CUSTOM: "CUSTOM";
    readonly KENDRA: "KENDRA";
    readonly S3: "S3";
    readonly SALESFORCE: "SALESFORCE";
    readonly SHAREPOINT: "SHAREPOINT";
    readonly SQL: "SQL";
    readonly WEB: "WEB";
};
/**
 * @public
 */
export type RetrievalResultLocationType = (typeof RetrievalResultLocationType)[keyof typeof RetrievalResultLocationType];
/**
 * <p>The web URL/URLs data source location.</p>
 * @public
 */
export interface RetrievalResultWebLocation {
    /**
     * <p>The web URL/URLs for the data source location.</p>
     * @public
     */
    url?: string | undefined;
}
/**
 * <p>Contains information about the data source location.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_Retrieve.html#API_agent-runtime_Retrieve_ResponseSyntax">Retrieve response</a> – in the <code>location</code> field</p> </li> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html#API_agent-runtime_RetrieveAndGenerate_ResponseSyntax">RetrieveAndGenerate response</a> – in the <code>location</code> field</p> </li> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html#API_agent-runtime_InvokeAgent_ResponseSyntax">InvokeAgent response</a> – in the <code>location</code> field</p> </li> </ul>
 * @public
 */
export interface RetrievalResultLocation {
    /**
     * <p>The type of data source location.</p>
     * @public
     */
    type: RetrievalResultLocationType | undefined;
    /**
     * <p>The S3 data source location.</p>
     * @public
     */
    s3Location?: RetrievalResultS3Location | undefined;
    /**
     * <p>The web URL/URLs data source location.</p>
     * @public
     */
    webLocation?: RetrievalResultWebLocation | undefined;
    /**
     * <p>The Confluence data source location.</p>
     * @public
     */
    confluenceLocation?: RetrievalResultConfluenceLocation | undefined;
    /**
     * <p>The Salesforce data source location.</p>
     * @public
     */
    salesforceLocation?: RetrievalResultSalesforceLocation | undefined;
    /**
     * <p>The SharePoint data source location.</p>
     * @public
     */
    sharePointLocation?: RetrievalResultSharePointLocation | undefined;
    /**
     * <p>Specifies the location of a document in a custom data source.</p>
     * @public
     */
    customDocumentLocation?: RetrievalResultCustomDocumentLocation | undefined;
    /**
     * <p>The location of a document in Amazon Kendra.</p>
     * @public
     */
    kendraDocumentLocation?: RetrievalResultKendraDocumentLocation | undefined;
    /**
     * <p>Specifies information about the SQL query used to retrieve the result.</p>
     * @public
     */
    sqlLocation?: RetrievalResultSqlLocation | undefined;
}
/**
 * <p>Contains metadata about a source cited for the generated response.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html#API_agent-runtime_RetrieveAndGenerate_ResponseSyntax">RetrieveAndGenerate response</a> – in the <code>retrievedReferences</code> field</p> </li> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html#API_agent-runtime_InvokeAgent_ResponseSyntax">InvokeAgent response</a> – in the <code>retrievedReferences</code> field</p> </li> </ul>
 * @public
 */
export interface RetrievedReference {
    /**
     * <p>Contains the cited text from the data source.</p>
     * @public
     */
    content?: RetrievalResultContent | undefined;
    /**
     * <p>Contains information about the location of the data source.</p>
     * @public
     */
    location?: RetrievalResultLocation | undefined;
    /**
     * <p>Contains metadata attributes and their values for the file in the data source. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-ds.html#kb-ds-metadata">Metadata and filtering</a>.</p>
     * @public
     */
    metadata?: Record<string, __DocumentType> | undefined;
}
/**
 * <p>An object containing a segment of the generated response that is based on a source in the knowledge base, alongside information about the source.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html#API_agent-runtime_InvokeAgent_ResponseSyntax">InvokeAgent response</a> – in the <code>citations</code> field</p> </li> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html#API_agent-runtime_RetrieveAndGenerate_ResponseSyntax">RetrieveAndGenerate response</a> – in the <code>citations</code> field</p> </li> </ul>
 * @public
 */
export interface Citation {
    /**
     * <p>Contains the generated response and metadata </p>
     * @public
     */
    generatedResponsePart?: GeneratedResponsePart | undefined;
    /**
     * <p>Contains metadata about the sources cited for the generated response.</p>
     * @public
     */
    retrievedReferences?: RetrievedReference[] | undefined;
}
/**
 * <p>Contains citations for a part of an agent response.</p>
 * @public
 */
export interface Attribution {
    /**
     * <p>A list of citations and related information for a part of an agent response.</p>
     * @public
     */
    citations?: Citation[] | undefined;
}
/**
 * <p>Contains a part of an agent response and citations for it.</p>
 * @public
 */
export interface PayloadPart {
    /**
     * <p>A part of the agent response in bytes.</p>
     * @public
     */
    bytes?: Uint8Array | undefined;
    /**
     * <p>Contains citations for a part of an agent response.</p>
     * @public
     */
    attribution?: Attribution | undefined;
}
/**
 * <p>Contains details of the response from code interpreter.</p>
 * @public
 */
export interface OutputFile {
    /**
     * <p>The name of the file containing response from code interpreter.</p>
     * @public
     */
    name?: string | undefined;
    /**
     * <p>The type of file that contains response from the code interpreter.</p>
     * @public
     */
    type?: string | undefined;
    /**
     * <p>The byte count of files that contains response from code interpreter.</p>
     * @public
     */
    bytes?: Uint8Array | undefined;
}
/**
 * <p>Contains intermediate response for code interpreter if any files have been generated.</p>
 * @public
 */
export interface FilePart {
    /**
     * <p>Files containing intermediate response for the user.</p>
     * @public
     */
    files?: OutputFile[] | undefined;
}
/**
 * <p> The model specified in the request is not ready to serve inference requests. The AWS SDK will automatically retry the operation up to 5 times. For information about configuring automatic retries, see <a href="https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html">Retry behavior</a> in the <i>AWS SDKs and Tools</i> reference guide. </p>
 * @public
 */
export declare class ModelNotReadyException extends __BaseException {
    readonly name: "ModelNotReadyException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ModelNotReadyException, __BaseException>);
}
/**
 * <p>Details about a caller.</p>
 * @public
 */
export type Caller = Caller.AgentAliasArnMember | Caller.$UnknownMember;
/**
 * @public
 */
export declare namespace Caller {
    /**
     * <p>The caller's agent alias ARN.</p>
     * @public
     */
    interface AgentAliasArnMember {
        agentAliasArn: string;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        agentAliasArn?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        agentAliasArn: (value: string) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: Caller, visitor: Visitor<T>) => T;
}
/**
 * <p> The event in the custom orchestration sequence. Events are the responses which the custom orchestration Lambda function sends as response to the agent. </p>
 * @public
 */
export interface CustomOrchestrationTraceEvent {
    /**
     * <p> The text that prompted the event at this step. </p>
     * @public
     */
    text?: string | undefined;
}
/**
 * <p> The trace behavior for the custom orchestration. </p>
 * @public
 */
export interface CustomOrchestrationTrace {
    /**
     * <p> The unique identifier of the trace. </p>
     * @public
     */
    traceId?: string | undefined;
    /**
     * <p> The event details used with the custom orchestration. </p>
     * @public
     */
    event?: CustomOrchestrationTraceEvent | undefined;
}
/**
 * <p>Contains information about the failure of the interaction.</p>
 * @public
 */
export interface FailureTrace {
    /**
     * <p>The unique identifier of the trace.</p>
     * @public
     */
    traceId?: string | undefined;
    /**
     * <p>The reason the interaction failed.</p>
     * @public
     */
    failureReason?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const GuardrailAction: {
    readonly INTERVENED: "INTERVENED";
    readonly NONE: "NONE";
};
/**
 * @public
 */
export type GuardrailAction = (typeof GuardrailAction)[keyof typeof GuardrailAction];
/**
 * @public
 * @enum
 */
export declare const GuardrailContentPolicyAction: {
    readonly BLOCKED: "BLOCKED";
};
/**
 * @public
 */
export type GuardrailContentPolicyAction = (typeof GuardrailContentPolicyAction)[keyof typeof GuardrailContentPolicyAction];
/**
 * @public
 * @enum
 */
export declare const GuardrailContentFilterConfidence: {
    readonly HIGH: "HIGH";
    readonly LOW: "LOW";
    readonly MEDIUM: "MEDIUM";
    readonly NONE: "NONE";
};
/**
 * @public
 */
export type GuardrailContentFilterConfidence = (typeof GuardrailContentFilterConfidence)[keyof typeof GuardrailContentFilterConfidence];
/**
 * @public
 * @enum
 */
export declare const GuardrailContentFilterType: {
    readonly HATE: "HATE";
    readonly INSULTS: "INSULTS";
    readonly MISCONDUCT: "MISCONDUCT";
    readonly PROMPT_ATTACK: "PROMPT_ATTACK";
    readonly SEXUAL: "SEXUAL";
    readonly VIOLENCE: "VIOLENCE";
};
/**
 * @public
 */
export type GuardrailContentFilterType = (typeof GuardrailContentFilterType)[keyof typeof GuardrailContentFilterType];
/**
 * <p>Details of the content filter used in the Guardrail.</p>
 * @public
 */
export interface GuardrailContentFilter {
    /**
     * <p>The type of content detected in the filter by the Guardrail.</p>
     * @public
     */
    type?: GuardrailContentFilterType | undefined;
    /**
     * <p>The confidence level regarding the content detected in the filter by the Guardrail.</p>
     * @public
     */
    confidence?: GuardrailContentFilterConfidence | undefined;
    /**
     * <p>The action placed on the content by the Guardrail filter.</p>
     * @public
     */
    action?: GuardrailContentPolicyAction | undefined;
}
/**
 * <p>The details of the policy assessment in the Guardrails filter.</p>
 * @public
 */
export interface GuardrailContentPolicyAssessment {
    /**
     * <p>The filter details of the policy assessment used in the Guardrails filter.</p>
     * @public
     */
    filters?: GuardrailContentFilter[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const GuardrailSensitiveInformationPolicyAction: {
    readonly ANONYMIZED: "ANONYMIZED";
    readonly BLOCKED: "BLOCKED";
};
/**
 * @public
 */
export type GuardrailSensitiveInformationPolicyAction = (typeof GuardrailSensitiveInformationPolicyAction)[keyof typeof GuardrailSensitiveInformationPolicyAction];
/**
 * @public
 * @enum
 */
export declare const GuardrailPiiEntityType: {
    readonly ADDRESS: "ADDRESS";
    readonly AGE: "AGE";
    readonly AWS_ACCESS_KEY: "AWS_ACCESS_KEY";
    readonly AWS_SECRET_KEY: "AWS_SECRET_KEY";
    readonly CA_HEALTH_NUMBER: "CA_HEALTH_NUMBER";
    readonly CA_SOCIAL_INSURANCE_NUMBER: "CA_SOCIAL_INSURANCE_NUMBER";
    readonly CREDIT_DEBIT_CARD_CVV: "CREDIT_DEBIT_CARD_CVV";
    readonly CREDIT_DEBIT_CARD_EXPIRY: "CREDIT_DEBIT_CARD_EXPIRY";
    readonly CREDIT_DEBIT_CARD_NUMBER: "CREDIT_DEBIT_CARD_NUMBER";
    readonly DRIVER_ID: "DRIVER_ID";
    readonly EMAIL: "EMAIL";
    readonly INTERNATIONAL_BANK_ACCOUNT_NUMBER: "INTERNATIONAL_BANK_ACCOUNT_NUMBER";
    readonly IP_ADDRESS: "IP_ADDRESS";
    readonly LICENSE_PLATE: "LICENSE_PLATE";
    readonly MAC_ADDRESS: "MAC_ADDRESS";
    readonly NAME: "NAME";
    readonly PASSWORD: "PASSWORD";
    readonly PHONE: "PHONE";
    readonly PIN: "PIN";
    readonly SWIFT_CODE: "SWIFT_CODE";
    readonly UK_NATIONAL_HEALTH_SERVICE_NUMBER: "UK_NATIONAL_HEALTH_SERVICE_NUMBER";
    readonly UK_NATIONAL_INSURANCE_NUMBER: "UK_NATIONAL_INSURANCE_NUMBER";
    readonly UK_UNIQUE_TAXPAYER_REFERENCE_NUMBER: "UK_UNIQUE_TAXPAYER_REFERENCE_NUMBER";
    readonly URL: "URL";
    readonly USERNAME: "USERNAME";
    readonly US_BANK_ACCOUNT_NUMBER: "US_BANK_ACCOUNT_NUMBER";
    readonly US_BANK_ROUTING_NUMBER: "US_BANK_ROUTING_NUMBER";
    readonly US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER: "US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER";
    readonly US_PASSPORT_NUMBER: "US_PASSPORT_NUMBER";
    readonly US_SOCIAL_SECURITY_NUMBER: "US_SOCIAL_SECURITY_NUMBER";
    readonly VEHICLE_IDENTIFICATION_NUMBER: "VEHICLE_IDENTIFICATION_NUMBER";
};
/**
 * @public
 */
export type GuardrailPiiEntityType = (typeof GuardrailPiiEntityType)[keyof typeof GuardrailPiiEntityType];
/**
 * <p>The Guardrail filter to identify and remove personally identifiable information (PII).</p>
 * @public
 */
export interface GuardrailPiiEntityFilter {
    /**
     * <p>The type of PII the Guardrail filter has identified and removed.</p>
     * @public
     */
    type?: GuardrailPiiEntityType | undefined;
    /**
     * <p>The match to settings in the Guardrail filter to identify and remove PII.</p>
     * @public
     */
    match?: string | undefined;
    /**
     * <p>The action of the Guardrail filter to identify and remove PII.</p>
     * @public
     */
    action?: GuardrailSensitiveInformationPolicyAction | undefined;
}
/**
 * <p>The details for the regex filter used in the Guardrail.</p>
 * @public
 */
export interface GuardrailRegexFilter {
    /**
     * <p>The name details for the regex filter used in the Guardrail.</p>
     * @public
     */
    name?: string | undefined;
    /**
     * <p>The regex details for the regex filter used in the Guardrail.</p>
     * @public
     */
    regex?: string | undefined;
    /**
     * <p>The match details for the regex filter used in the Guardrail.</p>
     * @public
     */
    match?: string | undefined;
    /**
     * <p>The action details for the regex filter used in the Guardrail.</p>
     * @public
     */
    action?: GuardrailSensitiveInformationPolicyAction | undefined;
}
/**
 * <p>The details of the sensitive policy assessment used in the Guardrail.</p>
 * @public
 */
export interface GuardrailSensitiveInformationPolicyAssessment {
    /**
     * <p>The details of the PII entities used in the sensitive policy assessment for the Guardrail.</p>
     * @public
     */
    piiEntities?: GuardrailPiiEntityFilter[] | undefined;
    /**
     * <p>The details of the regexes used in the sensitive policy assessment for the Guardrail.</p>
     * @public
     */
    regexes?: GuardrailRegexFilter[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const GuardrailTopicPolicyAction: {
    readonly BLOCKED: "BLOCKED";
};
/**
 * @public
 */
export type GuardrailTopicPolicyAction = (typeof GuardrailTopicPolicyAction)[keyof typeof GuardrailTopicPolicyAction];
/**
 * @public
 * @enum
 */
export declare const GuardrailTopicType: {
    readonly DENY: "DENY";
};
/**
 * @public
 */
export type GuardrailTopicType = (typeof GuardrailTopicType)[keyof typeof GuardrailTopicType];
/**
 * <p>The details for a specific topic defined in the Guardrail.</p>
 * @public
 */
export interface GuardrailTopic {
    /**
     * <p>The name details on a specific topic in the Guardrail.</p>
     * @public
     */
    name?: string | undefined;
    /**
     * <p>The type details on a specific topic in the Guardrail.</p>
     * @public
     */
    type?: GuardrailTopicType | undefined;
    /**
     * <p>The action details on a specific topic in the Guardrail.</p>
     * @public
     */
    action?: GuardrailTopicPolicyAction | undefined;
}
/**
 * <p>The details of the policy assessment used in the Guardrail.</p>
 * @public
 */
export interface GuardrailTopicPolicyAssessment {
    /**
     * <p>The topic details of the policy assessment used in the Guardrail.</p>
     * @public
     */
    topics?: GuardrailTopic[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const GuardrailWordPolicyAction: {
    readonly BLOCKED: "BLOCKED";
};
/**
 * @public
 */
export type GuardrailWordPolicyAction = (typeof GuardrailWordPolicyAction)[keyof typeof GuardrailWordPolicyAction];
/**
 * <p>The custom word details for the filter in the Guardrail.</p>
 * @public
 */
export interface GuardrailCustomWord {
    /**
     * <p>The match details for the custom word filter in the Guardrail.</p>
     * @public
     */
    match?: string | undefined;
    /**
     * <p>The action details for the custom word filter in the Guardrail.</p>
     * @public
     */
    action?: GuardrailWordPolicyAction | undefined;
}
/**
 * @public
 * @enum
 */
export declare const GuardrailManagedWordType: {
    readonly PROFANITY: "PROFANITY";
};
/**
 * @public
 */
export type GuardrailManagedWordType = (typeof GuardrailManagedWordType)[keyof typeof GuardrailManagedWordType];
/**
 * <p>The managed word details for the filter in the Guardrail.</p>
 * @public
 */
export interface GuardrailManagedWord {
    /**
     * <p>The match details for the managed word filter in the Guardrail.</p>
     * @public
     */
    match?: string | undefined;
    /**
     * <p>The type details for the managed word filter in the Guardrail.</p>
     * @public
     */
    type?: GuardrailManagedWordType | undefined;
    /**
     * <p>The action details for the managed word filter in the Guardrail.</p>
     * @public
     */
    action?: GuardrailWordPolicyAction | undefined;
}
/**
 * <p>The assessment details for words defined in the Guardrail filter.</p>
 * @public
 */
export interface GuardrailWordPolicyAssessment {
    /**
     * <p>The custom word details for words defined in the Guardrail filter.</p>
     * @public
     */
    customWords?: GuardrailCustomWord[] | undefined;
    /**
     * <p>The managed word lists for words defined in the Guardrail filter.</p>
     * @public
     */
    managedWordLists?: GuardrailManagedWord[] | undefined;
}
/**
 * <p>Assessment details of the content analyzed by Guardrails.</p>
 * @public
 */
export interface GuardrailAssessment {
    /**
     * <p>Topic policy details of the Guardrail.</p>
     * @public
     */
    topicPolicy?: GuardrailTopicPolicyAssessment | undefined;
    /**
     * <p>Content policy details of the Guardrail.</p>
     * @public
     */
    contentPolicy?: GuardrailContentPolicyAssessment | undefined;
    /**
     * <p>Word policy details of the Guardrail.</p>
     * @public
     */
    wordPolicy?: GuardrailWordPolicyAssessment | undefined;
    /**
     * <p>Sensitive Information policy details of Guardrail.</p>
     * @public
     */
    sensitiveInformationPolicy?: GuardrailSensitiveInformationPolicyAssessment | undefined;
}
/**
 * <p>The trace details used in the Guardrail.</p>
 * @public
 */
export interface GuardrailTrace {
    /**
     * <p>The trace action details used with the Guardrail.</p>
     * @public
     */
    action?: GuardrailAction | undefined;
    /**
     * <p>The details of the trace Id used in the Guardrail Trace.</p>
     * @public
     */
    traceId?: string | undefined;
    /**
     * <p>The details of the input assessments used in the Guardrail Trace.</p>
     * @public
     */
    inputAssessments?: GuardrailAssessment[] | undefined;
    /**
     * <p>The details of the output assessments used in the Guardrail Trace.</p>
     * @public
     */
    outputAssessments?: GuardrailAssessment[] | undefined;
}
/**
 * <p>Contains information about the code interpreter being invoked.</p>
 * @public
 */
export interface CodeInterpreterInvocationInput {
    /**
     * <p>The code for the code interpreter to use.</p>
     * @public
     */
    code?: string | undefined;
    /**
     * <p>Files that are uploaded for code interpreter to use.</p>
     * @public
     */
    files?: string[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const InvocationType: {
    readonly ACTION_GROUP: "ACTION_GROUP";
    readonly ACTION_GROUP_CODE_INTERPRETER: "ACTION_GROUP_CODE_INTERPRETER";
    readonly AGENT_COLLABORATOR: "AGENT_COLLABORATOR";
    readonly FINISH: "FINISH";
    readonly KNOWLEDGE_BASE: "KNOWLEDGE_BASE";
};
/**
 * @public
 */
export type InvocationType = (typeof InvocationType)[keyof typeof InvocationType];
/**
 * <p>Contains details about the knowledge base to look up and the query to be made.</p>
 * @public
 */
export interface KnowledgeBaseLookupInput {
    /**
     * <p>The query made to the knowledge base.</p>
     * @public
     */
    text?: string | undefined;
    /**
     * <p>The unique identifier of the knowledge base to look up.</p>
     * @public
     */
    knowledgeBaseId?: string | undefined;
}
/**
 * <p>Contains information pertaining to the action group or knowledge base that is being invoked.</p>
 * @public
 */
export interface InvocationInput {
    /**
     * <p>The unique identifier of the trace.</p>
     * @public
     */
    traceId?: string | undefined;
    /**
     * <p>Specifies whether the agent is invoking an action group or a knowledge base.</p>
     * @public
     */
    invocationType?: InvocationType | undefined;
    /**
     * <p>Contains information about the action group to be invoked.</p>
     * @public
     */
    actionGroupInvocationInput?: ActionGroupInvocationInput | undefined;
    /**
     * <p>Contains details about the knowledge base to look up and the query to be made.</p>
     * @public
     */
    knowledgeBaseLookupInput?: KnowledgeBaseLookupInput | undefined;
    /**
     * <p>Contains information about the code interpreter to be invoked.</p>
     * @public
     */
    codeInterpreterInvocationInput?: CodeInterpreterInvocationInput | undefined;
    /**
     * <p>The collaborator's invocation input.</p>
     * @public
     */
    agentCollaboratorInvocationInput?: AgentCollaboratorInvocationInput | undefined;
}
/**
 * <p>Specifications about the inference parameters that were provided alongside the prompt. These are specified in the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_PromptOverrideConfiguration.html">PromptOverrideConfiguration</a> object that was set when the agent was created or updated. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html">Inference parameters for foundation models</a>.</p>
 * @public
 */
export interface InferenceConfiguration {
    /**
     * <p>The likelihood of the model selecting higher-probability options while generating a response. A lower value makes the model more likely to choose higher-probability options, while a higher value makes the model more likely to choose lower-probability options.</p>
     * @public
     */
    temperature?: number | undefined;
    /**
     * <p>While generating a response, the model determines the probability of the following token at each point of generation. The value that you set for <code>Top P</code> determines the number of most-likely candidates from which the model chooses the next token in the sequence. For example, if you set <code>topP</code> to 0.8, the model only selects the next token from the top 80% of the probability distribution of next tokens.</p>
     * @public
     */
    topP?: number | undefined;
    /**
     * <p>While generating a response, the model determines the probability of the following token at each point of generation. The value that you set for <code>topK</code> is the number of most-likely candidates from which the model chooses the next token in the sequence. For example, if you set <code>topK</code> to 50, the model selects the next token from among the top 50 most likely choices.</p>
     * @public
     */
    topK?: number | undefined;
    /**
     * <p>The maximum number of tokens allowed in the generated response.</p>
     * @public
     */
    maximumLength?: number | undefined;
    /**
     * <p>A list of stop sequences. A stop sequence is a sequence of characters that causes the model to stop generating the response.</p>
     * @public
     */
    stopSequences?: string[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const CreationMode: {
    readonly DEFAULT: "DEFAULT";
    readonly OVERRIDDEN: "OVERRIDDEN";
};
/**
 * @public
 */
export type CreationMode = (typeof CreationMode)[keyof typeof CreationMode];
/**
 * @public
 * @enum
 */
export declare const PromptType: {
    readonly KNOWLEDGE_BASE_RESPONSE_GENERATION: "KNOWLEDGE_BASE_RESPONSE_GENERATION";
    readonly ORCHESTRATION: "ORCHESTRATION";
    readonly POST_PROCESSING: "POST_PROCESSING";
    readonly PRE_PROCESSING: "PRE_PROCESSING";
    readonly ROUTING_CLASSIFIER: "ROUTING_CLASSIFIER";
};
/**
 * @public
 */
export type PromptType = (typeof PromptType)[keyof typeof PromptType];
/**
 * <p>The input for the pre-processing step.</p> <ul> <li> <p>The <code>type</code> matches the agent step.</p> </li> <li> <p>The <code>text</code> contains the prompt.</p> </li> <li> <p>The <code>inferenceConfiguration</code>, <code>parserMode</code>, and <code>overrideLambda</code> values are set in the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_PromptOverrideConfiguration.html">PromptOverrideConfiguration</a> object that was set when the agent was created or updated.</p> </li> </ul>
 * @public
 */
export interface ModelInvocationInput {
    /**
     * <p>The unique identifier of the trace.</p>
     * @public
     */
    traceId?: string | undefined;
    /**
     * <p>The text that prompted the agent at this step.</p>
     * @public
     */
    text?: string | undefined;
    /**
     * <p>The step in the agent sequence.</p>
     * @public
     */
    type?: PromptType | undefined;
    /**
     * <p>The ARN of the Lambda function to use when parsing the raw foundation model output in parts of the agent sequence.</p>
     * @public
     */
    overrideLambda?: string | undefined;
    /**
     * <p>Specifies whether the default prompt template was <code>OVERRIDDEN</code>. If it was, the <code>basePromptTemplate</code> that was set in the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_PromptOverrideConfiguration.html">PromptOverrideConfiguration</a> object when the agent was created or updated is used instead.</p>
     * @public
     */
    promptCreationMode?: CreationMode | undefined;
    /**
     * <p>Specifications about the inference parameters that were provided alongside the prompt. These are specified in the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_PromptOverrideConfiguration.html">PromptOverrideConfiguration</a> object that was set when the agent was created or updated. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html">Inference parameters for foundation models</a>.</p>
     * @public
     */
    inferenceConfiguration?: InferenceConfiguration | undefined;
    /**
     * <p>Specifies whether to override the default parser Lambda function when parsing the raw foundation model output in the part of the agent sequence defined by the <code>promptType</code>.</p>
     * @public
     */
    parserMode?: CreationMode | undefined;
    /**
     * <p>The identifier of a foundation model.</p>
     * @public
     */
    foundationModel?: string | undefined;
}
/**
 * <p>Contains information of the usage of the foundation model.</p>
 * @public
 */
export interface Usage {
    /**
     * <p>Contains information about the input tokens from the foundation model usage.</p>
     * @public
     */
    inputTokens?: number | undefined;
    /**
     * <p>Contains information about the output tokens from the foundation model usage.</p>
     * @public
     */
    outputTokens?: number | undefined;
}
/**
 * <p>Provides details of the foundation model.</p>
 * @public
 */
export interface Metadata {
    /**
     * <p>Contains details of the foundation model usage.</p>
     * @public
     */
    usage?: Usage | undefined;
}
/**
 * <p>Contains the raw output from the foundation model.</p>
 * @public
 */
export interface RawResponse {
    /**
     * <p>The foundation model's raw output content.</p>
     * @public
     */
    content?: string | undefined;
}
/**
 * <p>Contains information about the reasoning that the model used to return the content in the content block.</p>
 * @public
 */
export interface ReasoningTextBlock {
    /**
     * <p>Text describing the reasoning that the model used to return the content in the content block.</p>
     * @public
     */
    text: string | undefined;
    /**
     * <p>A hash of all the messages in the conversation to ensure that the content in the reasoning text block isn't tampered with. You must submit the signature in subsequent <code>Converse</code> requests, in addition to the previous messages. If the previous messages are tampered with, the response throws an error.</p>
     * @public
     */
    signature?: string | undefined;
}
/**
 * <p>Contains content regarding the reasoning that the foundation model made with respect to the content in the content block. Reasoning refers to a Chain of Thought (CoT) that the model generates to enhance the accuracy of its final response.</p>
 * @public
 */
export type ReasoningContentBlock = ReasoningContentBlock.ReasoningTextMember | ReasoningContentBlock.RedactedContentMember | ReasoningContentBlock.$UnknownMember;
/**
 * @public
 */
export declare namespace ReasoningContentBlock {
    /**
     * <p>Contains information about the reasoning that the model used to return the content in the content block.</p>
     * @public
     */
    interface ReasoningTextMember {
        reasoningText: ReasoningTextBlock;
        redactedContent?: never;
        $unknown?: never;
    }
    /**
     * <p>The content in the reasoning that was encrypted by the model provider for trust and safety reasons.</p>
     * @public
     */
    interface RedactedContentMember {
        reasoningText?: never;
        redactedContent: Uint8Array;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        reasoningText?: never;
        redactedContent?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        reasoningText: (value: ReasoningTextBlock) => T;
        redactedContent: (value: Uint8Array) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: ReasoningContentBlock, visitor: Visitor<T>) => T;
}
/**
 * <p>The foundation model output from the orchestration step.</p>
 * @public
 */
export interface OrchestrationModelInvocationOutput {
    /**
     * <p>The unique identifier of the trace.</p>
     * @public
     */
    traceId?: string | undefined;
    /**
     * <p>Contains details of the raw response from the foundation model output.</p>
     * @public
     */
    rawResponse?: RawResponse | undefined;
    /**
     * <p>Contains information about the foundation model output from the orchestration step.</p>
     * @public
     */
    metadata?: Metadata | undefined;
    /**
     * <p>Contains content about the reasoning that the model made during the orchestration step. </p>
     * @public
     */
    reasoningContent?: ReasoningContentBlock | undefined;
}
/**
 * <p>Contains the JSON-formatted string returned by the API invoked by the code interpreter.</p>
 * @public
 */
export interface CodeInterpreterInvocationOutput {
    /**
     * <p>Contains the successful output returned from code execution</p>
     * @public
     */
    executionOutput?: string | undefined;
    /**
     * <p>Contains the error returned from code execution.</p>
     * @public
     */
    executionError?: string | undefined;
    /**
     * <p>Contains output files, if generated by code execution.</p>
     * @public
     */
    files?: string[] | undefined;
    /**
     * <p>Indicates if the execution of the code timed out.</p>
     * @public
     */
    executionTimeout?: boolean | undefined;
}
/**
 * <p>Contains details about the response to the user.</p>
 * @public
 */
export interface FinalResponse {
    /**
     * <p>The text in the response to the user.</p>
     * @public
     */
    text?: string | undefined;
}
/**
 * <p>Contains details about the results from looking up the knowledge base.</p>
 * @public
 */
export interface KnowledgeBaseLookupOutput {
    /**
     * <p>Contains metadata about the sources cited for the generated response.</p>
     * @public
     */
    retrievedReferences?: RetrievedReference[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const Source: {
    readonly ACTION_GROUP: "ACTION_GROUP";
    readonly KNOWLEDGE_BASE: "KNOWLEDGE_BASE";
    readonly PARSER: "PARSER";
};
/**
 * @public
 */
export type Source = (typeof Source)[keyof typeof Source];
/**
 * <p>Contains details about the agent's response to reprompt the input.</p>
 * @public
 */
export interface RepromptResponse {
    /**
     * <p>The text reprompting the input.</p>
     * @public
     */
    text?: string | undefined;
    /**
     * <p>Specifies what output is prompting the agent to reprompt the input.</p>
     * @public
     */
    source?: Source | undefined;
}
/**
 * @public
 * @enum
 */
export declare const Type: {
    readonly ACTION_GROUP: "ACTION_GROUP";
    readonly AGENT_COLLABORATOR: "AGENT_COLLABORATOR";
    readonly ASK_USER: "ASK_USER";
    readonly FINISH: "FINISH";
    readonly KNOWLEDGE_BASE: "KNOWLEDGE_BASE";
    readonly REPROMPT: "REPROMPT";
};
/**
 * @public
 */
export type Type = (typeof Type)[keyof typeof Type];
/**
 * <p>Contains the result or output of an action group or knowledge base, or the response to the user.</p>
 * @public
 */
export interface Observation {
    /**
     * <p>The unique identifier of the trace.</p>
     * @public
     */
    traceId?: string | undefined;
    /**
     * <p>Specifies what kind of information the agent returns in the observation. The following values are possible.</p> <ul> <li> <p> <code>ACTION_GROUP</code> – The agent returns the result of an action group.</p> </li> <li> <p> <code>KNOWLEDGE_BASE</code> – The agent returns information from a knowledge base.</p> </li> <li> <p> <code>FINISH</code> – The agent returns a final response to the user with no follow-up.</p> </li> <li> <p> <code>ASK_USER</code> – The agent asks the user a question.</p> </li> <li> <p> <code>REPROMPT</code> – The agent prompts the user again for the same information.</p> </li> </ul>
     * @public
     */
    type?: Type | undefined;
    /**
     * <p>Contains the JSON-formatted string returned by the API invoked by the action group.</p>
     * @public
     */
    actionGroupInvocationOutput?: ActionGroupInvocationOutput | undefined;
    /**
     * <p>A collaborator's invocation output.</p>
     * @public
     */
    agentCollaboratorInvocationOutput?: AgentCollaboratorInvocationOutput | undefined;
    /**
     * <p>Contains details about the results from looking up the knowledge base.</p>
     * @public
     */
    knowledgeBaseLookupOutput?: KnowledgeBaseLookupOutput | undefined;
    /**
     * <p>Contains details about the response to the user.</p>
     * @public
     */
    finalResponse?: FinalResponse | undefined;
    /**
     * <p>Contains details about the response to reprompt the input.</p>
     * @public
     */
    repromptResponse?: RepromptResponse | undefined;
    /**
     * <p>Contains the JSON-formatted string returned by the API invoked by the code interpreter.</p>
     * @public
     */
    codeInterpreterInvocationOutput?: CodeInterpreterInvocationOutput | undefined;
}
/**
 * <p>Contains the reasoning, based on the input, that the agent uses to justify carrying out an action group or getting information from a knowledge base.</p>
 * @public
 */
export interface Rationale {
    /**
     * <p>The unique identifier of the trace step.</p>
     * @public
     */
    traceId?: string | undefined;
    /**
     * <p>The reasoning or thought process of the agent, based on the input.</p>
     * @public
     */
    text?: string | undefined;
}
/**
 * <p>Details about the orchestration step, in which the agent determines the order in which actions are executed and which knowledge bases are retrieved.</p>
 * @public
 */
export type OrchestrationTrace = OrchestrationTrace.InvocationInputMember | OrchestrationTrace.ModelInvocationInputMember | OrchestrationTrace.ModelInvocationOutputMember | OrchestrationTrace.ObservationMember | OrchestrationTrace.RationaleMember | OrchestrationTrace.$UnknownMember;
/**
 * @public
 */
export declare namespace OrchestrationTrace {
    /**
     * <p>Details about the reasoning, based on the input, that the agent uses to justify carrying out an action group or getting information from a knowledge base.</p>
     * @public
     */
    interface RationaleMember {
        rationale: Rationale;
        invocationInput?: never;
        observation?: never;
        modelInvocationInput?: never;
        modelInvocationOutput?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains information pertaining to the action group or knowledge base that is being invoked.</p>
     * @public
     */
    interface InvocationInputMember {
        rationale?: never;
        invocationInput: InvocationInput;
        observation?: never;
        modelInvocationInput?: never;
        modelInvocationOutput?: never;
        $unknown?: never;
    }
    /**
     * <p>Details about the observation (the output of the action group Lambda or knowledge base) made by the agent.</p>
     * @public
     */
    interface ObservationMember {
        rationale?: never;
        invocationInput?: never;
        observation: Observation;
        modelInvocationInput?: never;
        modelInvocationOutput?: never;
        $unknown?: never;
    }
    /**
     * <p>The input for the orchestration step.</p> <ul> <li> <p>The <code>type</code> is <code>ORCHESTRATION</code>.</p> </li> <li> <p>The <code>text</code> contains the prompt.</p> </li> <li> <p>The <code>inferenceConfiguration</code>, <code>parserMode</code>, and <code>overrideLambda</code> values are set in the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_PromptOverrideConfiguration.html">PromptOverrideConfiguration</a> object that was set when the agent was created or updated.</p> </li> </ul>
     * @public
     */
    interface ModelInvocationInputMember {
        rationale?: never;
        invocationInput?: never;
        observation?: never;
        modelInvocationInput: ModelInvocationInput;
        modelInvocationOutput?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains information pertaining to the output from the foundation model that is being invoked.</p>
     * @public
     */
    interface ModelInvocationOutputMember {
        rationale?: never;
        invocationInput?: never;
        observation?: never;
        modelInvocationInput?: never;
        modelInvocationOutput: OrchestrationModelInvocationOutput;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        rationale?: never;
        invocationInput?: never;
        observation?: never;
        modelInvocationInput?: never;
        modelInvocationOutput?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        rationale: (value: Rationale) => T;
        invocationInput: (value: InvocationInput) => T;
        observation: (value: Observation) => T;
        modelInvocationInput: (value: ModelInvocationInput) => T;
        modelInvocationOutput: (value: OrchestrationModelInvocationOutput) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: OrchestrationTrace, visitor: Visitor<T>) => T;
}
/**
 * <p>Details about the response from the Lambda parsing of the output from the post-processing step.</p>
 * @public
 */
export interface PostProcessingParsedResponse {
    /**
     * <p>The text returned by the parser.</p>
     * @public
     */
    text?: string | undefined;
}
/**
 * <p>The foundation model output from the post-processing step.</p>
 * @public
 */
export interface PostProcessingModelInvocationOutput {
    /**
     * <p>The unique identifier of the trace.</p>
     * @public
     */
    traceId?: string | undefined;
    /**
     * <p>Details about the response from the Lambda parsing of the output of the post-processing step.</p>
     * @public
     */
    parsedResponse?: PostProcessingParsedResponse | undefined;
    /**
     * <p> Details of the raw response from the foundation model output. </p>
     * @public
     */
    rawResponse?: RawResponse | undefined;
    /**
     * <p> Contains information about the foundation model output from the post-processing step. </p>
     * @public
     */
    metadata?: Metadata | undefined;
    /**
     * <p>Contains content about the reasoning that the model made during the post-processing step.</p>
     * @public
     */
    reasoningContent?: ReasoningContentBlock | undefined;
}
/**
 * <p>Details about the post-processing step, in which the agent shapes the response.</p>
 * @public
 */
export type PostProcessingTrace = PostProcessingTrace.ModelInvocationInputMember | PostProcessingTrace.ModelInvocationOutputMember | PostProcessingTrace.$UnknownMember;
/**
 * @public
 */
export declare namespace PostProcessingTrace {
    /**
     * <p>The input for the post-processing step.</p> <ul> <li> <p>The <code>type</code> is <code>POST_PROCESSING</code>.</p> </li> <li> <p>The <code>text</code> contains the prompt.</p> </li> <li> <p>The <code>inferenceConfiguration</code>, <code>parserMode</code>, and <code>overrideLambda</code> values are set in the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_PromptOverrideConfiguration.html">PromptOverrideConfiguration</a> object that was set when the agent was created or updated.</p> </li> </ul>
     * @public
     */
    interface ModelInvocationInputMember {
        modelInvocationInput: ModelInvocationInput;
        modelInvocationOutput?: never;
        $unknown?: never;
    }
    /**
     * <p>The foundation model output from the post-processing step.</p>
     * @public
     */
    interface ModelInvocationOutputMember {
        modelInvocationInput?: never;
        modelInvocationOutput: PostProcessingModelInvocationOutput;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        modelInvocationInput?: never;
        modelInvocationOutput?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        modelInvocationInput: (value: ModelInvocationInput) => T;
        modelInvocationOutput: (value: PostProcessingModelInvocationOutput) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: PostProcessingTrace, visitor: Visitor<T>) => T;
}
/**
 * <p>Details about the response from the Lambda parsing of the output from the pre-processing step.</p>
 * @public
 */
export interface PreProcessingParsedResponse {
    /**
     * <p>The text returned by the parsing of the pre-processing step, explaining the steps that the agent plans to take in orchestration, if the user input is valid.</p>
     * @public
     */
    rationale?: string | undefined;
    /**
     * <p>Whether the user input is valid or not. If <code>false</code>, the agent doesn't proceed to orchestration.</p>
     * @public
     */
    isValid?: boolean | undefined;
}
/**
 * <p>The foundation model output from the pre-processing step.</p>
 * @public
 */
export interface PreProcessingModelInvocationOutput {
    /**
     * <p>The unique identifier of the trace.</p>
     * @public
     */
    traceId?: string | undefined;
    /**
     * <p>Details about the response from the Lambda parsing of the output of the pre-processing step.</p>
     * @public
     */
    parsedResponse?: PreProcessingParsedResponse | undefined;
    /**
     * <p> Details of the raw response from the foundation model output. </p>
     * @public
     */
    rawResponse?: RawResponse | undefined;
    /**
     * <p> Contains information about the foundation model output from the pre-processing step. </p>
     * @public
     */
    metadata?: Metadata | undefined;
    /**
     * <p>Contains content about the reasoning that the model made during the pre-processing step. </p>
     * @public
     */
    reasoningContent?: ReasoningContentBlock | undefined;
}
/**
 * <p>Details about the pre-processing step, in which the agent contextualizes and categorizes user inputs.</p>
 * @public
 */
export type PreProcessingTrace = PreProcessingTrace.ModelInvocationInputMember | PreProcessingTrace.ModelInvocationOutputMember | PreProcessingTrace.$UnknownMember;
/**
 * @public
 */
export declare namespace PreProcessingTrace {
    /**
     * <p>The input for the pre-processing step.</p> <ul> <li> <p>The <code>type</code> is <code>PRE_PROCESSING</code>.</p> </li> <li> <p>The <code>text</code> contains the prompt.</p> </li> <li> <p>The <code>inferenceConfiguration</code>, <code>parserMode</code>, and <code>overrideLambda</code> values are set in the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_PromptOverrideConfiguration.html">PromptOverrideConfiguration</a> object that was set when the agent was created or updated.</p> </li> </ul>
     * @public
     */
    interface ModelInvocationInputMember {
        modelInvocationInput: ModelInvocationInput;
        modelInvocationOutput?: never;
        $unknown?: never;
    }
    /**
     * <p>The foundation model output from the pre-processing step.</p>
     * @public
     */
    interface ModelInvocationOutputMember {
        modelInvocationInput?: never;
        modelInvocationOutput: PreProcessingModelInvocationOutput;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        modelInvocationInput?: never;
        modelInvocationOutput?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        modelInvocationInput: (value: ModelInvocationInput) => T;
        modelInvocationOutput: (value: PreProcessingModelInvocationOutput) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: PreProcessingTrace, visitor: Visitor<T>) => T;
}
/**
 * <p>Invocation output from a routing classifier model.</p>
 * @public
 */
export interface RoutingClassifierModelInvocationOutput {
    /**
     * <p>The invocation's trace ID.</p>
     * @public
     */
    traceId?: string | undefined;
    /**
     * <p>The invocation's raw response.</p>
     * @public
     */
    rawResponse?: RawResponse | undefined;
    /**
     * <p>The invocation's metadata.</p>
     * @public
     */
    metadata?: Metadata | undefined;
}
/**
 * <p>A trace for a routing classifier.</p>
 * @public
 */
export type RoutingClassifierTrace = RoutingClassifierTrace.InvocationInputMember | RoutingClassifierTrace.ModelInvocationInputMember | RoutingClassifierTrace.ModelInvocationOutputMember | RoutingClassifierTrace.ObservationMember | RoutingClassifierTrace.$UnknownMember;
/**
 * @public
 */
export declare namespace RoutingClassifierTrace {
    /**
     * <p>The classifier's invocation input.</p>
     * @public
     */
    interface InvocationInputMember {
        invocationInput: InvocationInput;
        observation?: never;
        modelInvocationInput?: never;
        modelInvocationOutput?: never;
        $unknown?: never;
    }
    /**
     * <p>The classifier's observation.</p>
     * @public
     */
    interface ObservationMember {
        invocationInput?: never;
        observation: Observation;
        modelInvocationInput?: never;
        modelInvocationOutput?: never;
        $unknown?: never;
    }
    /**
     * <p>The classifier's model invocation input.</p>
     * @public
     */
    interface ModelInvocationInputMember {
        invocationInput?: never;
        observation?: never;
        modelInvocationInput: ModelInvocationInput;
        modelInvocationOutput?: never;
        $unknown?: never;
    }
    /**
     * <p>The classifier's model invocation output.</p>
     * @public
     */
    interface ModelInvocationOutputMember {
        invocationInput?: never;
        observation?: never;
        modelInvocationInput?: never;
        modelInvocationOutput: RoutingClassifierModelInvocationOutput;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        invocationInput?: never;
        observation?: never;
        modelInvocationInput?: never;
        modelInvocationOutput?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        invocationInput: (value: InvocationInput) => T;
        observation: (value: Observation) => T;
        modelInvocationInput: (value: ModelInvocationInput) => T;
        modelInvocationOutput: (value: RoutingClassifierModelInvocationOutput) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: RoutingClassifierTrace, visitor: Visitor<T>) => T;
}
/**
 * <p>Contains one part of the agent's reasoning process and results from calling API actions and querying knowledge bases. You can use the trace to understand how the agent arrived at the response it provided the customer. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-test.html#trace-enablement">Trace enablement</a>.</p>
 * @public
 */
export type Trace = Trace.CustomOrchestrationTraceMember | Trace.FailureTraceMember | Trace.GuardrailTraceMember | Trace.OrchestrationTraceMember | Trace.PostProcessingTraceMember | Trace.PreProcessingTraceMember | Trace.RoutingClassifierTraceMember | Trace.$UnknownMember;
/**
 * @public
 */
export declare namespace Trace {
    /**
     * <p>The trace details for a trace defined in the Guardrail filter.</p>
     * @public
     */
    interface GuardrailTraceMember {
        guardrailTrace: GuardrailTrace;
        preProcessingTrace?: never;
        orchestrationTrace?: never;
        postProcessingTrace?: never;
        routingClassifierTrace?: never;
        failureTrace?: never;
        customOrchestrationTrace?: never;
        $unknown?: never;
    }
    /**
     * <p>Details about the pre-processing step, in which the agent contextualizes and categorizes user inputs.</p>
     * @public
     */
    interface PreProcessingTraceMember {
        guardrailTrace?: never;
        preProcessingTrace: PreProcessingTrace;
        orchestrationTrace?: never;
        postProcessingTrace?: never;
        routingClassifierTrace?: never;
        failureTrace?: never;
        customOrchestrationTrace?: never;
        $unknown?: never;
    }
    /**
     * <p>Details about the orchestration step, in which the agent determines the order in which actions are executed and which knowledge bases are retrieved.</p>
     * @public
     */
    interface OrchestrationTraceMember {
        guardrailTrace?: never;
        preProcessingTrace?: never;
        orchestrationTrace: OrchestrationTrace;
        postProcessingTrace?: never;
        routingClassifierTrace?: never;
        failureTrace?: never;
        customOrchestrationTrace?: never;
        $unknown?: never;
    }
    /**
     * <p>Details about the post-processing step, in which the agent shapes the response..</p>
     * @public
     */
    interface PostProcessingTraceMember {
        guardrailTrace?: never;
        preProcessingTrace?: never;
        orchestrationTrace?: never;
        postProcessingTrace: PostProcessingTrace;
        routingClassifierTrace?: never;
        failureTrace?: never;
        customOrchestrationTrace?: never;
        $unknown?: never;
    }
    /**
     * <p>A routing classifier's trace.</p>
     * @public
     */
    interface RoutingClassifierTraceMember {
        guardrailTrace?: never;
        preProcessingTrace?: never;
        orchestrationTrace?: never;
        postProcessingTrace?: never;
        routingClassifierTrace: RoutingClassifierTrace;
        failureTrace?: never;
        customOrchestrationTrace?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains information about the failure of the interaction.</p>
     * @public
     */
    interface FailureTraceMember {
        guardrailTrace?: never;
        preProcessingTrace?: never;
        orchestrationTrace?: never;
        postProcessingTrace?: never;
        routingClassifierTrace?: never;
        failureTrace: FailureTrace;
        customOrchestrationTrace?: never;
        $unknown?: never;
    }
    /**
     * <p> Details about the custom orchestration step in which the agent determines the order in which actions are executed. </p>
     * @public
     */
    interface CustomOrchestrationTraceMember {
        guardrailTrace?: never;
        preProcessingTrace?: never;
        orchestrationTrace?: never;
        postProcessingTrace?: never;
        routingClassifierTrace?: never;
        failureTrace?: never;
        customOrchestrationTrace: CustomOrchestrationTrace;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        guardrailTrace?: never;
        preProcessingTrace?: never;
        orchestrationTrace?: never;
        postProcessingTrace?: never;
        routingClassifierTrace?: never;
        failureTrace?: never;
        customOrchestrationTrace?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        guardrailTrace: (value: GuardrailTrace) => T;
        preProcessingTrace: (value: PreProcessingTrace) => T;
        orchestrationTrace: (value: OrchestrationTrace) => T;
        postProcessingTrace: (value: PostProcessingTrace) => T;
        routingClassifierTrace: (value: RoutingClassifierTrace) => T;
        failureTrace: (value: FailureTrace) => T;
        customOrchestrationTrace: (value: CustomOrchestrationTrace) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: Trace, visitor: Visitor<T>) => T;
}
/**
 * <p>Contains information about the agent and session, alongside the agent's reasoning process and results from calling API actions and querying knowledge bases and metadata about the trace. You can use the trace to understand how the agent arrived at the response it provided the customer. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-test.html#trace-enablement">Trace enablement</a>.</p>
 * @public
 */
export interface TracePart {
    /**
     * <p>The unique identifier of the session with the agent.</p>
     * @public
     */
    sessionId?: string | undefined;
    /**
     * <p>Contains one part of the agent's reasoning process and results from calling API actions and querying knowledge bases. You can use the trace to understand how the agent arrived at the response it provided the customer. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-test.html#trace-enablement">Trace enablement</a>.</p>
     * @public
     */
    trace?: Trace | undefined;
    /**
     * <p>The part's caller chain.</p>
     * @public
     */
    callerChain?: Caller[] | undefined;
    /**
     * <p> The time of the trace. </p>
     * @public
     */
    eventTime?: Date | undefined;
    /**
     * <p>The part's collaborator name.</p>
     * @public
     */
    collaboratorName?: string | undefined;
    /**
     * <p>The unique identifier of the agent.</p>
     * @public
     */
    agentId?: string | undefined;
    /**
     * <p>The unique identifier of the alias of the agent.</p>
     * @public
     */
    agentAliasId?: string | undefined;
    /**
     * <p>The version of the agent.</p>
     * @public
     */
    agentVersion?: string | undefined;
}
/**
 * <p>The response from invoking the agent and associated citations and trace information.</p>
 * @public
 */
export type ResponseStream = ResponseStream.AccessDeniedExceptionMember | ResponseStream.BadGatewayExceptionMember | ResponseStream.ChunkMember | ResponseStream.ConflictExceptionMember | ResponseStream.DependencyFailedExceptionMember | ResponseStream.FilesMember | ResponseStream.InternalServerExceptionMember | ResponseStream.ModelNotReadyExceptionMember | ResponseStream.ResourceNotFoundExceptionMember | ResponseStream.ReturnControlMember | ResponseStream.ServiceQuotaExceededExceptionMember | ResponseStream.ThrottlingExceptionMember | ResponseStream.TraceMember | ResponseStream.ValidationExceptionMember | ResponseStream.$UnknownMember;
/**
 * @public
 */
export declare namespace ResponseStream {
    /**
     * <p>Contains a part of an agent response and citations for it.</p>
     * @public
     */
    interface ChunkMember {
        chunk: PayloadPart;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        modelNotReadyException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains information about the agent and session, alongside the agent's reasoning process and results from calling actions and querying knowledge bases and metadata about the trace. You can use the trace to understand how the agent arrived at the response it provided the customer. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/trace-events.html">Trace events</a>.</p>
     * @public
     */
    interface TraceMember {
        chunk?: never;
        trace: TracePart;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        modelNotReadyException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains the parameters and information that the agent elicited from the customer to carry out an action. This information is returned to the system and can be used in your own setup for fulfilling the action.</p>
     * @public
     */
    interface ReturnControlMember {
        chunk?: never;
        trace?: never;
        returnControl: ReturnControlPayload;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        modelNotReadyException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>An internal server error occurred. Retry your request.</p>
     * @public
     */
    interface InternalServerExceptionMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException: InternalServerException;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        modelNotReadyException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>Input validation failed. Check your request parameters and retry the request.</p>
     * @public
     */
    interface ValidationExceptionMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException: ValidationException;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        modelNotReadyException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>The specified resource Amazon Resource Name (ARN) was not found. Check the Amazon Resource Name (ARN) and try your request again.</p>
     * @public
     */
    interface ResourceNotFoundExceptionMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException: ResourceNotFoundException;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        modelNotReadyException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>The number of requests exceeds the service quota. Resubmit your request later.</p>
     * @public
     */
    interface ServiceQuotaExceededExceptionMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException: ServiceQuotaExceededException;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        modelNotReadyException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>The number of requests exceeds the limit. Resubmit your request later.</p>
     * @public
     */
    interface ThrottlingExceptionMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException: ThrottlingException;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        modelNotReadyException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>The request is denied because of missing access permissions. Check your permissions and retry your request.</p>
     * @public
     */
    interface AccessDeniedExceptionMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException: AccessDeniedException;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        modelNotReadyException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>There was a conflict performing an operation. Resolve the conflict and retry your request.</p>
     * @public
     */
    interface ConflictExceptionMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException: ConflictException;
        dependencyFailedException?: never;
        badGatewayException?: never;
        modelNotReadyException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>There was an issue with a dependency. Check the resource configurations and retry the request.</p>
     * @public
     */
    interface DependencyFailedExceptionMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException: DependencyFailedException;
        badGatewayException?: never;
        modelNotReadyException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>There was an issue with a dependency due to a server issue. Retry your request.</p>
     * @public
     */
    interface BadGatewayExceptionMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException: BadGatewayException;
        modelNotReadyException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p> The model specified in the request is not ready to serve Inference requests. The AWS SDK will automatically retry the operation up to 5 times. For information about configuring automatic retries, see <a href="https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html">Retry behavior</a> in the <i>AWS SDKs and Tools</i> reference guide. </p>
     * @public
     */
    interface ModelNotReadyExceptionMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        modelNotReadyException: ModelNotReadyException;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains intermediate response for code interpreter if any files have been generated.</p>
     * @public
     */
    interface FilesMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        modelNotReadyException?: never;
        files: FilePart;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        modelNotReadyException?: never;
        files?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        chunk: (value: PayloadPart) => T;
        trace: (value: TracePart) => T;
        returnControl: (value: ReturnControlPayload) => T;
        internalServerException: (value: InternalServerException) => T;
        validationException: (value: ValidationException) => T;
        resourceNotFoundException: (value: ResourceNotFoundException) => T;
        serviceQuotaExceededException: (value: ServiceQuotaExceededException) => T;
        throttlingException: (value: ThrottlingException) => T;
        accessDeniedException: (value: AccessDeniedException) => T;
        conflictException: (value: ConflictException) => T;
        dependencyFailedException: (value: DependencyFailedException) => T;
        badGatewayException: (value: BadGatewayException) => T;
        modelNotReadyException: (value: ModelNotReadyException) => T;
        files: (value: FilePart) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: ResponseStream, visitor: Visitor<T>) => T;
}
/**
 * @public
 */
export interface InvokeAgentResponse {
    /**
     * <p>The agent's response to the user prompt.</p>
     * @public
     */
    completion: AsyncIterable<ResponseStream> | undefined;
    /**
     * <p>The MIME type of the input data in the request. The default value is <code>application/json</code>.</p>
     * @public
     */
    contentType: string | undefined;
    /**
     * <p>The unique identifier of the session with the agent.</p>
     * @public
     */
    sessionId: string | undefined;
    /**
     * <p>The unique identifier of the agent memory.</p>
     * @public
     */
    memoryId?: string | undefined;
}
/**
 * <p>Settings for a model called with <a>InvokeInlineAgent</a>.</p>
 * @public
 */
export interface InlineBedrockModelConfigurations {
    /**
     * <p>The latency configuration for the model.</p>
     * @public
     */
    performanceConfig?: PerformanceConfiguration | undefined;
}
/**
 * @public
 * @enum
 */
export declare const RelayConversationHistory: {
    readonly DISABLED: "DISABLED";
    readonly TO_COLLABORATOR: "TO_COLLABORATOR";
};
/**
 * @public
 */
export type RelayConversationHistory = (typeof RelayConversationHistory)[keyof typeof RelayConversationHistory];
/**
 * <p> Settings of an inline collaborator agent. </p>
 * @public
 */
export interface CollaboratorConfiguration {
    /**
     * <p> Name of the inline collaborator agent which must be the same name as specified for <code>agentName</code>. </p>
     * @public
     */
    collaboratorName: string | undefined;
    /**
     * <p> Instructions that tell the inline collaborator agent what it should do and how it should interact with users. </p>
     * @public
     */
    collaboratorInstruction: string | undefined;
    /**
     * <p> The Amazon Resource Name (ARN) of the inline collaborator agent. </p>
     * @public
     */
    agentAliasArn?: string | undefined;
    /**
     * <p> A relay conversation history for the inline collaborator agent. </p>
     * @public
     */
    relayConversationHistory?: RelayConversationHistory | undefined;
}
/**
 * <p> The configuration details for the guardrail. </p>
 * @public
 */
export interface GuardrailConfigurationWithArn {
    /**
     * <p> The unique identifier for the guardrail. </p>
     * @public
     */
    guardrailIdentifier: string | undefined;
    /**
     * <p> The version of the guardrail. </p>
     * @public
     */
    guardrailVersion: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const PromptState: {
    readonly DISABLED: "DISABLED";
    readonly ENABLED: "ENABLED";
};
/**
 * @public
 */
export type PromptState = (typeof PromptState)[keyof typeof PromptState];
/**
 * <p> Contains configurations to override a prompt template in one part of an agent sequence. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/advanced-prompts.html">Advanced prompts</a>. </p>
 * @public
 */
export interface PromptConfiguration {
    /**
     * <p> The step in the agent sequence that this prompt configuration applies to. </p>
     * @public
     */
    promptType?: PromptType | undefined;
    /**
     * <p>Specifies whether to override the default prompt template for this <code>promptType</code>. Set this value to <code>OVERRIDDEN</code> to use the prompt that you provide in the <code>basePromptTemplate</code>. If you leave it as <code>DEFAULT</code>, the agent uses a default prompt template.</p>
     * @public
     */
    promptCreationMode?: CreationMode | undefined;
    /**
     * <p>Specifies whether to allow the inline agent to carry out the step specified in the <code>promptType</code>. If you set this value to <code>DISABLED</code>, the agent skips that step. The default state for each <code>promptType</code> is as follows.</p> <ul> <li> <p> <code>PRE_PROCESSING</code> – <code>ENABLED</code> </p> </li> <li> <p> <code>ORCHESTRATION</code> – <code>ENABLED</code> </p> </li> <li> <p> <code>KNOWLEDGE_BASE_RESPONSE_GENERATION</code> – <code>ENABLED</code> </p> </li> <li> <p> <code>POST_PROCESSING</code> – <code>DISABLED</code> </p> </li> </ul>
     * @public
     */
    promptState?: PromptState | undefined;
    /**
     * <p>Defines the prompt template with which to replace the default prompt template. You can use placeholder variables in the base prompt template to customize the prompt. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-placeholders.html">Prompt template placeholder variables</a>. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/advanced-prompts-configure.html">Configure the prompt templates</a>.</p>
     * @public
     */
    basePromptTemplate?: string | undefined;
    /**
     * <p>Contains inference parameters to use when the agent invokes a foundation model in the part of the agent sequence defined by the <code>promptType</code>. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html">Inference parameters for foundation models</a>.</p>
     * @public
     */
    inferenceConfiguration?: InferenceConfiguration | undefined;
    /**
     * <p>Specifies whether to override the default parser Lambda function when parsing the raw foundation model output in the part of the agent sequence defined by the <code>promptType</code>. If you set the field as <code>OVERRIDDEN</code>, the <code>overrideLambda</code> field in the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_PromptOverrideConfiguration.html">PromptOverrideConfiguration</a> must be specified with the ARN of a Lambda function.</p>
     * @public
     */
    parserMode?: CreationMode | undefined;
    /**
     * <p> The foundation model to use. </p>
     * @public
     */
    foundationModel?: string | undefined;
    /**
     * <p>If the Converse or ConverseStream operations support the model, <code>additionalModelRequestFields</code> contains additional inference parameters, beyond the base set of inference parameters in the <code>inferenceConfiguration</code> field. </p> <p>For more information, see <i>Inference request parameters and response fields for foundation models</i> in the Amazon Bedrock user guide.</p>
     * @public
     */
    additionalModelRequestFields?: __DocumentType | undefined;
}
/**
 * <p>Contains configurations to override prompts in different parts of an agent sequence. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/advanced-prompts.html">Advanced prompts</a>. </p>
 * @public
 */
export interface PromptOverrideConfiguration {
    /**
     * <p>Contains configurations to override a prompt template in one part of an agent sequence. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/advanced-prompts.html">Advanced prompts</a>. </p>
     * @public
     */
    promptConfigurations: PromptConfiguration[] | undefined;
    /**
     * <p>The ARN of the Lambda function to use when parsing the raw foundation model output in parts of the agent sequence. If you specify this field, at least one of the <code>promptConfigurations</code> must contain a <code>parserMode</code> value that is set to <code>OVERRIDDEN</code>. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/lambda-parser.html">Parser Lambda function in Amazon Bedrock Agents</a>. </p>
     * @public
     */
    overrideLambda?: string | undefined;
}
/**
 * <p>The structure of the executor invoking the actions in custom orchestration.</p>
 * @public
 */
export type OrchestrationExecutor = OrchestrationExecutor.LambdaMember | OrchestrationExecutor.$UnknownMember;
/**
 * @public
 */
export declare namespace OrchestrationExecutor {
    /**
     * <p>The Amazon Resource Name (ARN) of the Lambda function containing the business logic that is carried out upon invoking the action. </p>
     * @public
     */
    interface LambdaMember {
        lambda: string;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        lambda?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        lambda: (value: string) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: OrchestrationExecutor, visitor: Visitor<T>) => T;
}
/**
 * <p>Contains details of the custom orchestration configured for the agent. </p>
 * @public
 */
export interface CustomOrchestration {
    /**
     * <p>The structure of the executor invoking the actions in custom orchestration. </p>
     * @public
     */
    executor?: OrchestrationExecutor | undefined;
}
/**
 * <p> Contains parameters that specify various attributes that persist across a session or prompt. You can define session state attributes as key-value pairs when writing a <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-lambda.html">Lambda function</a> for an action group or pass them when making an <code>InvokeInlineAgent</code> request. Use session state attributes to control and provide conversational context for your inline agent and to help customize your agent's behavior. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-session-state.html">Control session context</a> </p>
 * @public
 */
export interface InlineSessionState {
    /**
     * <p> Contains attributes that persist across a session and the values of those attributes. </p>
     * @public
     */
    sessionAttributes?: Record<string, string> | undefined;
    /**
     * <p> Contains attributes that persist across a session and the values of those attributes. </p>
     * @public
     */
    promptSessionAttributes?: Record<string, string> | undefined;
    /**
     * <p> Contains information about the results from the action group invocation. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-returncontrol.html">Return control to the agent developer</a>. </p> <note> <p>If you include this field in the <code>sessionState</code> field, the <code>inputText</code> field will be ignored.</p> </note>
     * @public
     */
    returnControlInvocationResults?: InvocationResultMember[] | undefined;
    /**
     * <p> The identifier of the invocation of an action. This value must match the <code>invocationId</code> returned in the <code>InvokeInlineAgent</code> response for the action whose results are provided in the <code>returnControlInvocationResults</code> field. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-returncontrol.html">Return control to the agent developer</a>. </p>
     * @public
     */
    invocationId?: string | undefined;
    /**
     * <p> Contains information about the files used by code interpreter. </p>
     * @public
     */
    files?: InputFile[] | undefined;
    /**
     * <p> Contains the conversation history that persist across sessions. </p>
     * @public
     */
    conversationHistory?: ConversationHistory | undefined;
}
/**
 * @public
 * @enum
 */
export declare const OrchestrationType: {
    readonly CUSTOM_ORCHESTRATION: "CUSTOM_ORCHESTRATION";
    readonly DEFAULT: "DEFAULT";
};
/**
 * @public
 */
export type OrchestrationType = (typeof OrchestrationType)[keyof typeof OrchestrationType];
/**
 * <p>Contains a part of an agent response and citations for it. </p>
 * @public
 */
export interface InlineAgentPayloadPart {
    /**
     * <p>A part of the agent response in bytes.</p>
     * @public
     */
    bytes?: Uint8Array | undefined;
    /**
     * <p>Contains citations for a part of an agent response.</p>
     * @public
     */
    attribution?: Attribution | undefined;
}
/**
 * <p>Contains intermediate response for code interpreter if any files have been generated.</p>
 * @public
 */
export interface InlineAgentFilePart {
    /**
     * <p>Files containing intermediate response for the user.</p>
     * @public
     */
    files?: OutputFile[] | undefined;
}
/**
 * <p>Contains information to return from the action group that the agent has predicted to invoke.</p> <p>This data type is used in the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html#API_agent-runtime_InvokeAgent_ResponseSyntax">InvokeAgent response</a> API operation.</p>
 * @public
 */
export interface InlineAgentReturnControlPayload {
    /**
     * <p>A list of objects that contain information about the parameters and inputs that need to be sent into the API operation or function, based on what the agent determines from its session with the user.</p>
     * @public
     */
    invocationInputs?: InvocationInputMember[] | undefined;
    /**
     * <p>The identifier of the action group invocation. </p>
     * @public
     */
    invocationId?: string | undefined;
}
/**
 * <p>Contains information about the agent and session, alongside the agent's reasoning process and results from calling API actions and querying knowledge bases and metadata about the trace. You can use the trace to understand how the agent arrived at the response it provided the customer. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-test.html#trace-enablement">Trace enablement</a>.</p>
 * @public
 */
export interface InlineAgentTracePart {
    /**
     * <p>The unique identifier of the session with the agent.</p>
     * @public
     */
    sessionId?: string | undefined;
    /**
     * <p>Contains one part of the agent's reasoning process and results from calling API actions and querying knowledge bases. You can use the trace to understand how the agent arrived at the response it provided the customer. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-test.html#trace-enablement">Trace enablement</a>. </p>
     * @public
     */
    trace?: Trace | undefined;
    /**
     * <p>The caller chain for the trace part.</p>
     * @public
     */
    callerChain?: Caller[] | undefined;
    /**
     * <p>The time that trace occurred. </p>
     * @public
     */
    eventTime?: Date | undefined;
    /**
     * <p>The collaborator name for the trace part.</p>
     * @public
     */
    collaboratorName?: string | undefined;
}
/**
 * <p>The response from invoking the agent and associated citations and trace information.</p>
 * @public
 */
export type InlineAgentResponseStream = InlineAgentResponseStream.AccessDeniedExceptionMember | InlineAgentResponseStream.BadGatewayExceptionMember | InlineAgentResponseStream.ChunkMember | InlineAgentResponseStream.ConflictExceptionMember | InlineAgentResponseStream.DependencyFailedExceptionMember | InlineAgentResponseStream.FilesMember | InlineAgentResponseStream.InternalServerExceptionMember | InlineAgentResponseStream.ResourceNotFoundExceptionMember | InlineAgentResponseStream.ReturnControlMember | InlineAgentResponseStream.ServiceQuotaExceededExceptionMember | InlineAgentResponseStream.ThrottlingExceptionMember | InlineAgentResponseStream.TraceMember | InlineAgentResponseStream.ValidationExceptionMember | InlineAgentResponseStream.$UnknownMember;
/**
 * @public
 */
export declare namespace InlineAgentResponseStream {
    /**
     * <p>Contains a part of an agent response and citations for it.</p>
     * @public
     */
    interface ChunkMember {
        chunk: InlineAgentPayloadPart;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains information about the agent and session, alongside the agent's reasoning process and results from calling actions and querying knowledge bases and metadata about the trace. You can use the trace to understand how the agent arrived at the response it provided the customer. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/trace-events.html">Trace events</a>. </p>
     * @public
     */
    interface TraceMember {
        chunk?: never;
        trace: InlineAgentTracePart;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains the parameters and information that the agent elicited from the customer to carry out an action. This information is returned to the system and can be used in your own setup for fulfilling the action.</p>
     * @public
     */
    interface ReturnControlMember {
        chunk?: never;
        trace?: never;
        returnControl: InlineAgentReturnControlPayload;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>An internal server error occurred. Retry your request.</p>
     * @public
     */
    interface InternalServerExceptionMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException: InternalServerException;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>Input validation failed. Check your request parameters and retry the request.</p>
     * @public
     */
    interface ValidationExceptionMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException: ValidationException;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>The specified resource Amazon Resource Name (ARN) was not found. Check the Amazon Resource Name (ARN) and try your request again. </p>
     * @public
     */
    interface ResourceNotFoundExceptionMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException: ResourceNotFoundException;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>The number of requests exceeds the service quota. Resubmit your request later.</p>
     * @public
     */
    interface ServiceQuotaExceededExceptionMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException: ServiceQuotaExceededException;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>The number of requests exceeds the limit. Resubmit your request later.</p>
     * @public
     */
    interface ThrottlingExceptionMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException: ThrottlingException;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>The request is denied because of missing access permissions. Check your permissions and retry your request.</p>
     * @public
     */
    interface AccessDeniedExceptionMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException: AccessDeniedException;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>There was a conflict performing an operation. Resolve the conflict and retry your request. </p>
     * @public
     */
    interface ConflictExceptionMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException: ConflictException;
        dependencyFailedException?: never;
        badGatewayException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>There was an issue with a dependency. Check the resource configurations and retry the request.</p>
     * @public
     */
    interface DependencyFailedExceptionMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException: DependencyFailedException;
        badGatewayException?: never;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>There was an issue with a dependency due to a server issue. Retry your request. </p>
     * @public
     */
    interface BadGatewayExceptionMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException: BadGatewayException;
        files?: never;
        $unknown?: never;
    }
    /**
     * <p>Contains intermediate response for code interpreter if any files have been generated.</p>
     * @public
     */
    interface FilesMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        files: InlineAgentFilePart;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        chunk?: never;
        trace?: never;
        returnControl?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        files?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        chunk: (value: InlineAgentPayloadPart) => T;
        trace: (value: InlineAgentTracePart) => T;
        returnControl: (value: InlineAgentReturnControlPayload) => T;
        internalServerException: (value: InternalServerException) => T;
        validationException: (value: ValidationException) => T;
        resourceNotFoundException: (value: ResourceNotFoundException) => T;
        serviceQuotaExceededException: (value: ServiceQuotaExceededException) => T;
        throttlingException: (value: ThrottlingException) => T;
        accessDeniedException: (value: AccessDeniedException) => T;
        conflictException: (value: ConflictException) => T;
        dependencyFailedException: (value: DependencyFailedException) => T;
        badGatewayException: (value: BadGatewayException) => T;
        files: (value: InlineAgentFilePart) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: InlineAgentResponseStream, visitor: Visitor<T>) => T;
}
/**
 * @public
 */
export interface InvokeInlineAgentResponse {
    /**
     * <p>The inline agent's response to the user prompt. </p>
     * @public
     */
    completion: AsyncIterable<InlineAgentResponseStream> | undefined;
    /**
     * <p> The MIME type of the input data in the request. The default value is application/json. </p>
     * @public
     */
    contentType: string | undefined;
    /**
     * <p> The unique identifier of the session with the agent. </p>
     * @public
     */
    sessionId: string | undefined;
}
/**
 * @public
 */
export interface DeleteAgentMemoryRequest {
    /**
     * <p>The unique identifier of the agent to which the alias belongs.</p>
     * @public
     */
    agentId: string | undefined;
    /**
     * <p>The unique identifier of an alias of an agent.</p>
     * @public
     */
    agentAliasId: string | undefined;
    /**
     * <p>The unique identifier of the memory.</p>
     * @public
     */
    memoryId?: string | undefined;
    /**
     * <p>The unique session identifier of the memory.</p>
     * @public
     */
    sessionId?: string | undefined;
}
/**
 * @public
 */
export interface DeleteAgentMemoryResponse {
}
/**
 * @public
 * @enum
 */
export declare const MemoryType: {
    readonly SESSION_SUMMARY: "SESSION_SUMMARY";
};
/**
 * @public
 */
export type MemoryType = (typeof MemoryType)[keyof typeof MemoryType];
/**
 * @public
 */
export interface GetAgentMemoryRequest {
    /**
     * <p>If the total number of results is greater than the maxItems value provided in the request, enter the token returned in the <code>nextToken</code> field in the response in this field to return the next batch of results.</p>
     * @public
     */
    nextToken?: string | undefined;
    /**
     * <p>The maximum number of items to return in the response. If the total number of results is greater than this value, use the token returned in the response in the <code>nextToken</code> field when making another request to return the next batch of results.</p>
     * @public
     */
    maxItems?: number | undefined;
    /**
     * <p>The unique identifier of the agent to which the alias belongs.</p>
     * @public
     */
    agentId: string | undefined;
    /**
     * <p>The unique identifier of an alias of an agent.</p>
     * @public
     */
    agentAliasId: string | undefined;
    /**
     * <p>The type of memory.</p>
     * @public
     */
    memoryType: MemoryType | undefined;
    /**
     * <p>The unique identifier of the memory. </p>
     * @public
     */
    memoryId: string | undefined;
}
/**
 * <p>Contains details of a session summary.</p>
 * @public
 */
export interface MemorySessionSummary {
    /**
     * <p>The unique identifier of the memory where the session summary is stored.</p>
     * @public
     */
    memoryId?: string | undefined;
    /**
     * <p>The identifier for this session.</p>
     * @public
     */
    sessionId?: string | undefined;
    /**
     * <p>The start time for this session.</p>
     * @public
     */
    sessionStartTime?: Date | undefined;
    /**
     * <p>The time when the memory duration for the session is set to end.</p>
     * @public
     */
    sessionExpiryTime?: Date | undefined;
    /**
     * <p>The summarized text for this session.</p>
     * @public
     */
    summaryText?: string | undefined;
}
/**
 * <p>Contains sessions summaries.</p>
 * @public
 */
export type Memory = Memory.SessionSummaryMember | Memory.$UnknownMember;
/**
 * @public
 */
export declare namespace Memory {
    /**
     * <p>Contains summary of a session.</p>
     * @public
     */
    interface SessionSummaryMember {
        sessionSummary: MemorySessionSummary;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        sessionSummary?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        sessionSummary: (value: MemorySessionSummary) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: Memory, visitor: Visitor<T>) => T;
}
/**
 * @public
 */
export interface GetAgentMemoryResponse {
    /**
     * <p>If the total number of results is greater than the maxItems value provided in the request, use this token when making another request in the <code>nextToken</code> field to return the next batch of results.</p>
     * @public
     */
    nextToken?: string | undefined;
    /**
     * <p>Contains details of the sessions stored in the memory</p>
     * @public
     */
    memoryContents?: Memory[] | undefined;
}
/**
 * <p>Contains information about the text prompt to optimize.</p>
 * @public
 */
export interface TextPrompt {
    /**
     * <p>The text in the text prompt to optimize.</p>
     * @public
     */
    text: string | undefined;
}
/**
 * <p>Contains information about the prompt to optimize.</p>
 * @public
 */
export type InputPrompt = InputPrompt.TextPromptMember | InputPrompt.$UnknownMember;
/**
 * @public
 */
export declare namespace InputPrompt {
    /**
     * <p>Contains information about the text prompt to optimize.</p>
     * @public
     */
    interface TextPromptMember {
        textPrompt: TextPrompt;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        textPrompt?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        textPrompt: (value: TextPrompt) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: InputPrompt, visitor: Visitor<T>) => T;
}
/**
 * @public
 */
export interface OptimizePromptRequest {
    /**
     * <p>Contains the prompt to optimize.</p>
     * @public
     */
    input: InputPrompt | undefined;
    /**
     * <p>The unique identifier of the model that you want to optimize the prompt for.</p>
     * @public
     */
    targetModelId: string | undefined;
}
/**
 * <p>An event in which the prompt was analyzed in preparation for optimization.</p>
 * @public
 */
export interface AnalyzePromptEvent {
    /**
     * <p>A message describing the analysis of the prompt.</p>
     * @public
     */
    message?: string | undefined;
}
/**
 * <p>Contains information about the optimized prompt.</p>
 * @public
 */
export type OptimizedPrompt = OptimizedPrompt.TextPromptMember | OptimizedPrompt.$UnknownMember;
/**
 * @public
 */
export declare namespace OptimizedPrompt {
    /**
     * <p>Contains information about the text in the prompt that was optimized.</p>
     * @public
     */
    interface TextPromptMember {
        textPrompt: TextPrompt;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        textPrompt?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        textPrompt: (value: TextPrompt) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: OptimizedPrompt, visitor: Visitor<T>) => T;
}
/**
 * <p>An event in which the prompt was optimized.</p>
 * @public
 */
export interface OptimizedPromptEvent {
    /**
     * <p>Contains information about the optimized prompt.</p>
     * @public
     */
    optimizedPrompt?: OptimizedPrompt | undefined;
}
/**
 * <p>The stream containing events in the prompt optimization process.</p>
 * @public
 */
export type OptimizedPromptStream = OptimizedPromptStream.AccessDeniedExceptionMember | OptimizedPromptStream.AnalyzePromptEventMember | OptimizedPromptStream.BadGatewayExceptionMember | OptimizedPromptStream.DependencyFailedExceptionMember | OptimizedPromptStream.InternalServerExceptionMember | OptimizedPromptStream.OptimizedPromptEventMember | OptimizedPromptStream.ThrottlingExceptionMember | OptimizedPromptStream.ValidationExceptionMember | OptimizedPromptStream.$UnknownMember;
/**
 * @public
 */
export declare namespace OptimizedPromptStream {
    /**
     * <p>An event in which the prompt was optimized.</p>
     * @public
     */
    interface OptimizedPromptEventMember {
        optimizedPromptEvent: OptimizedPromptEvent;
        analyzePromptEvent?: never;
        internalServerException?: never;
        throttlingException?: never;
        validationException?: never;
        dependencyFailedException?: never;
        accessDeniedException?: never;
        badGatewayException?: never;
        $unknown?: never;
    }
    /**
     * <p>An event in which the prompt was analyzed in preparation for optimization.</p>
     * @public
     */
    interface AnalyzePromptEventMember {
        optimizedPromptEvent?: never;
        analyzePromptEvent: AnalyzePromptEvent;
        internalServerException?: never;
        throttlingException?: never;
        validationException?: never;
        dependencyFailedException?: never;
        accessDeniedException?: never;
        badGatewayException?: never;
        $unknown?: never;
    }
    /**
     * <p>An internal server error occurred. Retry your request.</p>
     * @public
     */
    interface InternalServerExceptionMember {
        optimizedPromptEvent?: never;
        analyzePromptEvent?: never;
        internalServerException: InternalServerException;
        throttlingException?: never;
        validationException?: never;
        dependencyFailedException?: never;
        accessDeniedException?: never;
        badGatewayException?: never;
        $unknown?: never;
    }
    /**
     * <p>Your request was throttled because of service-wide limitations. Resubmit your request later or in a different region. You can also purchase <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/prov-throughput.html">Provisioned Throughput</a> to increase the rate or number of tokens you can process.</p>
     * @public
     */
    interface ThrottlingExceptionMember {
        optimizedPromptEvent?: never;
        analyzePromptEvent?: never;
        internalServerException?: never;
        throttlingException: ThrottlingException;
        validationException?: never;
        dependencyFailedException?: never;
        accessDeniedException?: never;
        badGatewayException?: never;
        $unknown?: never;
    }
    /**
     * <p>Input validation failed. Check your request parameters and retry the request.</p>
     * @public
     */
    interface ValidationExceptionMember {
        optimizedPromptEvent?: never;
        analyzePromptEvent?: never;
        internalServerException?: never;
        throttlingException?: never;
        validationException: ValidationException;
        dependencyFailedException?: never;
        accessDeniedException?: never;
        badGatewayException?: never;
        $unknown?: never;
    }
    /**
     * <p>There was an issue with a dependency. Check the resource configurations and retry the request.</p>
     * @public
     */
    interface DependencyFailedExceptionMember {
        optimizedPromptEvent?: never;
        analyzePromptEvent?: never;
        internalServerException?: never;
        throttlingException?: never;
        validationException?: never;
        dependencyFailedException: DependencyFailedException;
        accessDeniedException?: never;
        badGatewayException?: never;
        $unknown?: never;
    }
    /**
     * <p>The request is denied because of missing access permissions. Check your permissions and retry your request.</p>
     * @public
     */
    interface AccessDeniedExceptionMember {
        optimizedPromptEvent?: never;
        analyzePromptEvent?: never;
        internalServerException?: never;
        throttlingException?: never;
        validationException?: never;
        dependencyFailedException?: never;
        accessDeniedException: AccessDeniedException;
        badGatewayException?: never;
        $unknown?: never;
    }
    /**
     * <p>There was an issue with a dependency due to a server issue. Retry your request.</p>
     * @public
     */
    interface BadGatewayExceptionMember {
        optimizedPromptEvent?: never;
        analyzePromptEvent?: never;
        internalServerException?: never;
        throttlingException?: never;
        validationException?: never;
        dependencyFailedException?: never;
        accessDeniedException?: never;
        badGatewayException: BadGatewayException;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        optimizedPromptEvent?: never;
        analyzePromptEvent?: never;
        internalServerException?: never;
        throttlingException?: never;
        validationException?: never;
        dependencyFailedException?: never;
        accessDeniedException?: never;
        badGatewayException?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        optimizedPromptEvent: (value: OptimizedPromptEvent) => T;
        analyzePromptEvent: (value: AnalyzePromptEvent) => T;
        internalServerException: (value: InternalServerException) => T;
        throttlingException: (value: ThrottlingException) => T;
        validationException: (value: ValidationException) => T;
        dependencyFailedException: (value: DependencyFailedException) => T;
        accessDeniedException: (value: AccessDeniedException) => T;
        badGatewayException: (value: BadGatewayException) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: OptimizedPromptStream, visitor: Visitor<T>) => T;
}
/**
 * @public
 */
export interface OptimizePromptResponse {
    /**
     * <p>The prompt after being optimized for the task.</p>
     * @public
     */
    optimizedPrompt: AsyncIterable<OptimizedPromptStream> | undefined;
}
/**
 * <p>Contains information about a text document to rerank.</p>
 * @public
 */
export interface RerankTextDocument {
    /**
     * <p>The text of the document.</p>
     * @public
     */
    text?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const RerankQueryContentType: {
    readonly TEXT: "TEXT";
};
/**
 * @public
 */
export type RerankQueryContentType = (typeof RerankQueryContentType)[keyof typeof RerankQueryContentType];
/**
 * <p>Contains information about a query to submit to the reranker model.</p>
 * @public
 */
export interface RerankQuery {
    /**
     * <p>The type of the query.</p>
     * @public
     */
    type: RerankQueryContentType | undefined;
    /**
     * <p>Contains information about a text query.</p>
     * @public
     */
    textQuery: RerankTextDocument | undefined;
}
/**
 * <p>Contains configurations for a reranker model.</p>
 * @public
 */
export interface BedrockRerankingModelConfiguration {
    /**
     * <p>The ARN of the reranker model.</p>
     * @public
     */
    modelArn: string | undefined;
    /**
     * <p>A JSON object whose keys are request fields for the model and whose values are values for those fields.</p>
     * @public
     */
    additionalModelRequestFields?: Record<string, __DocumentType> | undefined;
}
/**
 * <p>Contains configurations for an Amazon Bedrock reranker model.</p>
 * @public
 */
export interface BedrockRerankingConfiguration {
    /**
     * <p>The number of results to return after reranking.</p>
     * @public
     */
    numberOfResults?: number | undefined;
    /**
     * <p>Contains configurations for a reranker model.</p>
     * @public
     */
    modelConfiguration: BedrockRerankingModelConfiguration | undefined;
}
/**
 * @public
 * @enum
 */
export declare const RerankingConfigurationType: {
    readonly BEDROCK_RERANKING_MODEL: "BEDROCK_RERANKING_MODEL";
};
/**
 * @public
 */
export type RerankingConfigurationType = (typeof RerankingConfigurationType)[keyof typeof RerankingConfigurationType];
/**
 * <p>Contains configurations for reranking.</p>
 * @public
 */
export interface RerankingConfiguration {
    /**
     * <p>The type of reranker that the configurations apply to.</p>
     * @public
     */
    type: RerankingConfigurationType | undefined;
    /**
     * <p>Contains configurations for an Amazon Bedrock reranker.</p>
     * @public
     */
    bedrockRerankingConfiguration: BedrockRerankingConfiguration | undefined;
}
/**
 * @public
 * @enum
 */
export declare const RerankDocumentType: {
    readonly JSON: "JSON";
    readonly TEXT: "TEXT";
};
/**
 * @public
 */
export type RerankDocumentType = (typeof RerankDocumentType)[keyof typeof RerankDocumentType];
/**
 * <p>Contains information about a document to rerank. Choose the <code>type</code> to define and include the field that corresponds to the type.</p>
 * @public
 */
export interface RerankDocument {
    /**
     * <p>The type of document to rerank.</p>
     * @public
     */
    type: RerankDocumentType | undefined;
    /**
     * <p>Contains information about a text document to rerank.</p>
     * @public
     */
    textDocument?: RerankTextDocument | undefined;
    /**
     * <p>Contains a JSON document to rerank.</p>
     * @public
     */
    jsonDocument?: __DocumentType | undefined;
}
/**
 * @public
 * @enum
 */
export declare const RerankSourceType: {
    readonly INLINE: "INLINE";
};
/**
 * @public
 */
export type RerankSourceType = (typeof RerankSourceType)[keyof typeof RerankSourceType];
/**
 * <p>Contains information about a source for reranking.</p>
 * @public
 */
export interface RerankSource {
    /**
     * <p>The type of the source.</p>
     * @public
     */
    type: RerankSourceType | undefined;
    /**
     * <p>Contains an inline definition of a source for reranking.</p>
     * @public
     */
    inlineDocumentSource: RerankDocument | undefined;
}
/**
 * @public
 */
export interface RerankRequest {
    /**
     * <p>An array of objects, each of which contains information about a query to submit to the reranker model.</p>
     * @public
     */
    queries: RerankQuery[] | undefined;
    /**
     * <p>An array of objects, each of which contains information about the sources to rerank.</p>
     * @public
     */
    sources: RerankSource[] | undefined;
    /**
     * <p>Contains configurations for reranking.</p>
     * @public
     */
    rerankingConfiguration: RerankingConfiguration | undefined;
    /**
     * <p>If the total number of results was greater than could fit in a response, a token is returned in the <code>nextToken</code> field. You can enter that token in this field to return the next batch of results.</p>
     * @public
     */
    nextToken?: string | undefined;
}
/**
 * <p>Contains information about a document that was reranked.</p>
 * @public
 */
export interface RerankResult {
    /**
     * <p>The ranking of the document. The lower a number, the higher the document is ranked.</p>
     * @public
     */
    index: number | undefined;
    /**
     * <p>The relevance score of the document.</p>
     * @public
     */
    relevanceScore: number | undefined;
    /**
     * <p>Contains information about the document.</p>
     * @public
     */
    document?: RerankDocument | undefined;
}
/**
 * @public
 */
export interface RerankResponse {
    /**
     * <p>An array of objects, each of which contains information about the results of reranking.</p>
     * @public
     */
    results: RerankResult[] | undefined;
    /**
     * <p>If the total number of results is greater than can fit in the response, use this token in the <code>nextToken</code> field when making another request to return the next batch of results.</p>
     * @public
     */
    nextToken?: string | undefined;
}
/**
 * <p>Contains the query made to the knowledge base.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html#API_agent-runtime_RetrieveAndGenerate_RequestSyntax">RetrieveAndGenerate request</a> – in the <code>input</code> field</p> </li> </ul>
 * @public
 */
export interface RetrieveAndGenerateInput {
    /**
     * <p>The query made to the knowledge base.</p>
     * @public
     */
    text: string | undefined;
}
/**
 * <p>The configuration details for the guardrail.</p>
 * @public
 */
export interface GuardrailConfiguration {
    /**
     * <p>The unique identifier for the guardrail.</p>
     * @public
     */
    guardrailId: string | undefined;
    /**
     * <p>The version of the guardrail.</p>
     * @public
     */
    guardrailVersion: string | undefined;
}
/**
 * <p>Configuration settings for text generation using a language model via the RetrieveAndGenerate operation. Includes parameters like temperature, top-p, maximum token count, and stop sequences. </p> <note> <p>The valid range of <code>maxTokens</code> depends on the accepted values for your chosen model's inference parameters. To see the inference parameters for your model, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html">Inference parameters for foundation models.</a> </p> </note>
 * @public
 */
export interface TextInferenceConfig {
    /**
     * <p> Controls the random-ness of text generated by the language model, influencing how much the model sticks to the most predictable next words versus exploring more surprising options. A lower temperature value (e.g. 0.2 or 0.3) makes model outputs more deterministic or predictable, while a higher temperature (e.g. 0.8 or 0.9) makes the outputs more creative or unpredictable. </p>
     * @public
     */
    temperature?: number | undefined;
    /**
     * <p> A probability distribution threshold which controls what the model considers for the set of possible next tokens. The model will only consider the top p% of the probability distribution when generating the next token. </p>
     * @public
     */
    topP?: number | undefined;
    /**
     * <p>The maximum number of tokens to generate in the output text. Do not use the minimum of 0 or the maximum of 65536. The limit values described here are arbitary values, for actual values consult the limits defined by your specific model.</p>
     * @public
     */
    maxTokens?: number | undefined;
    /**
     * <p>A list of sequences of characters that, if generated, will cause the model to stop generating further tokens. Do not use a minimum length of 1 or a maximum length of 1000. The limit values described here are arbitary values, for actual values consult the limits defined by your specific model.</p>
     * @public
     */
    stopSequences?: string[] | undefined;
}
/**
 * <p> The configuration for inference settings when generating responses using RetrieveAndGenerate. </p>
 * @public
 */
export interface InferenceConfig {
    /**
     * <p> Configuration settings specific to text generation while generating responses using RetrieveAndGenerate. </p>
     * @public
     */
    textInferenceConfig?: TextInferenceConfig | undefined;
}
/**
 * <p>Contains the template for the prompt that's sent to the model for response generation. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html#kb-test-config-sysprompt">Knowledge base prompt templates</a>.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html#API_agent-runtime_RetrieveAndGenerate_RequestSyntax">RetrieveAndGenerate request</a> – in the <code>filter</code> field</p> </li> </ul>
 * @public
 */
export interface PromptTemplate {
    /**
     * <p>The template for the prompt that's sent to the model for response generation. You can include prompt placeholders, which become replaced before the prompt is sent to the model to provide instructions and context to the model. In addition, you can include XML tags to delineate meaningful sections of the prompt template.</p> <p>For more information, see the following resources:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html#kb-test-config-sysprompt">Knowledge base prompt templates</a> </p> </li> <li> <p> <a href="https://docs.anthropic.com/claude/docs/use-xml-tags">Use XML tags with Anthropic Claude models</a> </p> </li> </ul>
     * @public
     */
    textPromptTemplate?: string | undefined;
}
/**
 * <p>Contains the generation configuration of the external source wrapper object.</p>
 * @public
 */
export interface ExternalSourcesGenerationConfiguration {
    /**
     * <p>Contain the textPromptTemplate string for the external source wrapper object.</p>
     * @public
     */
    promptTemplate?: PromptTemplate | undefined;
    /**
     * <p>The configuration details for the guardrail.</p>
     * @public
     */
    guardrailConfiguration?: GuardrailConfiguration | undefined;
    /**
     * <p> Configuration settings for inference when using RetrieveAndGenerate to generate responses while using an external source.</p>
     * @public
     */
    inferenceConfig?: InferenceConfig | undefined;
    /**
     * <p> Additional model parameters and their corresponding values not included in the textInferenceConfig structure for an external source. Takes in custom model parameters specific to the language model being used. </p>
     * @public
     */
    additionalModelRequestFields?: Record<string, __DocumentType> | undefined;
    /**
     * <p>The latency configuration for the model.</p>
     * @public
     */
    performanceConfig?: PerformanceConfiguration | undefined;
}
/**
 * <p>This property contains the document to chat with, along with its attributes.</p>
 * @public
 */
export interface ByteContentDoc {
    /**
     * <p>The file name of the document contained in the wrapper object.</p>
     * @public
     */
    identifier: string | undefined;
    /**
     * <p>The MIME type of the document contained in the wrapper object.</p>
     * @public
     */
    contentType: string | undefined;
    /**
     * <p>The byte value of the file to upload, encoded as a Base-64 string.</p>
     * @public
     */
    data: Uint8Array | undefined;
}
/**
 * <p>The unique wrapper object of the document from the S3 location.</p>
 * @public
 */
export interface S3ObjectDoc {
    /**
     * <p>The file location of the S3 wrapper object.</p>
     * @public
     */
    uri: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ExternalSourceType: {
    readonly BYTE_CONTENT: "BYTE_CONTENT";
    readonly S3: "S3";
};
/**
 * @public
 */
export type ExternalSourceType = (typeof ExternalSourceType)[keyof typeof ExternalSourceType];
/**
 * <p>The unique external source of the content contained in the wrapper object.</p>
 * @public
 */
export interface ExternalSource {
    /**
     * <p>The source type of the external source wrapper object.</p>
     * @public
     */
    sourceType: ExternalSourceType | undefined;
    /**
     * <p>The S3 location of the external source wrapper object.</p>
     * @public
     */
    s3Location?: S3ObjectDoc | undefined;
    /**
     * <p>The identifier, contentType, and data of the external source wrapper object.</p>
     * @public
     */
    byteContent?: ByteContentDoc | undefined;
}
/**
 * <p>The configurations of the external source wrapper object in the <code>retrieveAndGenerate</code> function.</p>
 * @public
 */
export interface ExternalSourcesRetrieveAndGenerateConfiguration {
    /**
     * <p>The model Amazon Resource Name (ARN) for the external source wrapper object in the <code>retrieveAndGenerate</code> function.</p>
     * @public
     */
    modelArn: string | undefined;
    /**
     * <p>The document for the external source wrapper object in the <code>retrieveAndGenerate</code> function.</p>
     * @public
     */
    sources: ExternalSource[] | undefined;
    /**
     * <p>The prompt used with the external source wrapper object with the <code>retrieveAndGenerate</code> function.</p>
     * @public
     */
    generationConfiguration?: ExternalSourcesGenerationConfiguration | undefined;
}
/**
 * <p>Contains configurations for response generation based on the knowledge base query results.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html#API_agent-runtime_RetrieveAndGenerate_RequestSyntax">RetrieveAndGenerate request</a> </p> </li> </ul>
 * @public
 */
export interface GenerationConfiguration {
    /**
     * <p>Contains the template for the prompt that's sent to the model for response generation. Generation prompts must include the <code>$search_results$</code> variable. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-placeholders.html">Use placeholder variables</a> in the user guide.</p>
     * @public
     */
    promptTemplate?: PromptTemplate | undefined;
    /**
     * <p>The configuration details for the guardrail.</p>
     * @public
     */
    guardrailConfiguration?: GuardrailConfiguration | undefined;
    /**
     * <p> Configuration settings for inference when using RetrieveAndGenerate to generate responses while using a knowledge base as a source. </p>
     * @public
     */
    inferenceConfig?: InferenceConfig | undefined;
    /**
     * <p> Additional model parameters and corresponding values not included in the textInferenceConfig structure for a knowledge base. This allows users to provide custom model parameters specific to the language model being used. </p>
     * @public
     */
    additionalModelRequestFields?: Record<string, __DocumentType> | undefined;
    /**
     * <p>The latency configuration for the model.</p>
     * @public
     */
    performanceConfig?: PerformanceConfiguration | undefined;
}
/**
 * @public
 * @enum
 */
export declare const QueryTransformationType: {
    readonly QUERY_DECOMPOSITION: "QUERY_DECOMPOSITION";
};
/**
 * @public
 */
export type QueryTransformationType = (typeof QueryTransformationType)[keyof typeof QueryTransformationType];
/**
 * <p>To split up the prompt and retrieve multiple sources, set the transformation type to <code>QUERY_DECOMPOSITION</code>.</p>
 * @public
 */
export interface QueryTransformationConfiguration {
    /**
     * <p>The type of transformation to apply to the prompt.</p>
     * @public
     */
    type: QueryTransformationType | undefined;
}
/**
 * <p>Settings for how the model processes the prompt prior to retrieval and generation.</p>
 * @public
 */
export interface OrchestrationConfiguration {
    /**
     * <p>Contains the template for the prompt that's sent to the model. Orchestration prompts must include the <code>$conversation_history$</code> and <code>$output_format_instructions$</code> variables. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-placeholders.html">Use placeholder variables</a> in the user guide.</p>
     * @public
     */
    promptTemplate?: PromptTemplate | undefined;
    /**
     * <p> Configuration settings for inference when using RetrieveAndGenerate to generate responses while using a knowledge base as a source. </p>
     * @public
     */
    inferenceConfig?: InferenceConfig | undefined;
    /**
     * <p> Additional model parameters and corresponding values not included in the textInferenceConfig structure for a knowledge base. This allows users to provide custom model parameters specific to the language model being used. </p>
     * @public
     */
    additionalModelRequestFields?: Record<string, __DocumentType> | undefined;
    /**
     * <p>To split up the prompt and retrieve multiple sources, set the transformation type to <code>QUERY_DECOMPOSITION</code>.</p>
     * @public
     */
    queryTransformationConfiguration?: QueryTransformationConfiguration | undefined;
    /**
     * <p>The latency configuration for the model.</p>
     * @public
     */
    performanceConfig?: PerformanceConfiguration | undefined;
}
/**
 * @public
 * @enum
 */
export declare const RetrieveAndGenerateType: {
    readonly EXTERNAL_SOURCES: "EXTERNAL_SOURCES";
    readonly KNOWLEDGE_BASE: "KNOWLEDGE_BASE";
};
/**
 * @public
 */
export type RetrieveAndGenerateType = (typeof RetrieveAndGenerateType)[keyof typeof RetrieveAndGenerateType];
/**
 * <p>Contains configuration about the session with the knowledge base.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html#API_agent-runtime_RetrieveAndGenerate_RequestSyntax">RetrieveAndGenerate request</a> – in the <code>sessionConfiguration</code> field</p> </li> </ul>
 * @public
 */
export interface RetrieveAndGenerateSessionConfiguration {
    /**
     * <p>The ARN of the KMS key encrypting the session.</p>
     * @public
     */
    kmsKeyArn: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const GuadrailAction: {
    readonly INTERVENED: "INTERVENED";
    readonly NONE: "NONE";
};
/**
 * @public
 */
export type GuadrailAction = (typeof GuadrailAction)[keyof typeof GuadrailAction];
/**
 * <p>Contains the response generated from querying the knowledge base.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html#API_agent-runtime_RetrieveAndGenerate_ResponseSyntax">RetrieveAndGenerate response</a> – in the <code>output</code> field</p> </li> </ul>
 * @public
 */
export interface RetrieveAndGenerateOutput {
    /**
     * <p>The response generated from querying the knowledge base.</p>
     * @public
     */
    text: string | undefined;
}
/**
 * @public
 */
export interface RetrieveAndGenerateResponse {
    /**
     * <p>The unique identifier of the session. When you first make a <code>RetrieveAndGenerate</code> request, Amazon Bedrock automatically generates this value. You must reuse this value for all subsequent requests in the same conversational session. This value allows Amazon Bedrock to maintain context and knowledge from previous interactions. You can't explicitly set the <code>sessionId</code> yourself.</p>
     * @public
     */
    sessionId: string | undefined;
    /**
     * <p>Contains the response generated from querying the knowledge base.</p>
     * @public
     */
    output: RetrieveAndGenerateOutput | undefined;
    /**
     * <p>A list of segments of the generated response that are based on sources in the knowledge base, alongside information about the sources.</p>
     * @public
     */
    citations?: Citation[] | undefined;
    /**
     * <p>Specifies if there is a guardrail intervention in the response.</p>
     * @public
     */
    guardrailAction?: GuadrailAction | undefined;
}
/**
 * <p>A citation event.</p>
 * @public
 */
export interface CitationEvent {
    /**
     * <p>The citation.</p>
     *
     * @deprecated
     * @public
     */
    citation?: Citation | undefined;
    /**
     * <p>The generated response to the citation event.</p>
     * @public
     */
    generatedResponsePart?: GeneratedResponsePart | undefined;
    /**
     * <p>The retrieved references of the citation event.</p>
     * @public
     */
    retrievedReferences?: RetrievedReference[] | undefined;
}
/**
 * <p>A guardrail event.</p>
 * @public
 */
export interface GuardrailEvent {
    /**
     * <p>The guardrail action.</p>
     * @public
     */
    action?: GuadrailAction | undefined;
}
/**
 * <p>A retrieve and generate output event.</p>
 * @public
 */
export interface RetrieveAndGenerateOutputEvent {
    /**
     * <p>A text response.</p>
     * @public
     */
    text: string | undefined;
}
/**
 * <p>A retrieve and generate stream response output.</p>
 * @public
 */
export type RetrieveAndGenerateStreamResponseOutput = RetrieveAndGenerateStreamResponseOutput.AccessDeniedExceptionMember | RetrieveAndGenerateStreamResponseOutput.BadGatewayExceptionMember | RetrieveAndGenerateStreamResponseOutput.CitationMember | RetrieveAndGenerateStreamResponseOutput.ConflictExceptionMember | RetrieveAndGenerateStreamResponseOutput.DependencyFailedExceptionMember | RetrieveAndGenerateStreamResponseOutput.GuardrailMember | RetrieveAndGenerateStreamResponseOutput.InternalServerExceptionMember | RetrieveAndGenerateStreamResponseOutput.OutputMember | RetrieveAndGenerateStreamResponseOutput.ResourceNotFoundExceptionMember | RetrieveAndGenerateStreamResponseOutput.ServiceQuotaExceededExceptionMember | RetrieveAndGenerateStreamResponseOutput.ThrottlingExceptionMember | RetrieveAndGenerateStreamResponseOutput.ValidationExceptionMember | RetrieveAndGenerateStreamResponseOutput.$UnknownMember;
/**
 * @public
 */
export declare namespace RetrieveAndGenerateStreamResponseOutput {
    /**
     * <p>An output event.</p>
     * @public
     */
    interface OutputMember {
        output: RetrieveAndGenerateOutputEvent;
        citation?: never;
        guardrail?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        $unknown?: never;
    }
    /**
     * <p>A citation event.</p>
     * @public
     */
    interface CitationMember {
        output?: never;
        citation: CitationEvent;
        guardrail?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        $unknown?: never;
    }
    /**
     * <p>A guardrail event.</p>
     * @public
     */
    interface GuardrailMember {
        output?: never;
        citation?: never;
        guardrail: GuardrailEvent;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        $unknown?: never;
    }
    /**
     * <p>An internal server error occurred. Retry your request.</p>
     * @public
     */
    interface InternalServerExceptionMember {
        output?: never;
        citation?: never;
        guardrail?: never;
        internalServerException: InternalServerException;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        $unknown?: never;
    }
    /**
     * <p>The input fails to satisfy the constraints specified by <i>Amazon Bedrock</i>. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-validation-error">ValidationError</a> in the Amazon Bedrock User Guide.</p>
     * @public
     */
    interface ValidationExceptionMember {
        output?: never;
        citation?: never;
        guardrail?: never;
        internalServerException?: never;
        validationException: ValidationException;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        $unknown?: never;
    }
    /**
     * <p>The specified resource ARN was not found. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-resource-not-found">ResourceNotFound</a> in the Amazon Bedrock User Guide.</p>
     * @public
     */
    interface ResourceNotFoundExceptionMember {
        output?: never;
        citation?: never;
        guardrail?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException: ResourceNotFoundException;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        $unknown?: never;
    }
    /**
     * <p>Your request exceeds the service quota for your account. You can view your quotas at <a href="https://docs.aws.amazon.com/servicequotas/latest/userguide/gs-request-quota.html">Viewing service quotas</a>. You can resubmit your request later.</p>
     * @public
     */
    interface ServiceQuotaExceededExceptionMember {
        output?: never;
        citation?: never;
        guardrail?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException: ServiceQuotaExceededException;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        $unknown?: never;
    }
    /**
     * <p>Your request was denied due to exceeding the account quotas for <i>Amazon Bedrock</i>. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-throttling-exception">ThrottlingException</a> in the Amazon Bedrock User Guide.</p>
     * @public
     */
    interface ThrottlingExceptionMember {
        output?: never;
        citation?: never;
        guardrail?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException: ThrottlingException;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        $unknown?: never;
    }
    /**
     * <p>The request is denied because you do not have sufficient permissions to perform the requested action. For troubleshooting this error, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html#ts-access-denied">AccessDeniedException</a> in the Amazon Bedrock User Guide.</p>
     * @public
     */
    interface AccessDeniedExceptionMember {
        output?: never;
        citation?: never;
        guardrail?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException: AccessDeniedException;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        $unknown?: never;
    }
    /**
     * <p>Error occurred because of a conflict while performing an operation.</p>
     * @public
     */
    interface ConflictExceptionMember {
        output?: never;
        citation?: never;
        guardrail?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException: ConflictException;
        dependencyFailedException?: never;
        badGatewayException?: never;
        $unknown?: never;
    }
    /**
     * <p>The request failed due to a dependency error.</p>
     * @public
     */
    interface DependencyFailedExceptionMember {
        output?: never;
        citation?: never;
        guardrail?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException: DependencyFailedException;
        badGatewayException?: never;
        $unknown?: never;
    }
    /**
     * <p>The request failed due to a bad gateway error.</p>
     * @public
     */
    interface BadGatewayExceptionMember {
        output?: never;
        citation?: never;
        guardrail?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException: BadGatewayException;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        output?: never;
        citation?: never;
        guardrail?: never;
        internalServerException?: never;
        validationException?: never;
        resourceNotFoundException?: never;
        serviceQuotaExceededException?: never;
        throttlingException?: never;
        accessDeniedException?: never;
        conflictException?: never;
        dependencyFailedException?: never;
        badGatewayException?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        output: (value: RetrieveAndGenerateOutputEvent) => T;
        citation: (value: CitationEvent) => T;
        guardrail: (value: GuardrailEvent) => T;
        internalServerException: (value: InternalServerException) => T;
        validationException: (value: ValidationException) => T;
        resourceNotFoundException: (value: ResourceNotFoundException) => T;
        serviceQuotaExceededException: (value: ServiceQuotaExceededException) => T;
        throttlingException: (value: ThrottlingException) => T;
        accessDeniedException: (value: AccessDeniedException) => T;
        conflictException: (value: ConflictException) => T;
        dependencyFailedException: (value: DependencyFailedException) => T;
        badGatewayException: (value: BadGatewayException) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: RetrieveAndGenerateStreamResponseOutput, visitor: Visitor<T>) => T;
}
/**
 * @public
 */
export interface RetrieveAndGenerateStreamResponse {
    /**
     * <p>A stream of events from the model.</p>
     * @public
     */
    stream: AsyncIterable<RetrieveAndGenerateStreamResponseOutput> | undefined;
    /**
     * <p>The session ID.</p>
     * @public
     */
    sessionId: string | undefined;
}
/**
 * <p>Contains the query made to the knowledge base.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_Retrieve.html#API_agent-runtime_Retrieve_RequestSyntax">Retrieve request</a> – in the <code>retrievalQuery</code> field</p> </li> </ul>
 * @public
 */
export interface KnowledgeBaseQuery {
    /**
     * <p>The text of the query made to the knowledge base.</p>
     * @public
     */
    text: string | undefined;
}
/**
 * <p>Details about a result from querying the knowledge base.</p> <p>This data type is used in the following API operations:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_Retrieve.html#API_agent-runtime_Retrieve_ResponseSyntax">Retrieve response</a> – in the <code>retrievalResults</code> field</p> </li> </ul>
 * @public
 */
export interface KnowledgeBaseRetrievalResult {
    /**
     * <p>Contains information about the content of the chunk.</p>
     * @public
     */
    content: RetrievalResultContent | undefined;
    /**
     * <p>Contains information about the location of the data source.</p>
     * @public
     */
    location?: RetrievalResultLocation | undefined;
    /**
     * <p>The level of relevance of the result to the query.</p>
     * @public
     */
    score?: number | undefined;
    /**
     * <p>Contains metadata attributes and their values for the file in the data source. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-ds.html#kb-ds-metadata">Metadata and filtering</a>.</p>
     * @public
     */
    metadata?: Record<string, __DocumentType> | undefined;
}
/**
 * @public
 */
export interface RetrieveResponse {
    /**
     * <p>A list of results from querying the knowledge base.</p>
     * @public
     */
    retrievalResults: KnowledgeBaseRetrievalResult[] | undefined;
    /**
     * <p>Specifies if there is a guardrail intervention in the response.</p>
     * @public
     */
    guardrailAction?: GuadrailAction | undefined;
    /**
     * <p>If there are more results than can fit in the response, the response returns a <code>nextToken</code>. Use this token in the <code>nextToken</code> field of another request to retrieve the next batch of results.</p>
     * @public
     */
    nextToken?: string | undefined;
}
/**
 * @public
 */
export interface CreateSessionRequest {
    /**
     * <p>A map of key-value pairs containing attributes to be persisted across the session. For example, the user's ID, their language preference, and the type of device they are using.</p>
     * @public
     */
    sessionMetadata?: Record<string, string> | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the KMS key to use to encrypt the session data. The user or role creating the session must have permission to use the key. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/session-encryption.html">Amazon Bedrock session encryption</a>. </p>
     * @public
     */
    encryptionKeyArn?: string | undefined;
    /**
     * <p>Specify the key-value pairs for the tags that you want to attach to the session.</p>
     * @public
     */
    tags?: Record<string, string> | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SessionStatus: {
    readonly ACTIVE: "ACTIVE";
    readonly ENDED: "ENDED";
    readonly EXPIRED: "EXPIRED";
};
/**
 * @public
 */
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];
/**
 * @public
 */
export interface CreateSessionResponse {
    /**
     * <p>The unique identifier for the session.</p>
     * @public
     */
    sessionId: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the created session.</p>
     * @public
     */
    sessionArn: string | undefined;
    /**
     * <p>The current status of the session.</p>
     * @public
     */
    sessionStatus: SessionStatus | undefined;
    /**
     * <p>The timestamp for when the session was created.</p>
     * @public
     */
    createdAt: Date | undefined;
}
/**
 * @public
 */
export interface DeleteSessionRequest {
    /**
     * <p>The unique identifier for the session to be deleted. You can specify either the session's <code>sessionId</code> or its Amazon Resource Name (ARN).</p>
     * @public
     */
    sessionIdentifier: string | undefined;
}
/**
 * @public
 */
export interface DeleteSessionResponse {
}
/**
 * @public
 */
export interface EndSessionRequest {
    /**
     * <p>The unique identifier for the session to end. You can specify either the session's <code>sessionId</code> or its Amazon Resource Name (ARN).</p>
     * @public
     */
    sessionIdentifier: string | undefined;
}
/**
 * @public
 */
export interface EndSessionResponse {
    /**
     * <p>The unique identifier of the session you ended.</p>
     * @public
     */
    sessionId: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the session you ended.</p>
     * @public
     */
    sessionArn: string | undefined;
    /**
     * <p>The current status of the session you ended.</p>
     * @public
     */
    sessionStatus: SessionStatus | undefined;
}
/**
 * @public
 */
export interface GetSessionRequest {
    /**
     * <p>A unique identifier for the session to retrieve. You can specify either the session's <code>sessionId</code> or its Amazon Resource Name (ARN).</p>
     * @public
     */
    sessionIdentifier: string | undefined;
}
/**
 * @public
 */
export interface GetSessionResponse {
    /**
     * <p>The unique identifier for the session in UUID format.</p>
     * @public
     */
    sessionId: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the session.</p>
     * @public
     */
    sessionArn: string | undefined;
    /**
     * <p>The current status of the session.</p>
     * @public
     */
    sessionStatus: SessionStatus | undefined;
    /**
     * <p>The timestamp for when the session was created.</p>
     * @public
     */
    createdAt: Date | undefined;
    /**
     * <p>The timestamp for when the session was last modified.</p>
     * @public
     */
    lastUpdatedAt: Date | undefined;
    /**
     * <p>A map of key-value pairs containing attributes persisted across the session.</p>
     * @public
     */
    sessionMetadata?: Record<string, string> | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the Key Management Service key used to encrypt the session data. For more information, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/session-encryption.html">Amazon Bedrock session encryption</a>.</p>
     * @public
     */
    encryptionKeyArn?: string | undefined;
}
/**
 * @public
 */
export interface CreateInvocationRequest {
    /**
     * <p>A unique identifier for the invocation in UUID format.</p>
     * @public
     */
    invocationId?: string | undefined;
    /**
     * <p>A description for the interactions in the invocation. For example, "User asking about weather in Seattle".</p>
     * @public
     */
    description?: string | undefined;
    /**
     * <p>The unique identifier for the associated session for the invocation. You can specify either the session's <code>sessionId</code> or its Amazon Resource Name (ARN). </p>
     * @public
     */
    sessionIdentifier: string | undefined;
}
/**
 * @public
 */
export interface CreateInvocationResponse {
    /**
     * <p>The unique identifier for the session associated with the invocation.</p>
     * @public
     */
    sessionId: string | undefined;
    /**
     * <p>The unique identifier for the invocation.</p>
     * @public
     */
    invocationId: string | undefined;
    /**
     * <p>The timestamp for when the invocation was created.</p>
     * @public
     */
    createdAt: Date | undefined;
}
/**
 * @public
 */
export interface ListInvocationsRequest {
    /**
     * <p>If the total number of results is greater than the <code>maxResults</code> value provided in the request, enter the token returned in the <code>nextToken</code> field in the response in this field to return the next batch of results. </p>
     * @public
     */
    nextToken?: string | undefined;
    /**
     * <p>The maximum number of results to return in the response. If the total number of results is greater than this value, use the token returned in the response in the <code>nextToken</code> field when making another request to return the next batch of results.</p>
     * @public
     */
    maxResults?: number | undefined;
    /**
     * <p>The unique identifier for the session to list invocations for. You can specify either the session's <code>sessionId</code> or its Amazon Resource Name (ARN).</p>
     * @public
     */
    sessionIdentifier: string | undefined;
}
/**
 * <p>Contains details about an invocation in a session. For more information about sessions, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/sessions.html">Store and retrieve conversation history and context with Amazon Bedrock sessions</a>.</p>
 * @public
 */
export interface InvocationSummary {
    /**
     * <p>The unique identifier for the session associated with the invocation.</p>
     * @public
     */
    sessionId: string | undefined;
    /**
     * <p>A unique identifier for the invocation in UUID format.</p>
     * @public
     */
    invocationId: string | undefined;
    /**
     * <p>The timestamp for when the invocation was created.</p>
     * @public
     */
    createdAt: Date | undefined;
}
/**
 * @public
 */
export interface ListInvocationsResponse {
    /**
     * <p>A list of invocation summaries associated with the session.</p>
     * @public
     */
    invocationSummaries: InvocationSummary[] | undefined;
    /**
     * <p>If the total number of results is greater than the <code>maxResults</code> value provided in the request, use this token when making another request in the <code>nextToken</code> field to return the next batch of results.</p>
     * @public
     */
    nextToken?: string | undefined;
}
/**
 * @public
 */
export interface GetInvocationStepRequest {
    /**
     * <p>The unique identifier for the invocation in UUID format.</p>
     * @public
     */
    invocationIdentifier: string | undefined;
    /**
     * <p>The unique identifier (in UUID format) for the specific invocation step to retrieve.</p>
     * @public
     */
    invocationStepId: string | undefined;
    /**
     * <p>The unique identifier for the invocation step's associated session. You can specify either the session's <code>sessionId</code> or its Amazon Resource Name (ARN).</p>
     * @public
     */
    sessionIdentifier: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ImageFormat: {
    readonly GIF: "gif";
    readonly JPEG: "jpeg";
    readonly PNG: "png";
    readonly WEBP: "webp";
};
/**
 * @public
 */
export type ImageFormat = (typeof ImageFormat)[keyof typeof ImageFormat];
/**
 * <p>Information about the Amazon S3 bucket where the image is stored.</p>
 * @public
 */
export interface S3Location {
    /**
     * <p>The path to the Amazon S3 bucket where the image is stored.</p>
     * @public
     */
    uri: string | undefined;
}
/**
 * <p>The source for an image.</p>
 * @public
 */
export type ImageSource = ImageSource.BytesMember | ImageSource.S3LocationMember | ImageSource.$UnknownMember;
/**
 * @public
 */
export declare namespace ImageSource {
    /**
     * <p> The raw image bytes for the image. If you use an Amazon Web Services SDK, you don't need to encode the image bytes in base64.</p>
     * @public
     */
    interface BytesMember {
        bytes: Uint8Array;
        s3Location?: never;
        $unknown?: never;
    }
    /**
     * <p>The path to the Amazon S3 bucket where the image is stored.</p>
     * @public
     */
    interface S3LocationMember {
        bytes?: never;
        s3Location: S3Location;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        bytes?: never;
        s3Location?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        bytes: (value: Uint8Array) => T;
        s3Location: (value: S3Location) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: ImageSource, visitor: Visitor<T>) => T;
}
/**
 * <p>Image content for an invocation step.</p>
 * @public
 */
export interface ImageBlock {
    /**
     * <p>The format of the image.</p>
     * @public
     */
    format: ImageFormat | undefined;
    /**
     * <p>The source for the image.</p>
     * @public
     */
    source: ImageSource | undefined;
}
/**
 * <p>A block of content that you pass to, or receive from, a Amazon Bedrock session in an invocation step. You pass the content to a session in the <code>payLoad</code> of the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_PutInvocationStep.html">PutInvocationStep</a> API operation. You retrieve the content with the <a href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_GetInvocationStep.html">GetInvocationStep</a> API operation.</p> <p>For more information about sessions, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/sessions.html">Store and retrieve conversation history and context with Amazon Bedrock sessions</a>.</p>
 * @public
 */
export type BedrockSessionContentBlock = BedrockSessionContentBlock.ImageMember | BedrockSessionContentBlock.TextMember | BedrockSessionContentBlock.$UnknownMember;
/**
 * @public
 */
export declare namespace BedrockSessionContentBlock {
    /**
     * <p>The text in the invocation step.</p>
     * @public
     */
    interface TextMember {
        text: string;
        image?: never;
        $unknown?: never;
    }
    /**
     * <p>The image in the invocation step.</p>
     * @public
     */
    interface ImageMember {
        text?: never;
        image: ImageBlock;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        text?: never;
        image?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        text: (value: string) => T;
        image: (value: ImageBlock) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: BedrockSessionContentBlock, visitor: Visitor<T>) => T;
}
/**
 * <p>Payload content, such as text and images, for the invocation step.</p>
 * @public
 */
export type InvocationStepPayload = InvocationStepPayload.ContentBlocksMember | InvocationStepPayload.$UnknownMember;
/**
 * @public
 */
export declare namespace InvocationStepPayload {
    /**
     * <p>The content for the invocation step.</p>
     * @public
     */
    interface ContentBlocksMember {
        contentBlocks: BedrockSessionContentBlock[];
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        contentBlocks?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        contentBlocks: (value: BedrockSessionContentBlock[]) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: InvocationStepPayload, visitor: Visitor<T>) => T;
}
/**
 * <p>Stores fine-grained state checkpoints, including text and images, for each interaction in an invocation in a session. For more information about sessions, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/sessions.html">Store and retrieve conversation history and context with Amazon Bedrock sessions</a>. </p>
 * @public
 */
export interface InvocationStep {
    /**
     * <p>The unique identifier of the session containing the invocation step.</p>
     * @public
     */
    sessionId: string | undefined;
    /**
     * <p>The unique identifier (in UUID format) for the invocation that includes the invocation step.</p>
     * @public
     */
    invocationId: string | undefined;
    /**
     * <p>The unique identifier (in UUID format) for the invocation step.</p>
     * @public
     */
    invocationStepId: string | undefined;
    /**
     * <p>The timestamp for when the invocation step was created.</p>
     * @public
     */
    invocationStepTime: Date | undefined;
    /**
     * <p>Payload content, such as text and images, for the invocation step.</p>
     * @public
     */
    payload: InvocationStepPayload | undefined;
}
/**
 * @public
 */
export interface GetInvocationStepResponse {
    /**
     * <p>The complete details of the requested invocation step.</p>
     * @public
     */
    invocationStep: InvocationStep | undefined;
}
/**
 * @public
 */
export interface ListInvocationStepsRequest {
    /**
     * <p>The unique identifier (in UUID format) for the invocation to list invocation steps for.</p>
     * @public
     */
    invocationIdentifier?: string | undefined;
    /**
     * <p>If the total number of results is greater than the <code>maxResults</code> value provided in the request, enter the token returned in the <code>nextToken</code> field in the response in this field to return the next batch of results. </p>
     * @public
     */
    nextToken?: string | undefined;
    /**
     * <p>The maximum number of results to return in the response. If the total number of results is greater than this value, use the token returned in the response in the <code>nextToken</code> field when making another request to return the next batch of results.</p>
     * @public
     */
    maxResults?: number | undefined;
    /**
     * <p>The unique identifier for the session associated with the invocation steps. You can specify either the session's <code>sessionId</code> or its Amazon Resource Name (ARN).</p>
     * @public
     */
    sessionIdentifier: string | undefined;
}
/**
 * <p>Contains details about an invocation step within an invocation in a session. For more information about sessions, see <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/sessions.html">Store and retrieve conversation history and context with Amazon Bedrock sessions</a>.</p>
 * @public
 */
export interface InvocationStepSummary {
    /**
     * <p>The unique identifier for the session associated with the invocation step.</p>
     * @public
     */
    sessionId: string | undefined;
    /**
     * <p>A unique identifier for the invocation in UUID format.</p>
     * @public
     */
    invocationId: string | undefined;
    /**
     * <p>The unique identifier (in UUID format) for the invocation step.</p>
     * @public
     */
    invocationStepId: string | undefined;
    /**
     * <p>The timestamp for when the invocation step was created.</p>
     * @public
     */
    invocationStepTime: Date | undefined;
}
/**
 * @public
 */
export interface ListInvocationStepsResponse {
    /**
     * <p>A list of summaries for each invocation step associated with a session and if you specified it, an invocation within the session.</p>
     * @public
     */
    invocationStepSummaries: InvocationStepSummary[] | undefined;
    /**
     * <p>If the total number of results is greater than the <code>maxResults</code> value provided in the request, use this token when making another request in the <code>nextToken</code> field to return the next batch of results.</p>
     * @public
     */
    nextToken?: string | undefined;
}
/**
 * @public
 */
export interface PutInvocationStepRequest {
    /**
     * <p>The unique identifier for the session to add the invocation step to. You can specify either the session's <code>sessionId</code> or its Amazon Resource Name (ARN).</p>
     * @public
     */
    sessionIdentifier: string | undefined;
    /**
     * <p>The unique identifier (in UUID format) of the invocation to add the invocation step to.</p>
     * @public
     */
    invocationIdentifier: string | undefined;
    /**
     * <p>The timestamp for when the invocation step occurred.</p>
     * @public
     */
    invocationStepTime: Date | undefined;
    /**
     * <p>The payload for the invocation step, including text and images for the interaction.</p>
     * @public
     */
    payload: InvocationStepPayload | undefined;
    /**
     * <p>The unique identifier of the invocation step in UUID format.</p>
     * @public
     */
    invocationStepId?: string | undefined;
}
/**
 * @public
 */
export interface PutInvocationStepResponse {
    /**
     * <p>The unique identifier of the invocation step in UUID format.</p>
     * @public
     */
    invocationStepId: string | undefined;
}
/**
 * @public
 */
export interface ListSessionsRequest {
    /**
     * <p>The maximum number of results to return in the response. If the total number of results is greater than this value, use the token returned in the response in the <code>nextToken</code> field when making another request to return the next batch of results.</p>
     * @public
     */
    maxResults?: number | undefined;
    /**
     * <p>If the total number of results is greater than the <code>maxResults</code> value provided in the request, enter the token returned in the <code>nextToken</code> field in the response in this field to return the next batch of results. </p>
     * @public
     */
    nextToken?: string | undefined;
}
/**
 * @internal
 */
export declare const ActionGroupInvocationInputFilterSensitiveLog: (obj: ActionGroupInvocationInput) => any;
/**
 * @internal
 */
export declare const ActionGroupInvocationOutputFilterSensitiveLog: (obj: ActionGroupInvocationOutput) => any;
/**
 * @internal
 */
export declare const APISchemaFilterSensitiveLog: (obj: APISchema) => any;
/**
 * @internal
 */
export declare const FunctionDefinitionFilterSensitiveLog: (obj: FunctionDefinition) => any;
/**
 * @internal
 */
export declare const FunctionSchemaFilterSensitiveLog: (obj: FunctionSchema) => any;
/**
 * @internal
 */
export declare const AgentActionGroupFilterSensitiveLog: (obj: AgentActionGroup) => any;
/**
 * @internal
 */
export declare const ApiResultFilterSensitiveLog: (obj: ApiResult) => any;
/**
 * @internal
 */
export declare const InvocationResultMemberFilterSensitiveLog: (obj: InvocationResultMember) => any;
/**
 * @internal
 */
export declare const ReturnControlResultsFilterSensitiveLog: (obj: ReturnControlResults) => any;
/**
 * @internal
 */
export declare const AgentCollaboratorInputPayloadFilterSensitiveLog: (obj: AgentCollaboratorInputPayload) => any;
/**
 * @internal
 */
export declare const AgentCollaboratorInvocationInputFilterSensitiveLog: (obj: AgentCollaboratorInvocationInput) => any;
/**
 * @internal
 */
export declare const ApiInvocationInputFilterSensitiveLog: (obj: ApiInvocationInput) => any;
/**
 * @internal
 */
export declare const FunctionInvocationInputFilterSensitiveLog: (obj: FunctionInvocationInput) => any;
/**
 * @internal
 */
export declare const InvocationInputMemberFilterSensitiveLog: (obj: InvocationInputMember) => any;
/**
 * @internal
 */
export declare const ReturnControlPayloadFilterSensitiveLog: (obj: ReturnControlPayload) => any;
/**
 * @internal
 */
export declare const AgentCollaboratorOutputPayloadFilterSensitiveLog: (obj: AgentCollaboratorOutputPayload) => any;
/**
 * @internal
 */
export declare const AgentCollaboratorInvocationOutputFilterSensitiveLog: (obj: AgentCollaboratorInvocationOutput) => any;
/**
 * @internal
 */
export declare const FlowInputContentFilterSensitiveLog: (obj: FlowInputContent) => any;
/**
 * @internal
 */
export declare const FlowInputFilterSensitiveLog: (obj: FlowInput) => any;
/**
 * @internal
 */
export declare const InvokeFlowRequestFilterSensitiveLog: (obj: InvokeFlowRequest) => any;
/**
 * @internal
 */
export declare const FlowCompletionEventFilterSensitiveLog: (obj: FlowCompletionEvent) => any;
/**
 * @internal
 */
export declare const FlowMultiTurnInputRequestEventFilterSensitiveLog: (obj: FlowMultiTurnInputRequestEvent) => any;
/**
 * @internal
 */
export declare const FlowOutputEventFilterSensitiveLog: (obj: FlowOutputEvent) => any;
/**
 * @internal
 */
export declare const FlowTraceConditionFilterSensitiveLog: (obj: FlowTraceCondition) => any;
/**
 * @internal
 */
export declare const FlowTraceConditionNodeResultEventFilterSensitiveLog: (obj: FlowTraceConditionNodeResultEvent) => any;
/**
 * @internal
 */
export declare const FlowTraceNodeActionEventFilterSensitiveLog: (obj: FlowTraceNodeActionEvent) => any;
/**
 * @internal
 */
export declare const FlowTraceNodeInputContentFilterSensitiveLog: (obj: FlowTraceNodeInputContent) => any;
/**
 * @internal
 */
export declare const FlowTraceNodeInputFieldFilterSensitiveLog: (obj: FlowTraceNodeInputField) => any;
/**
 * @internal
 */
export declare const FlowTraceNodeInputEventFilterSensitiveLog: (obj: FlowTraceNodeInputEvent) => any;
/**
 * @internal
 */
export declare const FlowTraceNodeOutputFieldFilterSensitiveLog: (obj: FlowTraceNodeOutputField) => any;
/**
 * @internal
 */
export declare const FlowTraceNodeOutputEventFilterSensitiveLog: (obj: FlowTraceNodeOutputEvent) => any;
/**
 * @internal
 */
export declare const FlowTraceFilterSensitiveLog: (obj: FlowTrace) => any;
/**
 * @internal
 */
export declare const FlowTraceEventFilterSensitiveLog: (obj: FlowTraceEvent) => any;
/**
 * @internal
 */
export declare const FlowResponseStreamFilterSensitiveLog: (obj: FlowResponseStream) => any;
/**
 * @internal
 */
export declare const InvokeFlowResponseFilterSensitiveLog: (obj: InvokeFlowResponse) => any;
/**
 * @internal
 */
export declare const QueryGenerationInputFilterSensitiveLog: (obj: QueryGenerationInput) => any;
/**
 * @internal
 */
export declare const GenerateQueryRequestFilterSensitiveLog: (obj: GenerateQueryRequest) => any;
/**
 * @internal
 */
export declare const GeneratedQueryFilterSensitiveLog: (obj: GeneratedQuery) => any;
/**
 * @internal
 */
export declare const GenerateQueryResponseFilterSensitiveLog: (obj: GenerateQueryResponse) => any;
/**
 * @internal
 */
export declare const ContentBlockFilterSensitiveLog: (obj: ContentBlock) => any;
/**
 * @internal
 */
export declare const MessageFilterSensitiveLog: (obj: Message) => any;
/**
 * @internal
 */
export declare const ConversationHistoryFilterSensitiveLog: (obj: ConversationHistory) => any;
/**
 * @internal
 */
export declare const ByteContentFileFilterSensitiveLog: (obj: ByteContentFile) => any;
/**
 * @internal
 */
export declare const FileSourceFilterSensitiveLog: (obj: FileSource) => any;
/**
 * @internal
 */
export declare const InputFileFilterSensitiveLog: (obj: InputFile) => any;
/**
 * @internal
 */
export declare const MetadataAttributeSchemaFilterSensitiveLog: (obj: MetadataAttributeSchema) => any;
/**
 * @internal
 */
export declare const ImplicitFilterConfigurationFilterSensitiveLog: (obj: ImplicitFilterConfiguration) => any;
/**
 * @internal
 */
export declare const RerankingMetadataSelectiveModeConfigurationFilterSensitiveLog: (obj: RerankingMetadataSelectiveModeConfiguration) => any;
/**
 * @internal
 */
export declare const MetadataConfigurationForRerankingFilterSensitiveLog: (obj: MetadataConfigurationForReranking) => any;
/**
 * @internal
 */
export declare const VectorSearchBedrockRerankingConfigurationFilterSensitiveLog: (obj: VectorSearchBedrockRerankingConfiguration) => any;
/**
 * @internal
 */
export declare const VectorSearchRerankingConfigurationFilterSensitiveLog: (obj: VectorSearchRerankingConfiguration) => any;
/**
 * @internal
 */
export declare const TextResponsePartFilterSensitiveLog: (obj: TextResponsePart) => any;
/**
 * @internal
 */
export declare const GeneratedResponsePartFilterSensitiveLog: (obj: GeneratedResponsePart) => any;
/**
 * @internal
 */
export declare const RetrievalResultContentColumnFilterSensitiveLog: (obj: RetrievalResultContentColumn) => any;
/**
 * @internal
 */
export declare const RetrievalResultContentFilterSensitiveLog: (obj: RetrievalResultContent) => any;
/**
 * @internal
 */
export declare const RetrievalResultLocationFilterSensitiveLog: (obj: RetrievalResultLocation) => any;
/**
 * @internal
 */
export declare const RetrievedReferenceFilterSensitiveLog: (obj: RetrievedReference) => any;
/**
 * @internal
 */
export declare const CitationFilterSensitiveLog: (obj: Citation) => any;
/**
 * @internal
 */
export declare const AttributionFilterSensitiveLog: (obj: Attribution) => any;
/**
 * @internal
 */
export declare const PayloadPartFilterSensitiveLog: (obj: PayloadPart) => any;
/**
 * @internal
 */
export declare const OutputFileFilterSensitiveLog: (obj: OutputFile) => any;
/**
 * @internal
 */
export declare const FilePartFilterSensitiveLog: (obj: FilePart) => any;
/**
 * @internal
 */
export declare const CustomOrchestrationTraceEventFilterSensitiveLog: (obj: CustomOrchestrationTraceEvent) => any;
/**
 * @internal
 */
export declare const CustomOrchestrationTraceFilterSensitiveLog: (obj: CustomOrchestrationTrace) => any;
/**
 * @internal
 */
export declare const FailureTraceFilterSensitiveLog: (obj: FailureTrace) => any;
/**
 * @internal
 */
export declare const GuardrailContentFilterFilterSensitiveLog: (obj: GuardrailContentFilter) => any;
/**
 * @internal
 */
export declare const GuardrailContentPolicyAssessmentFilterSensitiveLog: (obj: GuardrailContentPolicyAssessment) => any;
/**
 * @internal
 */
export declare const GuardrailPiiEntityFilterFilterSensitiveLog: (obj: GuardrailPiiEntityFilter) => any;
/**
 * @internal
 */
export declare const GuardrailRegexFilterFilterSensitiveLog: (obj: GuardrailRegexFilter) => any;
/**
 * @internal
 */
export declare const GuardrailSensitiveInformationPolicyAssessmentFilterSensitiveLog: (obj: GuardrailSensitiveInformationPolicyAssessment) => any;
/**
 * @internal
 */
export declare const GuardrailTopicFilterSensitiveLog: (obj: GuardrailTopic) => any;
/**
 * @internal
 */
export declare const GuardrailTopicPolicyAssessmentFilterSensitiveLog: (obj: GuardrailTopicPolicyAssessment) => any;
/**
 * @internal
 */
export declare const GuardrailCustomWordFilterSensitiveLog: (obj: GuardrailCustomWord) => any;
/**
 * @internal
 */
export declare const GuardrailManagedWordFilterSensitiveLog: (obj: GuardrailManagedWord) => any;
/**
 * @internal
 */
export declare const GuardrailWordPolicyAssessmentFilterSensitiveLog: (obj: GuardrailWordPolicyAssessment) => any;
/**
 * @internal
 */
export declare const GuardrailAssessmentFilterSensitiveLog: (obj: GuardrailAssessment) => any;
/**
 * @internal
 */
export declare const GuardrailTraceFilterSensitiveLog: (obj: GuardrailTrace) => any;
/**
 * @internal
 */
export declare const KnowledgeBaseLookupInputFilterSensitiveLog: (obj: KnowledgeBaseLookupInput) => any;
/**
 * @internal
 */
export declare const InvocationInputFilterSensitiveLog: (obj: InvocationInput) => any;
/**
 * @internal
 */
export declare const ModelInvocationInputFilterSensitiveLog: (obj: ModelInvocationInput) => any;
/**
 * @internal
 */
export declare const UsageFilterSensitiveLog: (obj: Usage) => any;
/**
 * @internal
 */
export declare const MetadataFilterSensitiveLog: (obj: Metadata) => any;
/**
 * @internal
 */
export declare const RawResponseFilterSensitiveLog: (obj: RawResponse) => any;
/**
 * @internal
 */
export declare const ReasoningTextBlockFilterSensitiveLog: (obj: ReasoningTextBlock) => any;
/**
 * @internal
 */
export declare const ReasoningContentBlockFilterSensitiveLog: (obj: ReasoningContentBlock) => any;
/**
 * @internal
 */
export declare const OrchestrationModelInvocationOutputFilterSensitiveLog: (obj: OrchestrationModelInvocationOutput) => any;
/**
 * @internal
 */
export declare const FinalResponseFilterSensitiveLog: (obj: FinalResponse) => any;
/**
 * @internal
 */
export declare const KnowledgeBaseLookupOutputFilterSensitiveLog: (obj: KnowledgeBaseLookupOutput) => any;
/**
 * @internal
 */
export declare const RepromptResponseFilterSensitiveLog: (obj: RepromptResponse) => any;
/**
 * @internal
 */
export declare const ObservationFilterSensitiveLog: (obj: Observation) => any;
/**
 * @internal
 */
export declare const RationaleFilterSensitiveLog: (obj: Rationale) => any;
/**
 * @internal
 */
export declare const OrchestrationTraceFilterSensitiveLog: (obj: OrchestrationTrace) => any;
/**
 * @internal
 */
export declare const PostProcessingParsedResponseFilterSensitiveLog: (obj: PostProcessingParsedResponse) => any;
/**
 * @internal
 */
export declare const PostProcessingModelInvocationOutputFilterSensitiveLog: (obj: PostProcessingModelInvocationOutput) => any;
/**
 * @internal
 */
export declare const PostProcessingTraceFilterSensitiveLog: (obj: PostProcessingTrace) => any;
/**
 * @internal
 */
export declare const PreProcessingParsedResponseFilterSensitiveLog: (obj: PreProcessingParsedResponse) => any;
/**
 * @internal
 */
export declare const PreProcessingModelInvocationOutputFilterSensitiveLog: (obj: PreProcessingModelInvocationOutput) => any;
/**
 * @internal
 */
export declare const PreProcessingTraceFilterSensitiveLog: (obj: PreProcessingTrace) => any;
/**
 * @internal
 */
export declare const RoutingClassifierModelInvocationOutputFilterSensitiveLog: (obj: RoutingClassifierModelInvocationOutput) => any;
/**
 * @internal
 */
export declare const RoutingClassifierTraceFilterSensitiveLog: (obj: RoutingClassifierTrace) => any;
/**
 * @internal
 */
export declare const TraceFilterSensitiveLog: (obj: Trace) => any;
/**
 * @internal
 */
export declare const TracePartFilterSensitiveLog: (obj: TracePart) => any;
/**
 * @internal
 */
export declare const ResponseStreamFilterSensitiveLog: (obj: ResponseStream) => any;
/**
 * @internal
 */
export declare const InvokeAgentResponseFilterSensitiveLog: (obj: InvokeAgentResponse) => any;
/**
 * @internal
 */
export declare const CollaboratorConfigurationFilterSensitiveLog: (obj: CollaboratorConfiguration) => any;
/**
 * @internal
 */
export declare const PromptConfigurationFilterSensitiveLog: (obj: PromptConfiguration) => any;
/**
 * @internal
 */
export declare const PromptOverrideConfigurationFilterSensitiveLog: (obj: PromptOverrideConfiguration) => any;
/**
 * @internal
 */
export declare const InlineSessionStateFilterSensitiveLog: (obj: InlineSessionState) => any;
/**
 * @internal
 */
export declare const InlineAgentPayloadPartFilterSensitiveLog: (obj: InlineAgentPayloadPart) => any;
/**
 * @internal
 */
export declare const InlineAgentFilePartFilterSensitiveLog: (obj: InlineAgentFilePart) => any;
/**
 * @internal
 */
export declare const InlineAgentReturnControlPayloadFilterSensitiveLog: (obj: InlineAgentReturnControlPayload) => any;
/**
 * @internal
 */
export declare const InlineAgentTracePartFilterSensitiveLog: (obj: InlineAgentTracePart) => any;
/**
 * @internal
 */
export declare const InlineAgentResponseStreamFilterSensitiveLog: (obj: InlineAgentResponseStream) => any;
/**
 * @internal
 */
export declare const InvokeInlineAgentResponseFilterSensitiveLog: (obj: InvokeInlineAgentResponse) => any;
/**
 * @internal
 */
export declare const TextPromptFilterSensitiveLog: (obj: TextPrompt) => any;
/**
 * @internal
 */
export declare const InputPromptFilterSensitiveLog: (obj: InputPrompt) => any;
/**
 * @internal
 */
export declare const OptimizePromptRequestFilterSensitiveLog: (obj: OptimizePromptRequest) => any;
/**
 * @internal
 */
export declare const AnalyzePromptEventFilterSensitiveLog: (obj: AnalyzePromptEvent) => any;
/**
 * @internal
 */
export declare const OptimizedPromptFilterSensitiveLog: (obj: OptimizedPrompt) => any;
/**
 * @internal
 */
export declare const OptimizedPromptEventFilterSensitiveLog: (obj: OptimizedPromptEvent) => any;
/**
 * @internal
 */
export declare const OptimizedPromptStreamFilterSensitiveLog: (obj: OptimizedPromptStream) => any;
/**
 * @internal
 */
export declare const OptimizePromptResponseFilterSensitiveLog: (obj: OptimizePromptResponse) => any;
/**
 * @internal
 */
export declare const RerankTextDocumentFilterSensitiveLog: (obj: RerankTextDocument) => any;
/**
 * @internal
 */
export declare const RerankQueryFilterSensitiveLog: (obj: RerankQuery) => any;
/**
 * @internal
 */
export declare const RerankDocumentFilterSensitiveLog: (obj: RerankDocument) => any;
/**
 * @internal
 */
export declare const RerankSourceFilterSensitiveLog: (obj: RerankSource) => any;
/**
 * @internal
 */
export declare const RerankRequestFilterSensitiveLog: (obj: RerankRequest) => any;
/**
 * @internal
 */
export declare const RerankResultFilterSensitiveLog: (obj: RerankResult) => any;
/**
 * @internal
 */
export declare const RerankResponseFilterSensitiveLog: (obj: RerankResponse) => any;
/**
 * @internal
 */
export declare const RetrieveAndGenerateInputFilterSensitiveLog: (obj: RetrieveAndGenerateInput) => any;
/**
 * @internal
 */
export declare const PromptTemplateFilterSensitiveLog: (obj: PromptTemplate) => any;
/**
 * @internal
 */
export declare const ExternalSourcesGenerationConfigurationFilterSensitiveLog: (obj: ExternalSourcesGenerationConfiguration) => any;
/**
 * @internal
 */
export declare const ByteContentDocFilterSensitiveLog: (obj: ByteContentDoc) => any;
/**
 * @internal
 */
export declare const ExternalSourceFilterSensitiveLog: (obj: ExternalSource) => any;
/**
 * @internal
 */
export declare const ExternalSourcesRetrieveAndGenerateConfigurationFilterSensitiveLog: (obj: ExternalSourcesRetrieveAndGenerateConfiguration) => any;
/**
 * @internal
 */
export declare const GenerationConfigurationFilterSensitiveLog: (obj: GenerationConfiguration) => any;
/**
 * @internal
 */
export declare const OrchestrationConfigurationFilterSensitiveLog: (obj: OrchestrationConfiguration) => any;
/**
 * @internal
 */
export declare const RetrieveAndGenerateOutputFilterSensitiveLog: (obj: RetrieveAndGenerateOutput) => any;
/**
 * @internal
 */
export declare const RetrieveAndGenerateResponseFilterSensitiveLog: (obj: RetrieveAndGenerateResponse) => any;
/**
 * @internal
 */
export declare const CitationEventFilterSensitiveLog: (obj: CitationEvent) => any;
/**
 * @internal
 */
export declare const RetrieveAndGenerateOutputEventFilterSensitiveLog: (obj: RetrieveAndGenerateOutputEvent) => any;
/**
 * @internal
 */
export declare const RetrieveAndGenerateStreamResponseOutputFilterSensitiveLog: (obj: RetrieveAndGenerateStreamResponseOutput) => any;
/**
 * @internal
 */
export declare const RetrieveAndGenerateStreamResponseFilterSensitiveLog: (obj: RetrieveAndGenerateStreamResponse) => any;
/**
 * @internal
 */
export declare const KnowledgeBaseQueryFilterSensitiveLog: (obj: KnowledgeBaseQuery) => any;
/**
 * @internal
 */
export declare const KnowledgeBaseRetrievalResultFilterSensitiveLog: (obj: KnowledgeBaseRetrievalResult) => any;
/**
 * @internal
 */
export declare const RetrieveResponseFilterSensitiveLog: (obj: RetrieveResponse) => any;
/**
 * @internal
 */
export declare const BedrockSessionContentBlockFilterSensitiveLog: (obj: BedrockSessionContentBlock) => any;
/**
 * @internal
 */
export declare const InvocationStepPayloadFilterSensitiveLog: (obj: InvocationStepPayload) => any;
/**
 * @internal
 */
export declare const InvocationStepFilterSensitiveLog: (obj: InvocationStep) => any;
/**
 * @internal
 */
export declare const GetInvocationStepResponseFilterSensitiveLog: (obj: GetInvocationStepResponse) => any;
/**
 * @internal
 */
export declare const PutInvocationStepRequestFilterSensitiveLog: (obj: PutInvocationStepRequest) => any;
