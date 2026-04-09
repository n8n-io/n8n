import { APIResource } from "../../../resource.js";
import * as Core from "../../../core.js";
import { CursorPage, type CursorPageParams } from "../../../pagination.js";
export declare class Checkpoints extends APIResource {
    /**
     * List checkpoints for a fine-tuning job.
     *
     * @example
     * ```ts
     * // Automatically fetches more pages as needed.
     * for await (const fineTuningJobCheckpoint of client.fineTuning.jobs.checkpoints.list(
     *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
     * )) {
     *   // ...
     * }
     * ```
     */
    list(fineTuningJobId: string, query?: CheckpointListParams, options?: Core.RequestOptions): Core.PagePromise<FineTuningJobCheckpointsPage, FineTuningJobCheckpoint>;
    list(fineTuningJobId: string, options?: Core.RequestOptions): Core.PagePromise<FineTuningJobCheckpointsPage, FineTuningJobCheckpoint>;
}
export declare class FineTuningJobCheckpointsPage extends CursorPage<FineTuningJobCheckpoint> {
}
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
export declare namespace FineTuningJobCheckpoint {
    /**
     * Metrics at the step number during the fine-tuning job.
     */
    interface Metrics {
        full_valid_loss?: number;
        full_valid_mean_token_accuracy?: number;
        step?: number;
        train_loss?: number;
        train_mean_token_accuracy?: number;
        valid_loss?: number;
        valid_mean_token_accuracy?: number;
    }
}
export interface CheckpointListParams extends CursorPageParams {
}
export declare namespace Checkpoints {
    export { type FineTuningJobCheckpoint as FineTuningJobCheckpoint, FineTuningJobCheckpointsPage as FineTuningJobCheckpointsPage, type CheckpointListParams as CheckpointListParams, };
}
//# sourceMappingURL=checkpoints.d.ts.map