// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../../resource';
import { isRequestOptions } from '../../../core';
import * as Core from '../../../core';
import { CursorPage, type CursorPageParams } from '../../../pagination';

export class Checkpoints extends APIResource {
  /**
   * List checkpoints for a fine-tuning job.
   */
  list(
    fineTuningJobId: string,
    query?: CheckpointListParams,
    options?: Core.RequestOptions,
  ): Core.PagePromise<FineTuningJobCheckpointsPage, FineTuningJobCheckpoint>;
  list(
    fineTuningJobId: string,
    options?: Core.RequestOptions,
  ): Core.PagePromise<FineTuningJobCheckpointsPage, FineTuningJobCheckpoint>;
  list(
    fineTuningJobId: string,
    query: CheckpointListParams | Core.RequestOptions = {},
    options?: Core.RequestOptions,
  ): Core.PagePromise<FineTuningJobCheckpointsPage, FineTuningJobCheckpoint> {
    if (isRequestOptions(query)) {
      return this.list(fineTuningJobId, {}, query);
    }
    return this._client.getAPIList(
      `/fine_tuning/jobs/${fineTuningJobId}/checkpoints`,
      FineTuningJobCheckpointsPage,
      { query, ...options },
    );
  }
}

export class FineTuningJobCheckpointsPage extends CursorPage<FineTuningJobCheckpoint> {}

/**
 * The `fine_tuning.job.checkpoint` object represents a model checkpoint for a
 * fine-tuning job that is ready to use.
 */
export interface FineTuningJobCheckpoint {
  /**
   * The checkpoint identifier, which can be referenced in the API endpoints.
   */
  id: string;

  /**
   * The Unix timestamp (in seconds) for when the checkpoint was created.
   */
  created_at: number;

  /**
   * The name of the fine-tuned checkpoint model that is created.
   */
  fine_tuned_model_checkpoint: string;

  /**
   * The name of the fine-tuning job that this checkpoint was created from.
   */
  fine_tuning_job_id: string;

  /**
   * Metrics at the step number during the fine-tuning job.
   */
  metrics: FineTuningJobCheckpoint.Metrics;

  /**
   * The object type, which is always "fine_tuning.job.checkpoint".
   */
  object: 'fine_tuning.job.checkpoint';

  /**
   * The step number that the checkpoint was created at.
   */
  step_number: number;
}

export namespace FineTuningJobCheckpoint {
  /**
   * Metrics at the step number during the fine-tuning job.
   */
  export interface Metrics {
    full_valid_loss?: number;

    full_valid_mean_token_accuracy?: number;

    step?: number;

    train_loss?: number;

    train_mean_token_accuracy?: number;

    valid_loss?: number;

    valid_mean_token_accuracy?: number;
  }
}

export interface CheckpointListParams extends CursorPageParams {}

Checkpoints.FineTuningJobCheckpointsPage = FineTuningJobCheckpointsPage;

export declare namespace Checkpoints {
  export {
    type FineTuningJobCheckpoint as FineTuningJobCheckpoint,
    FineTuningJobCheckpointsPage as FineTuningJobCheckpointsPage,
    type CheckpointListParams as CheckpointListParams,
  };
}
