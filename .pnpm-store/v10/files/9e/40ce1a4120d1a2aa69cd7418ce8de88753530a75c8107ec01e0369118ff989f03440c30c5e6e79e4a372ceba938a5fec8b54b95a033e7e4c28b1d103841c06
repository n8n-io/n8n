"use strict";
// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.GCPEnv = void 0;
exports.clear = clear;
exports.getEnv = getEnv;
const gcpMetadata = require("gcp-metadata");
var GCPEnv;
(function (GCPEnv) {
    GCPEnv["APP_ENGINE"] = "APP_ENGINE";
    GCPEnv["KUBERNETES_ENGINE"] = "KUBERNETES_ENGINE";
    GCPEnv["CLOUD_FUNCTIONS"] = "CLOUD_FUNCTIONS";
    GCPEnv["COMPUTE_ENGINE"] = "COMPUTE_ENGINE";
    GCPEnv["CLOUD_RUN"] = "CLOUD_RUN";
    GCPEnv["NONE"] = "NONE";
})(GCPEnv || (exports.GCPEnv = GCPEnv = {}));
let envPromise;
function clear() {
    envPromise = undefined;
}
async function getEnv() {
    if (envPromise) {
        return envPromise;
    }
    envPromise = getEnvMemoized();
    return envPromise;
}
async function getEnvMemoized() {
    let env = GCPEnv.NONE;
    if (isAppEngine()) {
        env = GCPEnv.APP_ENGINE;
    }
    else if (isCloudFunction()) {
        env = GCPEnv.CLOUD_FUNCTIONS;
    }
    else if (await isComputeEngine()) {
        if (await isKubernetesEngine()) {
            env = GCPEnv.KUBERNETES_ENGINE;
        }
        else if (isCloudRun()) {
            env = GCPEnv.CLOUD_RUN;
        }
        else {
            env = GCPEnv.COMPUTE_ENGINE;
        }
    }
    else {
        env = GCPEnv.NONE;
    }
    return env;
}
function isAppEngine() {
    return !!(process.env.GAE_SERVICE || process.env.GAE_MODULE_NAME);
}
function isCloudFunction() {
    return !!(process.env.FUNCTION_NAME || process.env.FUNCTION_TARGET);
}
/**
 * This check only verifies that the environment is running knative.
 * This must be run *after* checking for Kubernetes, otherwise it will
 * return a false positive.
 */
function isCloudRun() {
    return !!process.env.K_CONFIGURATION;
}
async function isKubernetesEngine() {
    try {
        await gcpMetadata.instance('attributes/cluster-name');
        return true;
    }
    catch (e) {
        return false;
    }
}
async function isComputeEngine() {
    return gcpMetadata.isAvailable();
}
