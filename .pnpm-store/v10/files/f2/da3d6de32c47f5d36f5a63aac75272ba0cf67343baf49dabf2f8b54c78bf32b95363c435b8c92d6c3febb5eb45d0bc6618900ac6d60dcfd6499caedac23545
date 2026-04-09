import { makeRequestOptions } from "../lib/makeRequestOptions.js";
import { getLines, getMessages } from "../vendor/fetch-event-source/parse.js";
import { InferenceClientProviderApiError } from "../errors.js";
function bodyToJson(body) {
    let data = null;
    if (body instanceof Blob || body instanceof ArrayBuffer) {
        data = "[Blob or ArrayBuffer]";
    }
    else if (typeof body === "string") {
        try {
            data = JSON.parse(body);
        }
        catch {
            data = body;
        }
    }
    if (data.accessToken) {
        data.accessToken = "[REDACTED]";
    }
    return data;
}
/**
 * Primitive to make custom calls to the inference provider
 */
export async function innerRequest(args, providerHelper, options) {
    const { url, info } = await makeRequestOptions(args, providerHelper, options);
    const response = await (options?.fetch ?? fetch)(url, info);
    const requestContext = { url, info };
    if (options?.retry_on_error !== false && response.status === 503) {
        return innerRequest(args, providerHelper, options);
    }
    if (!response.ok) {
        const contentType = response.headers.get("Content-Type");
        if (["application/json", "application/problem+json"].some((ct) => contentType?.startsWith(ct))) {
            const output = await response.json();
            if ([400, 422, 404, 500].includes(response.status) && options?.chatCompletion) {
                throw new InferenceClientProviderApiError(`Provider ${args.provider} does not seem to support chat completion for model ${args.model} . Error: ${JSON.stringify(output.error)}`, {
                    url,
                    method: info.method ?? "GET",
                    headers: info.headers,
                    body: bodyToJson(info.body),
                }, { requestId: response.headers.get("x-request-id") ?? "", status: response.status, body: output });
            }
            if (typeof output.error === "string" || typeof output.detail === "string" || typeof output.message === "string") {
                throw new InferenceClientProviderApiError(`Failed to perform inference: ${output.error ?? output.detail ?? output.message}`, {
                    url,
                    method: info.method ?? "GET",
                    headers: info.headers,
                    body: bodyToJson(info.body),
                }, { requestId: response.headers.get("x-request-id") ?? "", status: response.status, body: output });
            }
            else {
                throw new InferenceClientProviderApiError(`Failed to perform inference: an HTTP error occurred when requesting the provider.`, {
                    url,
                    method: info.method ?? "GET",
                    headers: info.headers,
                    body: bodyToJson(info.body),
                }, { requestId: response.headers.get("x-request-id") ?? "", status: response.status, body: output });
            }
        }
        const message = contentType?.startsWith("text/plain;") ? await response.text() : undefined;
        throw new InferenceClientProviderApiError(`Failed to perform inference: ${message ?? "an HTTP error occurred when requesting the provider"}`, {
            url,
            method: info.method ?? "GET",
            headers: info.headers,
            body: bodyToJson(info.body),
        }, { requestId: response.headers.get("x-request-id") ?? "", status: response.status, body: message ?? "" });
    }
    if (response.headers.get("Content-Type")?.startsWith("application/json")) {
        const data = (await response.json());
        return { data, requestContext };
    }
    const blob = (await response.blob());
    return { data: blob, requestContext };
}
/**
 * Primitive to make custom inference calls that expect server-sent events, and returns the response through a generator
 */
export async function* innerStreamingRequest(args, providerHelper, options) {
    const { url, info } = await makeRequestOptions({ ...args, stream: true }, providerHelper, options);
    const response = await (options?.fetch ?? fetch)(url, info);
    if (options?.retry_on_error !== false && response.status === 503) {
        return yield* innerStreamingRequest(args, providerHelper, options);
    }
    if (!response.ok) {
        if (response.headers.get("Content-Type")?.startsWith("application/json")) {
            const output = await response.json();
            if ([400, 422, 404, 500].includes(response.status) && options?.chatCompletion) {
                throw new InferenceClientProviderApiError(`Provider ${args.provider} does not seem to support chat completion for model ${args.model} . Error: ${JSON.stringify(output.error)}`, {
                    url,
                    method: info.method ?? "GET",
                    headers: info.headers,
                    body: bodyToJson(info.body),
                }, { requestId: response.headers.get("x-request-id") ?? "", status: response.status, body: output });
            }
            if (typeof output.error === "string") {
                throw new InferenceClientProviderApiError(`Failed to perform inference: ${output.error}`, {
                    url,
                    method: info.method ?? "GET",
                    headers: info.headers,
                    body: bodyToJson(info.body),
                }, { requestId: response.headers.get("x-request-id") ?? "", status: response.status, body: output });
            }
            if (output.error && "message" in output.error && typeof output.error.message === "string") {
                /// OpenAI errors
                throw new InferenceClientProviderApiError(`Failed to perform inference: ${output.error.message}`, {
                    url,
                    method: info.method ?? "GET",
                    headers: info.headers,
                    body: bodyToJson(info.body),
                }, { requestId: response.headers.get("x-request-id") ?? "", status: response.status, body: output });
            }
            // Sambanova errors
            if (typeof output.message === "string") {
                throw new InferenceClientProviderApiError(`Failed to perform inference: ${output.message}`, {
                    url,
                    method: info.method ?? "GET",
                    headers: info.headers,
                    body: bodyToJson(info.body),
                }, { requestId: response.headers.get("x-request-id") ?? "", status: response.status, body: output });
            }
        }
        throw new InferenceClientProviderApiError(`Failed to perform inference: an HTTP error occurred when requesting the provider.`, {
            url,
            method: info.method ?? "GET",
            headers: info.headers,
            body: bodyToJson(info.body),
        }, { requestId: response.headers.get("x-request-id") ?? "", status: response.status, body: "" });
    }
    if (!response.headers.get("content-type")?.startsWith("text/event-stream")) {
        throw new InferenceClientProviderApiError(`Failed to perform inference: server does not support event stream content type, it returned ` +
            response.headers.get("content-type"), {
            url,
            method: info.method ?? "GET",
            headers: info.headers,
            body: bodyToJson(info.body),
        }, { requestId: response.headers.get("x-request-id") ?? "", status: response.status, body: "" });
    }
    if (!response.body) {
        return;
    }
    const reader = response.body.getReader();
    let events = [];
    const onEvent = (event) => {
        // accumulate events in array
        events.push(event);
    };
    const onChunk = getLines(getMessages(() => { }, () => { }, onEvent));
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                return;
            }
            onChunk(value);
            for (const event of events) {
                if (event.data.length > 0) {
                    if (event.data === "[DONE]") {
                        return;
                    }
                    const data = JSON.parse(event.data);
                    if (typeof data === "object" && data !== null && "error" in data) {
                        const errorStr = typeof data.error === "string"
                            ? data.error
                            : typeof data.error === "object" &&
                                data.error &&
                                "message" in data.error &&
                                typeof data.error.message === "string"
                                ? data.error.message
                                : JSON.stringify(data.error);
                        throw new InferenceClientProviderApiError(`Failed to perform inference: an occurred while streaming the response: ${errorStr}`, {
                            url,
                            method: info.method ?? "GET",
                            headers: info.headers,
                            body: bodyToJson(info.body),
                        }, { requestId: response.headers.get("x-request-id") ?? "", status: response.status, body: data });
                    }
                    yield data;
                }
            }
            events = [];
        }
    }
    finally {
        reader.releaseLock();
    }
}
