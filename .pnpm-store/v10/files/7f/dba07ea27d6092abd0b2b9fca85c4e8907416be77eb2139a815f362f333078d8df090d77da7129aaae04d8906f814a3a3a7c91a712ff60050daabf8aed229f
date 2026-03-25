// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../resource';

export class Completions extends APIResource {}

/**
 * Usage statistics for the completion request.
 */
export interface CompletionUsage {
  /**
   * Number of tokens in the generated completion.
   */
  completion_tokens: number;

  /**
   * Number of tokens in the prompt.
   */
  prompt_tokens: number;

  /**
   * Total number of tokens used in the request (prompt + completion).
   */
  total_tokens: number;

  /**
   * Time spent generating tokens
   */
  completion_time?: number;

  /**
   * Time spent processing input tokens
   */
  prompt_time?: number;

  /**
   * Time the requests was spent queued
   */
  queue_time?: number;

  /**
   * completion time and prompt time combined
   */
  total_time?: number;
}

export declare namespace Completions {
  export { type CompletionUsage as CompletionUsage };
}
