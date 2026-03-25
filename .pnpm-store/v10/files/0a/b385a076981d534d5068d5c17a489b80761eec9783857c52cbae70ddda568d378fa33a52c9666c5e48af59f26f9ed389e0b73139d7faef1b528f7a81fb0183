"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzurePowerShellCredential = exports.commandStack = exports.powerShellPublicErrorMessages = exports.powerShellErrors = void 0;
exports.formatCommand = formatCommand;
exports.parseJsonToken = parseJsonToken;
const tenantIdUtils_js_1 = require("../util/tenantIdUtils.js");
const logging_js_1 = require("../util/logging.js");
const scopeUtils_js_1 = require("../util/scopeUtils.js");
const errors_js_1 = require("../errors.js");
const processUtils_js_1 = require("../util/processUtils.js");
const tracing_js_1 = require("../util/tracing.js");
const logger = (0, logging_js_1.credentialLogger)("AzurePowerShellCredential");
const isWindows = process.platform === "win32";
/**
 * Returns a platform-appropriate command name by appending ".exe" on Windows.
 *
 * @internal
 */
function formatCommand(commandName) {
    if (isWindows) {
        return `${commandName}.exe`;
    }
    else {
        return commandName;
    }
}
/**
 * Receives a list of commands to run, executes them, then returns the outputs.
 * If anything fails, an error is thrown.
 * @internal
 */
async function runCommands(commands, timeout) {
    const results = [];
    for (const command of commands) {
        const [file, ...parameters] = command;
        const result = (await processUtils_js_1.processUtils.execFile(file, parameters, {
            encoding: "utf8",
            timeout,
        }));
        results.push(result);
    }
    return results;
}
/**
 * Known PowerShell errors
 * @internal
 */
exports.powerShellErrors = {
    login: "Run Connect-AzAccount to login",
    installed: "The specified module 'Az.Accounts' with version '2.2.0' was not loaded because no valid module file was found in any module directory",
};
/**
 * Messages to use when throwing in this credential.
 * @internal
 */
exports.powerShellPublicErrorMessages = {
    login: "Please run 'Connect-AzAccount' from PowerShell to authenticate before using this credential.",
    installed: `The 'Az.Account' module >= 2.2.0 is not installed. Install the Azure Az PowerShell module with: "Install-Module -Name Az -Scope CurrentUser -Repository PSGallery -Force".`,
    claim: "This credential doesn't support claims challenges. To authenticate with the required claims, please run the following command:",
    troubleshoot: `To troubleshoot, visit https://aka.ms/azsdk/js/identity/powershellcredential/troubleshoot.`,
};
// PowerShell Azure User not logged in error check.
const isLoginError = (err) => err.message.match(`(.*)${exports.powerShellErrors.login}(.*)`);
// Az Module not Installed in Azure PowerShell check.
const isNotInstalledError = (err) => err.message.match(exports.powerShellErrors.installed);
/**
 * The PowerShell commands to be tried, in order.
 *
 * @internal
 */
exports.commandStack = [formatCommand("pwsh")];
if (isWindows) {
    exports.commandStack.push(formatCommand("powershell"));
}
/**
 * This credential will use the currently logged-in user information from the
 * Azure PowerShell module. To do so, it will read the user access token and
 * expire time with Azure PowerShell command `Get-AzAccessToken -ResourceUrl {ResourceScope}`
 */
