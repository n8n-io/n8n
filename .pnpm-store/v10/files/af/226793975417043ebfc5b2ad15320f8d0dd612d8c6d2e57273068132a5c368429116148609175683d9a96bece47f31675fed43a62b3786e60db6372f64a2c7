<!-- generated file, do not edit directly -->

# @aws-sdk/client-sagemaker

## Description

AWS SDK for JavaScript SageMaker Client for Node.js, Browser and React Native.

<p>Provides APIs for creating and managing SageMaker resources. </p> <p>Other Resources:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/whatis.html#first-time-user">SageMaker Developer Guide</a> </p> </li> <li> <p> <a href="https://docs.aws.amazon.com/augmented-ai/2019-11-07/APIReference/Welcome.html">Amazon Augmented AI Runtime API Reference</a> </p> </li> </ul>

## Installing

To install this package, simply type add or install @aws-sdk/client-sagemaker
using your favorite package manager:

- `npm install @aws-sdk/client-sagemaker`
- `yarn add @aws-sdk/client-sagemaker`
- `pnpm add @aws-sdk/client-sagemaker`

## Getting Started

### Import

The AWS SDK is modulized by clients and commands.
To send a request, you only need to import the `SageMakerClient` and
the commands you need, for example `ListActionsCommand`:

```js
// ES5 example
const { SageMakerClient, ListActionsCommand } = require("@aws-sdk/client-sagemaker");
```

```ts
// ES6+ example
import { SageMakerClient, ListActionsCommand } from "@aws-sdk/client-sagemaker";
```

### Usage

To send a request, you:

- Initiate client with configuration (e.g. credentials, region).
- Initiate command with input parameters.
- Call `send` operation on client with command object as input.
- If you are using a custom http handler, you may call `destroy()` to close open connections.

