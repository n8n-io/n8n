# @aws-sdk/util-user-agent-browser

[![NPM version](https://img.shields.io/npm/v/@aws-sdk/util-user-agent-browser/latest.svg)](https://www.npmjs.com/package/@aws-sdk/util-user-agent-browser)
[![NPM downloads](https://img.shields.io/npm/dm/@aws-sdk/util-user-agent-browser.svg)](https://www.npmjs.com/package/@aws-sdk/util-user-agent-browser)

## Usage

In previous versions of the AWS SDK for JavaScript v3, the AWS SDK user agent header was provided by parsing the navigator user agent string with the `bowser` library.

This was later changed to browser feature detection using the native Navigator APIs, but if you would like to have the previous functionality, use the following code:

```js
import { createUserAgentStringParsingProvider } from "@aws-sdk/util-user-agent-browser";

import { S3Client } from "@aws-sdk/client-s3";
import pkgInfo from "@aws-sdk/client-s3/package.json";
// or any other client.

const client = new S3Client({
  defaultUserAgentProvider: createUserAgentStringParsingProvider({
    // For a client's serviceId, check the corresponding shared runtimeConfig file
    // https://github.com/aws/aws-sdk-js-v3/blob/main/clients/client-s3/src/runtimeConfig.shared.ts
    serviceId: "S3",
    clientVersion: pkgInfo.version,
  }),
});
```

This usage is not recommended, due to the size of the additional parsing library.
