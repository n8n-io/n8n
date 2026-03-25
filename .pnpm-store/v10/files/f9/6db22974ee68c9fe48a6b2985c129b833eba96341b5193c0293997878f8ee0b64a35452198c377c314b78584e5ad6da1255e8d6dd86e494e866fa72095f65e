// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import url from "node:url";
import { diag } from "@opentelemetry/api";
import { redirectPolicyName } from "@azure/core-rest-pipeline";
import { ApplicationInsightsClient } from "../../generated/index.js";
import { BaseSender } from "./baseSender.js";
const applicationInsightsResource = "https://monitor.azure.com//.default";
/**
 * Exporter HTTP sender class
 * @internal
 */
export class HttpSender extends BaseSender {
    constructor(options) {
        super(options);
        // Build endpoint using provided configuration or default values
        this.appInsightsClientOptions = Object.assign({ host: options.endpointUrl }, options.exporterOptions);
        if (this.appInsightsClientOptions.credential) {
            // Add credentialScopes
            if (options.aadAudience) {
                this.appInsightsClientOptions.credentialScopes = [options.aadAudience];
            }
            else {
                // Default
                this.appInsightsClientOptions.credentialScopes = [applicationInsightsResource];
            }
        }
        this.appInsightsClient = new ApplicationInsightsClient(this.appInsightsClientOptions);
        // Handle redirects in HTTP Sender
        this.appInsightsClient.pipeline.removePolicy({ name: redirectPolicyName });
    }
    /**
     * Send Azure envelopes
     * @internal
     */
    async send(envelopes) {
        var _a;
        const options = {};
        let response;
        function onResponse(rawResponse, flatResponse) {
            response = rawResponse;
            if (options.onResponse) {
                options.onResponse(rawResponse, flatResponse);
            }
        }
        await this.appInsightsClient.track(envelopes, Object.assign(Object.assign({}, options), { onResponse }));
        return { statusCode: response === null || response === void 0 ? void 0 : response.status, result: (_a = response === null || response === void 0 ? void 0 : response.bodyAsText) !== null && _a !== void 0 ? _a : "" };
    }
    /**
     * Shutdown sender
     * @internal
     */
    async shutdown() {
        diag.info("HttpSender shutting down");
    }
    handlePermanentRedirect(location) {
        if (location) {
            const locUrl = new url.URL(location);
            if (locUrl && locUrl.host) {
                this.appInsightsClient.host = "https://" + locUrl.host;
            }
        }
    }
}
//# sourceMappingURL=httpSender.js.map