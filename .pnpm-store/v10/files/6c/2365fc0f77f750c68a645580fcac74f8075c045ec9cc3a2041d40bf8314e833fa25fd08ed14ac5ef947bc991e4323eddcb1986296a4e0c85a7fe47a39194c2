/**
 * (C) Copyright IBM Corp. 2025-2026.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */
/**
 * Centralized URL and endpoint configuration for WatsonX AI ML SDK
 *
 * This file contains all base URLs, platform URL mappings, and API endpoint paths used throughout
 * the SDK. It provides a single source of truth for all URL-related constants to improve
 * maintainability and consistency.
 */
/**
 * Base parameterized URL template for ML cloud services Replace {region} with the appropriate
 * region identifier
 */
export declare const ML_CLOUD_BASE_URL = "https://{region}.ml.cloud.ibm.com";
/**
 * Maps ML cloud URLs to their corresponding data platform URLs Used for converting between ML
 * service URLs and watsonx service URLs
 */
export declare const PLATFORM_URL_MAPPINGS: Record<string, string>;
export declare const DEPLOYMENT_ENDPOINTS: {
    /** List/Create deployments - GET/POST /ml/v4/deployments */
    readonly BASE: "/ml/v4/deployments";
    /** Get/Update/Delete deployment - GET/PATCH/DELETE /ml/v4/deployments/{deployment_id} */
    readonly BY_ID: "/ml/v4/deployments/{deployment_id}";
    /** Generate text from deployment - POST /ml/v1/deployments/{id_or_name}/text/generation */
    readonly TEXT_GENERATION: "/ml/v1/deployments/{id_or_name}/text/generation";
    /**
     * Stream text generation from deployment - POST
     * /ml/v1/deployments/{id_or_name}/text/generation_stream
     */
    readonly TEXT_GENERATION_STREAM: "/ml/v1/deployments/{id_or_name}/text/generation_stream";
    /** Chat with deployment - POST /ml/v1/deployments/{id_or_name}/text/chat */
    readonly CHAT: "/ml/v1/deployments/{id_or_name}/text/chat";
    /** Stream chat with deployment - POST /ml/v1/deployments/{id_or_name}/text/chat_stream */
    readonly CHAT_STREAM: "/ml/v1/deployments/{id_or_name}/text/chat_stream";
    /**
     * Time series forecast from deployment - POST
     * /ml/v1/deployments/{id_or_name}/time_series/forecast
     */
    readonly TIME_SERIES_FORECAST: "/ml/v1/deployments/{id_or_name}/time_series/forecast";
};
export declare const FOUNDATION_MODEL_ENDPOINTS: {
    /** List foundation model specifications - GET /ml/v1/foundation_model_specs */
    readonly LIST_SPECS: "/ml/v1/foundation_model_specs";
    /** Get foundation model specification - GET /ml/v1/foundation_model_specs/{model_id} */
    readonly SPEC_BY_ID: "/ml/v1/foundation_model_specs/{model_id}";
    /** List foundation model tasks - GET /ml/v1/foundation_model_tasks */
    readonly LIST_TASKS: "/ml/v1/foundation_model_tasks";
};
export declare const PROMPT_ENDPOINTS: {
    /** List/Create prompts - GET/POST /v1/prompts */
    readonly BASE: "/v1/prompts";
    /** Get/Update/Delete prompt - GET/PATCH/DELETE /v1/prompts/{prompt_id} */
    readonly BY_ID: "/v1/prompts/{prompt_id}";
    /** Lock/Unlock prompt - POST/DELETE /v1/prompts/{prompt_id}/lock */
    readonly LOCK: "/v1/prompts/{prompt_id}/lock";
    /** Get/Update prompt input - GET/PUT /v1/prompts/{prompt_id}/input */
    readonly INPUT: "/v1/prompts/{prompt_id}/input";
    /** Get/Update prompt chat items - GET/PUT /v1/prompts/{prompt_id}/chat_items */
    readonly CHAT_ITEMS: "/v1/prompts/{prompt_id}/chat_items";
    /** Search prompts - POST /v2/asset_types/wx_prompt/search */
    readonly SEARCH: "/v2/asset_types/wx_prompt/search";
};
export declare const PROMPT_SESSION_ENDPOINTS: {
    /** List/Create prompt sessions - GET/POST /v1/prompt_sessions */
    readonly BASE: "/v1/prompt_sessions";
    /** Get/Delete prompt session - GET/DELETE /v1/prompt_sessions/{session_id} */
    readonly BY_ID: "/v1/prompt_sessions/{session_id}";
    /** Lock/Unlock prompt session - POST/DELETE /v1/prompt_sessions/{session_id}/lock */
    readonly LOCK: "/v1/prompt_sessions/{session_id}/lock";
    /** List/Create session entries - GET/POST /v1/prompt_sessions/{session_id}/entries */
    readonly ENTRIES: "/v1/prompt_sessions/{session_id}/entries";
    /** Get/Delete session entry - GET/DELETE /v1/prompt_sessions/{session_id}/entries/{entry_id} */
    readonly ENTRY_BY_ID: "/v1/prompt_sessions/{session_id}/entries/{entry_id}";
    /**
     * Get/Update entry chat items - GET/PUT
     * /v1/prompt_sessions/{session_id}/entries/{entry_id}/chat_items
     */
    readonly ENTRY_CHAT_ITEMS: "/v1/prompt_sessions/{session_id}/entries/{entry_id}/chat_items";
};
export declare const TEXT_ENDPOINTS: {
    /** Chat completion - POST /ml/v1/text/chat */
    readonly CHAT: "/ml/v1/text/chat";
    /** Stream chat completion - POST /ml/v1/text/chat_stream */
    readonly CHAT_STREAM: "/ml/v1/text/chat_stream";
    /** Generate text embeddings - POST /ml/v1/text/embeddings */
    readonly EMBEDDINGS: "/ml/v1/text/embeddings";
    /** Extract text - POST /ml/v1/text/extractions */
    readonly EXTRACTIONS: "/ml/v1/text/extractions";
    /** Get extraction result - GET /ml/v1/text/extractions/{id} */
    readonly EXTRACTION_BY_ID: "/ml/v1/text/extractions/{id}";
    /** Generate text - POST /ml/v1/text/generation */
    readonly GENERATION: "/ml/v1/text/generation";
    /** Stream text generation - POST /ml/v1/text/generation_stream */
    readonly GENERATION_STREAM: "/ml/v1/text/generation_stream";
    /** Tokenize text - POST /ml/v1/text/tokenization */
    readonly TOKENIZATION: "/ml/v1/text/tokenization";
    /** Rerank text - POST /ml/v1/text/rerank */
    readonly RERANK: "/ml/v1/text/rerank";
    /** Classify text - POST /ml/v1/text/classifications */
    readonly CLASSIFICATIONS: "/ml/v1/text/classifications";
    /** Get/Delete classification result - GET/DELETE /ml/v1/text/classifications/{id} */
    readonly CLASSIFICATION_BY_ID: "/ml/v1/text/classifications/{id}";
};
export declare const TIME_SERIES_ENDPOINTS: {
    /** Time series forecast - POST /ml/v1/time_series/forecast */
    readonly FORECAST: "/ml/v1/time_series/forecast";
};
export declare const TRAINING_ENDPOINTS: {
    /** List/Create trainings - GET/POST /ml/v4/trainings */
    readonly BASE: "/ml/v4/trainings";
    /** Get/Delete training - GET/DELETE /ml/v4/trainings/{training_id} */
    readonly BY_ID: "/ml/v4/trainings/{training_id}";
};
export declare const FINE_TUNING_ENDPOINTS: {
    /** List/Create fine tuning jobs - GET/POST /ml/v1/fine_tunings */
    readonly BASE: "/ml/v1/fine_tunings";
    /** Get fine tuning job - GET /ml/v1/fine_tunings/{id} */
    readonly BY_ID: "/ml/v1/fine_tunings/{id}";
    /** Cancel fine tuning job - POST /ml/v1/fine_tunings/{id}/cancel */
    readonly CANCEL: "/ml/v1/fine_tunings/{id}/cancel";
};
export declare const TUNING_DOCUMENT_ENDPOINTS: {
    /** Extract document - POST /ml/v1/tuning/documents */
    readonly BASE: "/ml/v1/tuning/documents";
    /** Get/Delete document extraction - GET/DELETE /ml/v1/tuning/documents/{id} */
    readonly BY_ID: "/ml/v1/tuning/documents/{id}";
};
export declare const SYNTHETIC_DATA_ENDPOINTS: {
    /** Generate synthetic data - POST /ml/v1/tuning/synthetic_data */
    readonly BASE: "/ml/v1/tuning/synthetic_data";
    /** Get/Delete synthetic data - GET/DELETE /ml/v1/tuning/synthetic_data/{id} */
    readonly BY_ID: "/ml/v1/tuning/synthetic_data/{id}";
};
export declare const TAXONOMY_ENDPOINTS: {
    /** Import taxonomy - POST /ml/v1/tuning/taxonomies_imports */
    readonly BASE: "/ml/v1/tuning/taxonomies_imports";
    /** Get/Delete taxonomy import - GET/DELETE /ml/v1/tuning/taxonomies_imports/{id} */
    readonly BY_ID: "/ml/v1/tuning/taxonomies_imports/{id}";
};
export declare const MODEL_ENDPOINTS: {
    /** List/Create models - GET/POST /ml/v4/models */
    readonly BASE: "/ml/v4/models";
    /** Get/Update/Delete model - GET/PATCH/DELETE /ml/v4/models/{model_id} */
    readonly BY_ID: "/ml/v4/models/{model_id}";
};
export declare const UTILITY_AGENT_TOOL_ENDPOINTS: {
    /** List/Create utility agent tools - GET/POST /v1-beta/utility_agent_tools */
    readonly BASE: "/v1-beta/utility_agent_tools";
    /** Get/Update/Delete utility agent tool - GET/PATCH/DELETE /v1-beta/utility_agent_tools/{tool_id} */
    readonly BY_ID: "/v1-beta/utility_agent_tools/{tool_id}";
    /** Run utility agent tool - POST /v1-beta/utility_agent_tools/run */
    readonly RUN: "/v1-beta/utility_agent_tools/run";
    /** Run specific utility agent tool - POST /v1-beta/utility_agent_tools/run/{tool_id} */
    readonly RUN_BY_ID: "/v1-beta/utility_agent_tools/run/{tool_id}";
};
export declare const SPACES_ENDPOINTS: {
    /** List/Create spaces - GET/POST /v2/spaces */
    readonly BASE: "/v2/spaces";
    /** Get/Update/Delete space - GET/PATCH/DELETE /v2/spaces/{space_id} */
    readonly BY_ID: "/v2/spaces/{space_id}";
};
export declare const AUDIO_ENDPOINTS: {
    /** Transcribe audio - POST /ml/v1/audio/transcriptions */
    readonly TRANSCRIPTIONS: "/ml/v1/audio/transcriptions";
};
export declare const GATEWAY_COMPLETION_ENDPOINTS: {
    /** Chat completions via gateway - POST /ml/gateway/v1/chat/completions */
    readonly CHAT: "/ml/gateway/v1/chat/completions";
    /** Embeddings via gateway - POST /ml/gateway/v1/embeddings */
    readonly EMBEDDINGS: "/ml/gateway/v1/embeddings";
    /** Text completions via gateway - POST /ml/gateway/v1/completions */
    readonly TEXT: "/ml/gateway/v1/completions";
};
export declare const GATEWAY_MODEL_ENDPOINTS: {
    /** List all gateway models - GET /ml/gateway/v1/models */
    readonly BASE: "/ml/gateway/v1/models";
    /** Get gateway model details - GET /ml/gateway/v1/models/{model_id} */
    readonly BY_ID: "/ml/gateway/v1/models/{model_id}";
    /** List provider models - GET /ml/gateway/v1/providers/{provider_id}/models */
    readonly LIST_PROVIDER_MODELS: "/ml/gateway/v1/providers/{provider_id}/models";
};
export declare const GATEWAY_POLICY_ENDPOINTS: {
    /** List/Create policies - GET/POST /ml/gateway/v1/policies */
    readonly BASE: "/ml/gateway/v1/policies";
    /** Get/Update/Delete policy - GET/PUT/DELETE /ml/gateway/v1/policies/{policy_id} */
    readonly BY_ID: "/ml/gateway/v1/policies/{policy_id}";
};
export declare const GATEWAY_PROVIDER_ENDPOINTS: {
    /** List providers - GET /ml/gateway/v1/providers */
    readonly BASE: "/ml/gateway/v1/providers";
    /** Create provider - POST /ml/gateway/v1/providers/{provider_name} */
    readonly CREATE: "/ml/gateway/v1/providers/{provider_name}";
    /** Get/Delete provider - GET/DELETE /ml/gateway/v1/providers/{provider_id} */
    readonly BY_ID: "/ml/gateway/v1/providers/{provider_id}";
    /** Update provider - PUT /ml/gateway/v1/providers/{provider_id}/{provider_name} */
    readonly UPDATE: "/ml/gateway/v1/providers/{provider_id}/{provider_name}";
    /**
     * List available models for provider - GET
     * /ml/gateway/v1/providers/{provider_id}/models/available
     */
    readonly LIST_AVAILABLE_MODELS: "/ml/gateway/v1/providers/{provider_id}/models/available";
};
export declare const GATEWAY_RATE_LIMIT_ENDPOINTS: {
    /** List/Create rate limits - GET/POST /ml/gateway/v1/rate-limits */
    readonly BASE: "/ml/gateway/v1/rate-limits";
    /** Get/Update/Delete rate limit - GET/PUT/DELETE /ml/gateway/v1/rate-limits/{rate_limit_id} */
    readonly BY_ID: "/ml/gateway/v1/rate-limits/{rate_limit_id}";
};
/** All endpoint constants grouped by category for easy access */
export declare const ENDPOINTS: {
    readonly DEPLOYMENT: {
        /** List/Create deployments - GET/POST /ml/v4/deployments */
        readonly BASE: "/ml/v4/deployments";
        /** Get/Update/Delete deployment - GET/PATCH/DELETE /ml/v4/deployments/{deployment_id} */
        readonly BY_ID: "/ml/v4/deployments/{deployment_id}";
        /** Generate text from deployment - POST /ml/v1/deployments/{id_or_name}/text/generation */
        readonly TEXT_GENERATION: "/ml/v1/deployments/{id_or_name}/text/generation";
        /**
         * Stream text generation from deployment - POST
         * /ml/v1/deployments/{id_or_name}/text/generation_stream
         */
        readonly TEXT_GENERATION_STREAM: "/ml/v1/deployments/{id_or_name}/text/generation_stream";
        /** Chat with deployment - POST /ml/v1/deployments/{id_or_name}/text/chat */
        readonly CHAT: "/ml/v1/deployments/{id_or_name}/text/chat";
        /** Stream chat with deployment - POST /ml/v1/deployments/{id_or_name}/text/chat_stream */
        readonly CHAT_STREAM: "/ml/v1/deployments/{id_or_name}/text/chat_stream";
        /**
         * Time series forecast from deployment - POST
         * /ml/v1/deployments/{id_or_name}/time_series/forecast
         */
        readonly TIME_SERIES_FORECAST: "/ml/v1/deployments/{id_or_name}/time_series/forecast";
    };
    readonly FOUNDATION_MODEL: {
        /** List foundation model specifications - GET /ml/v1/foundation_model_specs */
        readonly LIST_SPECS: "/ml/v1/foundation_model_specs";
        /** Get foundation model specification - GET /ml/v1/foundation_model_specs/{model_id} */
        readonly SPEC_BY_ID: "/ml/v1/foundation_model_specs/{model_id}";
        /** List foundation model tasks - GET /ml/v1/foundation_model_tasks */
        readonly LIST_TASKS: "/ml/v1/foundation_model_tasks";
    };
    readonly PROMPT: {
        /** List/Create prompts - GET/POST /v1/prompts */
        readonly BASE: "/v1/prompts";
        /** Get/Update/Delete prompt - GET/PATCH/DELETE /v1/prompts/{prompt_id} */
        readonly BY_ID: "/v1/prompts/{prompt_id}";
        /** Lock/Unlock prompt - POST/DELETE /v1/prompts/{prompt_id}/lock */
        readonly LOCK: "/v1/prompts/{prompt_id}/lock";
        /** Get/Update prompt input - GET/PUT /v1/prompts/{prompt_id}/input */
        readonly INPUT: "/v1/prompts/{prompt_id}/input";
        /** Get/Update prompt chat items - GET/PUT /v1/prompts/{prompt_id}/chat_items */
        readonly CHAT_ITEMS: "/v1/prompts/{prompt_id}/chat_items";
        /** Search prompts - POST /v2/asset_types/wx_prompt/search */
        readonly SEARCH: "/v2/asset_types/wx_prompt/search";
    };
    readonly PROMPT_SESSION: {
        /** List/Create prompt sessions - GET/POST /v1/prompt_sessions */
        readonly BASE: "/v1/prompt_sessions";
        /** Get/Delete prompt session - GET/DELETE /v1/prompt_sessions/{session_id} */
        readonly BY_ID: "/v1/prompt_sessions/{session_id}";
        /** Lock/Unlock prompt session - POST/DELETE /v1/prompt_sessions/{session_id}/lock */
        readonly LOCK: "/v1/prompt_sessions/{session_id}/lock";
        /** List/Create session entries - GET/POST /v1/prompt_sessions/{session_id}/entries */
        readonly ENTRIES: "/v1/prompt_sessions/{session_id}/entries";
        /** Get/Delete session entry - GET/DELETE /v1/prompt_sessions/{session_id}/entries/{entry_id} */
        readonly ENTRY_BY_ID: "/v1/prompt_sessions/{session_id}/entries/{entry_id}";
        /**
         * Get/Update entry chat items - GET/PUT
         * /v1/prompt_sessions/{session_id}/entries/{entry_id}/chat_items
         */
        readonly ENTRY_CHAT_ITEMS: "/v1/prompt_sessions/{session_id}/entries/{entry_id}/chat_items";
    };
    readonly TEXT: {
        /** Chat completion - POST /ml/v1/text/chat */
        readonly CHAT: "/ml/v1/text/chat";
        /** Stream chat completion - POST /ml/v1/text/chat_stream */
        readonly CHAT_STREAM: "/ml/v1/text/chat_stream";
        /** Generate text embeddings - POST /ml/v1/text/embeddings */
        readonly EMBEDDINGS: "/ml/v1/text/embeddings";
        /** Extract text - POST /ml/v1/text/extractions */
        readonly EXTRACTIONS: "/ml/v1/text/extractions";
        /** Get extraction result - GET /ml/v1/text/extractions/{id} */
        readonly EXTRACTION_BY_ID: "/ml/v1/text/extractions/{id}";
        /** Generate text - POST /ml/v1/text/generation */
        readonly GENERATION: "/ml/v1/text/generation";
        /** Stream text generation - POST /ml/v1/text/generation_stream */
        readonly GENERATION_STREAM: "/ml/v1/text/generation_stream";
        /** Tokenize text - POST /ml/v1/text/tokenization */
        readonly TOKENIZATION: "/ml/v1/text/tokenization";
        /** Rerank text - POST /ml/v1/text/rerank */
        readonly RERANK: "/ml/v1/text/rerank";
        /** Classify text - POST /ml/v1/text/classifications */
        readonly CLASSIFICATIONS: "/ml/v1/text/classifications";
        /** Get/Delete classification result - GET/DELETE /ml/v1/text/classifications/{id} */
        readonly CLASSIFICATION_BY_ID: "/ml/v1/text/classifications/{id}";
    };
    readonly TIME_SERIES: {
        /** Time series forecast - POST /ml/v1/time_series/forecast */
        readonly FORECAST: "/ml/v1/time_series/forecast";
    };
    readonly TRAINING: {
        /** List/Create trainings - GET/POST /ml/v4/trainings */
        readonly BASE: "/ml/v4/trainings";
        /** Get/Delete training - GET/DELETE /ml/v4/trainings/{training_id} */
        readonly BY_ID: "/ml/v4/trainings/{training_id}";
    };
    readonly FINE_TUNING: {
        /** List/Create fine tuning jobs - GET/POST /ml/v1/fine_tunings */
        readonly BASE: "/ml/v1/fine_tunings";
        /** Get fine tuning job - GET /ml/v1/fine_tunings/{id} */
        readonly BY_ID: "/ml/v1/fine_tunings/{id}";
        /** Cancel fine tuning job - POST /ml/v1/fine_tunings/{id}/cancel */
        readonly CANCEL: "/ml/v1/fine_tunings/{id}/cancel";
    };
    readonly TUNING_DOCUMENT: {
        /** Extract document - POST /ml/v1/tuning/documents */
        readonly BASE: "/ml/v1/tuning/documents";
        /** Get/Delete document extraction - GET/DELETE /ml/v1/tuning/documents/{id} */
        readonly BY_ID: "/ml/v1/tuning/documents/{id}";
    };
    readonly SYNTHETIC_DATA: {
        /** Generate synthetic data - POST /ml/v1/tuning/synthetic_data */
        readonly BASE: "/ml/v1/tuning/synthetic_data";
        /** Get/Delete synthetic data - GET/DELETE /ml/v1/tuning/synthetic_data/{id} */
        readonly BY_ID: "/ml/v1/tuning/synthetic_data/{id}";
    };
    readonly TAXONOMY: {
        /** Import taxonomy - POST /ml/v1/tuning/taxonomies_imports */
        readonly BASE: "/ml/v1/tuning/taxonomies_imports";
        /** Get/Delete taxonomy import - GET/DELETE /ml/v1/tuning/taxonomies_imports/{id} */
        readonly BY_ID: "/ml/v1/tuning/taxonomies_imports/{id}";
    };
    readonly MODEL: {
        /** List/Create models - GET/POST /ml/v4/models */
        readonly BASE: "/ml/v4/models";
        /** Get/Update/Delete model - GET/PATCH/DELETE /ml/v4/models/{model_id} */
        readonly BY_ID: "/ml/v4/models/{model_id}";
    };
    readonly UTILITY_AGENT_TOOL: {
        /** List/Create utility agent tools - GET/POST /v1-beta/utility_agent_tools */
        readonly BASE: "/v1-beta/utility_agent_tools";
        /** Get/Update/Delete utility agent tool - GET/PATCH/DELETE /v1-beta/utility_agent_tools/{tool_id} */
        readonly BY_ID: "/v1-beta/utility_agent_tools/{tool_id}";
        /** Run utility agent tool - POST /v1-beta/utility_agent_tools/run */
        readonly RUN: "/v1-beta/utility_agent_tools/run";
        /** Run specific utility agent tool - POST /v1-beta/utility_agent_tools/run/{tool_id} */
        readonly RUN_BY_ID: "/v1-beta/utility_agent_tools/run/{tool_id}";
    };
    readonly SPACES: {
        /** List/Create spaces - GET/POST /v2/spaces */
        readonly BASE: "/v2/spaces";
        /** Get/Update/Delete space - GET/PATCH/DELETE /v2/spaces/{space_id} */
        readonly BY_ID: "/v2/spaces/{space_id}";
    };
    readonly AUDIO: {
        /** Transcribe audio - POST /ml/v1/audio/transcriptions */
        readonly TRANSCRIPTIONS: "/ml/v1/audio/transcriptions";
    };
    readonly GATEWAY: {
        readonly COMPLETION: {
            /** Chat completions via gateway - POST /ml/gateway/v1/chat/completions */
            readonly CHAT: "/ml/gateway/v1/chat/completions";
            /** Embeddings via gateway - POST /ml/gateway/v1/embeddings */
            readonly EMBEDDINGS: "/ml/gateway/v1/embeddings";
            /** Text completions via gateway - POST /ml/gateway/v1/completions */
            readonly TEXT: "/ml/gateway/v1/completions";
        };
        readonly MODEL: {
            /** List all gateway models - GET /ml/gateway/v1/models */
            readonly BASE: "/ml/gateway/v1/models";
            /** Get gateway model details - GET /ml/gateway/v1/models/{model_id} */
            readonly BY_ID: "/ml/gateway/v1/models/{model_id}";
            /** List provider models - GET /ml/gateway/v1/providers/{provider_id}/models */
            readonly LIST_PROVIDER_MODELS: "/ml/gateway/v1/providers/{provider_id}/models";
        };
        readonly POLICY: {
            /** List/Create policies - GET/POST /ml/gateway/v1/policies */
            readonly BASE: "/ml/gateway/v1/policies";
            /** Get/Update/Delete policy - GET/PUT/DELETE /ml/gateway/v1/policies/{policy_id} */
            readonly BY_ID: "/ml/gateway/v1/policies/{policy_id}";
        };
        readonly PROVIDER: {
            /** List providers - GET /ml/gateway/v1/providers */
            readonly BASE: "/ml/gateway/v1/providers";
            /** Create provider - POST /ml/gateway/v1/providers/{provider_name} */
            readonly CREATE: "/ml/gateway/v1/providers/{provider_name}";
            /** Get/Delete provider - GET/DELETE /ml/gateway/v1/providers/{provider_id} */
            readonly BY_ID: "/ml/gateway/v1/providers/{provider_id}";
            /** Update provider - PUT /ml/gateway/v1/providers/{provider_id}/{provider_name} */
            readonly UPDATE: "/ml/gateway/v1/providers/{provider_id}/{provider_name}";
            /**
             * List available models for provider - GET
             * /ml/gateway/v1/providers/{provider_id}/models/available
             */
            readonly LIST_AVAILABLE_MODELS: "/ml/gateway/v1/providers/{provider_id}/models/available";
        };
        readonly RATE_LIMIT: {
            /** List/Create rate limits - GET/POST /ml/gateway/v1/rate-limits */
            readonly BASE: "/ml/gateway/v1/rate-limits";
            /** Get/Update/Delete rate limit - GET/PUT/DELETE /ml/gateway/v1/rate-limits/{rate_limit_id} */
            readonly BY_ID: "/ml/gateway/v1/rate-limits/{rate_limit_id}";
        };
    };
};
//# sourceMappingURL=endpoints.d.mts.map