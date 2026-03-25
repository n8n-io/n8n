// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../core/resource.mjs";
import { buildHeaders } from "../internal/headers.mjs";
export class Completions extends APIResource {
    create(params, options) {
        const { betas, ...body } = params;
        return this._client.post('/v1/complete', {
            body,
            timeout: this._client._options.timeout ?? 600000,
            ...options,
            headers: buildHeaders([
                { ...(betas?.toString() != null ? { 'anthropic-beta': betas?.toString() } : undefined) },
                options?.headers,
            ]),
            stream: params.stream ?? false,
        });
    }
}
//# sourceMappingURL=completions.mjs.map