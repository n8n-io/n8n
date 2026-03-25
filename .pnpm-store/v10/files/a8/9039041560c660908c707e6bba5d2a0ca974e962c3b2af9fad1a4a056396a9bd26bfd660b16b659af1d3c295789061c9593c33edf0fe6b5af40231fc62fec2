# Azure Identity client library for JavaScript

The Azure Identity library provides [Microsoft Entra ID](https://learn.microsoft.com/entra/fundamentals/whatis) token-based authentication through a set of convenient [TokenCredential](https://learn.microsoft.com/javascript/api/@azure/core-auth/tokencredential) implementations.

For examples of various credentials, see the [Azure Identity examples page](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md).

Key links:

- [Source code](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/identity/identity)
- [Package (npm)](https://www.npmjs.com/package/@azure/identity)
- [API Reference Documentation](https://learn.microsoft.com/javascript/api/@azure/identity)
- [Microsoft Entra ID documentation](https://learn.microsoft.com/entra/identity)
- [Samples](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples)

## Getting started

### Currently supported environments

- [LTS versions of Node.js](https://github.com/nodejs/release#release-schedule)
- Latest versions of Safari, Chrome, Edge, and Firefox.
  - **Note**: Among the different credentials exported in this library, `InteractiveBrowserCredential` is the only one supported in the browser.

For more information, see our [support policy](https://github.com/Azure/azure-sdk-for-js/blob/main/SUPPORT.md).

### Install the package

Install Azure Identity with `npm`:

```sh
npm install --save @azure/identity
```

### Prerequisites

- An [Azure subscription](https://azure.microsoft.com/free/).
- Optional: The [Azure CLI][azure_cli] and/or [Azure PowerShell][azure_powershell] can also be useful for authenticating in a development environment and managing account roles.

### When to use @azure/identity

The credential classes exposed by `@azure/identity` are focused on providing the most straightforward way to authenticate the Azure SDK clients locally, in your development environments, and in production. We aim for simplicity and reasonable support of the authentication protocols to cover most of the authentication scenarios possible on Azure. We're actively expanding to cover more scenarios. For a full list of the credentials offered, see the [Credential Classes](#credential-classes) section.

All credential types provided by `@azure/identity` are supported in Node.js. For browsers, `InteractiveBrowserCredential` is the credential type to be used for basic authentication scenarios.

Most of the credential types offered by `@azure/identity` use the [Microsoft Authentication Library for JavaScript (MSAL.js)](https://github.com/AzureAD/microsoft-authentication-library-for-js). Specifically, we use the v2 MSAL.js libraries, which use [OAuth 2.0 Authorization Code Flow with PKCE](https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow) and are [OpenID-compliant](https://learn.microsoft.com/entra/identity-platform/v2-protocols-oidc). While `@azure/identity` focuses on simplicity, the MSAL.js libraries, such as [@azure/msal-common](https://www.npmjs.com/package/@azure/msal-common), [@azure/msal-node](https://www.npmjs.com/package/@azure/msal-node), and [@azure/msal-browser](https://www.npmjs.com/package/@azure/msal-browser), are designed to provide robust support for the authentication protocols that Azure supports.

#### When to use something else

The `@azure/identity` credential types are implementations of [@azure/core-auth](https://www.npmjs.com/package/@azure/core-auth)'s `TokenCredential` class. In principle, any object with a `getToken` method that satisfies `getToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken | null>` works as a `TokenCredential`. This means developers can write their own credential types to support authentication cases not covered by `@azure/identity`. To learn more, see [Custom Credentials](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#custom-credentials).

Though our credential types support many advanced scenarios, developers may want to use [Microsoft Authentication Library for JavaScript (MSAL.js)](https://github.com/AzureAD/microsoft-authentication-library-for-js) directly instead. Consider using MSAL.js in the following scenarios:

- Developers who want full control of the authentication protocol and its configuration.
- Our credential types are designed to be used with Azure SDK clients with intelligent caching and token refreshing handled at the core HTTP layer. If you find yourself having to use `getToken` directly, you may benefit from using MSAL.js for more control over the authentication flow and token caching.

You can read more through the following links:

- We portray some advanced use cases of `@azure/identity` on the [Azure Identity Examples](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md) page.
  - There, we specifically have an [Advanced Examples](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#advanced-examples) section.
  - We also have a section that shows how to [Authenticate with MSAL directly](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#authenticating-with-msal-directly).

For advanced authentication workflows in the browser, we have a section where we showcase how to use the [@azure/msal-browser](https://www.npmjs.com/package/@azure/msal-browser) library directly to authenticate Azure SDK clients.

### Authenticate the client in development environment

While we recommend using managed identity in your Azure-hosted application, it's typical for a developer to use their own account for authenticating calls to Azure services when debugging and executing code locally. There are several developer tools that can be used to perform this authentication in your development environment.

#### Authenticate via the Azure Developer CLI

Developers coding outside of an IDE can also use the [Azure Developer CLI][azure_developer_cli] to authenticate. Applications using the `DefaultAzureCredential` or the `AzureDeveloperCliCredential` can then use this account to authenticate calls in their application when running locally.

To authenticate with the [Azure Developer CLI][azure_developer_cli], users can run the command `azd auth login`. For users running on a system with a default web browser, the Azure Developer CLI launches the browser to authenticate the user.

For systems without a default web browser, the `azd auth login --use-device-code` command uses the device code authentication flow.

#### Authenticate via the Azure CLI

Applications using the `AzureCliCredential`, whether directly or via the `DefaultAzureCredential`, can use the Azure CLI account to authenticate calls in the application when running locally.

To authenticate with the [Azure CLI][azure_cli], run the command `az login`. For users running on a system with a default web browser, the Azure CLI launches the browser to authenticate the user.

![Azure CLI Account Sign In][azureclilogin_image]

For systems without a default web browser, the `az login` command uses the device code authentication flow. The user can also force the Azure CLI to use the device code flow rather than launching a browser by specifying the `--use-device-code` argument.

![Azure CLI Account Device Code Sign In][azureclilogindevicecode_image]

#### Authenticate via Azure PowerShell

Applications using the `AzurePowerShellCredential`, whether directly or via the `DefaultAzureCredential`, can use the account connected to Azure PowerShell to authenticate calls in the application when running locally.

To authenticate with [Azure PowerShell][azure_powershell], run the `Connect-AzAccount` cmdlet. By default, like the Azure CLI, `Connect-AzAccount` launches the default web browser to authenticate a user account.

![Azure PowerShell Account Sign In][azurepowershelllogin_image]

If interactive authentication can't be supported in the session, then the `-UseDeviceAuthentication` argument forces the cmdlet to use a device code authentication flow instead, similar to the corresponding option in the Azure CLI credential.

### Authenticate the client in browsers

To authenticate Azure SDK clients within web browsers, we offer the `InteractiveBrowserCredential`, which can be set to use redirection or popups to complete the authentication flow. It's necessary to [create an Azure App Registration](https://learn.microsoft.com/entra/identity-platform/scenario-spa-app-registration) in the Azure portal for your web application first.

## Key concepts

If this is your first time using `@azure/identity` or Microsoft Entra ID, read [Using `@azure/identity` with Microsoft Entra ID](https://github.com/Azure/azure-sdk-for-js/blob/main/documentation/using-azure-identity.md) first. This document provides a deeper understanding of the platform and how to configure your Azure account correctly.

### Credentials

A credential is a class that contains or can obtain the data needed for a service client to authenticate requests. Service clients across the Azure SDK accept credentials when they're constructed. Service clients use those credentials to authenticate requests to the service.

The Azure Identity library focuses on OAuth authentication with Microsoft Entra ID, and it offers various credential classes capable of acquiring a Microsoft Entra token to authenticate service requests. All of the credential classes in this library are implementations of the [TokenCredential](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/core/core-auth/src/tokenCredential.ts) abstract class, and any of them can be used by to construct service clients capable of authenticating with a `TokenCredential`.

See [Credential Classes](#credential-classes).

### DefaultAzureCredential

`DefaultAzureCredential` simplifies authentication while developing apps that deploy to Azure by combining credentials used in Azure hosting environments with credentials used in local development. For more information, see [DefaultAzureCredential overview](https://aka.ms/azsdk/js/identity/credential-chains#use-defaultazurecredential-for-flexibility).

#### Continuation policy

As of version 3.3.0, `DefaultAzureCredential` attempts to authenticate with all developer credentials until one succeeds, regardless of any errors previous developer credentials experienced. For example, a developer credential may attempt to get a token and fail, so `DefaultAzureCredential` continues to the next credential in the flow. Deployed service credentials stop the flow with a thrown exception if they're able to attempt token retrieval, but don't receive one.

This allows for trying all of the developer credentials on your machine while having predictable deployed behavior.

## Plugins

Azure Identity for JavaScript provides a plugin API that allows us to provide certain functionality through separate _plugin packages_. The `@azure/identity` package exports a top-level function (`useIdentityPlugin`) that can be used to enable a plugin. We provide two plugin packages:

- [`@azure/identity-broker`](https://www.npmjs.com/package/@azure/identity-broker), which provides brokered authentication support through a native broker, such as Web Account Manager.
- [`@azure/identity-vscode`](https://www.npmjs.com/package/@azure/identity-vscode), which provides Visual Studio Code authentication support for signing in through Azure Resource extension.
- [`@azure/identity-cache-persistence`](https://www.npmjs.com/package/@azure/identity-cache-persistence), which provides persistent token caching in Node.js using a native secure storage system provided by your operating system. This plugin allows cached `access_token` values to persist across sessions, meaning that an interactive login flow doesn't need to be repeated as long as a cached token is available.

## Examples

You can find more examples of using various credentials in [Azure Identity Examples Page](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md)

### Authenticate with `DefaultAzureCredential`

This example demonstrates authenticating the `KeyClient` from the [@azure/keyvault-keys](https://www.npmjs.com/package/@azure/keyvault-keys) client library using `DefaultAzureCredential`.

```ts snippet:defaultazurecredential_authenticate
import { DefaultAzureCredential } from "@azure/identity";
import { KeyClient } from "@azure/keyvault-keys";

// Configure vault URL
const vaultUrl = "https://<your-unique-keyvault-name>.vault.azure.net";

// Azure SDK clients accept the credential as a parameter
const credential = new DefaultAzureCredential();

// Create authenticated client
const client = new KeyClient(vaultUrl, credential);
```

### Specify a user-assigned managed identity with `DefaultAzureCredential`

A relatively common scenario involves authenticating using a user-assigned managed identity for an Azure resource. Explore the [example on Authenticating a user-assigned managed identity with DefaultAzureCredential](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#authenticating-a-user-assigned-managed-identity-with-defaultazurecredential) to see how this is made a relatively straightforward task that can be configured using environment variables or in code.

### Authenticate with Visual Studio Code via `DefaultAzureCredential`

`DefaultAzureCredential` can automatically use the signed-in user from Visual Studio Code to authenticate your application during local development. Before using Visual Studio Code authentication, ensure you have:

1. **Azure Resources Extension**: Install the [Azure Resources extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azureresourcegroups) in Visual Studio Code
2. **Signed in to Azure**: Use the `Azure: Sign In` command in VS Code 
3. **Broker package configuration**: Install the `@azure/identity-vscode` package v2.0.0 or above in your project with `npm install @azure/identity-vscode` and configure `useIdentityPlugin` as shown below:

```ts snippet:defaultazurecredential_vscode
import { useIdentityPlugin, DefaultAzureCredential } from "@azure/identity";

useIdentityPlugin(vsCodePlugin);
const credential = new DefaultAzureCredential();
```

Once these prerequisites are met, `DefaultAzureCredential` will automatically detect and use VS Code authentication when running locally.

### Define a custom authentication flow with `ChainedTokenCredential`

While `DefaultAzureCredential` is generally the quickest way to get started developing applications for Azure, more advanced users may want to customize the credentials considered when authenticating. The `ChainedTokenCredential` enables users to combine multiple credential instances to define a customized chain of credentials. This example demonstrates creating a `ChainedTokenCredential` that attempts to authenticate using two differently configured instances of `ClientSecretCredential`, to then authenticate the `KeyClient` from the [@azure/keyvault-keys](https://www.npmjs.com/package/@azure/keyvault-keys):

```ts snippet:chaintedtokencredential_authenticate
import { ClientSecretCredential, ChainedTokenCredential } from "@azure/identity";
import { KeyClient } from "@azure/keyvault-keys";

// Configure variables
const vaultUrl = "https://<your-unique-keyvault-name>.vault.azure.net";
const tenantId = "<tenant-id>";
const clientId = "<client-id>";
const clientSecret = "<client-secret>";
const anotherClientId = "<another-client-id>";
const anotherSecret = "<another-client-secret>";

// When an access token is requested, the chain will try each
// credential in order, stopping when one provides a token
const firstCredential = new ClientSecretCredential(tenantId, clientId, clientSecret);
const secondCredential = new ClientSecretCredential(tenantId, anotherClientId, anotherSecret);
const credentialChain = new ChainedTokenCredential(firstCredential, secondCredential);

// The chain can be used anywhere a credential is required
const client = new KeyClient(vaultUrl, credentialChain);
```

## Managed identity support

The [Managed identity authentication](https://learn.microsoft.com/entra/identity/managed-identities-azure-resources/overview) is supported via either the `DefaultAzureCredential` or the `ManagedIdentityCredential` credential classes directly for the following Azure services:

- [Azure App Service and Azure Functions](https://learn.microsoft.com/azure/app-service/overview-managed-identity)
- [Azure Arc](https://learn.microsoft.com/azure/azure-arc/servers/managed-identity-authentication)
- [Azure Cloud Shell](https://learn.microsoft.com/azure/cloud-shell/msi-authorization)
- [Azure Kubernetes Service](https://learn.microsoft.com/azure/aks/use-managed-identity)
- [Azure Service Fabric](https://learn.microsoft.com/azure/service-fabric/concepts-managed-identity)
- [Azure Virtual Machines](https://learn.microsoft.com/entra/identity/managed-identities-azure-resources/how-to-use-vm-token)
- [Azure Virtual Machines Scale Sets](https://learn.microsoft.com/entra/identity/managed-identities-azure-resources/qs-configure-powershell-windows-vmss)

For examples of how to use managed identity for authentication, see [the examples](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#authenticating-in-azure-with-managed-identity).

## Cloud configuration

Credentials default to authenticating to the Microsoft Entra endpoint for Azure Public Cloud. To access resources in other clouds, such as Azure Government or a private cloud, configure credentials with the `authorityHost` argument in the constructor. The [`AzureAuthorityHosts`][authority_hosts] enum defines authorities for well-known clouds. For the US Government cloud, you could instantiate a credential this way:

```ts snippet:cloudconfiguration_authenticate
import { ClientSecretCredential, AzureAuthorityHosts } from "@azure/identity";

const credential = new ClientSecretCredential(
  "<YOUR_TENANT_ID>",
  "<YOUR_CLIENT_ID>",
  "<YOUR_CLIENT_SECRET>",
  {
    authorityHost: AzureAuthorityHosts.AzureGovernment,
  },
);
```

As an alternative to specifying the `authorityHost` argument, you can also set the `AZURE_AUTHORITY_HOST` environment variable to the URL of your cloud's authority. This approach is useful when configuring multiple credentials to authenticate to the same cloud or when the deployed environment needs to define the target cloud:

```sh
AZURE_AUTHORITY_HOST=https://login.partner.microsoftonline.cn
```

The `AzureAuthorityHosts` enum defines authorities for well-known clouds for your convenience; however, if the authority for your cloud isn't listed in `AzureAuthorityHosts`, you may pass any valid authority URL as a string argument. For example:

```ts snippet:cloudconfiguration_authorityhost
import { ClientSecretCredential } from "@azure/identity";

const credential = new ClientSecretCredential(
  "<YOUR_TENANT_ID>",
  "<YOUR_CLIENT_ID>",
  "<YOUR_CLIENT_SECRET>",
  {
    authorityHost: "https://login.partner.microsoftonline.cn",
  },
);
```

Not all credentials require this configuration. Credentials that authenticate through a development tool, such as `AzureCliCredential`, use that tool's configuration.

## Credential classes

### Credential chains

| Credential                                                                                                                                   | Usage                                                                                                                   | Example                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`DefaultAzureCredential`](https://learn.microsoft.com/javascript/api/@azure/identity/defaultazurecredential?view=azure-node-latest)         | Provides a simplified authentication experience to quickly start developing applications run in Azure.                  | [example](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#authenticating-with-defaultazurecredential)                      |
| [`ChainedTokenCredential`](https://learn.microsoft.com/javascript/api/@azure/identity/chainedtokencredential?view=azure-node-latest)         | Allows users to define custom authentication flows composing multiple credentials.                                      | [example](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#chaining-credentials)                                            |

### Authenticate Azure-hosted applications

| Credential                                                                                                                                   | Usage                                                                                                                   | Example                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`EnvironmentCredential`](https://learn.microsoft.com/javascript/api/@azure/identity/environmentcredential?view=azure-node-latest)           | Authenticates a service principal or user via credential information specified in environment variables.                | [example](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#authenticating-a-service-principal-with-environment-credentials) |
| [`ManagedIdentityCredential`](https://learn.microsoft.com/javascript/api/@azure/identity/managedidentitycredential?view=azure-node-latest)   | Authenticates the managed identity of an Azure resource.                                                                | [example](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#authenticating-in-azure-with-managed-identity)                   |
| [`WorkloadIdentityCredential`](https://learn.microsoft.com/javascript/api/@azure/identity/workloadidentitycredential?view=azure-node-latest) | Supports [Microsoft Entra Workload ID](https://learn.microsoft.com/azure/aks/workload-identity-overview) on Kubernetes. | [example](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#authenticating-in-azure-with-workload-identity)                  |

### Authenticate service principals

| Credential                                                                                                                                     | Usage                                                                                                                                                                | Example                                                                                                                                                                            | Reference                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [`AzurePipelinesCredential`](https://learn.microsoft.com/javascript/api/@azure/identity/azurepipelinescredential?view=azure-node-latest) | Supports [Microsoft Entra Workload ID](https://learn.microsoft.com/azure/devops/pipelines/release/configure-workload-identity?view=azure-devops) on Azure Pipelines. | [example](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#authenticating-in-azure-pipelines-with-service-connections)   |
| [`ClientAssertionCredential`](https://learn.microsoft.com/javascript/api/@azure/identity/clientassertioncredential?view=azure-node-latest)     | Authenticates a service principal using a signed client assertion.                                                                                                   | [example](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#authenticating-a-service-principal-with-a-client-assertion)   | [Service principal authentication](https://learn.microsoft.com/entra/identity-platform/app-objects-and-service-principals) |
| [`ClientCertificateCredential`](https://learn.microsoft.com/javascript/api/@azure/identity/clientcertificatecredential?view=azure-node-latest) | Authenticates a service principal using a certificate.                                                                                                               | [example](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#authenticating-a-service-principal-with-a-client-certificate) | [Service principal authentication](https://learn.microsoft.com/entra/identity-platform/app-objects-and-service-principals) |
| [`ClientSecretCredential`](https://learn.microsoft.com/javascript/api/@azure/identity/clientsecretcredential?view=azure-node-latest)           | Authenticates a service principal using a secret.                                                                                                                    | [example](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#authenticating-a-service-principal-with-a-client-secret)      | [Service principal authentication](https://learn.microsoft.com/entra/identity-platform/app-objects-and-service-principals) |

### Authenticate users

| Credential                                                                                                                                       | Usage                                                                                                                                                                                                                     | Example                                                                                                                                                                          | Reference                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [`AuthorizationCodeCredential`](https://learn.microsoft.com/javascript/api/@azure/identity/authorizationcodecredential?view=azure-node-latest)   | Authenticates a user with a previously obtained authorization code.                                                                                                                                                       | [example](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#authenticating-a-user-account-with-auth-code-flow)          | [OAuth2 authentication code](https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow)     |
| [`DeviceCodeCredential`](https://learn.microsoft.com/javascript/api/@azure/identity/devicecodecredential?view=azure-node-latest)                 | Interactively authenticates a user on devices with limited UI.                                                                                                                                                            | [example](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#authenticating-a-user-account-with-device-code-flow)        | [Device code authentication](https://learn.microsoft.com/entra/identity-platform/v2-oauth2-device-code)        |
| [`InteractiveBrowserCredential`](https://learn.microsoft.com/javascript/api/@azure/identity/interactivebrowsercredential?view=azure-node-latest) | Interactively authenticates a user with the default system browser. Read more about how this happens [here](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/interactive-browser-credential.md). | [example](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#authenticating-a-user-account-interactively-in-the-browser) | [OAuth2 authorization code](https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow)     |
| [`OnBehalfOfCredential`](https://learn.microsoft.com/javascript/api/@azure/identity/onbehalfofcredential?view=azure-node-latest)                 | Propagates the delegated user identity and permissions through the request chain                                                                                                                                          |                                                                                                                                                                                  | [On-behalf-of authentication](https://learn.microsoft.com/entra/identity-platform/v2-oauth2-on-behalf-of-flow) |

### Authenticate via development tools

| Credential                                                                                                                                     | Usage                                                                                                        | Example                                                                                                                                                                   | Reference                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [`AzureCliCredential`](https://learn.microsoft.com/javascript/api/@azure/identity/azureclicredential?view=azure-node-latest)                   | Authenticate in a development environment with the Azure CLI.                                                | [example](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#authenticating-a-user-account-with-azure-cli)        | [Azure CLI authentication](https://learn.microsoft.com/cli/azure/authenticate-azure-cli)                       |
| [`AzureDeveloperCliCredential`](https://learn.microsoft.com/javascript/api/@azure/identity/azuredeveloperclicredential?view=azure-node-latest) | Authenticate in a development environment with the enabled user or service principal in Azure Developer CLI. |                                                                                                                                                                           | [Azure Developer CLI Reference](https://learn.microsoft.com/azure/developer/azure-developer-cli/reference)     |
| [`AzurePowerShellCredential`](https://learn.microsoft.com/javascript/api/@azure/identity/azurepowershellcredential?view=azure-node-latest)     | Authenticate in a development environment using Azure PowerShell.                                            | [example](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/AzureIdentityExamples.md#authenticating-a-user-account-with-azure-powershell) | [Azure PowerShell authentication](https://learn.microsoft.com/powershell/azure/authenticate-azureps)           |
| [`VisualStudioCodeCredential`](https://learn.microsoft.com/javascript/api/@azure/identity/visualstudiocodecredential?view=azure-node-latest)   | Authenticate in a development environment with Visual Studio Code.                                           |                                                                                                                                                                           |  |

## Environment variables

`DefaultAzureCredential` and `EnvironmentCredential` can be configured with environment variables. Each type of authentication requires values for specific variables.

### Service principal with secret

| Variable name         | Value                                          |
| --------------------- | ---------------------------------------------- |
| `AZURE_CLIENT_ID`     | ID of a Microsoft Entra application            |
| `AZURE_TENANT_ID`     | ID of the application's Microsoft Entra tenant |
| `AZURE_CLIENT_SECRET` | one of the application's client secrets        |

### Service principal with certificate

| Variable name                         | Value                                                        |
|---------------------------------------|--------------------------------------------------------------|
| `AZURE_CLIENT_ID`                     | ID of a Microsoft Entra application                          |
| `AZURE_TENANT_ID`                     | ID of the application's Microsoft Entra tenant               |
| `AZURE_CLIENT_CERTIFICATE_PATH`       | path to a PEM-encoded certificate file including private key |
| `AZURE_CLIENT_CERTIFICATE_PASSWORD`   | (optional) password of the certificate file, if any          |
| `AZURE_CLIENT_SEND_CERTIFICATE_CHAIN` | (optional) send certificate chain in x5c header to support subject name / issuer-based authentication |

Configuration is attempted in the preceding order. For example, if values for a client secret and certificate are both present, the client secret is used.

## Continuous Access Evaluation

As of version 3.3.0, accessing resources protected by [Continuous Access Evaluation](https://learn.microsoft.com/entra/identity/conditional-access/concept-continuous-access-evaluation) (CAE) is possible on a per-request basis. This can be enabled using the [`GetTokenOptions.enableCae(boolean)` API](https://learn.microsoft.com/javascript/api/@azure/core-auth/gettokenoptions?view=azure-node-latest#@azure-core-auth-gettokenoptions-enablecae). CAE isn't supported for developer credentials.

## Token caching

Token caching is a feature provided by the Azure Identity library that allows apps to:

- Cache tokens in memory (default) and on disk (opt-in).
- Improve resilience and performance.
- Reduce the number of requests made to Microsoft Entra ID to obtain access tokens.

The Azure Identity library offers both in-memory and persistent disk caching. For more information, see the [token caching documentation](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/TOKEN_CACHING.md).

## Brokered authentication

An authentication broker is an application that runs on a user’s machine and manages the authentication handshakes and token maintenance for connected accounts. Currently, only the Windows Web Account Manager (WAM) is supported. Broker authentication is used by `DefaultAzureCredential` to enable secure sign-in via the WAM. To enable support, use the [`@azure/identity-broker`][azure_identity_broker] package. For details on authenticating using WAM, see the [broker plugin documentation][azure_identity_broker_readme].

## Troubleshooting

For assistance with troubleshooting, see the [troubleshooting guide](https://aka.ms/azsdk/js/identity/troubleshoot).

## Next steps

### Read the documentation

API documentation for this library can be found on our [documentation site](https://learn.microsoft.com/javascript/api/@azure/identity).

### Client library support

Client and management libraries listed on the [Azure SDK releases page](https://azure.github.io/azure-sdk/releases/latest/js.html) that support Microsoft Entra authentication accept credentials from this library. Learn more about using these libraries in their documentation, which is linked from the releases page.

### Known issues

#### Azure AD B2C support

This library doesn't support the [Azure AD B2C](https://learn.microsoft.com/azure/active-directory-b2c/overview) service.

For other open issues, see the library's [GitHub repository](https://github.com/Azure/azure-sdk-for-js/issues?q=is%3Aopen+is%3Aissue+label%3AAzure.Identity).

### Provide feedback

If you encounter bugs or have suggestions, [open an issue](https://github.com/Azure/azure-sdk-for-js/issues).

## Contributing

To contribute to this library, read the [contributing guide](https://github.com/Azure/azure-sdk-for-js/blob/main/CONTRIBUTING.md) to learn more about how to build and test the code.

[azure_cli]: https://learn.microsoft.com/cli/azure
[azure_developer_cli]: https://learn.microsoft.com/azure/developer/azure-developer-cli
[azure_powershell]: https://learn.microsoft.com/powershell/azure/
[azureclilogin_image]: https://raw.githubusercontent.com/Azure/azure-sdk-for-js/main/sdk/identity/identity/images/AzureCliLogin.png
[azureclilogindevicecode_image]: https://raw.githubusercontent.com/Azure/azure-sdk-for-js/main/sdk/identity/identity/images/AzureCliLoginDeviceCode.png
[azurepowershelllogin_image]: https://raw.githubusercontent.com/Azure/azure-sdk-for-js/main/sdk/identity/identity/images/AzurePowerShellLogin.png
[azure_identity_broker]: https://www.npmjs.com/package/@azure/identity-broker
[azure_identity_broker_readme]: https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/identity/identity-broker
[authority_hosts]: https://learn.microsoft.com/javascript/api/@azure/identity/azureauthorityhosts
