"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENDPOINTS = exports.GATEWAY_RATE_LIMIT_ENDPOINTS = exports.GATEWAY_PROVIDER_ENDPOINTS = exports.GATEWAY_POLICY_ENDPOINTS = exports.GATEWAY_MODEL_ENDPOINTS = exports.GATEWAY_COMPLETION_ENDPOINTS = exports.AUDIO_ENDPOINTS = exports.SPACES_ENDPOINTS = exports.UTILITY_AGENT_TOOL_ENDPOINTS = exports.MODEL_ENDPOINTS = exports.TAXONOMY_ENDPOINTS = exports.SYNTHETIC_DATA_ENDPOINTS = exports.TUNING_DOCUMENT_ENDPOINTS = exports.FINE_TUNING_ENDPOINTS = exports.TRAINING_ENDPOINTS = exports.TIME_SERIES_ENDPOINTS = exports.TEXT_ENDPOINTS = exports.PROMPT_SESSION_ENDPOINTS = exports.PROMPT_ENDPOINTS = exports.FOUNDATION_MODEL_ENDPOINTS = exports.DEPLOYMENT_ENDPOINTS = exports.PLATFORM_URL_MAPPINGS = exports.ML_CLOUD_BASE_URL = void 0;
/**
 * Centralized URL and endpoint configuration for WatsonX AI ML SDK
 *
 * This file contains all base URLs, platform URL mappings, and API endpoint paths used throughout
 * the SDK. It provides a single source of truth for all URL-related constants to improve
 * maintainability and consistency.
 */
// ============================================================================
// BASE URLS
// ============================================================================
/**
 * Base parameterized URL template for ML cloud services Replace {region} with the appropriate
 * region identifier
 */
exports.ML_CLOUD_BASE_URL = 'https://{region}.ml.cloud.ibm.com';
// ============================================================================
// PLATFORM URL MAPPINGS
// ============================================================================
/**
 * Maps ML cloud URLs to their corresponding data platform URLs Used for converting between ML
 * service URLs and watsonx service URLs
 */
