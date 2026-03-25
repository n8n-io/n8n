<!-- generated file, do not edit directly -->

# @aws-sdk/client-sesv2

## Description

AWS SDK for JavaScript SESv2 Client for Node.js, Browser and React Native.

<fullname>Amazon SES API v2</fullname>

<p>
<a href="http://aws.amazon.com/ses">Amazon SES</a> is an Amazon Web Services service that
you can use to send email messages to your customers.</p>
<p>If you're new to Amazon SES API v2, you might find it helpful to review the <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/">Amazon Simple Email Service Developer
Guide</a>. The <i>Amazon SES Developer Guide</i> provides information
and code samples that demonstrate how to use Amazon SES API v2 features programmatically.</p>

## Installing

To install this package, simply type add or install @aws-sdk/client-sesv2
using your favorite package manager:

- `npm install @aws-sdk/client-sesv2`
- `yarn add @aws-sdk/client-sesv2`
- `pnpm add @aws-sdk/client-sesv2`

## Getting Started

### Import

The AWS SDK is modulized by clients and commands.
To send a request, you only need to import the `SESv2Client` and
the commands you need, for example `ListTenantsCommand`:

```js
// ES5 example
const { SESv2Client, ListTenantsCommand } = require("@aws-sdk/client-sesv2");
```

```ts
// ES6+ example
import { SESv2Client, ListTenantsCommand } from "@aws-sdk/client-sesv2";
```

### Usage

To send a request, you:

- Initiate client with configuration (e.g. credentials, region).
- Initiate command with input parameters.
- Call `send` operation on client with command object as input.
- If you are using a custom http handler, you may call `destroy()` to close open connections.

```js
// a client can be shared by different commands.
const client = new SESv2Client({ region: "REGION" });

const params = {
  /** input parameters */
};
const command = new ListTenantsCommand(params);
```

#### Async/await

We recommend using [await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)
operator to wait for the promise returned by send operation as follows:

```js
// async/await.
try {
  const data = await client.send(command);
  // process data.
} catch (error) {
  // error handling.
} finally {
  // finally.
}
```

Async-await is clean, concise, intuitive, easy to debug and has better error handling
as compared to using Promise chains or callbacks.

#### Promises

