# WireMock REST Client
The WireMock REST client is a lightweight module to interact with a running [WireMock](http://wiremock.org) server based on the [OpenAPI 3.0 spec](http://wiremock.org/docs/api/) via REST.

<!-- TOC -->
- [WireMock REST Client](#wiremock-rest-client)
  - [Installation](#installation)
  - [Usage](#usage)
  - [API](#api)
    - [Global](#global)
    - [Stub mappings](#stub-mappings)
    - [Recordings](#recordings)
    - [Requests](#requests)
    - [Scenarios](#scenarios)
  - [Configuration](#configuration)
    - [Proxy](#proxy)
    - [Headers](#headers)
    - [Log level](#log-level)
    - [Continue on failure](#continue-on-failure)
  - [CLI](#cli)
<!-- /TOC -->

## Installation
```
npm install wiremock-rest-client
```

## Usage
The `WireMockRestClient` has 5 services which correspond with request paths as specified in the OpenAPI spec.
- `global` - Global operations
- `mappings` - Operations on stub mappings
- `recordings` - Stub mapping record and snapshot functions
- `requests` - Logged requests and responses received
- `scenarios` - Scenarios support modeling of stateful behavior

See the [API](#api) for the available methods. All methods are related to available operations on the WireMock server endpoints.

```js
import { WireMockRestClient } from 'wiremock-rest-client';

const wireMock = new WireMockRestClient('http://localhost:8080');

const stubMappings = await wireMock.mappings.getAllMappings();

console.log(stubMappings);

await wireMock.global.shutdown();
```

## API

### Global
- `updateGlobalSettings(delayDefinition: DelayDefinition): Promise<void>`
- `resetAll(): Promise<void>`
- `shutdown(): Promise<void>`

Example:
```js
await wireMockRestClient.global.resetAll();
```

### Stub mappings
- `getAllMappings(): Promise<StubMappings>`
- `createMapping(stubMapping: StubMapping): Promise<StubMapping>`
- `createMappingFromFile(fileName: string): Promise<StubMapping>`
- `createMappingsFromDir(directoryName: string): Promise<any>`
- `deleteAllMappings(): Promise<void>`
- `resetAllMappings(): Promise<void>`
- `getMapping(uuid: string): Promise<StubMapping>`
- `updateMapping(uuid: string, stubMapping: StubMapping): Promise<StubMapping>`
- `deleteMapping(uuid: string): Promise<void>`
- `saveAllMappings(): Promise<void>`
- `findByMetaData(contentPattern: ContentPattern): Promise<StubMappings>`
- `removeByMetaData(contentPattern: ContentPattern): Promise<void>`

Example:
```js
await wireMockRestClient.mappings.resetAllMappings();

const stubMapping = {
    "request": {
        "method": "GET",
        "urlPathPattern": "/api/helloworld"
    },
    "response": {
        "status": 200,
        "jsonBody": {"hello": "world"},
        "headers": {
            "Content-Type": "application/json"
        }
    }
};

const response = await wireMock.mappings.createMapping(stubMapping);

// Create mapping from current working directory
await wireMock.mappings.createMappingFromFile('stubs/hello-world.json');

// Create mappings from a directory recursively (based on current working directory)
await wireMock.mappings.createMappingsFromDir('stubs');
```

### Recordings
- `startRecording(recordSpec: RecordSpec): Promise<void>`
- `stopRecording(): Promise<StubMappings>`
- `getRecordingStatus(): Promise<any>`
- `takeSnapshotRecording(snapshotSpec: RecordSpec): Promise<StubMappings>`

Example:
```js
const recordingStatus = wireMockRestClient.recordings.getRecordingStatus();
```

### Requests
- `getAllRequests(): Promise<any>`
- `deleteAllRequests(): Promise<void>`
- `getRequest(uuid: string): Promise<any>`
- `deleteRequest(uuid: string): Promise<void>`
- `resetAllRequests(): Promise<void>`
- `getCount(requestPattern: RequestPattern): Promise<any>`
- `removeRequests(requestPattern: RequestPattern): Promise<any>`
- `removeRequestsByMetadata(contentPattern: ContentPattern): Promise<any>`
- `findRequests(requestPattern: RequestPattern): Promise<any>`
- `getUnmatchedRequests(): Promise<any>`
- `getUnmatchedNearMisses(): Promise<LoggedRequest[]>`
- `getNearMissesByRequest(loggedRequest: LoggedRequest): Promise<any>`
- `getNearMissesByRequestPattern(requestPattern: RequestPattern): Promise<any>`

Example:
```js
const requests = await wireMockRestClient.requests.getAllRequests();
```

### Scenarios
- `getAllScenarios(): Promise<Scenario[]>`
- `resetAllScenarios(): Promise<void>`
- `resetScenario(scenarioId: string): Promise<void>`
- `setScenarioState(scenarioId: string, state: string): Promise<void>`

Example:
```js
await wireMockRestClient.scenarios.resetAllScenarios();
```

## Configuration
The following **optional** configuration options are available, to be set via options or environment variables.

| Configuration option                         | Default               | Options property    | Environment variable      |
|----------------------------------------------|-----------------------|---------------------|---------------------------|
| [Proxy](#proxy)                              | No proxy              | `proxy`             | `WRC_HTTP_PROXY`          |
| [Headers](#headers)                          | No additional headers | `headers`           | `WRC_HEADERS`             |
| [Log level](#log-level)                      | `info`                | `logLevel`          | `WRC_LOG_LEVEL`           |
| [Continue on failure](#continue-on-failure)  | `false`               | `continueOnFailure` | `WRC_CONTINUE_ON_FAILURE` |

Example using options:
```js
const wireMock = new WireMockRestClient('http://localhost:8080', {
    proxy: 'http://mycorporateproxy.com',
    headers: {Authorization: 'some-token'},
    logLevel: 'debug',
    continueOnFailure: true
});
```

Note: Environment variables have the highest priority

### Proxy
The proxy URL can be HTTP or HTTPS. Credentials for authentication can be passed in the URL.

Example:
```
WRC_HTTP_PROXY=http://username:secret@mycorporateproxy.com
```

### Headers
Additional headers can be added to all HTTP requests.

Example:
```
WRC_HEADERS="{Authorization: 'some-token'}"
```

### Log level
- Default log level is `info`
- Each log line contains a unique id to trace logs for a single request
- Log level `debug` will log the request body for each request.

A different log level can be configured by setting the environment variable `WRC_LOG_LEVEL` to specific a log level (`trace`/`debug`/`info`/`warn`/`error`/`silent`)

```shell
2019-12-11T20:43:18.157Z INFO wiremock-rest-client: [Uub8jVUBq91F3MIyKXrON] Request: [POST] http://localhost:8080/__admin/mappings
2019-12-11T20:43:18.157Z DEBUG wiremock-rest-client: [Uub8jVUBq91F3MIyKXrON] Request body:  {"request":{"method":"GET","urlPathPattern":"/api/helloworld"},"response":{"status":200,"jsonBody":{"hello":"world"},"headers":{"Content-Type":"application/json"}}}
2019-12-11T20:43:18.158Z INFO wiremock-rest-client: [Uub8jVUBq91F3MIyKXrON] Response: [201] Created
2019-12-11T20:43:18.158Z INFO wiremock-rest-client: [EDYjmman5BLb7tgws-VGg] Request: [POST] http://localhost:8080/__admin/shutdown
2019-12-11T20:43:18.161Z INFO wiremock-rest-client: [EDYjmman5BLb7tgws-VGg] Response: [200] OK
```

### Continue on failure
- By default the node process is exited in case of a failure
- To change this behavior to continue on failure, set the value to `true`

## CLI
A small CLI is available to load data from the command line by passing the folder which contains the stub mappings to be loaded. By default it will reset all stub mappings first (configurable).

```
$ wrc load --help

Usage: wrc load [options]

Options:
  -f, --folders <folders>  Comma separated list of folders containing stub mappings to be loaded
  --no-reset               Skip resetting all stub mappings
  -u, --uri [uri]          WireMock base URI (default: "http://localhost:8080")
  -h, --help               display help for command
```
