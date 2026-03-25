import { BaseConversationalTask, BaseTextGenerationTask } from "./providerHelper.js";
/**
 * See the registered mapping of HF model ID => Groq model ID here:
 *
 * https://huggingface.co/api/partners/groq/models
 *
 * This is a publicly available mapping.
 *
 * If you want to try to run inference for a new model locally before it's registered on huggingface.co,
 * you can add it to the dictionary "HARDCODED_MODEL_ID_MAPPING" in consts.ts, for dev purposes.
 *
 * - If you work at Groq and want to update this mapping, please use the model mapping API we provide on huggingface.co
 * - If you're a community member and want to add a new supported HF model to Groq, please open an issue on the present repo
 * and we will tag Groq team members.
 *
 * Thanks!
 */
const GROQ_API_BASE_URL = "https://api.groq.com";
export class GroqTextGenerationTask extends BaseTextGenerationTask {
    constructor() {
        super("groq", GROQ_API_BASE_URL);
    }
    makeRoute() {
        return "/openai/v1/chat/completions";
    }
}
export class GroqConversationalTask extends BaseConversationalTask {
    constructor() {
        super("groq", GROQ_API_BASE_URL);
    }
    makeRoute() {
        return "/openai/v1/chat/completions";
    }
}
