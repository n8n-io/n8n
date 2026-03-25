// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as os from "node:os";
import { SDK_INFO } from "@opentelemetry/core";
import { ATTR_TELEMETRY_SDK_VERSION } from "@opentelemetry/semantic-conventions";
import { KnownContextTagKeys } from "../../../generated/index.js";
import * as ai from "../../../utils/constants/applicationinsights.js";
import { ENV_AZURE_MONITOR_PREFIX, ENV_APPLICATIONINSIGHTS_SHIM_VERSION, ENV_AZURE_MONITOR_DISTRO_VERSION, } from "../../../Declarations/Constants.js";
let instance = null;
/**
 * Azure Telemetry context.
 * @internal
 */
export class Context {
    constructor() {
        this.tags = {};
        this._loadDeviceContext();
        this._loadInternalContext();
    }
    _loadDeviceContext() {
        this.tags[KnownContextTagKeys.AiDeviceOsVersion] = os && `${os.type()} ${os.release()}`;
    }
    _loadInternalContext() {
        const { node } = process.versions;
        [Context.nodeVersion] = node.split(".");
        Context.opentelemetryVersion = SDK_INFO[ATTR_TELEMETRY_SDK_VERSION];
        Context.sdkVersion = ai.packageVersion;
        const prefix = process.env[ENV_AZURE_MONITOR_PREFIX]
            ? process.env[ENV_AZURE_MONITOR_PREFIX]
            : "";
        const version = this._getVersion();
        const internalSdkVersion = `${prefix}node${Context.nodeVersion}:otel${Context.opentelemetryVersion}:${version}`;
        this.tags[KnownContextTagKeys.AiInternalSdkVersion] = internalSdkVersion;
    }
    _getVersion() {
        if (process.env[ENV_APPLICATIONINSIGHTS_SHIM_VERSION]) {
            return `sha${process.env[ENV_APPLICATIONINSIGHTS_SHIM_VERSION]}`;
        }
        else if (process.env[ENV_AZURE_MONITOR_DISTRO_VERSION]) {
            return `dst${process.env[ENV_AZURE_MONITOR_DISTRO_VERSION]}`;
        }
        else {
            return `ext${Context.sdkVersion}`;
        }
    }
}
Context.sdkVersion = null;
Context.opentelemetryVersion = null;
Context.nodeVersion = "";
/**
 * Singleton Context instance
 * @internal
 */
export function getInstance() {
    if (!instance) {
        instance = new Context();
    }
    return instance;
}
//# sourceMappingURL=context.js.map