```js
// a client can be shared by different commands.
const client = new SageMakerClient({ region: "REGION" });

const params = {
  /** input parameters */
};
const command = new ListActionsCommand(params);
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
import * as AWS from "@aws-sdk/client-sagemaker";
const client = new AWS.SageMaker({ region: "REGION" });

// async/await.
try {
  const data = await client.listActions(params);
  // process data.
} catch (error) {
  // error handling.
}

// Promises.
client
  .listActions(params)
  .then((data) => {
    // process data.
  })
  .catch((error) => {
    // error handling.
  });

// callbacks.
client.listActions(params, (err, data) => {
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

This client code is generated automatically. Any modifications will be overwritten the next time the `@aws-sdk/client-sagemaker` package is updated.
To contribute to client you can check our [generate clients scripts](https://github.com/aws/aws-sdk-js-v3/tree/main/scripts/generate-clients).

## License

This SDK is distributed under the
[Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0),
see LICENSE for more information.

## Client Commands (Operations List)

<details>
<summary>
AddAssociation
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/AddAssociationCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/AddAssociationCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/AddAssociationCommandOutput/)

</details>
<details>
<summary>
AddTags
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/AddTagsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/AddTagsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/AddTagsCommandOutput/)

</details>
<details>
<summary>
AssociateTrialComponent
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/AssociateTrialComponentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/AssociateTrialComponentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/AssociateTrialComponentCommandOutput/)

</details>
<details>
<summary>
BatchDeleteClusterNodes
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/BatchDeleteClusterNodesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/BatchDeleteClusterNodesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/BatchDeleteClusterNodesCommandOutput/)

</details>
<details>
<summary>
BatchDescribeModelPackage
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/BatchDescribeModelPackageCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/BatchDescribeModelPackageCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/BatchDescribeModelPackageCommandOutput/)

</details>
<details>
<summary>
CreateAction
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateActionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateActionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateActionCommandOutput/)

</details>
<details>
<summary>
CreateAlgorithm
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateAlgorithmCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateAlgorithmCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateAlgorithmCommandOutput/)

</details>
<details>
<summary>
CreateApp
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateAppCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateAppCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateAppCommandOutput/)

</details>
<details>
<summary>
CreateAppImageConfig
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateAppImageConfigCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateAppImageConfigCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateAppImageConfigCommandOutput/)

</details>
<details>
<summary>
CreateArtifact
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateArtifactCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateArtifactCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateArtifactCommandOutput/)

</details>
<details>
<summary>
CreateAutoMLJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateAutoMLJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateAutoMLJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateAutoMLJobCommandOutput/)

</details>
<details>
<summary>
CreateAutoMLJobV2
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateAutoMLJobV2Command/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateAutoMLJobV2CommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateAutoMLJobV2CommandOutput/)

</details>
<details>
<summary>
CreateCluster
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateClusterCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateClusterCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateClusterCommandOutput/)

</details>
<details>
<summary>
CreateClusterSchedulerConfig
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateClusterSchedulerConfigCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateClusterSchedulerConfigCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateClusterSchedulerConfigCommandOutput/)

</details>
<details>
<summary>
CreateCodeRepository
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateCodeRepositoryCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateCodeRepositoryCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateCodeRepositoryCommandOutput/)

</details>
<details>
<summary>
CreateCompilationJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateCompilationJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateCompilationJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateCompilationJobCommandOutput/)

</details>
<details>
<summary>
CreateComputeQuota
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateComputeQuotaCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateComputeQuotaCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateComputeQuotaCommandOutput/)

</details>
<details>
<summary>
CreateContext
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateContextCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateContextCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateContextCommandOutput/)

</details>
<details>
<summary>
CreateDataQualityJobDefinition
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateDataQualityJobDefinitionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateDataQualityJobDefinitionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateDataQualityJobDefinitionCommandOutput/)

</details>
<details>
<summary>
CreateDeviceFleet
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateDeviceFleetCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateDeviceFleetCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateDeviceFleetCommandOutput/)

</details>
<details>
<summary>
CreateDomain
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateDomainCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateDomainCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateDomainCommandOutput/)

</details>
<details>
<summary>
CreateEdgeDeploymentPlan
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateEdgeDeploymentPlanCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateEdgeDeploymentPlanCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateEdgeDeploymentPlanCommandOutput/)

</details>
<details>
<summary>
CreateEdgeDeploymentStage
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateEdgeDeploymentStageCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateEdgeDeploymentStageCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateEdgeDeploymentStageCommandOutput/)

</details>
<details>
<summary>
CreateEdgePackagingJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateEdgePackagingJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateEdgePackagingJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateEdgePackagingJobCommandOutput/)

</details>
<details>
<summary>
CreateEndpoint
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateEndpointCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateEndpointCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateEndpointCommandOutput/)

</details>
<details>
<summary>
CreateEndpointConfig
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateEndpointConfigCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateEndpointConfigCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateEndpointConfigCommandOutput/)

</details>
<details>
<summary>
CreateExperiment
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateExperimentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateExperimentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateExperimentCommandOutput/)

</details>
<details>
<summary>
CreateFeatureGroup
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateFeatureGroupCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateFeatureGroupCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateFeatureGroupCommandOutput/)

</details>
<details>
<summary>
CreateFlowDefinition
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateFlowDefinitionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateFlowDefinitionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateFlowDefinitionCommandOutput/)

</details>
<details>
<summary>
CreateHub
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateHubCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateHubCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateHubCommandOutput/)

</details>
<details>
<summary>
CreateHubContentReference
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateHubContentReferenceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateHubContentReferenceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateHubContentReferenceCommandOutput/)

</details>
<details>
<summary>
CreateHumanTaskUi
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateHumanTaskUiCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateHumanTaskUiCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateHumanTaskUiCommandOutput/)

</details>
<details>
<summary>
CreateHyperParameterTuningJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateHyperParameterTuningJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateHyperParameterTuningJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateHyperParameterTuningJobCommandOutput/)

</details>
<details>
<summary>
CreateImage
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateImageCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateImageCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateImageCommandOutput/)

</details>
<details>
<summary>
CreateImageVersion
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateImageVersionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateImageVersionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateImageVersionCommandOutput/)

</details>
<details>
<summary>
CreateInferenceComponent
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateInferenceComponentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateInferenceComponentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateInferenceComponentCommandOutput/)

</details>
<details>
<summary>
CreateInferenceExperiment
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateInferenceExperimentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateInferenceExperimentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateInferenceExperimentCommandOutput/)

</details>
<details>
<summary>
CreateInferenceRecommendationsJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateInferenceRecommendationsJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateInferenceRecommendationsJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateInferenceRecommendationsJobCommandOutput/)

</details>
<details>
<summary>
CreateLabelingJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateLabelingJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateLabelingJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateLabelingJobCommandOutput/)

</details>
<details>
<summary>
CreateMlflowTrackingServer
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateMlflowTrackingServerCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateMlflowTrackingServerCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateMlflowTrackingServerCommandOutput/)

</details>
<details>
<summary>
CreateModel
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateModelCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateModelCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateModelCommandOutput/)

</details>
<details>
<summary>
CreateModelBiasJobDefinition
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateModelBiasJobDefinitionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateModelBiasJobDefinitionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateModelBiasJobDefinitionCommandOutput/)

</details>
<details>
<summary>
CreateModelCard
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateModelCardCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateModelCardCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateModelCardCommandOutput/)

</details>
<details>
<summary>
CreateModelCardExportJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateModelCardExportJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateModelCardExportJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateModelCardExportJobCommandOutput/)

</details>
<details>
<summary>
CreateModelExplainabilityJobDefinition
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateModelExplainabilityJobDefinitionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateModelExplainabilityJobDefinitionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateModelExplainabilityJobDefinitionCommandOutput/)

</details>
<details>
<summary>
CreateModelPackage
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateModelPackageCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateModelPackageCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateModelPackageCommandOutput/)

</details>
<details>
<summary>
CreateModelPackageGroup
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateModelPackageGroupCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateModelPackageGroupCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateModelPackageGroupCommandOutput/)

</details>
<details>
<summary>
CreateModelQualityJobDefinition
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateModelQualityJobDefinitionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateModelQualityJobDefinitionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateModelQualityJobDefinitionCommandOutput/)

</details>
<details>
<summary>
CreateMonitoringSchedule
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateMonitoringScheduleCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateMonitoringScheduleCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateMonitoringScheduleCommandOutput/)

</details>
<details>
<summary>
CreateNotebookInstance
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateNotebookInstanceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateNotebookInstanceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateNotebookInstanceCommandOutput/)

</details>
<details>
<summary>
CreateNotebookInstanceLifecycleConfig
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateNotebookInstanceLifecycleConfigCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateNotebookInstanceLifecycleConfigCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateNotebookInstanceLifecycleConfigCommandOutput/)

</details>
<details>
<summary>
CreateOptimizationJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateOptimizationJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateOptimizationJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateOptimizationJobCommandOutput/)

</details>
<details>
<summary>
CreatePartnerApp
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreatePartnerAppCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreatePartnerAppCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreatePartnerAppCommandOutput/)

</details>
<details>
<summary>
CreatePartnerAppPresignedUrl
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreatePartnerAppPresignedUrlCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreatePartnerAppPresignedUrlCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreatePartnerAppPresignedUrlCommandOutput/)

</details>
<details>
<summary>
CreatePipeline
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreatePipelineCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreatePipelineCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreatePipelineCommandOutput/)

</details>
<details>
<summary>
CreatePresignedDomainUrl
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreatePresignedDomainUrlCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreatePresignedDomainUrlCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreatePresignedDomainUrlCommandOutput/)

</details>
<details>
<summary>
CreatePresignedMlflowTrackingServerUrl
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreatePresignedMlflowTrackingServerUrlCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreatePresignedMlflowTrackingServerUrlCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreatePresignedMlflowTrackingServerUrlCommandOutput/)

</details>
<details>
<summary>
CreatePresignedNotebookInstanceUrl
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreatePresignedNotebookInstanceUrlCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreatePresignedNotebookInstanceUrlCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreatePresignedNotebookInstanceUrlCommandOutput/)

</details>
<details>
<summary>
CreateProcessingJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateProcessingJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateProcessingJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateProcessingJobCommandOutput/)

</details>
<details>
<summary>
CreateProject
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateProjectCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateProjectCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateProjectCommandOutput/)

</details>
<details>
<summary>
CreateSpace
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateSpaceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateSpaceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateSpaceCommandOutput/)

</details>
<details>
<summary>
CreateStudioLifecycleConfig
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateStudioLifecycleConfigCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateStudioLifecycleConfigCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateStudioLifecycleConfigCommandOutput/)

</details>
<details>
<summary>
CreateTrainingJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateTrainingJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateTrainingJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateTrainingJobCommandOutput/)

</details>
<details>
<summary>
CreateTrainingPlan
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateTrainingPlanCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateTrainingPlanCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateTrainingPlanCommandOutput/)

</details>
<details>
<summary>
CreateTransformJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateTransformJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateTransformJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateTransformJobCommandOutput/)

</details>
<details>
<summary>
CreateTrial
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateTrialCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateTrialCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateTrialCommandOutput/)

</details>
<details>
<summary>
CreateTrialComponent
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateTrialComponentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateTrialComponentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateTrialComponentCommandOutput/)

</details>
<details>
<summary>
CreateUserProfile
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateUserProfileCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateUserProfileCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateUserProfileCommandOutput/)

</details>
<details>
<summary>
CreateWorkforce
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateWorkforceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateWorkforceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateWorkforceCommandOutput/)

</details>
<details>
<summary>
CreateWorkteam
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/CreateWorkteamCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateWorkteamCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/CreateWorkteamCommandOutput/)

</details>
<details>
<summary>
DeleteAction
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteActionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteActionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteActionCommandOutput/)

</details>
<details>
<summary>
DeleteAlgorithm
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteAlgorithmCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteAlgorithmCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteAlgorithmCommandOutput/)

</details>
<details>
<summary>
DeleteApp
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteAppCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteAppCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteAppCommandOutput/)

</details>
<details>
<summary>
DeleteAppImageConfig
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteAppImageConfigCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteAppImageConfigCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteAppImageConfigCommandOutput/)

</details>
<details>
<summary>
DeleteArtifact
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteArtifactCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteArtifactCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteArtifactCommandOutput/)

</details>
<details>
<summary>
DeleteAssociation
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteAssociationCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteAssociationCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteAssociationCommandOutput/)

</details>
<details>
<summary>
DeleteCluster
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteClusterCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteClusterCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteClusterCommandOutput/)

</details>
<details>
<summary>
DeleteClusterSchedulerConfig
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteClusterSchedulerConfigCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteClusterSchedulerConfigCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteClusterSchedulerConfigCommandOutput/)

</details>
<details>
<summary>
DeleteCodeRepository
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteCodeRepositoryCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteCodeRepositoryCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteCodeRepositoryCommandOutput/)

</details>
<details>
<summary>
DeleteCompilationJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteCompilationJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteCompilationJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteCompilationJobCommandOutput/)

</details>
<details>
<summary>
DeleteComputeQuota
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteComputeQuotaCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteComputeQuotaCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteComputeQuotaCommandOutput/)

</details>
<details>
<summary>
DeleteContext
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteContextCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteContextCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteContextCommandOutput/)

</details>
<details>
<summary>
DeleteDataQualityJobDefinition
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteDataQualityJobDefinitionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteDataQualityJobDefinitionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteDataQualityJobDefinitionCommandOutput/)

</details>
<details>
<summary>
DeleteDeviceFleet
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteDeviceFleetCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteDeviceFleetCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteDeviceFleetCommandOutput/)

</details>
<details>
<summary>
DeleteDomain
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteDomainCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteDomainCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteDomainCommandOutput/)

</details>
<details>
<summary>
DeleteEdgeDeploymentPlan
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteEdgeDeploymentPlanCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteEdgeDeploymentPlanCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteEdgeDeploymentPlanCommandOutput/)

</details>
<details>
<summary>
DeleteEdgeDeploymentStage
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteEdgeDeploymentStageCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteEdgeDeploymentStageCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteEdgeDeploymentStageCommandOutput/)

</details>
<details>
<summary>
DeleteEndpoint
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteEndpointCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteEndpointCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteEndpointCommandOutput/)

</details>
<details>
<summary>
DeleteEndpointConfig
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteEndpointConfigCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteEndpointConfigCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteEndpointConfigCommandOutput/)

</details>
<details>
<summary>
DeleteExperiment
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteExperimentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteExperimentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteExperimentCommandOutput/)

</details>
<details>
<summary>
DeleteFeatureGroup
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteFeatureGroupCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteFeatureGroupCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteFeatureGroupCommandOutput/)

</details>
<details>
<summary>
DeleteFlowDefinition
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteFlowDefinitionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteFlowDefinitionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteFlowDefinitionCommandOutput/)

</details>
<details>
<summary>
DeleteHub
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteHubCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteHubCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteHubCommandOutput/)

</details>
<details>
<summary>
DeleteHubContent
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteHubContentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteHubContentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteHubContentCommandOutput/)

</details>
<details>
<summary>
DeleteHubContentReference
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteHubContentReferenceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteHubContentReferenceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteHubContentReferenceCommandOutput/)

</details>
<details>
<summary>
DeleteHumanTaskUi
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteHumanTaskUiCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteHumanTaskUiCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteHumanTaskUiCommandOutput/)

</details>
<details>
<summary>
DeleteHyperParameterTuningJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteHyperParameterTuningJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteHyperParameterTuningJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteHyperParameterTuningJobCommandOutput/)

</details>
<details>
<summary>
DeleteImage
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteImageCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteImageCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteImageCommandOutput/)

</details>
<details>
<summary>
DeleteImageVersion
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteImageVersionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteImageVersionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteImageVersionCommandOutput/)

</details>
<details>
<summary>
DeleteInferenceComponent
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteInferenceComponentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteInferenceComponentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteInferenceComponentCommandOutput/)

</details>
<details>
<summary>
DeleteInferenceExperiment
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteInferenceExperimentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteInferenceExperimentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteInferenceExperimentCommandOutput/)

</details>
<details>
<summary>
DeleteMlflowTrackingServer
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteMlflowTrackingServerCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteMlflowTrackingServerCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteMlflowTrackingServerCommandOutput/)

</details>
<details>
<summary>
DeleteModel
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteModelCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteModelCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteModelCommandOutput/)

</details>
<details>
<summary>
DeleteModelBiasJobDefinition
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteModelBiasJobDefinitionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteModelBiasJobDefinitionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteModelBiasJobDefinitionCommandOutput/)

</details>
<details>
<summary>
DeleteModelCard
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteModelCardCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteModelCardCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteModelCardCommandOutput/)

</details>
<details>
<summary>
DeleteModelExplainabilityJobDefinition
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteModelExplainabilityJobDefinitionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteModelExplainabilityJobDefinitionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteModelExplainabilityJobDefinitionCommandOutput/)

</details>
<details>
<summary>
DeleteModelPackage
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteModelPackageCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteModelPackageCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteModelPackageCommandOutput/)

</details>
<details>
<summary>
DeleteModelPackageGroup
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteModelPackageGroupCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteModelPackageGroupCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteModelPackageGroupCommandOutput/)

</details>
<details>
<summary>
DeleteModelPackageGroupPolicy
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteModelPackageGroupPolicyCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteModelPackageGroupPolicyCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteModelPackageGroupPolicyCommandOutput/)

</details>
<details>
<summary>
DeleteModelQualityJobDefinition
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteModelQualityJobDefinitionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteModelQualityJobDefinitionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteModelQualityJobDefinitionCommandOutput/)

</details>
<details>
<summary>
DeleteMonitoringSchedule
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteMonitoringScheduleCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteMonitoringScheduleCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteMonitoringScheduleCommandOutput/)

</details>
<details>
<summary>
DeleteNotebookInstance
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteNotebookInstanceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteNotebookInstanceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteNotebookInstanceCommandOutput/)

</details>
<details>
<summary>
DeleteNotebookInstanceLifecycleConfig
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteNotebookInstanceLifecycleConfigCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteNotebookInstanceLifecycleConfigCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteNotebookInstanceLifecycleConfigCommandOutput/)

</details>
<details>
<summary>
DeleteOptimizationJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteOptimizationJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteOptimizationJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteOptimizationJobCommandOutput/)

</details>
<details>
<summary>
DeletePartnerApp
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeletePartnerAppCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeletePartnerAppCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeletePartnerAppCommandOutput/)

</details>
<details>
<summary>
DeletePipeline
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeletePipelineCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeletePipelineCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeletePipelineCommandOutput/)

</details>
<details>
<summary>
DeleteProject
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteProjectCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteProjectCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteProjectCommandOutput/)

</details>
<details>
<summary>
DeleteSpace
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteSpaceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteSpaceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteSpaceCommandOutput/)

</details>
<details>
<summary>
DeleteStudioLifecycleConfig
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteStudioLifecycleConfigCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteStudioLifecycleConfigCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteStudioLifecycleConfigCommandOutput/)

</details>
<details>
<summary>
DeleteTags
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteTagsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteTagsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteTagsCommandOutput/)

</details>
<details>
<summary>
DeleteTrial
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteTrialCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteTrialCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteTrialCommandOutput/)

</details>
<details>
<summary>
DeleteTrialComponent
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteTrialComponentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteTrialComponentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteTrialComponentCommandOutput/)

</details>
<details>
<summary>
DeleteUserProfile
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteUserProfileCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteUserProfileCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteUserProfileCommandOutput/)

</details>
<details>
<summary>
DeleteWorkforce
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteWorkforceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteWorkforceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteWorkforceCommandOutput/)

</details>
<details>
<summary>
DeleteWorkteam
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeleteWorkteamCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteWorkteamCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeleteWorkteamCommandOutput/)

</details>
<details>
<summary>
DeregisterDevices
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DeregisterDevicesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeregisterDevicesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DeregisterDevicesCommandOutput/)

</details>
<details>
<summary>
DescribeAction
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeActionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeActionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeActionCommandOutput/)

</details>
<details>
<summary>
DescribeAlgorithm
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeAlgorithmCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeAlgorithmCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeAlgorithmCommandOutput/)

</details>
<details>
<summary>
DescribeApp
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeAppCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeAppCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeAppCommandOutput/)

</details>
<details>
<summary>
DescribeAppImageConfig
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeAppImageConfigCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeAppImageConfigCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeAppImageConfigCommandOutput/)

</details>
<details>
<summary>
DescribeArtifact
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeArtifactCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeArtifactCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeArtifactCommandOutput/)

</details>
<details>
<summary>
DescribeAutoMLJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeAutoMLJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeAutoMLJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeAutoMLJobCommandOutput/)

</details>
<details>
<summary>
DescribeAutoMLJobV2
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeAutoMLJobV2Command/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeAutoMLJobV2CommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeAutoMLJobV2CommandOutput/)

</details>
<details>
<summary>
DescribeCluster
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeClusterCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeClusterCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeClusterCommandOutput/)

</details>
<details>
<summary>
DescribeClusterNode
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeClusterNodeCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeClusterNodeCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeClusterNodeCommandOutput/)

</details>
<details>
<summary>
DescribeClusterSchedulerConfig
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeClusterSchedulerConfigCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeClusterSchedulerConfigCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeClusterSchedulerConfigCommandOutput/)

</details>
<details>
<summary>
DescribeCodeRepository
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeCodeRepositoryCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeCodeRepositoryCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeCodeRepositoryCommandOutput/)

</details>
<details>
<summary>
DescribeCompilationJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeCompilationJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeCompilationJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeCompilationJobCommandOutput/)

</details>
<details>
<summary>
DescribeComputeQuota
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeComputeQuotaCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeComputeQuotaCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeComputeQuotaCommandOutput/)

</details>
<details>
<summary>
DescribeContext
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeContextCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeContextCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeContextCommandOutput/)

</details>
<details>
<summary>
DescribeDataQualityJobDefinition
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeDataQualityJobDefinitionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeDataQualityJobDefinitionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeDataQualityJobDefinitionCommandOutput/)

</details>
<details>
<summary>
DescribeDevice
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeDeviceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeDeviceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeDeviceCommandOutput/)

</details>
<details>
<summary>
DescribeDeviceFleet
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeDeviceFleetCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeDeviceFleetCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeDeviceFleetCommandOutput/)

</details>
<details>
<summary>
DescribeDomain
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeDomainCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeDomainCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeDomainCommandOutput/)

</details>
<details>
<summary>
DescribeEdgeDeploymentPlan
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeEdgeDeploymentPlanCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeEdgeDeploymentPlanCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeEdgeDeploymentPlanCommandOutput/)

</details>
<details>
<summary>
DescribeEdgePackagingJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeEdgePackagingJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeEdgePackagingJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeEdgePackagingJobCommandOutput/)

</details>
<details>
<summary>
DescribeEndpoint
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeEndpointCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeEndpointCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeEndpointCommandOutput/)

</details>
<details>
<summary>
DescribeEndpointConfig
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeEndpointConfigCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeEndpointConfigCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeEndpointConfigCommandOutput/)

</details>
<details>
<summary>
DescribeExperiment
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeExperimentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeExperimentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeExperimentCommandOutput/)

</details>
<details>
<summary>
DescribeFeatureGroup
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeFeatureGroupCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeFeatureGroupCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeFeatureGroupCommandOutput/)

</details>
<details>
<summary>
DescribeFeatureMetadata
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeFeatureMetadataCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeFeatureMetadataCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeFeatureMetadataCommandOutput/)

</details>
<details>
<summary>
DescribeFlowDefinition
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeFlowDefinitionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeFlowDefinitionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeFlowDefinitionCommandOutput/)

</details>
<details>
<summary>
DescribeHub
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeHubCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeHubCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeHubCommandOutput/)

</details>
<details>
<summary>
DescribeHubContent
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeHubContentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeHubContentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeHubContentCommandOutput/)

</details>
<details>
<summary>
DescribeHumanTaskUi
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeHumanTaskUiCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeHumanTaskUiCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeHumanTaskUiCommandOutput/)

</details>
<details>
<summary>
DescribeHyperParameterTuningJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeHyperParameterTuningJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeHyperParameterTuningJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeHyperParameterTuningJobCommandOutput/)

</details>
<details>
<summary>
DescribeImage
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeImageCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeImageCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeImageCommandOutput/)

</details>
<details>
<summary>
DescribeImageVersion
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeImageVersionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeImageVersionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeImageVersionCommandOutput/)

</details>
<details>
<summary>
DescribeInferenceComponent
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeInferenceComponentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeInferenceComponentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeInferenceComponentCommandOutput/)

</details>
<details>
<summary>
DescribeInferenceExperiment
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeInferenceExperimentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeInferenceExperimentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeInferenceExperimentCommandOutput/)

</details>
<details>
<summary>
DescribeInferenceRecommendationsJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeInferenceRecommendationsJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeInferenceRecommendationsJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeInferenceRecommendationsJobCommandOutput/)

</details>
<details>
<summary>
DescribeLabelingJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeLabelingJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeLabelingJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeLabelingJobCommandOutput/)

</details>
<details>
<summary>
DescribeLineageGroup
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeLineageGroupCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeLineageGroupCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeLineageGroupCommandOutput/)

</details>
<details>
<summary>
DescribeMlflowTrackingServer
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeMlflowTrackingServerCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeMlflowTrackingServerCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeMlflowTrackingServerCommandOutput/)

</details>
<details>
<summary>
DescribeModel
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeModelCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeModelCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeModelCommandOutput/)

</details>
<details>
<summary>
DescribeModelBiasJobDefinition
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeModelBiasJobDefinitionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeModelBiasJobDefinitionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeModelBiasJobDefinitionCommandOutput/)

</details>
<details>
<summary>
DescribeModelCard
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeModelCardCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeModelCardCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeModelCardCommandOutput/)

</details>
<details>
<summary>
DescribeModelCardExportJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeModelCardExportJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeModelCardExportJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeModelCardExportJobCommandOutput/)

</details>
<details>
<summary>
DescribeModelExplainabilityJobDefinition
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeModelExplainabilityJobDefinitionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeModelExplainabilityJobDefinitionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeModelExplainabilityJobDefinitionCommandOutput/)

</details>
<details>
<summary>
DescribeModelPackage
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeModelPackageCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeModelPackageCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeModelPackageCommandOutput/)

</details>
<details>
<summary>
DescribeModelPackageGroup
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeModelPackageGroupCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeModelPackageGroupCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeModelPackageGroupCommandOutput/)

</details>
<details>
<summary>
DescribeModelQualityJobDefinition
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeModelQualityJobDefinitionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeModelQualityJobDefinitionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeModelQualityJobDefinitionCommandOutput/)

</details>
<details>
<summary>
DescribeMonitoringSchedule
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeMonitoringScheduleCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeMonitoringScheduleCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeMonitoringScheduleCommandOutput/)

</details>
<details>
<summary>
DescribeNotebookInstance
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeNotebookInstanceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeNotebookInstanceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeNotebookInstanceCommandOutput/)

</details>
<details>
<summary>
DescribeNotebookInstanceLifecycleConfig
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeNotebookInstanceLifecycleConfigCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeNotebookInstanceLifecycleConfigCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeNotebookInstanceLifecycleConfigCommandOutput/)

</details>
<details>
<summary>
DescribeOptimizationJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeOptimizationJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeOptimizationJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeOptimizationJobCommandOutput/)

</details>
<details>
<summary>
DescribePartnerApp
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribePartnerAppCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribePartnerAppCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribePartnerAppCommandOutput/)

</details>
<details>
<summary>
DescribePipeline
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribePipelineCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribePipelineCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribePipelineCommandOutput/)

</details>
<details>
<summary>
DescribePipelineDefinitionForExecution
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribePipelineDefinitionForExecutionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribePipelineDefinitionForExecutionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribePipelineDefinitionForExecutionCommandOutput/)

</details>
<details>
<summary>
DescribePipelineExecution
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribePipelineExecutionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribePipelineExecutionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribePipelineExecutionCommandOutput/)

</details>
<details>
<summary>
DescribeProcessingJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeProcessingJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeProcessingJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeProcessingJobCommandOutput/)

</details>
<details>
<summary>
DescribeProject
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeProjectCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeProjectCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeProjectCommandOutput/)

</details>
<details>
<summary>
DescribeSpace
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeSpaceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeSpaceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeSpaceCommandOutput/)

</details>
<details>
<summary>
DescribeStudioLifecycleConfig
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeStudioLifecycleConfigCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeStudioLifecycleConfigCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeStudioLifecycleConfigCommandOutput/)

</details>
<details>
<summary>
DescribeSubscribedWorkteam
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeSubscribedWorkteamCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeSubscribedWorkteamCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeSubscribedWorkteamCommandOutput/)

</details>
<details>
<summary>
DescribeTrainingJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeTrainingJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeTrainingJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeTrainingJobCommandOutput/)

</details>
<details>
<summary>
DescribeTrainingPlan
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeTrainingPlanCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeTrainingPlanCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeTrainingPlanCommandOutput/)

</details>
<details>
<summary>
DescribeTransformJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeTransformJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeTransformJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeTransformJobCommandOutput/)

</details>
<details>
<summary>
DescribeTrial
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeTrialCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeTrialCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeTrialCommandOutput/)

</details>
<details>
<summary>
DescribeTrialComponent
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeTrialComponentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeTrialComponentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeTrialComponentCommandOutput/)

</details>
<details>
<summary>
DescribeUserProfile
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeUserProfileCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeUserProfileCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeUserProfileCommandOutput/)

</details>
<details>
<summary>
DescribeWorkforce
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeWorkforceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeWorkforceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeWorkforceCommandOutput/)

</details>
<details>
<summary>
DescribeWorkteam
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DescribeWorkteamCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeWorkteamCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DescribeWorkteamCommandOutput/)

</details>
<details>
<summary>
DisableSagemakerServicecatalogPortfolio
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DisableSagemakerServicecatalogPortfolioCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DisableSagemakerServicecatalogPortfolioCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DisableSagemakerServicecatalogPortfolioCommandOutput/)

</details>
<details>
<summary>
DisassociateTrialComponent
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/DisassociateTrialComponentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DisassociateTrialComponentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/DisassociateTrialComponentCommandOutput/)

</details>
<details>
<summary>
EnableSagemakerServicecatalogPortfolio
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/EnableSagemakerServicecatalogPortfolioCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/EnableSagemakerServicecatalogPortfolioCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/EnableSagemakerServicecatalogPortfolioCommandOutput/)

</details>
<details>
<summary>
GetDeviceFleetReport
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/GetDeviceFleetReportCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/GetDeviceFleetReportCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/GetDeviceFleetReportCommandOutput/)

</details>
<details>
<summary>
GetLineageGroupPolicy
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/GetLineageGroupPolicyCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/GetLineageGroupPolicyCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/GetLineageGroupPolicyCommandOutput/)

</details>
<details>
<summary>
GetModelPackageGroupPolicy
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/GetModelPackageGroupPolicyCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/GetModelPackageGroupPolicyCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/GetModelPackageGroupPolicyCommandOutput/)

</details>
<details>
<summary>
GetSagemakerServicecatalogPortfolioStatus
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/GetSagemakerServicecatalogPortfolioStatusCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/GetSagemakerServicecatalogPortfolioStatusCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/GetSagemakerServicecatalogPortfolioStatusCommandOutput/)

</details>
<details>
<summary>
GetScalingConfigurationRecommendation
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/GetScalingConfigurationRecommendationCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/GetScalingConfigurationRecommendationCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/GetScalingConfigurationRecommendationCommandOutput/)

</details>
<details>
<summary>
GetSearchSuggestions
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/GetSearchSuggestionsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/GetSearchSuggestionsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/GetSearchSuggestionsCommandOutput/)

</details>
<details>
<summary>
ImportHubContent
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ImportHubContentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ImportHubContentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ImportHubContentCommandOutput/)

</details>
<details>
<summary>
ListActions
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListActionsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListActionsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListActionsCommandOutput/)

</details>
<details>
<summary>
ListAlgorithms
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListAlgorithmsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListAlgorithmsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListAlgorithmsCommandOutput/)

</details>
<details>
<summary>
ListAliases
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListAliasesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListAliasesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListAliasesCommandOutput/)

</details>
<details>
<summary>
ListAppImageConfigs
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListAppImageConfigsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListAppImageConfigsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListAppImageConfigsCommandOutput/)

</details>
<details>
<summary>
ListApps
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListAppsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListAppsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListAppsCommandOutput/)

</details>
<details>
<summary>
ListArtifacts
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListArtifactsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListArtifactsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListArtifactsCommandOutput/)

</details>
<details>
<summary>
ListAssociations
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListAssociationsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListAssociationsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListAssociationsCommandOutput/)

</details>
<details>
<summary>
ListAutoMLJobs
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListAutoMLJobsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListAutoMLJobsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListAutoMLJobsCommandOutput/)

</details>
<details>
<summary>
ListCandidatesForAutoMLJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListCandidatesForAutoMLJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListCandidatesForAutoMLJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListCandidatesForAutoMLJobCommandOutput/)

</details>
<details>
<summary>
ListClusterNodes
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListClusterNodesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListClusterNodesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListClusterNodesCommandOutput/)

</details>
<details>
<summary>
ListClusters
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListClustersCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListClustersCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListClustersCommandOutput/)

</details>
<details>
<summary>
ListClusterSchedulerConfigs
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListClusterSchedulerConfigsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListClusterSchedulerConfigsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListClusterSchedulerConfigsCommandOutput/)

</details>
<details>
<summary>
ListCodeRepositories
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListCodeRepositoriesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListCodeRepositoriesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListCodeRepositoriesCommandOutput/)

</details>
<details>
<summary>
ListCompilationJobs
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListCompilationJobsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListCompilationJobsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListCompilationJobsCommandOutput/)

</details>
<details>
<summary>
ListComputeQuotas
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListComputeQuotasCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListComputeQuotasCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListComputeQuotasCommandOutput/)

</details>
<details>
<summary>
ListContexts
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListContextsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListContextsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListContextsCommandOutput/)

</details>
<details>
<summary>
ListDataQualityJobDefinitions
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListDataQualityJobDefinitionsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListDataQualityJobDefinitionsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListDataQualityJobDefinitionsCommandOutput/)

</details>
<details>
<summary>
ListDeviceFleets
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListDeviceFleetsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListDeviceFleetsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListDeviceFleetsCommandOutput/)

</details>
<details>
<summary>
ListDevices
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListDevicesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListDevicesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListDevicesCommandOutput/)

</details>
<details>
<summary>
ListDomains
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListDomainsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListDomainsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListDomainsCommandOutput/)

</details>
<details>
<summary>
ListEdgeDeploymentPlans
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListEdgeDeploymentPlansCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListEdgeDeploymentPlansCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListEdgeDeploymentPlansCommandOutput/)

</details>
<details>
<summary>
ListEdgePackagingJobs
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListEdgePackagingJobsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListEdgePackagingJobsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListEdgePackagingJobsCommandOutput/)

</details>
<details>
<summary>
ListEndpointConfigs
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListEndpointConfigsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListEndpointConfigsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListEndpointConfigsCommandOutput/)

</details>
<details>
<summary>
ListEndpoints
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListEndpointsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListEndpointsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListEndpointsCommandOutput/)

</details>
<details>
<summary>
ListExperiments
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListExperimentsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListExperimentsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListExperimentsCommandOutput/)

</details>
<details>
<summary>
ListFeatureGroups
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListFeatureGroupsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListFeatureGroupsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListFeatureGroupsCommandOutput/)

</details>
<details>
<summary>
ListFlowDefinitions
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListFlowDefinitionsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListFlowDefinitionsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListFlowDefinitionsCommandOutput/)

</details>
<details>
<summary>
ListHubContents
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListHubContentsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListHubContentsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListHubContentsCommandOutput/)

</details>
<details>
<summary>
ListHubContentVersions
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListHubContentVersionsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListHubContentVersionsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListHubContentVersionsCommandOutput/)

</details>
<details>
<summary>
ListHubs
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListHubsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListHubsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListHubsCommandOutput/)

</details>
<details>
<summary>
ListHumanTaskUis
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListHumanTaskUisCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListHumanTaskUisCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListHumanTaskUisCommandOutput/)

</details>
<details>
<summary>
ListHyperParameterTuningJobs
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListHyperParameterTuningJobsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListHyperParameterTuningJobsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListHyperParameterTuningJobsCommandOutput/)

</details>
<details>
<summary>
ListImages
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListImagesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListImagesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListImagesCommandOutput/)

</details>
<details>
<summary>
ListImageVersions
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListImageVersionsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListImageVersionsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListImageVersionsCommandOutput/)

</details>
<details>
<summary>
ListInferenceComponents
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListInferenceComponentsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListInferenceComponentsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListInferenceComponentsCommandOutput/)

</details>
<details>
<summary>
ListInferenceExperiments
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListInferenceExperimentsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListInferenceExperimentsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListInferenceExperimentsCommandOutput/)

</details>
<details>
<summary>
ListInferenceRecommendationsJobs
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListInferenceRecommendationsJobsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListInferenceRecommendationsJobsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListInferenceRecommendationsJobsCommandOutput/)

</details>
<details>
<summary>
ListInferenceRecommendationsJobSteps
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListInferenceRecommendationsJobStepsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListInferenceRecommendationsJobStepsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListInferenceRecommendationsJobStepsCommandOutput/)

</details>
<details>
<summary>
ListLabelingJobs
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListLabelingJobsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListLabelingJobsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListLabelingJobsCommandOutput/)

</details>
<details>
<summary>
ListLabelingJobsForWorkteam
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListLabelingJobsForWorkteamCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListLabelingJobsForWorkteamCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListLabelingJobsForWorkteamCommandOutput/)

</details>
<details>
<summary>
ListLineageGroups
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListLineageGroupsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListLineageGroupsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListLineageGroupsCommandOutput/)

</details>
<details>
<summary>
ListMlflowTrackingServers
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListMlflowTrackingServersCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListMlflowTrackingServersCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListMlflowTrackingServersCommandOutput/)

</details>
<details>
<summary>
ListModelBiasJobDefinitions
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListModelBiasJobDefinitionsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListModelBiasJobDefinitionsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListModelBiasJobDefinitionsCommandOutput/)

</details>
<details>
<summary>
ListModelCardExportJobs
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListModelCardExportJobsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListModelCardExportJobsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListModelCardExportJobsCommandOutput/)

</details>
<details>
<summary>
ListModelCards
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListModelCardsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListModelCardsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListModelCardsCommandOutput/)

</details>
<details>
<summary>
ListModelCardVersions
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListModelCardVersionsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListModelCardVersionsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListModelCardVersionsCommandOutput/)

</details>
<details>
<summary>
ListModelExplainabilityJobDefinitions
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListModelExplainabilityJobDefinitionsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListModelExplainabilityJobDefinitionsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListModelExplainabilityJobDefinitionsCommandOutput/)

</details>
<details>
<summary>
ListModelMetadata
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListModelMetadataCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListModelMetadataCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListModelMetadataCommandOutput/)

</details>
<details>
<summary>
ListModelPackageGroups
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListModelPackageGroupsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListModelPackageGroupsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListModelPackageGroupsCommandOutput/)

</details>
<details>
<summary>
ListModelPackages
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListModelPackagesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListModelPackagesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListModelPackagesCommandOutput/)

</details>
<details>
<summary>
ListModelQualityJobDefinitions
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListModelQualityJobDefinitionsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListModelQualityJobDefinitionsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListModelQualityJobDefinitionsCommandOutput/)

</details>
<details>
<summary>
ListModels
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListModelsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListModelsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListModelsCommandOutput/)

</details>
<details>
<summary>
ListMonitoringAlertHistory
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListMonitoringAlertHistoryCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListMonitoringAlertHistoryCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListMonitoringAlertHistoryCommandOutput/)

</details>
<details>
<summary>
ListMonitoringAlerts
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListMonitoringAlertsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListMonitoringAlertsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListMonitoringAlertsCommandOutput/)

</details>
<details>
<summary>
ListMonitoringExecutions
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListMonitoringExecutionsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListMonitoringExecutionsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListMonitoringExecutionsCommandOutput/)

</details>
<details>
<summary>
ListMonitoringSchedules
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListMonitoringSchedulesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListMonitoringSchedulesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListMonitoringSchedulesCommandOutput/)

</details>
<details>
<summary>
ListNotebookInstanceLifecycleConfigs
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListNotebookInstanceLifecycleConfigsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListNotebookInstanceLifecycleConfigsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListNotebookInstanceLifecycleConfigsCommandOutput/)

</details>
<details>
<summary>
ListNotebookInstances
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListNotebookInstancesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListNotebookInstancesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListNotebookInstancesCommandOutput/)

</details>
<details>
<summary>
ListOptimizationJobs
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListOptimizationJobsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListOptimizationJobsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListOptimizationJobsCommandOutput/)

</details>
<details>
<summary>
ListPartnerApps
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListPartnerAppsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListPartnerAppsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListPartnerAppsCommandOutput/)

</details>
<details>
<summary>
ListPipelineExecutions
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListPipelineExecutionsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListPipelineExecutionsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListPipelineExecutionsCommandOutput/)

</details>
<details>
<summary>
ListPipelineExecutionSteps
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListPipelineExecutionStepsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListPipelineExecutionStepsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListPipelineExecutionStepsCommandOutput/)

</details>
<details>
<summary>
ListPipelineParametersForExecution
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListPipelineParametersForExecutionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListPipelineParametersForExecutionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListPipelineParametersForExecutionCommandOutput/)

</details>
<details>
<summary>
ListPipelines
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListPipelinesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListPipelinesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListPipelinesCommandOutput/)

</details>
<details>
<summary>
ListProcessingJobs
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListProcessingJobsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListProcessingJobsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListProcessingJobsCommandOutput/)

</details>
<details>
<summary>
ListProjects
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListProjectsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListProjectsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListProjectsCommandOutput/)

</details>
<details>
<summary>
ListResourceCatalogs
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListResourceCatalogsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListResourceCatalogsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListResourceCatalogsCommandOutput/)

</details>
<details>
<summary>
ListSpaces
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListSpacesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListSpacesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListSpacesCommandOutput/)

</details>
<details>
<summary>
ListStageDevices
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListStageDevicesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListStageDevicesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListStageDevicesCommandOutput/)

</details>
<details>
<summary>
ListStudioLifecycleConfigs
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListStudioLifecycleConfigsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListStudioLifecycleConfigsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListStudioLifecycleConfigsCommandOutput/)

</details>
<details>
<summary>
ListSubscribedWorkteams
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListSubscribedWorkteamsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListSubscribedWorkteamsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListSubscribedWorkteamsCommandOutput/)

</details>
<details>
<summary>
ListTags
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListTagsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListTagsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListTagsCommandOutput/)

</details>
<details>
<summary>
ListTrainingJobs
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListTrainingJobsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListTrainingJobsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListTrainingJobsCommandOutput/)

</details>
<details>
<summary>
ListTrainingJobsForHyperParameterTuningJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListTrainingJobsForHyperParameterTuningJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListTrainingJobsForHyperParameterTuningJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListTrainingJobsForHyperParameterTuningJobCommandOutput/)

</details>
<details>
<summary>
ListTrainingPlans
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListTrainingPlansCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListTrainingPlansCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListTrainingPlansCommandOutput/)

</details>
<details>
<summary>
ListTransformJobs
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListTransformJobsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListTransformJobsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListTransformJobsCommandOutput/)

</details>
<details>
<summary>
ListTrialComponents
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListTrialComponentsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListTrialComponentsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListTrialComponentsCommandOutput/)

</details>
<details>
<summary>
ListTrials
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListTrialsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListTrialsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListTrialsCommandOutput/)

</details>
<details>
<summary>
ListUserProfiles
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListUserProfilesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListUserProfilesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListUserProfilesCommandOutput/)

</details>
<details>
<summary>
ListWorkforces
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListWorkforcesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListWorkforcesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListWorkforcesCommandOutput/)

</details>
<details>
<summary>
ListWorkteams
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/ListWorkteamsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListWorkteamsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/ListWorkteamsCommandOutput/)

</details>
<details>
<summary>
PutModelPackageGroupPolicy
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/PutModelPackageGroupPolicyCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/PutModelPackageGroupPolicyCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/PutModelPackageGroupPolicyCommandOutput/)

</details>
<details>
<summary>
QueryLineage
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/QueryLineageCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/QueryLineageCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/QueryLineageCommandOutput/)

</details>
<details>
<summary>
RegisterDevices
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/RegisterDevicesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/RegisterDevicesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/RegisterDevicesCommandOutput/)

</details>
<details>
<summary>
RenderUiTemplate
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/RenderUiTemplateCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/RenderUiTemplateCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/RenderUiTemplateCommandOutput/)

</details>
<details>
<summary>
RetryPipelineExecution
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/RetryPipelineExecutionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/RetryPipelineExecutionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/RetryPipelineExecutionCommandOutput/)

</details>
<details>
<summary>
Search
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/SearchCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/SearchCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/SearchCommandOutput/)

</details>
<details>
<summary>
SearchTrainingPlanOfferings
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/SearchTrainingPlanOfferingsCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/SearchTrainingPlanOfferingsCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/SearchTrainingPlanOfferingsCommandOutput/)

</details>
<details>
<summary>
SendPipelineExecutionStepFailure
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/SendPipelineExecutionStepFailureCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/SendPipelineExecutionStepFailureCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/SendPipelineExecutionStepFailureCommandOutput/)

</details>
<details>
<summary>
SendPipelineExecutionStepSuccess
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/SendPipelineExecutionStepSuccessCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/SendPipelineExecutionStepSuccessCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/SendPipelineExecutionStepSuccessCommandOutput/)

</details>
<details>
<summary>
StartEdgeDeploymentStage
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StartEdgeDeploymentStageCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StartEdgeDeploymentStageCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StartEdgeDeploymentStageCommandOutput/)

</details>
<details>
<summary>
StartInferenceExperiment
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StartInferenceExperimentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StartInferenceExperimentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StartInferenceExperimentCommandOutput/)

</details>
<details>
<summary>
StartMlflowTrackingServer
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StartMlflowTrackingServerCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StartMlflowTrackingServerCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StartMlflowTrackingServerCommandOutput/)

</details>
<details>
<summary>
StartMonitoringSchedule
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StartMonitoringScheduleCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StartMonitoringScheduleCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StartMonitoringScheduleCommandOutput/)

</details>
<details>
<summary>
StartNotebookInstance
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StartNotebookInstanceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StartNotebookInstanceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StartNotebookInstanceCommandOutput/)

</details>
<details>
<summary>
StartPipelineExecution
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StartPipelineExecutionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StartPipelineExecutionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StartPipelineExecutionCommandOutput/)

</details>
<details>
<summary>
StopAutoMLJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StopAutoMLJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopAutoMLJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopAutoMLJobCommandOutput/)

</details>
<details>
<summary>
StopCompilationJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StopCompilationJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopCompilationJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopCompilationJobCommandOutput/)

</details>
<details>
<summary>
StopEdgeDeploymentStage
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StopEdgeDeploymentStageCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopEdgeDeploymentStageCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopEdgeDeploymentStageCommandOutput/)

</details>
<details>
<summary>
StopEdgePackagingJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StopEdgePackagingJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopEdgePackagingJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopEdgePackagingJobCommandOutput/)

</details>
<details>
<summary>
StopHyperParameterTuningJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StopHyperParameterTuningJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopHyperParameterTuningJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopHyperParameterTuningJobCommandOutput/)

</details>
<details>
<summary>
StopInferenceExperiment
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StopInferenceExperimentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopInferenceExperimentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopInferenceExperimentCommandOutput/)

</details>
<details>
<summary>
StopInferenceRecommendationsJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StopInferenceRecommendationsJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopInferenceRecommendationsJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopInferenceRecommendationsJobCommandOutput/)

</details>
<details>
<summary>
StopLabelingJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StopLabelingJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopLabelingJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopLabelingJobCommandOutput/)

</details>
<details>
<summary>
StopMlflowTrackingServer
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StopMlflowTrackingServerCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopMlflowTrackingServerCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopMlflowTrackingServerCommandOutput/)

</details>
<details>
<summary>
StopMonitoringSchedule
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StopMonitoringScheduleCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopMonitoringScheduleCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopMonitoringScheduleCommandOutput/)

</details>
<details>
<summary>
StopNotebookInstance
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StopNotebookInstanceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopNotebookInstanceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopNotebookInstanceCommandOutput/)

</details>
<details>
<summary>
StopOptimizationJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StopOptimizationJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopOptimizationJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopOptimizationJobCommandOutput/)

</details>
<details>
<summary>
StopPipelineExecution
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StopPipelineExecutionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopPipelineExecutionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopPipelineExecutionCommandOutput/)

</details>
<details>
<summary>
StopProcessingJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StopProcessingJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopProcessingJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopProcessingJobCommandOutput/)

</details>
<details>
<summary>
StopTrainingJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StopTrainingJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopTrainingJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopTrainingJobCommandOutput/)

</details>
<details>
<summary>
StopTransformJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/StopTransformJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopTransformJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/StopTransformJobCommandOutput/)

</details>
<details>
<summary>
UpdateAction
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateActionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateActionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateActionCommandOutput/)

</details>
<details>
<summary>
UpdateAppImageConfig
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateAppImageConfigCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateAppImageConfigCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateAppImageConfigCommandOutput/)

</details>
<details>
<summary>
UpdateArtifact
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateArtifactCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateArtifactCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateArtifactCommandOutput/)

</details>
<details>
<summary>
UpdateCluster
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateClusterCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateClusterCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateClusterCommandOutput/)

</details>
<details>
<summary>
UpdateClusterSchedulerConfig
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateClusterSchedulerConfigCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateClusterSchedulerConfigCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateClusterSchedulerConfigCommandOutput/)

</details>
<details>
<summary>
UpdateClusterSoftware
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateClusterSoftwareCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateClusterSoftwareCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateClusterSoftwareCommandOutput/)

</details>
<details>
<summary>
UpdateCodeRepository
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateCodeRepositoryCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateCodeRepositoryCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateCodeRepositoryCommandOutput/)

</details>
<details>
<summary>
UpdateComputeQuota
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateComputeQuotaCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateComputeQuotaCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateComputeQuotaCommandOutput/)

</details>
<details>
<summary>
UpdateContext
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateContextCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateContextCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateContextCommandOutput/)

</details>
<details>
<summary>
UpdateDeviceFleet
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateDeviceFleetCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateDeviceFleetCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateDeviceFleetCommandOutput/)

</details>
<details>
<summary>
UpdateDevices
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateDevicesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateDevicesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateDevicesCommandOutput/)

</details>
<details>
<summary>
UpdateDomain
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateDomainCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateDomainCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateDomainCommandOutput/)

</details>
<details>
<summary>
UpdateEndpoint
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateEndpointCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateEndpointCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateEndpointCommandOutput/)

</details>
<details>
<summary>
UpdateEndpointWeightsAndCapacities
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateEndpointWeightsAndCapacitiesCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateEndpointWeightsAndCapacitiesCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateEndpointWeightsAndCapacitiesCommandOutput/)

</details>
<details>
<summary>
UpdateExperiment
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateExperimentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateExperimentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateExperimentCommandOutput/)

</details>
<details>
<summary>
UpdateFeatureGroup
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateFeatureGroupCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateFeatureGroupCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateFeatureGroupCommandOutput/)

</details>
<details>
<summary>
UpdateFeatureMetadata
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateFeatureMetadataCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateFeatureMetadataCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateFeatureMetadataCommandOutput/)

</details>
<details>
<summary>
UpdateHub
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateHubCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateHubCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateHubCommandOutput/)

</details>
<details>
<summary>
UpdateHubContent
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateHubContentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateHubContentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateHubContentCommandOutput/)

</details>
<details>
<summary>
UpdateHubContentReference
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateHubContentReferenceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateHubContentReferenceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateHubContentReferenceCommandOutput/)

</details>
<details>
<summary>
UpdateImage
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateImageCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateImageCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateImageCommandOutput/)

</details>
<details>
<summary>
UpdateImageVersion
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateImageVersionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateImageVersionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateImageVersionCommandOutput/)

</details>
<details>
<summary>
UpdateInferenceComponent
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateInferenceComponentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateInferenceComponentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateInferenceComponentCommandOutput/)

</details>
<details>
<summary>
UpdateInferenceComponentRuntimeConfig
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateInferenceComponentRuntimeConfigCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateInferenceComponentRuntimeConfigCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateInferenceComponentRuntimeConfigCommandOutput/)

</details>
<details>
<summary>
UpdateInferenceExperiment
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateInferenceExperimentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateInferenceExperimentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateInferenceExperimentCommandOutput/)

</details>
<details>
<summary>
UpdateMlflowTrackingServer
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateMlflowTrackingServerCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateMlflowTrackingServerCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateMlflowTrackingServerCommandOutput/)

</details>
<details>
<summary>
UpdateModelCard
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateModelCardCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateModelCardCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateModelCardCommandOutput/)

</details>
<details>
<summary>
UpdateModelPackage
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateModelPackageCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateModelPackageCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateModelPackageCommandOutput/)

</details>
<details>
<summary>
UpdateMonitoringAlert
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateMonitoringAlertCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateMonitoringAlertCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateMonitoringAlertCommandOutput/)

</details>
<details>
<summary>
UpdateMonitoringSchedule
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateMonitoringScheduleCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateMonitoringScheduleCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateMonitoringScheduleCommandOutput/)

</details>
<details>
<summary>
UpdateNotebookInstance
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateNotebookInstanceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateNotebookInstanceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateNotebookInstanceCommandOutput/)

</details>
<details>
<summary>
UpdateNotebookInstanceLifecycleConfig
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateNotebookInstanceLifecycleConfigCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateNotebookInstanceLifecycleConfigCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateNotebookInstanceLifecycleConfigCommandOutput/)

</details>
<details>
<summary>
UpdatePartnerApp
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdatePartnerAppCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdatePartnerAppCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdatePartnerAppCommandOutput/)

</details>
<details>
<summary>
UpdatePipeline
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdatePipelineCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdatePipelineCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdatePipelineCommandOutput/)

</details>
<details>
<summary>
UpdatePipelineExecution
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdatePipelineExecutionCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdatePipelineExecutionCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdatePipelineExecutionCommandOutput/)

</details>
<details>
<summary>
UpdateProject
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateProjectCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateProjectCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateProjectCommandOutput/)

</details>
<details>
<summary>
UpdateSpace
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateSpaceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateSpaceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateSpaceCommandOutput/)

</details>
<details>
<summary>
UpdateTrainingJob
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateTrainingJobCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateTrainingJobCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateTrainingJobCommandOutput/)

</details>
<details>
<summary>
UpdateTrial
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateTrialCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateTrialCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateTrialCommandOutput/)

</details>
<details>
<summary>
UpdateTrialComponent
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateTrialComponentCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateTrialComponentCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateTrialComponentCommandOutput/)

</details>
<details>
<summary>
UpdateUserProfile
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateUserProfileCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateUserProfileCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateUserProfileCommandOutput/)

</details>
<details>
<summary>
UpdateWorkforce
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateWorkforceCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateWorkforceCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateWorkforceCommandOutput/)

</details>
<details>
<summary>
UpdateWorkteam
</summary>

[Command API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sagemaker/command/UpdateWorkteamCommand/) / [Input](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateWorkteamCommandInput/) / [Output](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sagemaker/Interface/UpdateWorkteamCommandOutput/)

</details>