You can also use [Promise chaining](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises#chaining)
to execute send operation.

```js
client.send(command).then(
  (data) => {
    // process data.
  },
  (error) => {
    // error handling.
  }
);
```

Promises can also be called using `.catch()` and `.finally()` as follows:

```js
client
  .send(command)
  .then((data) => {
    // process data.
  })
  .catch((error) => {
    // error handling.
  })
  .finally(() => {
    // finally.
  });
```

#### Callbacks

We do not recommend using callbacks because of [callback hell](http://callbackhell.com/),
but they are supported by the send operation.

```js
// callbacks.
client.send(command, (err, data) => {
  // process err and data.
});
```

#### v2 compatible style

The client can also send requests using v2 compatible style.
However, it results in a bigger bundle size and may be dropped in next major version. More details in the blog post
on [modular packages in AWS SDK for JavaScript](https://aws.amazon.com/blogs/developer/modular-packages-in-aws-sdk-for-javascript/)

```ts
import * as AWS from "@aws-sdk/client-sesv2";
const client = new AWS.SESv2({ region: "REGION" });

// async/await.
try {
  const data = await client.listTenants(params);
  // process data.
} catch (error) {
  // error handling.
}

// Promises.
client
  .listTenants(params)
  .then((data) => {
    // process data.
  })
  .catch((error) => {
    // error handling.
  });

// callbacks.
client.listTenants(params, (err, data) => {
  // process err and data.
});
```

### Troubleshooting

When the service returns an exception, the error will include the exception information,
as well as response metadata (e.g. request id).

```js
try {
  const data = await client.send(command);
  // process data.
} catch (error) {
  const { requestId, cfId, extendedRequestId } = error.$metadata;
  console.log({ requestId, cfId, extendedRequestId });
  /**
   * The keys within exceptions are also parsed.
   * You can access them by specifying exception names:
   * if (error.name === 'SomeServiceException') {
   *     const value = error.specialKeyInException;
   * }
   */
}
```

## Getting Help

Please use these community resources for getting help.
We use the GitHub issues for tracking bugs and feature requests, but have limited bandwidth to address them.

- Visit [Developer Guide](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html)
  or [API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/index.html).
- Check out the blog posts tagged with [`aws-sdk-js`](https://aws.amazon.com/blogs/developer/tag/aws-sdk-js/)
  on AWS Developer Blog.
- Ask a question on [StackOverflow](https://stackoverflow.com/questions/tagged/aws-sdk-js) and tag it with `aws-sdk-js`.
- Join the AWS JavaScript community on [gitter](https://gitter.im/aws/aws-sdk-js-v3).
- If it turns out that you may have found a bug, please [open an issue](https://github.com/aws/aws-sdk-js-v3/issues/new/choose).

To test your universal JavaScript code in Node.js, browser and react-native environments,
visit our [code samples repo](https://github.com/aws-samples/aws-sdk-js-tests).

## Contributing

This client code is generated automatically. Any modifications will be overwritten the next time the `@aws-sdk/client-sesv2` package is updated.
To contribute to client you can check our [generate clients scripts](https://github.com/aws/aws-sdk-js-v3/tree/main/scripts/generate-clients).

## License

This SDK is distributed under the
[Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0),
see LICENSE for more information.

## Client Commands (Operations List)

<details>
<summary>
BatchGetMetricData
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/BatchGetMetricDataCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/BatchGetMetricDataCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/BatchGetMetricDataCommandOutput/)

</details>
<details>
<summary>
CancelExportJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/CancelExportJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CancelExportJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CancelExportJobCommandOutput/)

</details>
<details>
<summary>
CreateConfigurationSet
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/CreateConfigurationSetCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateConfigurationSetCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateConfigurationSetCommandOutput/)

</details>
<details>
<summary>
CreateConfigurationSetEventDestination
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/CreateConfigurationSetEventDestinationCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateConfigurationSetEventDestinationCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateConfigurationSetEventDestinationCommandOutput/)

</details>
<details>
<summary>
CreateContact
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/CreateContactCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateContactCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateContactCommandOutput/)

</details>
<details>
<summary>
CreateContactList
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/CreateContactListCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateContactListCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateContactListCommandOutput/)

</details>
<details>
<summary>
CreateCustomVerificationEmailTemplate
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/CreateCustomVerificationEmailTemplateCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateCustomVerificationEmailTemplateCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateCustomVerificationEmailTemplateCommandOutput/)

</details>
<details>
<summary>
CreateDedicatedIpPool
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/CreateDedicatedIpPoolCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateDedicatedIpPoolCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateDedicatedIpPoolCommandOutput/)

</details>
<details>
<summary>
CreateDeliverabilityTestReport
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/CreateDeliverabilityTestReportCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateDeliverabilityTestReportCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateDeliverabilityTestReportCommandOutput/)

</details>
<details>
<summary>
CreateEmailIdentity
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/CreateEmailIdentityCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateEmailIdentityCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateEmailIdentityCommandOutput/)

</details>
<details>
<summary>
CreateEmailIdentityPolicy
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/CreateEmailIdentityPolicyCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateEmailIdentityPolicyCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateEmailIdentityPolicyCommandOutput/)

</details>
<details>
<summary>
CreateEmailTemplate
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/CreateEmailTemplateCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateEmailTemplateCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateEmailTemplateCommandOutput/)

</details>
<details>
<summary>
CreateExportJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/CreateExportJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateExportJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateExportJobCommandOutput/)

</details>
<details>
<summary>
CreateImportJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/CreateImportJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateImportJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateImportJobCommandOutput/)

</details>
<details>
<summary>
CreateMultiRegionEndpoint
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/CreateMultiRegionEndpointCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateMultiRegionEndpointCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateMultiRegionEndpointCommandOutput/)

</details>
<details>
<summary>
CreateTenant
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/CreateTenantCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateTenantCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateTenantCommandOutput/)

</details>
<details>
<summary>
CreateTenantResourceAssociation
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/CreateTenantResourceAssociationCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateTenantResourceAssociationCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/CreateTenantResourceAssociationCommandOutput/)

