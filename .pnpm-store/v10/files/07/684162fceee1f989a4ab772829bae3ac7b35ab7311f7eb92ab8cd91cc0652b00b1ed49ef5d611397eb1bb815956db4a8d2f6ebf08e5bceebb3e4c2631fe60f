import { SharedV3ProviderMetadata } from '../../shared/v3/shared-v3-provider-metadata';
import { SharedV3Warning } from '../../shared/v3/shared-v3-warning';
import { LanguageModelV3File } from './language-model-v3-file';
import { LanguageModelV3FinishReason } from './language-model-v3-finish-reason';
import { LanguageModelV3ResponseMetadata } from './language-model-v3-response-metadata';
import { LanguageModelV3Source } from './language-model-v3-source';
import { LanguageModelV3ToolApprovalRequest } from './language-model-v3-tool-approval-request';
import { LanguageModelV3ToolCall } from './language-model-v3-tool-call';
import { LanguageModelV3ToolResult } from './language-model-v3-tool-result';
import { LanguageModelV3Usage } from './language-model-v3-usage';

export type LanguageModelV3StreamPart =
  // Text blocks:
  | {
      type: 'text-start';
      providerMetadata?: SharedV3ProviderMetadata;
      id: string;
    }
  | {
      type: 'text-delta';
      id: string;
      providerMetadata?: SharedV3ProviderMetadata;
      delta: string;
    }
  | {
      type: 'text-end';
      providerMetadata?: SharedV3ProviderMetadata;
      id: string;
    }

  // Reasoning blocks:
  | {
      type: 'reasoning-start';
      providerMetadata?: SharedV3ProviderMetadata;
      id: string;
    }
  | {
      type: 'reasoning-delta';
      id: string;
      providerMetadata?: SharedV3ProviderMetadata;
      delta: string;
    }
  | {
      type: 'reasoning-end';
      id: string;
      providerMetadata?: SharedV3ProviderMetadata;
    }

  // Tool calls and results:
  | {
      type: 'tool-input-start';
      id: string;
      toolName: string;
      providerMetadata?: SharedV3ProviderMetadata;
      providerExecuted?: boolean;
      dynamic?: boolean;
      title?: string;
    }
  | {
      type: 'tool-input-delta';
      id: string;
      delta: string;
      providerMetadata?: SharedV3ProviderMetadata;
    }
  | {
      type: 'tool-input-end';
      id: string;
      providerMetadata?: SharedV3ProviderMetadata;
    }
  | LanguageModelV3ToolApprovalRequest
  | LanguageModelV3ToolCall
  | LanguageModelV3ToolResult

  // Files and sources:
  | LanguageModelV3File
  | LanguageModelV3Source

  // stream start event with warnings for the call, e.g. unsupported settings:
  | {
      type: 'stream-start';
      warnings: Array<SharedV3Warning>;
    }

  // metadata for the response.
  // separate stream part so it can be sent once it is available.
  | ({ type: 'response-metadata' } & LanguageModelV3ResponseMetadata)

  // metadata that is available after the stream is finished:
  | {
      type: 'finish';
      usage: LanguageModelV3Usage;
      finishReason: LanguageModelV3FinishReason;
      providerMetadata?: SharedV3ProviderMetadata;
    }

  // raw chunks if enabled
  | {
      type: 'raw';
      rawValue: unknown;
    }

  // error parts are streamed, allowing for multiple errors
  | {
      type: 'error';
      error: unknown;
    };
