"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpSender = void 0;
const tslib_1 = require("tslib");
const node_url_1 = tslib_1.__importDefault(require("node:url"));
const api_1 = require("@opentelemetry/api");
const core_rest_pipeline_1 = require("@azure/core-rest-pipeline");
const index_js_1 = require("../../generated/index.js");
const baseSender_js_1 = require("./baseSender.js");
const applicationInsightsResource = "https://monitor.azure.com//.default";
/**
 * Exporter HTTP sender class
 * @internal
 */
class HttpSender extends baseSender_js_1.BaseSender {
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
        this.appInsightsClient = new index_js_1.ApplicationInsightsClient(this.appInsightsClientOptions);
        // Handle redirects in HTTP Sender
        this.appInsightsClient.pipeline.removePolicy({ name: core_rest_pipeline_1.redirectPolicyName });
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
        api_1.diag.info("HttpSender shutting down");
    }
    handlePermanentRedirect(location) {
        if (location) {
            const locUrl = new node_url_1.default.URL(location);
            if (locUrl && locUrl.host) {
                this.appInsightsClient.host = "https://" + locUrl.host;
            }
        }
    }
}
exports.HttpSender = HttpSender;
//# sourceMappingURL=httpSender.js.map