</details>
<details>
<summary>
DeleteConfigurationSet
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/DeleteConfigurationSetCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteConfigurationSetCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteConfigurationSetCommandOutput/)

</details>
<details>
<summary>
DeleteConfigurationSetEventDestination
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/DeleteConfigurationSetEventDestinationCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteConfigurationSetEventDestinationCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteConfigurationSetEventDestinationCommandOutput/)

</details>
<details>
<summary>
DeleteContact
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/DeleteContactCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteContactCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteContactCommandOutput/)

</details>
<details>
<summary>
DeleteContactList
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/DeleteContactListCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteContactListCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteContactListCommandOutput/)

</details>
<details>
<summary>
DeleteCustomVerificationEmailTemplate
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/DeleteCustomVerificationEmailTemplateCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteCustomVerificationEmailTemplateCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteCustomVerificationEmailTemplateCommandOutput/)

</details>
<details>
<summary>
DeleteDedicatedIpPool
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/DeleteDedicatedIpPoolCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteDedicatedIpPoolCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteDedicatedIpPoolCommandOutput/)

</details>
<details>
<summary>
DeleteEmailIdentity
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/DeleteEmailIdentityCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteEmailIdentityCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteEmailIdentityCommandOutput/)

</details>
<details>
<summary>
DeleteEmailIdentityPolicy
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/DeleteEmailIdentityPolicyCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteEmailIdentityPolicyCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteEmailIdentityPolicyCommandOutput/)

</details>
<details>
<summary>
DeleteEmailTemplate
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/DeleteEmailTemplateCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteEmailTemplateCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteEmailTemplateCommandOutput/)

</details>
<details>
<summary>
DeleteMultiRegionEndpoint
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/DeleteMultiRegionEndpointCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteMultiRegionEndpointCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteMultiRegionEndpointCommandOutput/)

</details>
<details>
<summary>
DeleteSuppressedDestination
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/DeleteSuppressedDestinationCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteSuppressedDestinationCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteSuppressedDestinationCommandOutput/)

</details>
<details>
<summary>
DeleteTenant
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/DeleteTenantCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteTenantCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteTenantCommandOutput/)

</details>
<details>
<summary>
DeleteTenantResourceAssociation
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/DeleteTenantResourceAssociationCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteTenantResourceAssociationCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/DeleteTenantResourceAssociationCommandOutput/)

</details>
<details>
<summary>
GetAccount
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetAccountCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetAccountCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetAccountCommandOutput/)

</details>
<details>
<summary>
GetBlacklistReports
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetBlacklistReportsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetBlacklistReportsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetBlacklistReportsCommandOutput/)

</details>
<details>
<summary>
GetConfigurationSet
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetConfigurationSetCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetConfigurationSetCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetConfigurationSetCommandOutput/)

</details>
<details>
<summary>
GetConfigurationSetEventDestinations
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetConfigurationSetEventDestinationsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetConfigurationSetEventDestinationsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetConfigurationSetEventDestinationsCommandOutput/)

</details>
<details>
<summary>
GetContact
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetContactCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetContactCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetContactCommandOutput/)

</details>
<details>
<summary>
GetContactList
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetContactListCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetContactListCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetContactListCommandOutput/)

</details>
<details>
<summary>
GetCustomVerificationEmailTemplate
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetCustomVerificationEmailTemplateCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetCustomVerificationEmailTemplateCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetCustomVerificationEmailTemplateCommandOutput/)

</details>
<details>
<summary>
GetDedicatedIp
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetDedicatedIpCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetDedicatedIpCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetDedicatedIpCommandOutput/)

</details>
<details>
<summary>
GetDedicatedIpPool
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetDedicatedIpPoolCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetDedicatedIpPoolCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetDedicatedIpPoolCommandOutput/)

</details>
<details>
<summary>
GetDedicatedIps
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetDedicatedIpsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetDedicatedIpsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetDedicatedIpsCommandOutput/)

</details>
<details>
<summary>
GetDeliverabilityDashboardOptions
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetDeliverabilityDashboardOptionsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetDeliverabilityDashboardOptionsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetDeliverabilityDashboardOptionsCommandOutput/)

