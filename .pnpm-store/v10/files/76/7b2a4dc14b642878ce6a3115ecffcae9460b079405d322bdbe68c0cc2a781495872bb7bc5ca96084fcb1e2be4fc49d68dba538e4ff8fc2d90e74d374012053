// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../resource.mjs";
export class Completions extends APIResource {
    create(body, options) {
        return this._client.post('/v1/complete', {
            body,
            timeout: this._client._options.timeout ?? 600000,
            ...options,
            stream: body.stream ?? false,
        });
    }
}
(function (Completions) {
})(Completions || (Completions = {}));
//# sourceMappingURL=completions.mjs.map