class AzurePowerShellCredential {
    tenantId;
    additionallyAllowedTenantIds;
    timeout;
    /**
     * Creates an instance of the {@link AzurePowerShellCredential}.
     *
     * To use this credential:
     * - Install the Azure Az PowerShell module with:
     *   `Install-Module -Name Az -Scope CurrentUser -Repository PSGallery -Force`.
     * - You have already logged in to Azure PowerShell using the command
     * `Connect-AzAccount` from the command line.
     *
     * @param options - Options, to optionally allow multi-tenant requests.
     */
    constructor(options) {
        if (options?.tenantId) {
            (0, tenantIdUtils_js_1.checkTenantId)(logger, options?.tenantId);
            this.tenantId = options?.tenantId;
        }
        this.additionallyAllowedTenantIds = (0, tenantIdUtils_js_1.resolveAdditionallyAllowedTenantIds)(options?.additionallyAllowedTenants);
        this.timeout = options?.processTimeoutInMs;
    }
    /**
     * Gets the access token from Azure PowerShell
     * @param resource - The resource to use when getting the token
     */
    async getAzurePowerShellAccessToken(resource, tenantId, timeout) {
        // Clone the stack to avoid mutating it while iterating
        for (const powerShellCommand of [...exports.commandStack]) {
            try {
                await runCommands([[powerShellCommand, "/?"]], timeout);
            }
            catch (e) {
                // Remove this credential from the original stack so that we don't try it again.
                exports.commandStack.shift();
                continue;
            }
            const results = await runCommands([
                [
                    powerShellCommand,
                    "-NoProfile",
                    "-NonInteractive",
                    "-Command",
                    `
          $tenantId = "${tenantId ?? ""}"
          $m = Import-Module Az.Accounts -MinimumVersion 2.2.0 -PassThru
          $useSecureString = $m.Version -ge [version]'2.17.0' -and $m.Version -lt [version]'5.0.0'

          $params = @{
            ResourceUrl = "${resource}"
          }

          if ($tenantId.Length -gt 0) {
            $params["TenantId"] = $tenantId
          }

          if ($useSecureString) {
            $params["AsSecureString"] = $true
          }

          $token = Get-AzAccessToken @params

          $result = New-Object -TypeName PSObject
          $result | Add-Member -MemberType NoteProperty -Name ExpiresOn -Value $token.ExpiresOn

          if ($token.Token -is [System.Security.SecureString]) {
            if ($PSVersionTable.PSVersion.Major -lt 7) {
              $ssPtr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($token.Token)
              try {
                $result | Add-Member -MemberType NoteProperty -Name Token -Value ([System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($ssPtr))
              }
              finally {
                [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ssPtr)
              }
            }
            else {
              $result | Add-Member -MemberType NoteProperty -Name Token -Value ($token.Token | ConvertFrom-SecureString -AsPlainText)
            }
          }
          else {
            $result | Add-Member -MemberType NoteProperty -Name Token -Value $token.Token
          }

          Write-Output (ConvertTo-Json $result)
          `,
                ],
            ]);
            const result = results[0];
            return parseJsonToken(result);
        }
        throw new Error(`Unable to execute PowerShell. Ensure that it is installed in your system`);
    }
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If the authentication cannot be performed through PowerShell, a {@link CredentialUnavailableError} will be thrown.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this TokenCredential implementation might make.
     */
    async getToken(scopes, options = {}) {
        return tracing_js_1.tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async () => {
            const scope = typeof scopes === "string" ? scopes : scopes[0];
            const claimsValue = options.claims;
            if (claimsValue && claimsValue.trim()) {
                const encodedClaims = btoa(claimsValue);
                let loginCmd = `Connect-AzAccount -ClaimsChallenge ${encodedClaims}`;
                const tenantIdFromOptions = options.tenantId;
                if (tenantIdFromOptions) {
                    loginCmd += ` -Tenant ${tenantIdFromOptions}`;
                }
                const error = new errors_js_1.CredentialUnavailableError(`${exports.powerShellPublicErrorMessages.claim} ${loginCmd}`);
                logger.getToken.info((0, logging_js_1.formatError)(scope, error));
                throw error;
            }
            const tenantId = (0, tenantIdUtils_js_1.processMultiTenantRequest)(this.tenantId, options, this.additionallyAllowedTenantIds);
            if (tenantId) {
                (0, tenantIdUtils_js_1.checkTenantId)(logger, tenantId);
            }
            try {
                (0, scopeUtils_js_1.ensureValidScopeForDevTimeCreds)(scope, logger);
                logger.getToken.info(`Using the scope ${scope}`);
                const resource = (0, scopeUtils_js_1.getScopeResource)(scope);
                const response = await this.getAzurePowerShellAccessToken(resource, tenantId, this.timeout);
                logger.getToken.info((0, logging_js_1.formatSuccess)(scopes));
                return {
                    token: response.Token,
                    expiresOnTimestamp: new Date(response.ExpiresOn).getTime(),
                    tokenType: "Bearer",
                };
            }
            catch (err) {
                if (isNotInstalledError(err)) {
                    const error = new errors_js_1.CredentialUnavailableError(exports.powerShellPublicErrorMessages.installed);
                    logger.getToken.info((0, logging_js_1.formatError)(scope, error));
                    throw error;
                }
                else if (isLoginError(err)) {
                    const error = new errors_js_1.CredentialUnavailableError(exports.powerShellPublicErrorMessages.login);
                    logger.getToken.info((0, logging_js_1.formatError)(scope, error));
                    throw error;
                }
                const error = new errors_js_1.CredentialUnavailableError(`${err}. ${exports.powerShellPublicErrorMessages.troubleshoot}`);
                logger.getToken.info((0, logging_js_1.formatError)(scope, error));
                throw error;
            }
        });
    }
}
exports.AzurePowerShellCredential = AzurePowerShellCredential;
/**
 *
 * @internal
 */
async function parseJsonToken(result) {
    const jsonRegex = /{[^{}]*}/g;
    const matches = result.match(jsonRegex);
    let resultWithoutToken = result;
    if (matches) {
        try {
            for (const item of matches) {
                try {
                    const jsonContent = JSON.parse(item);
                    if (jsonContent?.Token) {
                        resultWithoutToken = resultWithoutToken.replace(item, "");
                        if (resultWithoutToken) {
                            logger.getToken.warning(resultWithoutToken);
                        }
                        return jsonContent;
                    }
                }
                catch (e) {
                    continue;
                }
            }
        }
        catch (e) {
            throw new Error(`Unable to parse the output of PowerShell. Received output: ${result}`);
        }
    }
    throw new Error(`No access token found in the output. Received output: ${result}`);
}
//# sourceMappingURL=azurePowerShellCredential.js.map