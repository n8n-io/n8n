import { AfterSuccessContext, AfterSuccessHook, Awaitable } from './types';


const HEADER_MODEL_DEPRECATION_TIMESTAMP = "x-model-deprecation-timestamp";

export class DeprecationWarningHook implements AfterSuccessHook {
    afterSuccess(_: AfterSuccessContext, response: Response): Awaitable<Response> {
        if (response.headers.has(HEADER_MODEL_DEPRECATION_TIMESTAMP)) {
            response.clone().json().then((body) => {
                const model = body.model;
                console.warn(
                    `WARNING: The model ${model} is deprecated and will be removed on ${response.headers.get(HEADER_MODEL_DEPRECATION_TIMESTAMP)}. Please refer to https://docs.mistral.ai/getting-started/models/#api-versioning for more information.`
                );
            });

        }
        return response;
    }
}
