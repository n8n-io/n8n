# Microsoft Authentication Library for JavaScript (MSAL.js) for Browser-Based Single-Page Applications

[![npm version](https://img.shields.io/npm/v/@azure/msal-browser.svg?style=flat)](https://www.npmjs.com/package/@azure/msal-browser/)
[![npm version](https://img.shields.io/npm/dm/@azure/msal-browser.svg)](https://nodei.co/npm/@azure/msal-browser/)
[![codecov](https://codecov.io/gh/AzureAD/microsoft-authentication-library-for-js/branch/dev/graph/badge.svg?flag=msal-browser)](https://codecov.io/gh/AzureAD/microsoft-authentication-library-for-js)

| <a href="https://docs.microsoft.com/azure/active-directory/develop/guidedsetups/active-directory-javascriptspa" target="_blank">Getting Started</a> | <a href="https://aka.ms/aaddevv2" target="_blank">AAD Docs</a> | <a href="https://azuread.github.io/microsoft-authentication-library-for-js/ref/modules/_azure_msal_browser.html" target="_blank">Library Reference</a> |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |

1. [About](#about)
1. [FAQ](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/FAQ.md)
1. [Changelog](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/CHANGELOG.md)
1. [Roadmap](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/roadmap.md)
1. [Prerequisites](#prerequisites)
1. [Installation](#installation)
1. [Usage](#usage)
    - [Migrating from Previous MSAL Versions](#migrating-from-previous-msal-versions)
    - [MSAL Basics](#msal-basics)
    - [Advanced Topics](#advanced-topics)
1. [Samples](#samples)
1. [Build and Test](#build-and-test)
1. [Authorization Code vs Implicit](#implicit-flow-vs-authorization-code-flow-with-pkce)
1. [Framework Wrappers](#framework-wrappers)
1. [Security Reporting](#security-reporting)
1. [License](#license)
1. [Code of Conduct](#we-value-and-adhere-to-the-microsoft-open-source-code-of-conduct)

## About

The MSAL library for JavaScript enables client-side JavaScript applications to authenticate users using [Azure AD](https://docs.microsoft.com/azure/active-directory/develop/v2-overview) work and school accounts (AAD), Microsoft personal accounts (MSA) and social identity providers like Facebook, Google, LinkedIn, Microsoft accounts, etc. through [Azure AD B2C](https://docs.microsoft.com/azure/active-directory-b2c/active-directory-b2c-overview#identity-providers) service. It also enables your app to get tokens to access [Microsoft Cloud](https://www.microsoft.com/enterprise) services such as [Microsoft Graph](https://graph.microsoft.io).

The `@azure/msal-browser` package described by the code in this folder uses the [`@azure/msal-common` package](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-common) as a dependency to enable authentication in JavaScript Single-Page Applications without backend servers. This version of the library uses the OAuth 2.0 Authorization Code Flow with PKCE. To read more about this protocol, as well as the differences between implicit flow and authorization code flow, see the section [below](#implicit-flow-vs-authorization-code-flow-with-pkce).

This is an improvement upon the previous `@azure/msal` library which will utilize the authorization code flow in the browser. Most features available in the old library will be available in this one, but there are nuances to the authentication flow in both. The `@azure/msal-browser` package does NOT support the implicit flow.

## FAQ

See [here](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/FAQ.md).

## Roadmap

See [here](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/roadmap.md).

## Prerequisites

-   `@azure/msal-browser` is meant to be used in [Single-Page Application scenarios](https://docs.microsoft.com/azure/active-directory/develop/scenario-spa-overview).

-   Before using `@azure/msal-browser` you will need to [register a Single Page Application in Azure AD](https://docs.microsoft.com/en-us/azure/active-directory/develop/scenario-spa-app-registration) to get a valid `clientId` for configuration, and to register the routes that your app will accept redirect traffic on.

## Installation

### Via NPM

```javascript
npm install @azure/msal-browser
```

## Usage

### Migrating from Previous MSAL Versions

-   [Migrating from MSAL v1.x to MSAL v2.x](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/v1-migration.md)
-   [Migrating from MSAL v2.x to MSAL v3.x](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/v2-migration.md)

### MSAL Basics

1. [Initialization](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/initialization.md)
2. [Logging in a User](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/login-user.md)
3. [Acquiring and Using an Access Token](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/acquire-token.md)
4. [Managing Token Lifetimes](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/token-lifetimes.md)
5. [Managing Accounts](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-common/docs/Accounts.md)
6. [Logging Out a User](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/logout.md)

### Advanced Topics

-   [Configuration Options](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/configuration.md)
-   [Request and Response Details](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/request-response-object.md)
-   [Cache Storage](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/caching.md)
-   [Performance Enhancements](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/performance.md)
-   [Instance Aware Flow](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/instance-aware.md)

## Samples

The [`msal-browser-samples` folder](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-browser-samples) contains sample applications for our libraries.

More instructions to run the samples can be found in the [`README.md` file](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/samples/msal-browser-samples/VanillaJSTestApp2.0/Readme.md) of the VanillaJSTestApp2.0 folder.

More advanced samples backed with a tutorial can be found in the [Azure Samples](https://github.com/Azure-Samples) space on GitHub:

-   [JavaScript SPA calling Express.js web API](https://github.com/Azure-Samples/ms-identity-javascript-tutorial/tree/main/3-Authorization-II/1-call-api)
-   [JavaScript SPA calling Microsoft Graph via Express.js web API using on-behalf-of flow](https://github.com/Azure-Samples/ms-identity-javascript-tutorial/tree/main/4-AdvancedGrants/1-call-api-graph)
-   [Deployment tutorial for Azure App Service and Azure Storage](https://github.com/Azure-Samples/ms-identity-javascript-tutorial/tree/main/5-Deployment)

We also provide samples for addin/plugin scenarios:

-   [Office Addin-in using MSAL.js](https://github.com/OfficeDev/PnP-OfficeAddins/blob/main/Samples/auth/Office-Add-in-Microsoft-Graph-React/)
-   [Teams Tab using MSAL.js](https://github.com/pnp/teams-dev-samples/tree/main/samples/tab-sso/src/nodejs)
-   [Chromium Extension using MSAL.js](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-browser-samples/ChromiumExtensionSample)

## Build and Test

See the [`contributing.md`](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/contributing.md) file for more information.

### Building the package

To build the `@azure/msal-browser` library, you can do the following:

```bash
// Change to the msal-browser package directory
cd lib/msal-browser/
// To run build only for browser package
npm run build
```

To build both the `@azure/msal-browser` library and `@azure/msal-common` libraries, you can do the following:

```bash
// Change to the msal-browser package directory
cd lib/msal-browser/
// To run build for both browser and common packages
npm run build:all
```

### Running Tests

`@azure/msal-browser` uses [jest](https://jestjs.io) to run unit tests.

```bash
// To run tests
npm test
// To run tests with code coverage
npm run test:coverage
```

## Implicit Flow vs Authorization Code Flow with PKCE

`@azure/msal-browser` implements the [OAuth 2.0 Authorization Code Flow with PKCE](https://tools.ietf.org/html/rfc7636) for browser-based applications. This is a significant improvement over the Implicit Flow that was used in `@azure/msal`, `msal` or `adal-angular`.

### Authorization Code Flow with PKCE

The Authorization Code Flow with Proof Key for Code Exchange (PKCE) is the current industry standard for securing OAuth 2.0 authorization in public clients, including single-page applications (SPAs). Key benefits include:

- **Enhanced Security**: PKCE provides protection against authorization code interception attacks
- **No Tokens in URLs**: Tokens are never exposed in the browser's URL or history
- **Refresh Token Support**: Enables long-lived sessions through refresh tokens
- **OIDC Compliance**: Fully compliant with OpenID Connect standards

### Implicit Flow (Deprecated)

The Implicit Flow was the previous standard for SPAs but has been deprecated due to security concerns:

- **Tokens in URLs**: Access tokens are returned in URL fragments, making them visible in browser history and server logs
- **No Refresh Tokens**: Implicit flow cannot securely deliver refresh tokens to public clients
- **Increased Attack Surface**: Tokens are more susceptible to token leakage attacks

### Migration Considerations

- **`@azure/msal-browser` only supports Authorization Code Flow with PKCE** - Implicit Flow is not supported
- If you're migrating from `@azure/msal`, `msal` or `adal-angular`, see our [migration guide](./docs/v1-migration.md)
- Your Azure AD app registration needs to be configured for the Authorization Code Flow
- Existing applications using Implicit Flow should migrate to Authorization Code Flow for improved security

For more technical details about these flows, refer to the [Microsoft identity platform documentation](https://docs.microsoft.com/azure/active-directory/develop/v2-oauth2-auth-code-flow).

## Framework Wrappers

If you are using a framework such as Angular or React you may be interested in using one of our wrapper libraries:

-   Angular: [@azure/msal-angular v2](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-angular)
-   React: [@azure/msal-react](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-react)

## Security Reporting

If you find a security issue with our libraries or services please report it to [secure@microsoft.com](mailto:secure@microsoft.com) with as much detail as possible. Your submission may be eligible for a bounty through the [Microsoft Bounty](http://aka.ms/bugbounty) program. Please do not post security issues to GitHub Issues or any other public site. We will contact you shortly upon receiving the information. We encourage you to get notifications of when security incidents occur by visiting [this page](https://technet.microsoft.com/security/dd252948) and subscribing to Security Advisory Alerts.

## License

Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT License.

## We Value and Adhere to the Microsoft Open Source Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
