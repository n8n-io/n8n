/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Possible roles.
 * @public
 */
export declare const POSSIBLE_ROLES: readonly ["user", "model", "function", "system"];
/**
 * Harm categories that would cause prompts or candidates to be blocked.
 * @public
 */
export declare enum HarmCategory {
    HARM_CATEGORY_UNSPECIFIED = "HARM_CATEGORY_UNSPECIFIED",
    HARM_CATEGORY_HATE_SPEECH = "HARM_CATEGORY_HATE_SPEECH",
    HARM_CATEGORY_SEXUALLY_EXPLICIT = "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    HARM_CATEGORY_HARASSMENT = "HARM_CATEGORY_HARASSMENT",
    HARM_CATEGORY_DANGEROUS_CONTENT = "HARM_CATEGORY_DANGEROUS_CONTENT",
    HARM_CATEGORY_CIVIC_INTEGRITY = "HARM_CATEGORY_CIVIC_INTEGRITY"
}
/**
 * Threshold above which a prompt or candidate will be blocked.
 * @public
 */
export declare enum HarmBlockThreshold {
    /** Threshold is unspecified. */
    HARM_BLOCK_THRESHOLD_UNSPECIFIED = "HARM_BLOCK_THRESHOLD_UNSPECIFIED",
    /** Content with NEGLIGIBLE will be allowed. */
    BLOCK_LOW_AND_ABOVE = "BLOCK_LOW_AND_ABOVE",
    /** Content with NEGLIGIBLE and LOW will be allowed. */
    BLOCK_MEDIUM_AND_ABOVE = "BLOCK_MEDIUM_AND_ABOVE",
    /** Content with NEGLIGIBLE, LOW, and MEDIUM will be allowed. */
    BLOCK_ONLY_HIGH = "BLOCK_ONLY_HIGH",
    /** All content will be allowed. */
    BLOCK_NONE = "BLOCK_NONE"
}
/**
 * Probability that a prompt or candidate matches a harm category.
 * @public
 */
export declare enum HarmProbability {
    /** Probability is unspecified. */
    HARM_PROBABILITY_UNSPECIFIED = "HARM_PROBABILITY_UNSPECIFIED",
    /** Content has a negligible chance of being unsafe. */
    NEGLIGIBLE = "NEGLIGIBLE",
    /** Content has a low chance of being unsafe. */
    LOW = "LOW",
    /** Content has a medium chance of being unsafe. */
    MEDIUM = "MEDIUM",
    /** Content has a high chance of being unsafe. */
    HIGH = "HIGH"
}
/**
 * Reason that a prompt was blocked.
 * @public
 */
export declare enum BlockReason {
    BLOCKED_REASON_UNSPECIFIED = "BLOCKED_REASON_UNSPECIFIED",
    SAFETY = "SAFETY",
    OTHER = "OTHER"
}
/**
 * Reason that a candidate finished.
 * @public
 */
export declare enum FinishReason {
    FINISH_REASON_UNSPECIFIED = "FINISH_REASON_UNSPECIFIED",
    STOP = "STOP",
    MAX_TOKENS = "MAX_TOKENS",
    SAFETY = "SAFETY",
    RECITATION = "RECITATION",
    LANGUAGE = "LANGUAGE",
    BLOCKLIST = "BLOCKLIST",
    PROHIBITED_CONTENT = "PROHIBITED_CONTENT",
    SPII = "SPII",
    MALFORMED_FUNCTION_CALL = "MALFORMED_FUNCTION_CALL",
    OTHER = "OTHER"
}
/**
 * Task type for embedding content.
 * @public
 */
export declare enum TaskType {
    TASK_TYPE_UNSPECIFIED = "TASK_TYPE_UNSPECIFIED",
    RETRIEVAL_QUERY = "RETRIEVAL_QUERY",
    RETRIEVAL_DOCUMENT = "RETRIEVAL_DOCUMENT",
    SEMANTIC_SIMILARITY = "SEMANTIC_SIMILARITY",
    CLASSIFICATION = "CLASSIFICATION",
    CLUSTERING = "CLUSTERING"
}
/**
 * @public
 */
export declare enum FunctionCallingMode {
    MODE_UNSPECIFIED = "MODE_UNSPECIFIED",
    AUTO = "AUTO",
    ANY = "ANY",
    NONE = "NONE"
}
/**
 * The mode of the predictor to be used in dynamic retrieval.
 * @public
 */
export declare enum DynamicRetrievalMode {
    MODE_UNSPECIFIED = "MODE_UNSPECIFIED",
    MODE_DYNAMIC = "MODE_DYNAMIC"
}
