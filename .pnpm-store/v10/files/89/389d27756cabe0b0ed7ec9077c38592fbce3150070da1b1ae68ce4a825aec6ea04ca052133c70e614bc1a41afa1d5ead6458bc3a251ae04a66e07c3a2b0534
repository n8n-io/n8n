"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = void 0;
exports.getInstance = getInstance;
const tslib_1 = require("tslib");
const os = tslib_1.__importStar(require("node:os"));
const core_1 = require("@opentelemetry/core");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const index_js_1 = require("../../../generated/index.js");
const ai = tslib_1.__importStar(require("../../../utils/constants/applicationinsights.js"));
const Constants_js_1 = require("../../../Declarations/Constants.js");
let instance = null;
/**
 * Azure Telemetry context.
 * @internal
 */
class Context {
    constructor() {
        this.tags = {};
        this._loadDeviceContext();
        this._loadInternalContext();
    }
    _loadDeviceContext() {
        this.tags[index_js_1.KnownContextTagKeys.AiDeviceOsVersion] = os && `${os.type()} ${os.release()}`;
    }
    _loadInternalContext() {
        const { node } = process.versions;
        [Context.nodeVersion] = node.split(".");
        Context.opentelemetryVersion = core_1.SDK_INFO[semantic_conventions_1.ATTR_TELEMETRY_SDK_VERSION];
        Context.sdkVersion = ai.packageVersion;
        const prefix = process.env[Constants_js_1.ENV_AZURE_MONITOR_PREFIX]
            ? process.env[Constants_js_1.ENV_AZURE_MONITOR_PREFIX]
            : "";
        const version = this._getVersion();
        const internalSdkVersion = `${prefix}node${Context.nodeVersion}:otel${Context.opentelemetryVersion}:${version}`;
        this.tags[index_js_1.KnownContextTagKeys.AiInternalSdkVersion] = internalSdkVersion;
    }
    _getVersion() {
        if (process.env[Constants_js_1.ENV_APPLICATIONINSIGHTS_SHIM_VERSION]) {
            return `sha${process.env[Constants_js_1.ENV_APPLICATIONINSIGHTS_SHIM_VERSION]}`;
        }
        else if (process.env[Constants_js_1.ENV_AZURE_MONITOR_DISTRO_VERSION]) {
            return `dst${process.env[Constants_js_1.ENV_AZURE_MONITOR_DISTRO_VERSION]}`;
        }
        else {
            return `ext${Context.sdkVersion}`;
        }
    }
}
exports.Context = Context;
Context.sdkVersion = null;
Context.opentelemetryVersion = null;
Context.nodeVersion = "";
/**
 * Singleton Context instance
 * @internal
 */
function getInstance() {
    if (!instance) {
        instance = new Context();
    }
    return instance;
}
//# sourceMappingURL=context.js.map