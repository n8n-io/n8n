import { APIResource } from "../../../resource.js";
import * as Core from "../../../core.js";
import * as GraderModelsAPI from "../../graders/grader-models.js";
export declare class Graders extends APIResource {
    /**
     * Run a grader.
     *
     * @example
     * ```ts
     * const response = await client.fineTuning.alpha.graders.run({
     *   grader: {
     *     input: 'input',
     *     name: 'name',
     *     operation: 'eq',
     *     reference: 'reference',
     *     type: 'string_check',
     *   },
     *   model_sample: 'model_sample',
     *   reference_answer: 'string',
     * });
     * ```
     */
    run(body: GraderRunParams, options?: Core.RequestOptions): Core.APIPromise<GraderRunResponse>;
    /**
     * Validate a grader.
     *
     * @example
     * ```ts
     * const response =
     *   await client.fineTuning.alpha.graders.validate({
     *     grader: {
     *       input: 'input',
     *       name: 'name',
     *       operation: 'eq',
     *       reference: 'reference',
     *       type: 'string_check',
     *     },
     *   });
     * ```
     */
    validate(body: GraderValidateParams, options?: Core.RequestOptions): Core.APIPromise<GraderValidateResponse>;
}
export interface GraderRunResponse {
    metadata: GraderRunResponse.Metadata;
    model_grader_token_usage_per_model: Record<string, unknown>;
    reward: number;
    sub_rewards: Record<string, unknown>;
}
export declare namespace GraderRunResponse {
    interface Metadata {
        errors: Metadata.Errors;
        execution_time: number;
        name: string;
        sampled_model_name: string | null;
        scores: Record<string, unknown>;
        token_usage: number | null;
        type: string;
    }
    namespace Metadata {
        interface Errors {
            formula_parse_error: boolean;
            invalid_variable_error: boolean;
            model_grader_parse_error: boolean;
            model_grader_refusal_error: boolean;
            model_grader_server_error: boolean;
            model_grader_server_error_details: string | null;
            other_error: boolean;
            python_grader_runtime_error: boolean;
            python_grader_runtime_error_details: string | null;
            python_grader_server_error: boolean;
            python_grader_server_error_type: string | null;
            sample_parse_error: boolean;
            truncated_observation_error: boolean;
            unresponsive_reward_error: boolean;
        }
    }
}
export interface GraderValidateResponse {
    /**
     * The grader used for the fine-tuning job.
     */
    grader?: GraderModelsAPI.StringCheckGrader | GraderModelsAPI.TextSimilarityGrader | GraderModelsAPI.PythonGrader | GraderModelsAPI.ScoreModelGrader | GraderModelsAPI.MultiGrader;
}
export interface GraderRunParams {
    /**
     * The grader used for the fine-tuning job.
     */
    grader: GraderModelsAPI.StringCheckGrader | GraderModelsAPI.TextSimilarityGrader | GraderModelsAPI.PythonGrader | GraderModelsAPI.ScoreModelGrader | GraderModelsAPI.MultiGrader;
    /**
     * The model sample to be evaluated.
     */
    model_sample: string;
    /**
     * The reference answer for the evaluation.
     */
    reference_answer: string | unknown | Array<unknown> | number;
}
export interface GraderValidateParams {
    /**
     * The grader used for the fine-tuning job.
     */
    grader: GraderModelsAPI.StringCheckGrader | GraderModelsAPI.TextSimilarityGrader | GraderModelsAPI.PythonGrader | GraderModelsAPI.ScoreModelGrader | GraderModelsAPI.MultiGrader;
}
export declare namespace Graders {
    export { type GraderRunResponse as GraderRunResponse, type GraderValidateResponse as GraderValidateResponse, type GraderRunParams as GraderRunParams, type GraderValidateParams as GraderValidateParams, };
}
//# sourceMappingURL=graders.d.ts.map