exports.PLATFORM_URL_MAPPINGS = {
    // Dallas
    'https://us-south.ml.cloud.ibm.com': 'https://api.dataplatform.cloud.ibm.com',
    'https://private.us-south.ml.cloud.ibm.com': 'https://private.api.dataplatform.cloud.ibm.com',
    // Frankfurt
    'https://eu-de.ml.cloud.ibm.com': 'https://api.eu-de.dataplatform.cloud.ibm.com',
    'https://private.eu-de.ml.cloud.ibm.com': 'https://private.api.eu-de.dataplatform.cloud.ibm.com',
    // London
    'https://eu-gb.ml.cloud.ibm.com': 'https://api.eu-gb.dataplatform.cloud.ibm.com',
    'https://private.eu-gb.ml.cloud.ibm.com': 'https://private.api.eu-gb.dataplatform.cloud.ibm.com',
    // Tokyo
    'https://jp-tok.ml.cloud.ibm.com': 'https://api.jp-tok.dataplatform.cloud.ibm.com',
    'https://private.jp-tok.ml.cloud.ibm.com': 'https://private.api.jp-tok.dataplatform.cloud.ibm.com',
    // Sydney
    'https://au-syd.ml.cloud.ibm.com': 'https://api.au-syd.dai.cloud.ibm.com',
    'https://private.au-syd.ml.cloud.ibm.com': 'https://private.api.au-syd.dai.cloud.ibm.com',
    // Toronto
    'https://ca-tor.ml.cloud.ibm.com': 'https://api.ca-tor.dai.cloud.ibm.com',
    'https://private.ca-tor.ml.cloud.ibm.com': 'https://private.api.ca-tor.dai.cloud.ibm.com',
    // YP-QA
    'https://yp-qa.ml.cloud.ibm.com': 'https://api.dataplatform.test.cloud.ibm.com',
    'https://private.yp-qa.ml.cloud.ibm.com': 'https://private.api.dataplatform.test.cloud.ibm.com',
    // MCSP
    'https://wxai-qa.ml.cloud.ibm.com': 'https://api.dai.test.cloud.ibm.com',
    'https://wml-mcsp-dev.ml.test.cloud.ibm.com': 'https://api.dai.dev.cloud.ibm.com',
    'https://private.wml-mcsp-dev.ml.test.cloud.ibm.com': 'https://private.api.dai.dev.cloud.ibm.com',
    // AWS
    'https://ap-south-1.aws.wxai.ibm.com': 'https://api.ap-south-1.aws.data.ibm.com/wx',
    'https://private.ap-south-1.aws.wxai.ibm.com': 'https://api.ap-south-1.aws.data.ibm.com',
    'https://us-east-1.aws.wxai.ibm.com': 'https://api.us-east-1.aws.data.ibm.com',
    'https://private.us-east-1.aws.wxai.ibm.com': 'https://api.us-east-1.aws.data.ibm.com',
};
// ============================================================================
// DEPLOYMENT ENDPOINTS
// ============================================================================
exports.DEPLOYMENT_ENDPOINTS = {
    /** List/Create deployments - GET/POST /ml/v4/deployments */
    BASE: '/ml/v4/deployments',
    /** Get/Update/Delete deployment - GET/PATCH/DELETE /ml/v4/deployments/{deployment_id} */
    BY_ID: '/ml/v4/deployments/{deployment_id}',
    /** Generate text from deployment - POST /ml/v1/deployments/{id_or_name}/text/generation */
    TEXT_GENERATION: '/ml/v1/deployments/{id_or_name}/text/generation',
    /**
     * Stream text generation from deployment - POST
     * /ml/v1/deployments/{id_or_name}/text/generation_stream
     */
    TEXT_GENERATION_STREAM: '/ml/v1/deployments/{id_or_name}/text/generation_stream',
    /** Chat with deployment - POST /ml/v1/deployments/{id_or_name}/text/chat */
    CHAT: '/ml/v1/deployments/{id_or_name}/text/chat',
    /** Stream chat with deployment - POST /ml/v1/deployments/{id_or_name}/text/chat_stream */
    CHAT_STREAM: '/ml/v1/deployments/{id_or_name}/text/chat_stream',
    /**
     * Time series forecast from deployment - POST
     * /ml/v1/deployments/{id_or_name}/time_series/forecast
     */
    TIME_SERIES_FORECAST: '/ml/v1/deployments/{id_or_name}/time_series/forecast',
};
// ============================================================================
// FOUNDATION MODEL ENDPOINTS
// ============================================================================
exports.FOUNDATION_MODEL_ENDPOINTS = {
    /** List foundation model specifications - GET /ml/v1/foundation_model_specs */
    LIST_SPECS: '/ml/v1/foundation_model_specs',
    /** Get foundation model specification - GET /ml/v1/foundation_model_specs/{model_id} */
    SPEC_BY_ID: '/ml/v1/foundation_model_specs/{model_id}',
    /** List foundation model tasks - GET /ml/v1/foundation_model_tasks */
    LIST_TASKS: '/ml/v1/foundation_model_tasks',
};
// ============================================================================
// PROMPT ENDPOINTS
// ============================================================================
exports.PROMPT_ENDPOINTS = {
    /** List/Create prompts - GET/POST /v1/prompts */
    BASE: '/v1/prompts',
    /** Get/Update/Delete prompt - GET/PATCH/DELETE /v1/prompts/{prompt_id} */
    BY_ID: '/v1/prompts/{prompt_id}',
    /** Lock/Unlock prompt - POST/DELETE /v1/prompts/{prompt_id}/lock */
    LOCK: '/v1/prompts/{prompt_id}/lock',
    /** Get/Update prompt input - GET/PUT /v1/prompts/{prompt_id}/input */
    INPUT: '/v1/prompts/{prompt_id}/input',
    /** Get/Update prompt chat items - GET/PUT /v1/prompts/{prompt_id}/chat_items */
    CHAT_ITEMS: '/v1/prompts/{prompt_id}/chat_items',
    /** Search prompts - POST /v2/asset_types/wx_prompt/search */
    SEARCH: '/v2/asset_types/wx_prompt/search',
};
// ============================================================================
// PROMPT SESSION ENDPOINTS
// ============================================================================
exports.PROMPT_SESSION_ENDPOINTS = {
    /** List/Create prompt sessions - GET/POST /v1/prompt_sessions */
    BASE: '/v1/prompt_sessions',
    /** Get/Delete prompt session - GET/DELETE /v1/prompt_sessions/{session_id} */
    BY_ID: '/v1/prompt_sessions/{session_id}',
    /** Lock/Unlock prompt session - POST/DELETE /v1/prompt_sessions/{session_id}/lock */
    LOCK: '/v1/prompt_sessions/{session_id}/lock',
    /** List/Create session entries - GET/POST /v1/prompt_sessions/{session_id}/entries */
    ENTRIES: '/v1/prompt_sessions/{session_id}/entries',
    /** Get/Delete session entry - GET/DELETE /v1/prompt_sessions/{session_id}/entries/{entry_id} */
    ENTRY_BY_ID: '/v1/prompt_sessions/{session_id}/entries/{entry_id}',
    /**
     * Get/Update entry chat items - GET/PUT
     * /v1/prompt_sessions/{session_id}/entries/{entry_id}/chat_items
     */
    ENTRY_CHAT_ITEMS: '/v1/prompt_sessions/{session_id}/entries/{entry_id}/chat_items',
};
// ============================================================================
// TEXT OPERATION ENDPOINTS
// ============================================================================
exports.TEXT_ENDPOINTS = {
    /** Chat completion - POST /ml/v1/text/chat */
    CHAT: '/ml/v1/text/chat',
    /** Stream chat completion - POST /ml/v1/text/chat_stream */
    CHAT_STREAM: '/ml/v1/text/chat_stream',
    /** Generate text embeddings - POST /ml/v1/text/embeddings */
    EMBEDDINGS: '/ml/v1/text/embeddings',
    /** Extract text - POST /ml/v1/text/extractions */
    EXTRACTIONS: '/ml/v1/text/extractions',
    /** Get extraction result - GET /ml/v1/text/extractions/{id} */
    EXTRACTION_BY_ID: '/ml/v1/text/extractions/{id}',
    /** Generate text - POST /ml/v1/text/generation */
    GENERATION: '/ml/v1/text/generation',
    /** Stream text generation - POST /ml/v1/text/generation_stream */
    GENERATION_STREAM: '/ml/v1/text/generation_stream',
    /** Tokenize text - POST /ml/v1/text/tokenization */
    TOKENIZATION: '/ml/v1/text/tokenization',
    /** Rerank text - POST /ml/v1/text/rerank */
    RERANK: '/ml/v1/text/rerank',
    /** Classify text - POST /ml/v1/text/classifications */
    CLASSIFICATIONS: '/ml/v1/text/classifications',
    /** Get/Delete classification result - GET/DELETE /ml/v1/text/classifications/{id} */
    CLASSIFICATION_BY_ID: '/ml/v1/text/classifications/{id}',
};
// ============================================================================
// TIME SERIES ENDPOINTS
// ============================================================================
exports.TIME_SERIES_ENDPOINTS = {
    /** Time series forecast - POST /ml/v1/time_series/forecast */
    FORECAST: '/ml/v1/time_series/forecast',
};
// ============================================================================
// TRAINING ENDPOINTS
// ============================================================================
exports.TRAINING_ENDPOINTS = {
    /** List/Create trainings - GET/POST /ml/v4/trainings */
    BASE: '/ml/v4/trainings',
    /** Get/Delete training - GET/DELETE /ml/v4/trainings/{training_id} */
    BY_ID: '/ml/v4/trainings/{training_id}',
};
// ============================================================================
// FINE TUNING ENDPOINTS
// ============================================================================
exports.FINE_TUNING_ENDPOINTS = {
    /** List/Create fine tuning jobs - GET/POST /ml/v1/fine_tunings */
    BASE: '/ml/v1/fine_tunings',
    /** Get fine tuning job - GET /ml/v1/fine_tunings/{id} */
    BY_ID: '/ml/v1/fine_tunings/{id}',
    /** Cancel fine tuning job - POST /ml/v1/fine_tunings/{id}/cancel */
    CANCEL: '/ml/v1/fine_tunings/{id}/cancel',
};
// ============================================================================
// TUNING DOCUMENT ENDPOINTS
// ============================================================================
exports.TUNING_DOCUMENT_ENDPOINTS = {
    /** Extract document - POST /ml/v1/tuning/documents */
    BASE: '/ml/v1/tuning/documents',
    /** Get/Delete document extraction - GET/DELETE /ml/v1/tuning/documents/{id} */
    BY_ID: '/ml/v1/tuning/documents/{id}',
};
// ============================================================================
// SYNTHETIC DATA ENDPOINTS
// ============================================================================
exports.SYNTHETIC_DATA_ENDPOINTS = {
    /** Generate synthetic data - POST /ml/v1/tuning/synthetic_data */
    BASE: '/ml/v1/tuning/synthetic_data',
    /** Get/Delete synthetic data - GET/DELETE /ml/v1/tuning/synthetic_data/{id} */
    BY_ID: '/ml/v1/tuning/synthetic_data/{id}',
};
// ============================================================================
// TAXONOMY ENDPOINTS
// ============================================================================
exports.TAXONOMY_ENDPOINTS = {
    /** Import taxonomy - POST /ml/v1/tuning/taxonomies_imports */
    BASE: '/ml/v1/tuning/taxonomies_imports',
    /** Get/Delete taxonomy import - GET/DELETE /ml/v1/tuning/taxonomies_imports/{id} */
    BY_ID: '/ml/v1/tuning/taxonomies_imports/{id}',
};
// ============================================================================
// MODEL ENDPOINTS
// ============================================================================
exports.MODEL_ENDPOINTS = {
    /** List/Create models - GET/POST /ml/v4/models */
    BASE: '/ml/v4/models',
    /** Get/Update/Delete model - GET/PATCH/DELETE /ml/v4/models/{model_id} */
    BY_ID: '/ml/v4/models/{model_id}',
};
// ============================================================================
// UTILITY AGENT TOOL ENDPOINTS
// ============================================================================
exports.UTILITY_AGENT_TOOL_ENDPOINTS = {
    /** List/Create utility agent tools - GET/POST /v1-beta/utility_agent_tools */
    BASE: '/v1-beta/utility_agent_tools',
    /** Get/Update/Delete utility agent tool - GET/PATCH/DELETE /v1-beta/utility_agent_tools/{tool_id} */
    BY_ID: '/v1-beta/utility_agent_tools/{tool_id}',
    /** Run utility agent tool - POST /v1-beta/utility_agent_tools/run */
    RUN: '/v1-beta/utility_agent_tools/run',
    /** Run specific utility agent tool - POST /v1-beta/utility_agent_tools/run/{tool_id} */
    RUN_BY_ID: '/v1-beta/utility_agent_tools/run/{tool_id}',
};
// ============================================================================
// SPACES ENDPOINTS
// ============================================================================
exports.SPACES_ENDPOINTS = {
    /** List/Create spaces - GET/POST /v2/spaces */
    BASE: '/v2/spaces',
    /** Get/Update/Delete space - GET/PATCH/DELETE /v2/spaces/{space_id} */
    BY_ID: '/v2/spaces/{space_id}',
};
// ============================================================================
// AUDIO ENDPOINTS
// ============================================================================
exports.AUDIO_ENDPOINTS = {
    /** Transcribe audio - POST /ml/v1/audio/transcriptions */
    TRANSCRIPTIONS: '/ml/v1/audio/transcriptions',
};
// ============================================================================
// GATEWAY - COMPLETION ENDPOINTS
// ============================================================================
exports.GATEWAY_COMPLETION_ENDPOINTS = {
    /** Chat completions via gateway - POST /ml/gateway/v1/chat/completions */
    CHAT: '/ml/gateway/v1/chat/completions',
    /** Embeddings via gateway - POST /ml/gateway/v1/embeddings */
    EMBEDDINGS: '/ml/gateway/v1/embeddings',
    /** Text completions via gateway - POST /ml/gateway/v1/completions */
    TEXT: '/ml/gateway/v1/completions',
};
// ============================================================================
// GATEWAY - MODEL ENDPOINTS
// ============================================================================
exports.GATEWAY_MODEL_ENDPOINTS = {
    /** List all gateway models - GET /ml/gateway/v1/models */
    BASE: '/ml/gateway/v1/models',
    /** Get gateway model details - GET /ml/gateway/v1/models/{model_id} */
    BY_ID: '/ml/gateway/v1/models/{model_id}',
    /** List provider models - GET /ml/gateway/v1/providers/{provider_id}/models */
    LIST_PROVIDER_MODELS: '/ml/gateway/v1/providers/{provider_id}/models',
};
// ============================================================================
// GATEWAY - POLICY ENDPOINTS
// ============================================================================
exports.GATEWAY_POLICY_ENDPOINTS = {
    /** List/Create policies - GET/POST /ml/gateway/v1/policies */
    BASE: '/ml/gateway/v1/policies',
    /** Get/Update/Delete policy - GET/PUT/DELETE /ml/gateway/v1/policies/{policy_id} */
    BY_ID: '/ml/gateway/v1/policies/{policy_id}',
};
// ============================================================================
// GATEWAY - PROVIDER ENDPOINTS
// ============================================================================
exports.GATEWAY_PROVIDER_ENDPOINTS = {
    /** List providers - GET /ml/gateway/v1/providers */
    BASE: '/ml/gateway/v1/providers',
    /** Create provider - POST /ml/gateway/v1/providers/{provider_name} */
    CREATE: '/ml/gateway/v1/providers/{provider_name}',
    /** Get/Delete provider - GET/DELETE /ml/gateway/v1/providers/{provider_id} */
    BY_ID: '/ml/gateway/v1/providers/{provider_id}',
    /** Update provider - PUT /ml/gateway/v1/providers/{provider_id}/{provider_name} */
    UPDATE: '/ml/gateway/v1/providers/{provider_id}/{provider_name}',
    /**
     * List available models for provider - GET
     * /ml/gateway/v1/providers/{provider_id}/models/available
     */
    LIST_AVAILABLE_MODELS: '/ml/gateway/v1/providers/{provider_id}/models/available',
};
// ============================================================================
// GATEWAY - RATE LIMIT ENDPOINTS
// ============================================================================
exports.GATEWAY_RATE_LIMIT_ENDPOINTS = {
    /** List/Create rate limits - GET/POST /ml/gateway/v1/rate-limits */
    BASE: '/ml/gateway/v1/rate-limits',
    /** Get/Update/Delete rate limit - GET/PUT/DELETE /ml/gateway/v1/rate-limits/{rate_limit_id} */
    BY_ID: '/ml/gateway/v1/rate-limits/{rate_limit_id}',
};
// ============================================================================
// EXPORTS
// ============================================================================
/** All endpoint constants grouped by category for easy access */
exports.ENDPOINTS = {
    DEPLOYMENT: exports.DEPLOYMENT_ENDPOINTS,
    FOUNDATION_MODEL: exports.FOUNDATION_MODEL_ENDPOINTS,
    PROMPT: exports.PROMPT_ENDPOINTS,
    PROMPT_SESSION: exports.PROMPT_SESSION_ENDPOINTS,
    TEXT: exports.TEXT_ENDPOINTS,
    TIME_SERIES: exports.TIME_SERIES_ENDPOINTS,
    TRAINING: exports.TRAINING_ENDPOINTS,
    FINE_TUNING: exports.FINE_TUNING_ENDPOINTS,
    TUNING_DOCUMENT: exports.TUNING_DOCUMENT_ENDPOINTS,
    SYNTHETIC_DATA: exports.SYNTHETIC_DATA_ENDPOINTS,
    TAXONOMY: exports.TAXONOMY_ENDPOINTS,
    MODEL: exports.MODEL_ENDPOINTS,
    UTILITY_AGENT_TOOL: exports.UTILITY_AGENT_TOOL_ENDPOINTS,
    SPACES: exports.SPACES_ENDPOINTS,
    AUDIO: exports.AUDIO_ENDPOINTS,
    GATEWAY: {
        COMPLETION: exports.GATEWAY_COMPLETION_ENDPOINTS,
        MODEL: exports.GATEWAY_MODEL_ENDPOINTS,
        POLICY: exports.GATEWAY_POLICY_ENDPOINTS,
        PROVIDER: exports.GATEWAY_PROVIDER_ENDPOINTS,
        RATE_LIMIT: exports.GATEWAY_RATE_LIMIT_ENDPOINTS,
    },
};
// Made with Bob
//# sourceMappingURL=endpoints.js.map