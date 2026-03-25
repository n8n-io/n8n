"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBearerTokenProvider = exports.AzureAuthorityHosts = exports.logger = exports.WorkloadIdentityCredential = exports.OnBehalfOfCredential = exports.VisualStudioCodeCredential = exports.UsernamePasswordCredential = exports.AzurePowerShellCredential = exports.AuthorizationCodeCredential = exports.AzurePipelinesCredential = exports.DeviceCodeCredential = exports.ManagedIdentityCredential = exports.InteractiveBrowserCredential = exports.AzureDeveloperCliCredential = exports.AzureCliCredential = exports.ClientAssertionCredential = exports.ClientCertificateCredential = exports.EnvironmentCredential = exports.DefaultAzureCredential = exports.ClientSecretCredential = exports.ChainedTokenCredential = exports.deserializeAuthenticationRecord = exports.serializeAuthenticationRecord = exports.AuthenticationRequiredError = exports.CredentialUnavailableErrorName = exports.CredentialUnavailableError = exports.AggregateAuthenticationErrorName = exports.AuthenticationErrorName = exports.AggregateAuthenticationError = exports.AuthenticationError = void 0;
exports.getDefaultAzureCredential = getDefaultAzureCredential;
const tslib_1 = require("tslib");
tslib_1.__exportStar(require("./plugins/consumer.js"), exports);
const defaultAzureCredential_js_1 = require("./credentials/defaultAzureCredential.js");
var errors_js_1 = require("./errors.js");
Object.defineProperty(exports, "AuthenticationError", { enumerable: true, get: function () { return errors_js_1.AuthenticationError; } });
Object.defineProperty(exports, "AggregateAuthenticationError", { enumerable: true, get: function () { return errors_js_1.AggregateAuthenticationError; } });
Object.defineProperty(exports, "AuthenticationErrorName", { enumerable: true, get: function () { return errors_js_1.AuthenticationErrorName; } });
Object.defineProperty(exports, "AggregateAuthenticationErrorName", { enumerable: true, get: function () { return errors_js_1.AggregateAuthenticationErrorName; } });
Object.defineProperty(exports, "CredentialUnavailableError", { enumerable: true, get: function () { return errors_js_1.CredentialUnavailableError; } });
Object.defineProperty(exports, "CredentialUnavailableErrorName", { enumerable: true, get: function () { return errors_js_1.CredentialUnavailableErrorName; } });
Object.defineProperty(exports, "AuthenticationRequiredError", { enumerable: true, get: function () { return errors_js_1.AuthenticationRequiredError; } });
var utils_js_1 = require("./msal/utils.js");
Object.defineProperty(exports, "serializeAuthenticationRecord", { enumerable: true, get: function () { return utils_js_1.serializeAuthenticationRecord; } });
Object.defineProperty(exports, "deserializeAuthenticationRecord", { enumerable: true, get: function () { return utils_js_1.deserializeAuthenticationRecord; } });
var chainedTokenCredential_js_1 = require("./credentials/chainedTokenCredential.js");
Object.defineProperty(exports, "ChainedTokenCredential", { enumerable: true, get: function () { return chainedTokenCredential_js_1.ChainedTokenCredential; } });
var clientSecretCredential_js_1 = require("./credentials/clientSecretCredential.js");
Object.defineProperty(exports, "ClientSecretCredential", { enumerable: true, get: function () { return clientSecretCredential_js_1.ClientSecretCredential; } });
var defaultAzureCredential_js_2 = require("./credentials/defaultAzureCredential.js");
Object.defineProperty(exports, "DefaultAzureCredential", { enumerable: true, get: function () { return defaultAzureCredential_js_2.DefaultAzureCredential; } });
var environmentCredential_js_1 = require("./credentials/environmentCredential.js");
Object.defineProperty(exports, "EnvironmentCredential", { enumerable: true, get: function () { return environmentCredential_js_1.EnvironmentCredential; } });
var clientCertificateCredential_js_1 = require("./credentials/clientCertificateCredential.js");
Object.defineProperty(exports, "ClientCertificateCredential", { enumerable: true, get: function () { return clientCertificateCredential_js_1.ClientCertificateCredential; } });
var clientAssertionCredential_js_1 = require("./credentials/clientAssertionCredential.js");
Object.defineProperty(exports, "ClientAssertionCredential", { enumerable: true, get: function () { return clientAssertionCredential_js_1.ClientAssertionCredential; } });
var azureCliCredential_js_1 = require("./credentials/azureCliCredential.js");
Object.defineProperty(exports, "AzureCliCredential", { enumerable: true, get: function () { return azureCliCredential_js_1.AzureCliCredential; } });
var azureDeveloperCliCredential_js_1 = require("./credentials/azureDeveloperCliCredential.js");
Object.defineProperty(exports, "AzureDeveloperCliCredential", { enumerable: true, get: function () { return azureDeveloperCliCredential_js_1.AzureDeveloperCliCredential; } });
var interactiveBrowserCredential_js_1 = require("./credentials/interactiveBrowserCredential.js");
Object.defineProperty(exports, "InteractiveBrowserCredential", { enumerable: true, get: function () { return interactiveBrowserCredential_js_1.InteractiveBrowserCredential; } });
var index_js_1 = require("./credentials/managedIdentityCredential/index.js");
Object.defineProperty(exports, "ManagedIdentityCredential", { enumerable: true, get: function () { return index_js_1.ManagedIdentityCredential; } });
var deviceCodeCredential_js_1 = require("./credentials/deviceCodeCredential.js");
Object.defineProperty(exports, "DeviceCodeCredential", { enumerable: true, get: function () { return deviceCodeCredential_js_1.DeviceCodeCredential; } });
var azurePipelinesCredential_js_1 = require("./credentials/azurePipelinesCredential.js");
Object.defineProperty(exports, "AzurePipelinesCredential", { enumerable: true, get: function () { return azurePipelinesCredential_js_1.AzurePipelinesCredential; } });
var authorizationCodeCredential_js_1 = require("./credentials/authorizationCodeCredential.js");
Object.defineProperty(exports, "AuthorizationCodeCredential", { enumerable: true, get: function () { return authorizationCodeCredential_js_1.AuthorizationCodeCredential; } });
var azurePowerShellCredential_js_1 = require("./credentials/azurePowerShellCredential.js");
Object.defineProperty(exports, "AzurePowerShellCredential", { enumerable: true, get: function () { return azurePowerShellCredential_js_1.AzurePowerShellCredential; } });
var usernamePasswordCredential_js_1 = require("./credentials/usernamePasswordCredential.js");
Object.defineProperty(exports, "UsernamePasswordCredential", { enumerable: true, get: function () { return usernamePasswordCredential_js_1.UsernamePasswordCredential; } });
var visualStudioCodeCredential_js_1 = require("./credentials/visualStudioCodeCredential.js");
Object.defineProperty(exports, "VisualStudioCodeCredential", { enumerable: true, get: function () { return visualStudioCodeCredential_js_1.VisualStudioCodeCredential; } });
var onBehalfOfCredential_js_1 = require("./credentials/onBehalfOfCredential.js");
Object.defineProperty(exports, "OnBehalfOfCredential", { enumerable: true, get: function () { return onBehalfOfCredential_js_1.OnBehalfOfCredential; } });
var workloadIdentityCredential_js_1 = require("./credentials/workloadIdentityCredential.js");
Object.defineProperty(exports, "WorkloadIdentityCredential", { enumerable: true, get: function () { return workloadIdentityCredential_js_1.WorkloadIdentityCredential; } });
var logging_js_1 = require("./util/logging.js");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logging_js_1.logger; } });
var constants_js_1 = require("./constants.js");
Object.defineProperty(exports, "AzureAuthorityHosts", { enumerable: true, get: function () { return constants_js_1.AzureAuthorityHosts; } });
/**
 * Returns a new instance of the {@link DefaultAzureCredential}.
 */
function getDefaultAzureCredential() {
    return new defaultAzureCredential_js_1.DefaultAzureCredential();
}
var tokenProvider_js_1 = require("./tokenProvider.js");
Object.defineProperty(exports, "getBearerTokenProvider", { enumerable: true, get: function () { return tokenProvider_js_1.getBearerTokenProvider; } });
//# sourceMappingURL=index.js.map