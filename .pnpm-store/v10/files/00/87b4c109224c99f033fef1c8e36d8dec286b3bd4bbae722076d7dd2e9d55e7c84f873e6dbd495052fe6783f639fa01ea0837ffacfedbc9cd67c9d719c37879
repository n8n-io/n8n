import { HF_HEADER_X_BILL_TO, HF_HUB_URL } from "../config.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "../package.js";
import { getInferenceProviderMapping } from "./getInferenceProviderMapping.js";
import { isUrl } from "./isUrl.js";
import { InferenceClientHubApiError, InferenceClientInputError } from "../errors.js";
/**
 * Lazy-loaded from huggingface.co/api/tasks when needed
 * Used to determine the default model to use when it's not user defined
 */
let tasks = null;
/**
 * Helper that prepares request arguments.
 * This async version handle the model ID resolution step.
 */
export async function makeRequestOptions(args, providerHelper, options) {
    const { model: maybeModel } = args;
    const provider = providerHelper.provider;
    const { task } = options ?? {};
    // Validate inputs
    if (args.endpointUrl && provider !== "hf-inference") {
        throw new InferenceClientInputError(`Cannot use endpointUrl with a third-party provider.`);
    }
    if (maybeModel && isUrl(maybeModel)) {
        throw new InferenceClientInputError(`Model URLs are no longer supported. Use endpointUrl instead.`);
    }
    if (args.endpointUrl) {
        // No need to have maybeModel, or to load default model for a task
        return makeRequestOptionsFromResolvedModel(maybeModel ?? args.endpointUrl, providerHelper, args, undefined, options);
    }
    if (!maybeModel && !task) {
        throw new InferenceClientInputError("No model provided, and no task has been specified.");
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const hfModel = maybeModel ?? (await loadDefaultModel(task));
    if (providerHelper.clientSideRoutingOnly && !maybeModel) {
        throw new InferenceClientInputError(`Provider ${provider} requires a model ID to be passed directly.`);
    }
    const inferenceProviderMapping = providerHelper.clientSideRoutingOnly
        ? {
            provider: provider,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            providerId: removeProviderPrefix(maybeModel, provider),
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            hfModelId: maybeModel,
            status: "live",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            task: task,
        }
        : await getInferenceProviderMapping({
            modelId: hfModel,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            task: task,
            provider,
            accessToken: args.accessToken,
        }, { fetch: options?.fetch });
    if (!inferenceProviderMapping) {
        throw new InferenceClientInputError(`We have not been able to find inference provider information for model ${hfModel}.`);
    }
    // Use the sync version with the resolved model
    return makeRequestOptionsFromResolvedModel(inferenceProviderMapping.providerId, providerHelper, args, inferenceProviderMapping, options);
}
/**
 * Helper that prepares request arguments. - for internal use only
 * This sync version skips the model ID resolution step
 */
export function makeRequestOptionsFromResolvedModel(resolvedModel, providerHelper, args, mapping, options) {
    const { accessToken, endpointUrl, provider: maybeProvider, model, ...remainingArgs } = args;
    void model;
    void maybeProvider;
    const provider = providerHelper.provider;
    const { includeCredentials, task, signal, billTo } = options ?? {};
    const authMethod = (() => {
        if (providerHelper.clientSideRoutingOnly) {
            // Closed-source providers require an accessToken (cannot be routed).
            if (accessToken && accessToken.startsWith("hf_")) {
                throw new InferenceClientInputError(`Provider ${provider} is closed-source and does not support HF tokens.`);
            }
        }
        if (accessToken) {
            return accessToken.startsWith("hf_") ? "hf-token" : "provider-key";
        }
        if (includeCredentials === "include") {
            // If accessToken is passed, it should take precedence over includeCredentials
            return "credentials-include";
        }
        return "none";
    })();
    // Make URL
    const modelId = endpointUrl ?? resolvedModel;
    const url = providerHelper.makeUrl({
        authMethod,
        model: modelId,
        task,
    });
    // Make headers
    const headers = providerHelper.prepareHeaders({
        accessToken,
        authMethod,
    }, "data" in args && !!args.data);
    if (billTo) {
        headers[HF_HEADER_X_BILL_TO] = billTo;
    }
    // Add user-agent to headers
    // e.g. @huggingface/inference/3.1.3
    const ownUserAgent = `${PACKAGE_NAME}/${PACKAGE_VERSION}`;
    const userAgent = [ownUserAgent, typeof navigator !== "undefined" ? navigator.userAgent : undefined]
        .filter((x) => x !== undefined)
        .join(" ");
    headers["User-Agent"] = userAgent;
    // Make body
    const body = providerHelper.makeBody({
        args: remainingArgs,
        model: resolvedModel,
        task,
        mapping,
    });
    /**
     * For edge runtimes, leave 'credentials' undefined, otherwise cloudflare workers will error
     */
    let credentials;
    if (typeof includeCredentials === "string") {
        credentials = includeCredentials;
    }
    else if (includeCredentials === true) {
        credentials = "include";
    }
    const info = {
        headers,
        method: "POST",
        body: body,
        ...(credentials ? { credentials } : undefined),
        signal,
    };
    return { url, info };
}
async function loadDefaultModel(task) {
    if (!tasks) {
        tasks = await loadTaskInfo();
    }
    const taskInfo = tasks[task];
    if ((taskInfo?.models.length ?? 0) <= 0) {
        throw new InferenceClientInputError(`No default model defined for task ${task}, please define the model explicitly.`);
    }
    return taskInfo.models[0].id;
}
async function loadTaskInfo() {
    const url = `${HF_HUB_URL}/api/tasks`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new InferenceClientHubApiError("Failed to load tasks definitions from Hugging Face Hub.", { url, method: "GET" }, { requestId: res.headers.get("x-request-id") ?? "", status: res.status, body: await res.text() });
    }
    return await res.json();
}
function removeProviderPrefix(model, provider) {
    if (!model.startsWith(`${provider}/`)) {
        throw new InferenceClientInputError(`Models from ${provider} must be prefixed by "${provider}/". Got "${model}".`);
    }
    return model.slice(provider.length + 1);
}