</details>
<details>
<summary>
GetDeliverabilityTestReport
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetDeliverabilityTestReportCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetDeliverabilityTestReportCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetDeliverabilityTestReportCommandOutput/)

</details>
<details>
<summary>
GetDomainDeliverabilityCampaign
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetDomainDeliverabilityCampaignCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetDomainDeliverabilityCampaignCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetDomainDeliverabilityCampaignCommandOutput/)

</details>
<details>
<summary>
GetDomainStatisticsReport
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetDomainStatisticsReportCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetDomainStatisticsReportCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetDomainStatisticsReportCommandOutput/)

</details>
<details>
<summary>
GetEmailIdentity
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetEmailIdentityCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetEmailIdentityCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetEmailIdentityCommandOutput/)

</details>
<details>
<summary>
GetEmailIdentityPolicies
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetEmailIdentityPoliciesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetEmailIdentityPoliciesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetEmailIdentityPoliciesCommandOutput/)

</details>
<details>
<summary>
GetEmailTemplate
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetEmailTemplateCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetEmailTemplateCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetEmailTemplateCommandOutput/)

</details>
<details>
<summary>
GetExportJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetExportJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetExportJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetExportJobCommandOutput/)

</details>
<details>
<summary>
GetImportJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetImportJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetImportJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetImportJobCommandOutput/)

</details>
<details>
<summary>
GetMessageInsights
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetMessageInsightsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetMessageInsightsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetMessageInsightsCommandOutput/)

</details>
<details>
<summary>
GetMultiRegionEndpoint
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetMultiRegionEndpointCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetMultiRegionEndpointCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetMultiRegionEndpointCommandOutput/)

</details>
<details>
<summary>
GetReputationEntity
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetReputationEntityCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetReputationEntityCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetReputationEntityCommandOutput/)

</details>
<details>
<summary>
GetSuppressedDestination
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetSuppressedDestinationCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetSuppressedDestinationCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetSuppressedDestinationCommandOutput/)

</details>
<details>
<summary>
GetTenant
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/GetTenantCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetTenantCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/GetTenantCommandOutput/)

</details>
<details>
<summary>
ListConfigurationSets
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/ListConfigurationSetsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListConfigurationSetsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListConfigurationSetsCommandOutput/)

</details>
<details>
<summary>
ListContactLists
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/ListContactListsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListContactListsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListContactListsCommandOutput/)

</details>
<details>
<summary>
ListContacts
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/ListContactsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListContactsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListContactsCommandOutput/)

</details>
<details>
<summary>
ListCustomVerificationEmailTemplates
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/ListCustomVerificationEmailTemplatesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListCustomVerificationEmailTemplatesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListCustomVerificationEmailTemplatesCommandOutput/)

</details>
<details>
<summary>
ListDedicatedIpPools
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/ListDedicatedIpPoolsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListDedicatedIpPoolsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListDedicatedIpPoolsCommandOutput/)

</details>
<details>
<summary>
ListDeliverabilityTestReports
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/ListDeliverabilityTestReportsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListDeliverabilityTestReportsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListDeliverabilityTestReportsCommandOutput/)

</details>
<details>
<summary>
ListDomainDeliverabilityCampaigns
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/ListDomainDeliverabilityCampaignsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListDomainDeliverabilityCampaignsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListDomainDeliverabilityCampaignsCommandOutput/)

</details>
<details>
<summary>
ListEmailIdentities
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/ListEmailIdentitiesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListEmailIdentitiesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListEmailIdentitiesCommandOutput/)

</details>
<details>
<summary>
ListEmailTemplates
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/ListEmailTemplatesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListEmailTemplatesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListEmailTemplatesCommandOutput/)

</details>
<details>
<summary>
ListExportJobs
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/ListExportJobsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListExportJobsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListExportJobsCommandOutput/)

</details>
<details>
<summary>
ListImportJobs
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/ListImportJobsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListImportJobsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListImportJobsCommandOutput/)

</details>
<details>
<summary>
ListMultiRegionEndpoints
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/ListMultiRegionEndpointsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListMultiRegionEndpointsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListMultiRegionEndpointsCommandOutput/)

</details>
<details>
<summary>
ListRecommendations
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/ListRecommendationsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListRecommendationsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListRecommendationsCommandOutput/)

