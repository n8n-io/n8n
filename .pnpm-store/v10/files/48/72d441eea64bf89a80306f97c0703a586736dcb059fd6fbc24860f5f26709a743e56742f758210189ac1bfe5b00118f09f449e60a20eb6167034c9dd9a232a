"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsbeatMetrics = void 0;
const tslib_1 = require("tslib");
const core_rest_pipeline_1 = require("@azure/core-rest-pipeline");
const api_1 = require("@opentelemetry/api");
const types_js_1 = require("./types.js");
const os = tslib_1.__importStar(require("node:os"));
class StatsbeatMetrics {
    constructor() {
        this.resourceProvider = types_js_1.StatsbeatResourceProvider.unknown;
        this.vmInfo = {};
        this.os = os.type();
        this.resourceIdentifier = "";
    }
    async getResourceProvider() {
        // Check resource provider
        this.resourceProvider = types_js_1.StatsbeatResourceProvider.unknown;
        if (process.env.AKS_ARM_NAMESPACE_ID) {
            // AKS
            this.resourceProvider = types_js_1.StatsbeatResourceProvider.aks;
            this.resourceIdentifier = process.env.AKS_ARM_NAMESPACE_ID;
        }
        else if (process.env.WEBSITE_SITE_NAME) {
            // Web apps
            this.resourceProvider = types_js_1.StatsbeatResourceProvider.appsvc;
            this.resourceIdentifier = process.env.WEBSITE_SITE_NAME;
            if (process.env.WEBSITE_HOME_STAMPNAME) {
                this.resourceIdentifier += "/" + process.env.WEBSITE_HOME_STAMPNAME;
            }
        }
        else if (process.env.FUNCTIONS_WORKER_RUNTIME) {
            // Function apps
            this.resourceProvider = types_js_1.StatsbeatResourceProvider.functions;
            if (process.env.WEBSITE_HOSTNAME) {
                this.resourceIdentifier = process.env.WEBSITE_HOSTNAME;
            }
        }
        else if (await this.getAzureComputeMetadata()) {
            this.resourceProvider = types_js_1.StatsbeatResourceProvider.vm;
            this.resourceIdentifier = this.vmInfo.id + "/" + this.vmInfo.subscriptionId;
            // Overrride OS as VM info have higher precedence
            if (this.vmInfo.osType) {
                this.os = this.vmInfo.osType;
            }
        }
        else {
            this.resourceProvider = types_js_1.StatsbeatResourceProvider.unknown;
        }
    }
    async getAzureComputeMetadata() {
        const httpClient = (0, core_rest_pipeline_1.createDefaultHttpClient)();
        const method = "GET";
        const options = {
            url: `${types_js_1.AIMS_URI}?${types_js_1.AIMS_API_VERSION}&${types_js_1.AIMS_FORMAT}`,
            timeout: 5000, // 5 seconds
            method: method,
            allowInsecureConnection: true,
        };
        const request = (0, core_rest_pipeline_1.createPipelineRequest)(options);
        await httpClient
            .sendRequest(request)
            .then((res) => {
            if (res.status === 200) {
                // Success; VM
                this.vmInfo.isVM = true;
                let virtualMachineData = "";
                res.on("data", (data) => {
                    virtualMachineData += data;
                });
                res.on("end", () => {
                    try {
                        const data = JSON.parse(virtualMachineData);
                        this.vmInfo.id = data["vmId"] || "";
                        this.vmInfo.subscriptionId = data["subscriptionId"] || "";
                        this.vmInfo.osType = data["osType"] || "";
                    }
                    catch (error) {
                        api_1.diag.debug("Failed to parse JSON: ", error);
                    }
                });
                return true;
            }
            else {
                return false;
            }
        })
            .catch(() => {
            return false;
        });
        return false;
    }
    getConnectionString(endpointUrl) {
        const currentEndpoint = endpointUrl;
        for (let i = 0; i < types_js_1.EU_ENDPOINTS.length; i++) {
            if (currentEndpoint.includes(types_js_1.EU_ENDPOINTS[i])) {
                return types_js_1.EU_CONNECTION_STRING;
            }
        }
        return types_js_1.NON_EU_CONNECTION_STRING;
    }
}
exports.StatsbeatMetrics = StatsbeatMetrics;
//# sourceMappingURL=statsbeatMetrics.js.map