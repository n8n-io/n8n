[![npm-version](https://img.shields.io/npm/v/@ibm-cloud/watsonx-ai.svg)](https://www.npmjs.com/package/@ibm-cloud/watsonx-ai)
![NPM Downloads](https://img.shields.io/npm/dw/%40ibm-cloud%2Fwatsonx-ai)

# IBM watsonx.ai Node.js SDK
Node.js client library to interact with [IBM watsonx.ai service](https://dataplatform.cloud.ibm.com/docs/content/wsj/getting-started/overview-wx.html?context=wx).


## Table of Contents

<!--
  The TOC below is generated using the `markdown-toc` node package.

      https://github.com/jonschlinkert/markdown-toc

  You should regenerate the TOC after making changes to this file.

      npx markdown-toc -i README.md
  -->

<!-- toc -->

- [IBM watsonx.ai Node.js SDK](#ibm-watsonxai-nodejs-sdk)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Using the SDK](#using-the-sdk)
    - [With environment variables](#with-environment-variables)
      - [IAM authentication](#iam-authentication)
      - [Bearer token authentication](#bearer-token-authentication)
      - [IBM watsonx.ai software authentication](#ibm-watsonxai-software-authentication)
    - [With an external credentials file](#with-an-external-credentials-file)
    - [With programmatic approach](#with-programmatic-approach)
  - [Code examples](#code-examples)
    - [Basic example - text generation/inference](#basic-example---text-generationinference)
    - [Lightweight engine](#lightweight-engine)
    - [More examples](#more-examples)
  - [Questions](#questions)
  - [Issues](#issues)
  - [Open source @ IBM](#open-source--ibm)
  - [Contributing](#contributing)
  - [License](#license)

<!-- tocstop -->

<!-- --------------------------------------------------------------- -->
## Overview

The IBM watsonx.ai Node.js SDK allows developers to programmatically interact with the [IBM watsonx.ai service](https://dataplatform.cloud.ibm.com/docs/content/wsj/getting-started/overview-wx.html?context=wx).

## Prerequisites
* You need an [IBM Cloud][ibm-cloud-onboarding] (SaaS offering) or have access to [IBM Cloud Pak® for Data][ibm-cpd-onboarding] (on-prem offering).
* You need to have an access to watsonx.ai service in either of above environments.
* **Node.js >=20**: This SDK is tested with Node.js versions 20 and up. It may work on previous versions but this is not officially supported.

[ibm-cloud-onboarding]: http://cloud.ibm.com/registration
[ibm-cpd-onboarding]: https://www.ibm.com/products/cloud-pak-for-data

## Installation
```sh
npm install @ibm-cloud/watsonx-ai
```

## Using the SDK
For general SDK usage information, please see
[this link](https://github.com/IBM/ibm-cloud-sdk-common/blob/main/README.md)

IBM watsonx.ai Node.js SDK documentation can be found [here](https://ibm.github.io/watsonx-ai-node-sdk/)

This library requires configuration with a service URL and platform credentials to authenticate to your account.

There are several ways to set these authentication properties.

### With environment variables

You can set the following environment variables for chosen authentication type.

#### IAM authentication

```sh
WATSONX_AI_AUTH_TYPE=iam
WATSONX_AI_APIKEY=<YOUR-APIKEY>
```

#### Bearer token authentication

```sh
WATSONX_AI_AUTH_TYPE=bearertoken
WATSONX_AI_BEARER_TOKEN=<YOUR-BEARER-TOKEN>
```

#### IBM watsonx.ai software authentication

```sh
WATSONX_AI_AUTH_TYPE=cp4d
WATSONX_AI_USERNAME=<YOUR_USERNAME>
WATSONX_AI_PASSWORD=<YOUR_PASSWORD>
WATSONX_AI_URL=url
```
If any troubles regarding SSL verification appear, such as "Error: self-signed certificate in certificate chain", please try setting up environment variables as below:
```sh
WATSONX_AI_DISABLE_SSL=true
WATSONX_AI_AUTH_DISABLE_SSL=true
```



### With an external credentials file
To use an external configuration file, please see the [general SDK usage information](https://github.com/IBM/ibm-cloud-sdk-common#using-external-configuration) for guidance. Additionally, please see the following template files for:
- [IAM authentication](https://github.com/IBM/watsonx-ai-node-sdk/blob/main/examples/auth/watsonx_ai_ml_vml_v1_iam.env.template)
- [Bearer token authentication](https://github.com/IBM/watsonx-ai-node-sdk/blob/main/examples/auth/watsonx_ai_ml_vml_v1_bearer.env.template)
- [CP4D authentication](https://github.com/IBM/watsonx-ai-node-sdk/blob/main/examples/auth/watsonx_ai_ml_vml_v1_cp4d.env.template)

### With programmatic approach
To learn more about how to use programmatic authentication, see the [Node.js SDK Core document](https://github.com/IBM/node-sdk-core/blob/main/Authentication.md) about authentication.

## Code examples

### Basic example - text generation/inference
The following code examples authenticate with the environment variables.
Please set environment variables before proceeding with examples:
It is mandatory to set `projectId` or `spaceId` unless you are working with lightweight engine.
```ts
import { WatsonXAI } from '@ibm-cloud/watsonx-ai';

// Service instance
const watsonxAIService = new WatsonXAI({
  version: '2024-05-31',
  serviceUrl: 'https://us-south.ml.cloud.ibm.com',
});

const params = {
  messages: [{ role: 'user', content: 'Generate a short greeting for project kick-off meeting.' }],
  modelId: 'ibm/granite-4-h-small',
  projectId: '<YOUR_PROJECT_ID>',
  maxTokens: 200,
};

try {
  const textGeneration = await watsonxAIService.textChat(params);

  console.log('\n\n***** TEXT RESPONSE FROM MODEL *****');
  console.log(textGeneration.result.choices[0].message?.content);
} catch (err) {
  console.warn(err);
}
```

When you run this code, you should see result similar to the following output:
```text
***** TEXT RESPONSE FROM MODEL *****
Welcome to the project kick-off meeting. I'm glad you could make it.
```

### Lightweight engine
For a watsonx.ai lightweight engine, you do not need to provide a `projectId` or `spaceId`. Remember to set environment variables (`IBM watsonx.ai software authentication`) before proceeding.

```ts
import { WatsonXAI } from '@ibm-cloud/watsonx-ai';

// Service instance
const watsonxAIService = new WatsonXAI({
    version: '2024-05-31',
    serviceUrl: process.env.SERVICE_URL,
});

const params = {
  messages: [{ role: 'user', content: 'Generate a short greeting for project kick-off meeting.' }],
  modelId: 'ibm/granite-4-h-small',
};

try {
    const textGeneration = await watsonxAIService.textChat(params);

    console.log('\n\n***** TEXT RESPONSE FROM MODEL *****');
    console.log(textGeneration.result.choices[0].message?.content);
} catch (err) {
    console.warn(err);
}
```

### More examples
For more examples, please refer to the [following directory](https://github.com/IBM/watsonx-ai-node-sdk/tree/main/examples/), which contains self-contained examples of several flows, where you could use this SDK in.

## Questions

If you are having difficulties using this SDK or have a question about the IBM Cloud services,
please ask a question at
[Stack Overflow](http://stackoverflow.com/questions/ask?tags=ibm-cloud).

## Issues
If you encounter an issue with the SDK, you are welcome to submit
a [bug report](https://github.com/IBM/watsonx-ai-node-sdk/issues).
Before that, please search for similar issues. It's possible someone has already encountered this issue.

## Open source @ IBM
Find more open source projects on the [IBM Github Page](http://ibm.github.io/)

## Contributing
See [CONTRIBUTING](CONTRIBUTING.md).

## License

This project is released under the Apache 2.0 license.
The license's full text can be found in
[LICENSE](LICENSE).