</details>
<details>
<summary>
ListReputationEntities
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/ListReputationEntitiesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListReputationEntitiesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListReputationEntitiesCommandOutput/)

</details>
<details>
<summary>
ListResourceTenants
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/ListResourceTenantsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListResourceTenantsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListResourceTenantsCommandOutput/)

</details>
<details>
<summary>
ListSuppressedDestinations
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/ListSuppressedDestinationsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListSuppressedDestinationsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListSuppressedDestinationsCommandOutput/)

</details>
<details>
<summary>
ListTagsForResource
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/ListTagsForResourceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListTagsForResourceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListTagsForResourceCommandOutput/)

</details>
<details>
<summary>
ListTenantResources
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/ListTenantResourcesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListTenantResourcesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListTenantResourcesCommandOutput/)

</details>
<details>
<summary>
ListTenants
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/ListTenantsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListTenantsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/ListTenantsCommandOutput/)

</details>
<details>
<summary>
PutAccountDedicatedIpWarmupAttributes
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutAccountDedicatedIpWarmupAttributesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutAccountDedicatedIpWarmupAttributesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutAccountDedicatedIpWarmupAttributesCommandOutput/)

</details>
<details>
<summary>
PutAccountDetails
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutAccountDetailsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutAccountDetailsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutAccountDetailsCommandOutput/)

</details>
<details>
<summary>
PutAccountSendingAttributes
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutAccountSendingAttributesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutAccountSendingAttributesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutAccountSendingAttributesCommandOutput/)

</details>
<details>
<summary>
PutAccountSuppressionAttributes
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutAccountSuppressionAttributesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutAccountSuppressionAttributesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutAccountSuppressionAttributesCommandOutput/)

</details>
<details>
<summary>
PutAccountVdmAttributes
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutAccountVdmAttributesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutAccountVdmAttributesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutAccountVdmAttributesCommandOutput/)

</details>
<details>
<summary>
PutConfigurationSetArchivingOptions
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutConfigurationSetArchivingOptionsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutConfigurationSetArchivingOptionsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutConfigurationSetArchivingOptionsCommandOutput/)

</details>
<details>
<summary>
PutConfigurationSetDeliveryOptions
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutConfigurationSetDeliveryOptionsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutConfigurationSetDeliveryOptionsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutConfigurationSetDeliveryOptionsCommandOutput/)

</details>
<details>
<summary>
PutConfigurationSetReputationOptions
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutConfigurationSetReputationOptionsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutConfigurationSetReputationOptionsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutConfigurationSetReputationOptionsCommandOutput/)

</details>
<details>
<summary>
PutConfigurationSetSendingOptions
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutConfigurationSetSendingOptionsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutConfigurationSetSendingOptionsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutConfigurationSetSendingOptionsCommandOutput/)

</details>
<details>
<summary>
PutConfigurationSetSuppressionOptions
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutConfigurationSetSuppressionOptionsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutConfigurationSetSuppressionOptionsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutConfigurationSetSuppressionOptionsCommandOutput/)

</details>
<details>
<summary>
PutConfigurationSetTrackingOptions
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutConfigurationSetTrackingOptionsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutConfigurationSetTrackingOptionsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutConfigurationSetTrackingOptionsCommandOutput/)

</details>
<details>
<summary>
PutConfigurationSetVdmOptions
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutConfigurationSetVdmOptionsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutConfigurationSetVdmOptionsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutConfigurationSetVdmOptionsCommandOutput/)

</details>
<details>
<summary>
PutDedicatedIpInPool
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutDedicatedIpInPoolCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutDedicatedIpInPoolCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutDedicatedIpInPoolCommandOutput/)

</details>
<details>
<summary>
PutDedicatedIpPoolScalingAttributes
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutDedicatedIpPoolScalingAttributesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutDedicatedIpPoolScalingAttributesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutDedicatedIpPoolScalingAttributesCommandOutput/)

</details>
<details>
<summary>
PutDedicatedIpWarmupAttributes
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutDedicatedIpWarmupAttributesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutDedicatedIpWarmupAttributesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutDedicatedIpWarmupAttributesCommandOutput/)

