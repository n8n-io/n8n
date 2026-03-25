# Microsoft Authentication Library for Node (msal-node)

[![npm version](https://img.shields.io/npm/v/@azure/msal-node.svg?style=flat)](https://www.npmjs.com/package/@azure/msal-node/)
[![npm version](https://img.shields.io/npm/dm/@azure/msal-node.svg)](https://nodei.co/npm/@azure/msal-node/)
[![codecov](https://codecov.io/gh/AzureAD/microsoft-authentication-library-for-js/branch/dev/graph/badge.svg?flag=msal-node)](https://codecov.io/gh/AzureAD/microsoft-authentication-library-for-js)

| <a href="https://docs.microsoft.com/azure/active-directory/develop/guidedsetups/active-directory-javascriptspa" target="_blank">Getting Started</a> | <a href="https://aka.ms/aaddevv2" target="_blank">AAD Docs</a> | <a href="https://azuread.github.io/microsoft-authentication-library-for-js/ref/modules/_azure_msal_node.html" target="_blank">Library Reference</a> |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |

1. [About](#about)
1. [FAQ](#faq)
1. [Changelog](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/CHANGELOG.md)
1. [Prerequisites](#prerequisites)
1. [Installation](#installation)
1. [Node Version Support](#node-version-support)
1. [Usage](#usage)
1. [Samples](#samples)
1. [Build Library](#build-and-test)
1. [Security Reporting](#security-reporting)
1. [License](#license)
1. [Code of Conduct](#we-value-and-adhere-to-the-microsoft-open-source-code-of-conduct)

## About

MSAL Node enables applications to authenticate users using [Azure AD](https://docs.microsoft.com/azure/active-directory/develop/v2-overview) work and school accounts (AAD), Microsoft personal accounts (MSA) and social identity providers like Facebook, Google, LinkedIn, Microsoft accounts, etc. through [Azure AD B2C](https://docs.microsoft.com/azure/active-directory-b2c/active-directory-b2c-overview#identity-providers) service. It also enables your app to get tokens to access [Microsoft Cloud](https://www.microsoft.com/enterprise) services such as [Microsoft Graph](https://graph.microsoft.io).

### OAuth2.0 grant types supported:

The current version supports the following ways of acquiring tokens:

#### Public Client:

-   [Authorization Code Grant](https://oauth.net/2/grant-types/authorization-code/) with [PKCE](https://oauth.net/2/pkce/)
-   [Device Code Grant](https://oauth.net/2/grant-types/device-code/)
-   [Refresh Token Grant](https://oauth.net/2/grant-types/refresh-token/)
-   [Silent Flow](https://docs.microsoft.com/azure/active-directory/develop/msal-acquire-cache-tokens#acquiring-tokens-silently-from-the-cache)
-   [Username and Password flow](https://docs.microsoft.com/azure/active-directory/develop/msal-authentication-flows#usernamepassword)

#### Confidential Client:

-   [Authorization Code Grant](https://oauth.net/2/grant-types/authorization-code/) with a client credential
-   [Refresh Token Grant](https://oauth.net/2/grant-types/refresh-token/)
-   [Silent Flow](https://docs.microsoft.com/azure/active-directory/develop/msal-acquire-cache-tokens#acquiring-tokens-silently-from-the-cache)
-   [Client Credential Grant](https://oauth.net/2/grant-types/client-credentials/)
-   [On-behalf-of flow](https://docs.microsoft.com/azure/active-directory/develop/v2-oauth2-on-behalf-of-flow)
-   [Username and Password flow](https://docs.microsoft.com/azure/active-directory/develop/msal-authentication-flows#usernamepassword)

Note that the username and password flow is deprecated and support will be removed in a future release.

More details on different grant types supported by Microsoft authentication libraries in general can be found [here](https://docs.microsoft.com/azure/active-directory/develop/msal-authentication-flows). 

### Scenarios supported:

The scenarios supported with this library are:

-   Desktop app that calls web APIs
-   Web app that calls web APIs
-   Web APIs that call web APIs
-   Daemon apps

More details on scenarios and the authentication flows that map to each of them can be found [here](https://docs.microsoft.com/azure/active-directory/develop/authentication-flows-app-scenarios).

## FAQ

See [here](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/faq.md).

## Prerequisites

Before using `@azure/msal-node` you will need to register your app in the azure portal:

-   [App registration](https://docs.microsoft.com/graph/auth-register-app-v2)

## Installation

### Via NPM:

```javascript
npm install @azure/msal-node
```

## Node Version Support

MSAL Node will follow the [Long Term Support (LTS) schedule of the Node.js project](https://nodejs.org/about/releases/). Our support plan is as follows.

Any major MSAL Node release:

-   Will support stable (even-numbered) Maintenance LTS, Active LTS, and Current versions of Node
-   Will drop support for any previously supported Node versions that have reached end of life
-   Will not support prerelease/preview/pending versions until they are stable

| MSAL Node version | MSAL support status | Supported Node versions |
| ----------------- | ------------------- | ----------------------- |
| 3.x.x             | Active development  | 16, 18, 20, 22, 24      |
| 2.x.x             | Active development  | 16, 18, 20, 22          |
| 1.x.x             | In maintenance      | 10, 12, 14, 16, 18      |

**Note:** There have been no functional changes in the MSAL Node v2 release.

## Usage

### MSAL basics

-   [Understand difference in between Public Client and Confidential Clients](https://docs.microsoft.com/azure/active-directory/develop/msal-client-applications)
-   [Initialize a Public Client Application](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/initialize-public-client-application.md)
-   [Initialize a Confidential Client Application](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/initialize-confidential-client-application.md)
-   [Configuration](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/configuration.md)
-   [Request](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-common/docs/request.md)
-   [Response](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-common/docs/Response.md)

## Samples

There are multiple [samples](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-node-samples) included in the repository that use MSAL Node to acquire tokens. These samples are currently used for manual testing, and are not meant to be a reference of best practices, therefore use judgement and do not blindly copy this code to any production applications.

AAD samples:

-   [auth-code](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-node-samples/auth-code): Express app using OAuth2.0 authorization code flow.
-   [auth-code-pkce](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-node-samples/auth-code-pkce): Express app using OAuth2.0 authorization code flow with PKCE.
-   [device-code](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-node-samples/device-code): Command line app using OAuth 2.0 device code flow.
-   [refresh-token](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-node-samples/refresh-token): Command line app using OAuth 2.0 refresh flow.
-   [silent-flow](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-node-samples/silent-flow): Express app using OAuth2.0 authorization code flow to acquire a token and store in the token cache, and silent flow to use tokens in the token cache.
-   [client-credentials](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-node-samples/client-credentials): Daemon app using OAuth 2.0 client credential grant to acquire a token.
-   [on-behalf-of](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-node-samples/on-behalf-of): Web application using OAuth 2.0 auth code flow to acquire a token for a web API. The web API validates the token, and calls Microsoft Graph on behalf of the user who authenticated in the web application.
-   [username-password](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-node-samples/username-password): Web application using OAuth 2.0 resource owner password credentials (ROPC) flow to acquire a token for a web API.
-   [ElectronTestApp](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-node-samples/ElectronTestApp): Electron desktop application using OAuth 2.0 auth code with PKCE flow to acquire a token for a web API such as Microsoft Graph.
-   [Hybrid Spa Sample](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-browser-samples/HybridSample): Sample demonstrating how to use `enableSpaAuthorizationCode` to perform SSO for applications that leverage server-side and client-side authentication using MSAL Browser and MSAL Node.

B2C samples:

-   [b2c-user-flows](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-node-samples/b2c-user-flows): Express app using OAuth2.0 authorization code flow.

Others:

-   [msal-node-extensions](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/extensions/samples/msal-node-extensions): Uses authorization code flow to acquire tokens and the [msal-extensions](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/extensions/) library to write the MSAL in-memory token cache to disk.

## Build and Test

```javascript
// Install dependencies from root of repo
npm install

// Change to the msal-node package directory
cd lib/msal-node

// To run build for common package & node package
npm run build:all

// To run build only for node package
npm run build

// To run tests
npm run test
```

### Local Development

Below is a list of commands you will probably find useful:

#### `npm run build:modules:watch`

Runs the project in development/watch mode. Your project will be rebuilt upon changes. TSDX has a special logger for you convenience. Error messages are pretty printed and formatted for compatibility VS Code's Problems tab. The library will be rebuilt if you make edits.

#### `npm run build`

Bundles the package to the `dist` folder.
The package is optimized and bundled with Rollup into multiple formats (CommonJS, UMD, and ES Module).

#### `npm run build:all`

Builds both `msal-common` and `msal-node`

#### `npm run lint`

Runs eslint with Prettier

#### `npm test`, `npm run test:coverage`, `npm run test:watch`

Runs the test watcher (Jest) in an interactive mode.
By default, runs tests related to files changed since the last commit.
Generate code coverage by adding the flag --coverage. No additional setup needed. Jest can collect code coverage information from entire projects, including untested files.

## Security Reporting

If you find a security issue with our libraries or services please report it to [secure@microsoft.com](mailto:secure@microsoft.com) with as much detail as possible. Your submission may be eligible for a bounty through the [Microsoft Bounty](http://aka.ms/bugbounty) program. Please do not post security issues to GitHub Issues or any other public site. We will contact you shortly upon receiving the information. We encourage you to get notifications of when security incidents occur by visiting [this page](https://technet.microsoft.com/security/dd252948) and subscribing to Security Advisory Alerts.

## License

Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT License.

## We Value and Adhere to the Microsoft Open Source Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
