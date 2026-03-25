import { BaseMessage } from "@langchain/core/messages";
import "@langchain/core/outputs";
import { StructuredToolInterface } from "@langchain/core/tools";
import { AwsCredentialIdentity, Provider } from "@aws-sdk/types";

//#region src/utils/bedrock/index.d.ts
type CredentialType = AwsCredentialIdentity | Provider<AwsCredentialIdentity>;
/** Bedrock models.
    To authenticate, the AWS client uses the following methods to automatically load credentials:
    https://boto3.amazonaws.com/v1/documentation/api/latest/guide/credentials.html
    If a specific credential profile should be used, you must pass the name of the profile from the ~/.aws/credentials file that is to be used.
    Make sure the credentials / roles used have the required policies to access the Bedrock service.
*/
interface BaseBedrockInput {
  /** Model to use.
      For example, "amazon.titan-tg1-large", this is equivalent to the modelId property in the list-foundation-models api.
  */
  model: string;
  /** Optional URL Encoded overide for URL model parameter in fetch. Necessary for invoking an Application Inference Profile.
      For example, "arn%3Aaws%3Abedrock%3Aus-east-1%3A1234567890%3Aapplication-inference-profile%2Fabcdefghi", will override this.model in final /invoke URL call.
      Must still provide `model` as normal modelId to benefit from all the metadata.
  */
  applicationInferenceProfile?: string;
  /** The AWS region e.g. `us-west-2`.
      Fallback to AWS_DEFAULT_REGION env variable or region specified in ~/.aws/config in case it is not provided here.
  */
  region?: string;
  /** AWS Credentials.
      If no credentials are provided, the default credentials from `@aws-sdk/credential-provider-node` will be used.
   */
  credentials?: CredentialType;
  /** Temperature. */
  temperature?: number;
  /** Max tokens. */
  maxTokens?: number;
  /** A custom fetch function for low-level access to AWS API. Defaults to fetch(). */
  fetchFn?: typeof fetch;
  /** Override the default endpoint hostname. */
  endpointHost?: string;
  /** Additional kwargs to pass to the model. */
  modelKwargs?: Record<string, unknown>;
  /** Whether or not to stream responses */
  streaming: boolean;
  /** Trace settings for the Bedrock Guardrails. */
  trace?: "ENABLED" | "DISABLED";
  /** Identifier for the guardrail configuration. */
  guardrailIdentifier?: string;
  /** Version for the guardrail configuration. */
  guardrailVersion?: string;
  /** Required when Guardrail is in use. */
  guardrailConfig?: {
    tagSuffix: string;
    streamProcessingMode: "SYNCHRONOUS" | "ASYNCHRONOUS";
  };
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsSessionToken?: string;
}
//#endregion
export { BaseBedrockInput, CredentialType };
//# sourceMappingURL=index.d.ts.map