</details>
<details>
<summary>
PutDeliverabilityDashboardOption
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutDeliverabilityDashboardOptionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutDeliverabilityDashboardOptionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutDeliverabilityDashboardOptionCommandOutput/)

</details>
<details>
<summary>
PutEmailIdentityConfigurationSetAttributes
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutEmailIdentityConfigurationSetAttributesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutEmailIdentityConfigurationSetAttributesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutEmailIdentityConfigurationSetAttributesCommandOutput/)

</details>
<details>
<summary>
PutEmailIdentityDkimAttributes
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutEmailIdentityDkimAttributesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutEmailIdentityDkimAttributesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutEmailIdentityDkimAttributesCommandOutput/)

</details>
<details>
<summary>
PutEmailIdentityDkimSigningAttributes
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutEmailIdentityDkimSigningAttributesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutEmailIdentityDkimSigningAttributesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutEmailIdentityDkimSigningAttributesCommandOutput/)

</details>
<details>
<summary>
PutEmailIdentityFeedbackAttributes
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutEmailIdentityFeedbackAttributesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutEmailIdentityFeedbackAttributesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutEmailIdentityFeedbackAttributesCommandOutput/)

</details>
<details>
<summary>
PutEmailIdentityMailFromAttributes
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutEmailIdentityMailFromAttributesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutEmailIdentityMailFromAttributesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutEmailIdentityMailFromAttributesCommandOutput/)

</details>
<details>
<summary>
PutSuppressedDestination
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/PutSuppressedDestinationCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutSuppressedDestinationCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/PutSuppressedDestinationCommandOutput/)

</details>
<details>
<summary>
SendBulkEmail
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/SendBulkEmailCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/SendBulkEmailCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/SendBulkEmailCommandOutput/)

</details>
<details>
<summary>
SendCustomVerificationEmail
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/SendCustomVerificationEmailCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/SendCustomVerificationEmailCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/SendCustomVerificationEmailCommandOutput/)

</details>
<details>
<summary>
SendEmail
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/SendEmailCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/SendEmailCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/SendEmailCommandOutput/)

</details>
<details>
<summary>
TagResource
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/TagResourceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/TagResourceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/TagResourceCommandOutput/)

</details>
<details>
<summary>
TestRenderEmailTemplate
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/TestRenderEmailTemplateCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/TestRenderEmailTemplateCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/TestRenderEmailTemplateCommandOutput/)

</details>
<details>
<summary>
UntagResource
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/UntagResourceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/UntagResourceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/UntagResourceCommandOutput/)

</details>
<details>
<summary>
UpdateConfigurationSetEventDestination
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/UpdateConfigurationSetEventDestinationCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/UpdateConfigurationSetEventDestinationCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/UpdateConfigurationSetEventDestinationCommandOutput/)

</details>
<details>
<summary>
UpdateContact
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/UpdateContactCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/UpdateContactCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/UpdateContactCommandOutput/)

</details>
<details>
<summary>
UpdateContactList
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/UpdateContactListCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/UpdateContactListCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/UpdateContactListCommandOutput/)

</details>
<details>
<summary>
UpdateCustomVerificationEmailTemplate
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/UpdateCustomVerificationEmailTemplateCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/UpdateCustomVerificationEmailTemplateCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/UpdateCustomVerificationEmailTemplateCommandOutput/)

</details>
<details>
<summary>
UpdateEmailIdentityPolicy
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/UpdateEmailIdentityPolicyCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/UpdateEmailIdentityPolicyCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/UpdateEmailIdentityPolicyCommandOutput/)

</details>
<details>
<summary>
UpdateEmailTemplate
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/UpdateEmailTemplateCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/UpdateEmailTemplateCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/UpdateEmailTemplateCommandOutput/)

</details>
<details>
<summary>
UpdateReputationEntityCustomerManagedStatus
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/UpdateReputationEntityCustomerManagedStatusCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/UpdateReputationEntityCustomerManagedStatusCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/UpdateReputationEntityCustomerManagedStatusCommandOutput/)

</details>
<details>
<summary>
UpdateReputationEntityPolicy
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/UpdateReputationEntityPolicyCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/UpdateReputationEntityPolicyCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sesv2/Interface/UpdateReputationEntityPolicyCommandOutput/)

</details>
