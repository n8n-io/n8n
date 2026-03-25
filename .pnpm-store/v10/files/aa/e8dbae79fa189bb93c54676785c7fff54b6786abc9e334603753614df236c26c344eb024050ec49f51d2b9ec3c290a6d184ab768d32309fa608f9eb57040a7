## [![Releases](https://img.shields.io/github/release/rudderlabs/rudder-sdk-node.svg)](https://github.com/rudderlabs/rudder-sdk-node/releases) [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=rudderlabs_rudder-sdk-node&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=rudderlabs_rudder-sdk-node) [![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=rudderlabs_rudder-sdk-node&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=rudderlabs_rudder-sdk-node) [![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=rudderlabs_rudder-sdk-node&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=rudderlabs_rudder-sdk-node) [![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=rudderlabs_rudder-sdk-node&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=rudderlabs_rudder-sdk-node) [![Coverage](https://sonarcloud.io/api/project_badges/measure?project=rudderlabs_rudder-sdk-node&metric=coverage)](https://sonarcloud.io/summary/new_code?id=rudderlabs_rudder-sdk-node)

<p align="center">
  <a href="https://rudderstack.com/">
    <img src="https://raw.githubusercontent.com/rudderlabs/rudder-sdk-js/develop/assets/rs-logo-full-light.jpg">
  </a>
</p>

<p align="center"><b>The Customer Data Platform for Developers</b></p>

<p align="center">
  <b>
    <a href="https://rudderstack.com">Website</a>
    ·
    <a href="https://rudderstack.com/docs/stream-sources/rudderstack-sdk-integration-guides/rudderstack-node-sdk/">Documentation</a>
    ·
    <a href="https://rudderstack.com/join-rudderstack-slack-community">Community Slack</a>
  </b>
</p>

---

# RudderStack Node.js SDK

The RudderStack Node.js SDK lets you track your customer event data from your Node.js applications and send it to your specified destinations.

Refer to the [**documentation**](https://www.rudderstack.com/docs/stream-sources/rudderstack-sdk-integration-guides/rudderstack-node-sdk/) for more details.

## Installing the SDK

Run the following command to install the Node.js SDK via **npm**:

```bash
$ npm install @rudderstack/rudder-sdk-node
```

## Using the SDK

To create a global RudderStack client object and use it for the subsequent event calls, run the following snippet:

```javascript
const Analytics = require('@rudderstack/rudder-sdk-node');

const client = new Analytics(WRITE_KEY, {
  dataPlaneUrl: DATA_PLANE_URL, // default: https://hosted.rudderlabs.com
});
```

## SDK Initialization Options

Below parameters are optional and can be passed during SDK initialization.

| Name                   | Type     | Default value                   | Description                                                                                       |
| :--------------------- | :------- | :------------------------------ | :------------------------------------------------------------------------------------------------ |
| `dataPlaneUrl`         | String   | `https://hosted.rudderlabs.com` | The data plane URL.                                                                               |
| `path`                 | String   | `/v1/batch`                     | Path to batch endpoint.                                                                           |
| `flushAt`              | Number   | 20                              | The number of events to be flushed when reached this limit.                                       |
| `flushInterval`        | Number   | 10000                           | The maximum timespan (in milliseconds) after which the events from the in-memory queue is flushed |
| `maxQueueSize`         | Number   | 460800(500kb)                   | Maximum payload size of a batch request                                                           |
| `maxInternalQueueSize` | Number   | 20000                           | The maximum length of the in-memory queue                                                         |
| `logLevel`             | String   | 'info'                          | Log level. `Ex: 'debug', 'error'`                                                                 |
| `axiosConfig`          | Object   | N/A                             | Axios config                                                                                      |
| `axiosInstance`        | Object   | N/A                             | Axios instance                                                                                    |
| `axiosRetryConfig`     | Object   | N/A                             | Axios retry configuration                                                                         |
| `retryCount`           | Number   | 3                               | Number of times requests will be retried by axios if failed                                       |
| `errorHandler`         | Function | N/A                             | A function that will be called if request to server failed                                        |
| `gzip`                 | Boolean  | true                            | Whether to compress request with gzip or not                                                      |

## Supported calls

Refer to the [**SDK documentation**](https://www.rudderstack.com/docs/stream-sources/rudderstack-sdk-integration-guides/rudderstack-node-sdk/) for more information on the supported calls.

## Initializing the SDK for data persistence

> **This is a beta feature. Contact us on our [Community Slack](https://rudderstack.com/join-rudderstack-slack-community) in case you face any issues.**

RudderStack has a data persistence feature to persist the events in Redis, leading to better event delivery guarantees. Also, the SDK can retry event delivery multiple times as the queue is maintained in a different process space(Redis).

| To use this feature, you will need to host a Redis server and use it as the intermediary data storage queue. |
| :----------------------------------------------------------------------------------------------------------- |

A sample SDK initialization is shown below:

```
const client = new Analytics(
  "write_key",
  {
    dataPlaneUrl: DATA_PLANE_URL // default: https://hosted.rudderlabs.com with default path set to /v1/batch
    flushAt: <number> = 20,
    flushInterval: <ms> = 20000
    maxInternalQueueSize: <number> = 20000 // the max number of elements that the SDK can hold in memory,
                                                                // this is different than the Redis list created when persistence is enabled
  }
);
client.createPersistenceQueue({ redisOpts: { host: "localhost" } }, err => {})
```

To initialize the data persistence queue, you need to call the `createPersistenceQueue` method which takes two parameters as input - `queueOpts` and a `callback`. The `createPersistenceQueue` method will initialize a Redis list by calling [Bull's](https://github.com/OptimalBits/bull) utility methods.

> **If you do not call `createPersistenceQueue` after initializing the SDK, the SDK will not implement data persistence.**

Read the detailed [documentation](https://www.rudderstack.com/docs/stream-sources/rudderstack-sdk-integration-guides/rudderstack-node-sdk/#nodejs-sdk-data-persistence) for more information on `createPersistenceQueue` and the other [configurable parameters](https://www.rudderstack.com/docs/stream-sources/rudderstack-sdk-integration-guides/rudderstack-node-sdk/#configurable-parameters).

### Event flow

For more information on how the event flow occurs with data persistence enabled, refer to the [documentation](https://www.rudderstack.com/docs/stream-sources/rudderstack-sdk-integration-guides/rudderstack-node-sdk/#event-flow).

### Limitations around data persistence

- Refer to this [page](https://gitter.im/OptimalBits/bull/archives/2018/04/17) to understand the limitations
- For more details on the limitations, read: https://redis.io/topics/cluster-tutorial#redis-cluster-data-sharding
- As a workaround, refer to this page: https://gitter.im/OptimalBits/bull/archives/2018/04/17. We pass a prefix with default value as {rudder}.

## Contact us

If you come across any issues while configuring or using the RudderStack Node.js SDK, you can [**contact us**](https://rudderstack.com/contact/) or start a conversation in our [**Slack**](https://resources.rudderstack.com/join-rudderstack-slack) community.
