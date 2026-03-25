![banner](autocannon-banner.png)

# autocannon

![Node.js CI](https://github.com/mcollina/autocannon/workflows/Node.js%20CI/badge.svg)

![demo](https://raw.githubusercontent.com/mcollina/autocannon/master/demo.gif)

An HTTP/1.1 benchmarking tool written in node, greatly inspired by [wrk][wrk]
and [wrk2][wrk2], with support for HTTP pipelining and HTTPS.
On _my_ box, *autocannon* can produce more load than `wrk` and `wrk2`, see [limitations](#limitations) for more details.

* [Installation](#install)
* [Usage](#usage)
* [API](#api)
* [Acknowledgements](#acknowledgements)
* [License](#license)

## Install

```
npm i autocannon -g
```

or if you want to use the [API](#api) or as a dependency:

```
npm i autocannon --save
```

## Usage

### Command Line

```
Usage: autocannon [opts] URL

URL is any valid HTTP or HTTPS URL.
If the PORT environment variable is set, the URL can be a path. In that case 'http://localhost:$PORT/path' will be used as the URL.

Available options:

  -c/--connections NUM
        The number of concurrent connections to use. default: 10.
  -p/--pipelining NUM
        The number of pipelined requests to use. default: 1.
  -d/--duration SEC
        The number of seconds to run the autocannon. default: 10.
  -a/--amount NUM
        The number of requests to make before exiting the benchmark. If set, duration is ignored.
  -L NUM
        The number of milliseconds to elapse between taking samples. This controls the sample interval, & therefore the total number of samples, which affects statistical analyses. default: 1.
  -S/--socketPath
        A path to a Unix Domain Socket or a Windows Named Pipe. A URL is still required to send the correct Host header and path.
  -w/--workers
        Number of worker threads to use to fire requests.
  -W/--warmup
       Use a warm up interval before starting sampling.
       This enables startup processes to finish and traffic to normalize before sampling begins
       use -c and -d sub args e.g. `--warmup [ -c 1 -d 3 ]`
  --on-port
        Start the command listed after -- on the command line. When it starts listening on a port,
        start sending requests to that port. A URL is still required to send requests to
        the correct path. The hostname can be omitted, `localhost` will be used by default.
        If the command after -- is `node <script>`, this flag is optional and assumed to be `true`.
  -m/--method METHOD
        The HTTP method to use. default: 'GET'.
  -t/--timeout NUM
        The number of seconds before timing out and resetting a connection. default: 10
  -T/--title TITLE
        The title to place in the results for identification.
  -b/--body BODY
        The body of the request.
        NOTE: This option needs to be used with the '-H/--headers' option in some frameworks
  -F/--form FORM
        Upload a form (multipart/form-data). The form options can be a JSON string like
        '{ "field 1": { "type": "text", "value": "a text value"}, "field 2": { "type": "file", "path": "path to the file" } }'
        or a path to a JSON file containing the form options.
        When uploading a file the default filename value can be overridden by using the corresponding option:
        '{ "field name": { "type": "file", "path": "path to the file", "options": { "filename": "myfilename" } } }'
        Passing the filepath to the form can be done by using the corresponding option:
        '{ "field name": { "type": "file", "path": "path to the file", "options": { "filepath": "/some/path/myfilename" } } }'
  -i/--input FILE
        The body of the request. See '-b/body' for more details.
  -H/--headers K=V
        The request headers.
  --har FILE
        When provided, Autocannon will use requests from the HAR file.
        CAUTION: you have to specify one or more domains using URL option: only the HAR requests to the same domains will be considered.
        NOTE: you can still add extra headers with -H/--headers but -m/--method, -F/--form, -i/--input -b/--body will be ignored.
  -B/--bailout NUM
        The number of failures before initiating a bailout.
  -M/--maxConnectionRequests NUM
        The max number of requests to make per connection to the server.
  -O/--maxOverallRequests NUM
        The max number of requests to make overall to the server.
  -r/--connectionRate NUM
        The max number of requests to make per second from an individual connection.
  -R/--overallRate NUM
        The max number of requests to make per second from all connections.
        connection rate will take precedence if both are set.
        NOTE: if using rate limiting and a very large rate is entered which cannot be met, Autocannon will do as many requests as possible per second.
        Also, latency data will be corrected to compensate for the effects of the coordinated omission issue.
        If you are not familiar with the coordinated omission issue, you should probably read [this article](http://highscalability.com/blog/2015/10/5/your-load-generator-is-probably-lying-to-you-take-the-red-pi.html) or watch this [Gil Tene's talk](https://www.youtube.com/watch?v=lJ8ydIuPFeU) on the topic.
  -C/--ignoreCoordinatedOmission
        Ignore the coordinated omission issue when requests should be sent at a fixed rate using 'connectionRate' or 'overallRate'.
        NOTE: it is not recommended to enable this option.
        When the request rate cannot be met because the server is too slow, many request latencies might be missing and Autocannon might report a misleading latency distribution.
  -D/--reconnectRate NUM
        The number of requests to make before resetting a connections connection to the
        server.
  -n/--no-progress
        Don't render the progress bar. default: false.
  -l/--latency
        Print all the latency data. default: false.
  -I/--idReplacement
        Enable replacement of `[<id>]` with a randomly generated ID within the request body. e.g. `/items/[<id>]`. default: false.
  -j/--json
        Print the output as newline delimited JSON. This will cause the progress bar and results not to be rendered. default: false.
  -f/--forever
        Run the benchmark forever. Efficiently restarts the benchmark on completion. default: false.
  -s/--servername
        Server name for the SNI (Server Name Indication) TLS extension. Defaults to the hostname of the URL when it is not an IP address.
  -x/--excludeErrorStats
        Exclude error statistics (non-2xx HTTP responses) from the final latency and bytes per second averages. default: false.
  -E/--expectBody EXPECTED
        Ensure the body matches this value. If enabled, mismatches count towards bailout.
        Enabling this option will slow down the load testing.
  --renderStatusCodes
        Print status codes and their respective statistics.
  --cert
        Path to cert chain in pem format
  --key
        Path to private key for specified cert in pem format
  --ca
        Path to trusted ca certificates for the test. This argument accepts both a single file as well as a list of files
  --debug
        Print connection errors to stderr.
  -v/--version
        Print the version number.
  -V/--verbose
        Print the table with results. default: true.
  -h/--help
        Print this menu.
```

autocannon outputs data in tables like this:

```
Running 10s test @ http://localhost:3000
10 connections

┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬──────────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max      │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼──────────┤
│ Latency │ 0 ms │ 0 ms │ 0 ms  │ 1 ms │ 0.02 ms │ 0.16 ms │ 16.45 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴──────────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg     │ Stdev   │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Req/Sec   │ 20623   │ 20623   │ 25583   │ 26271   │ 25131.2 │ 1540.94 │ 20615   │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Bytes/Sec │ 2.29 MB │ 2.29 MB │ 2.84 MB │ 2.92 MB │ 2.79 MB │ 171 kB  │ 2.29 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘

Req/Bytes counts sampled once per second.

251k requests in 10.05s, 27.9 MB read
```

There are two tables: one for the request latency, and one for the request volume.

The latency table lists the request times at the 2.5% percentile, the fast outliers; at 50%, the median; at 97.5%, the slow outliers; at 99%, the very slowest outliers. Here, lower means faster.

The request volume table lists the number of requests sent and the number of bytes downloaded. These values are sampled once per second. Higher values mean more requests were processed. In the above example, 2.29 MB was downloaded in 1 second in the worst case (slowest 1%). Since we only ran for 10 seconds, there are just 10 samples, the Min value and the 1% and 2.5% percentiles are all the same sample. With longer durations these numbers will differ more.

When passing the `-l` flag, a third table lists all the latency percentiles recorded by autocannon:

```
┌────────────┬──────────────┐
│ Percentile │ Latency (ms) │
├────────────┼──────────────┤
│ 0.001      │ 0            │
├────────────┼──────────────┤
│ 0.01       │ 0            │
├────────────┼──────────────┤
│ 0.1        │ 0            │
├────────────┼──────────────┤
│ 1          │ 0            │
├────────────┼──────────────┤
│ 2.5        │ 0            │
├────────────┼──────────────┤
│ 10         │ 0            │
├────────────┼──────────────┤
│ 25         │ 0            │
├────────────┼──────────────┤
│ 50         │ 0            │
├────────────┼──────────────┤
│ 75         │ 0            │
├────────────┼──────────────┤
│ 90         │ 0            │
├────────────┼──────────────┤
│ 97.5       │ 0            │
├────────────┼──────────────┤
│ 99         │ 1            │
├────────────┼──────────────┤
│ 99.9       │ 1            │
├────────────┼──────────────┤
│ 99.99      │ 3            │
├────────────┼──────────────┤
│ 99.999     │ 15           │
└────────────┴──────────────┘
```

This can give some more insight if a lot (millions) of requests were sent.

### Programmatically

```js
'use strict'

const autocannon = require('autocannon')

autocannon({
  url: 'http://localhost:3000',
  connections: 10, //default
  pipelining: 1, // default
  duration: 10 // default
}, console.log)

// async/await
async function foo () {
  const result = await autocannon({
    url: 'http://localhost:3000',
    connections: 10, //default
    pipelining: 1, // default
    duration: 10 // default
  })
  console.log(result)
}

```

<a name="workers"></a>
#### Workers

In workers mode, `autocannon` uses instances of Node's [Worker](https://nodejs.org/dist/latest/docs/api/worker_threads.html#new-workerfilename-options) class to execute the load tests in multiple threads.

The `amount` and `connections` parameters are divided amongst the workers. If either parameter is not integer divisible by the number of `workers`, the per-worker value is rounded to the lowest integer, or set to `1`, whichever is the higher. All other parameters are applied per-worker as if the test were single-threaded.

**NOTE:** Unlike `amount` and `connections`, the "overall" parameters, `maxOverallRequests` and `overallRate`, are applied **_per worker_**. For example, if you set `connections` to `4`, `workers` to `2` and `maxOverallRequests` to `10`, each worker will receive `2` connections and a `maxOverallRequests` of `10`, resulting in `20` requests being sent.

```js
'use strict'

const autocannon = require('autocannon')

autocannon({
  url: 'http://localhost:3000',
  connections: 10, //default
  pipelining: 1, // default
  duration: 10, // default
  workers: 4
}, console.log)
```

**NOTE:** When in workers mode, you need to pass in an absolute file path to all the options that accept a `function`. This is because a function passed into the main process can not be cloned and passed to the worker. So instead, it needs a file that it can `require`. The options with this behaviour are shown in the below example

```js
'use strict'

const autocannon = require('autocannon')

autocannon({
  // ...
  workers: 4,
  setupClient: '/full/path/to/setup-client.js',
  verifyBody: '/full/path/to/verify-body.js'
  requests: [
    {
      // ...
      onResponse: '/full/path/to/on-response.js'
    },
    {
      // ...
      setupRequest: '/full/path/to/setup-request.js'
    }
  ]
}, console.log)
```

## API

### autocannon(opts[, cb])

Start autocannon against the given target.

* `opts`: Configuration options for the autocannon instance. This can have the following attributes. _REQUIRED_.
    * `url`: The given target. Can be HTTP or HTTPS. More than one URL is allowed, but it is recommended that the number of connections is an integer multiple of the URL. _REQUIRED_.
    * `socketPath`: A path to a Unix Domain Socket or a Windows Named Pipe. A `url` is still required to send the correct Host header and path. _OPTIONAL_.
    * `workers`: Number of worker threads to use to fire requests.
    * `connections`: The number of concurrent connections. _OPTIONAL_ default: `10`.
    * `duration`: The number of seconds to run the autocannon. Can be a [timestring](https://www.npmjs.com/package/timestring). _OPTIONAL_ default: `10`.
    * `amount`: A `Number` stating the number of requests to make before ending the test. This overrides duration and takes precedence, so the test won't end until the number of requests needed to be completed is completed. _OPTIONAL_.
    * `sampleInt`: The number of milliseconds to elapse between taking samples. This controls the sample interval, & therefore the total number of samples, which affects statistical analyses. default: 1.
    * `timeout`: The number of seconds to wait for a response before. _OPTIONAL_ default: `10`.
    * `pipelining`: The number of [pipelined requests](https://en.wikipedia.org/wiki/HTTP_pipelining) for each connection. Will cause the `Client` API to throw when greater than 1. _OPTIONAL_ default: `1`.
    * `bailout`: The threshold of the number of errors when making the requests to the server before this instance bail's out. This instance will take all existing results so far and aggregate them into the results. If none passed here, the instance will ignore errors and never bail out. _OPTIONAL_ default: `undefined`.
    * `method`: The HTTP method to use. _OPTIONAL_ `default: 'GET'`.
    * `title`: A `String` to be added to the results for identification. _OPTIONAL_ default: `undefined`.
    * `body`: A `String` or a `Buffer` containing the body of the request. Insert one or more randomly generated IDs into the body by including `[<id>]` where the randomly generated ID should be inserted (Must also set idReplacement to true). This can be useful in soak testing POST endpoints where one or more fields must be unique. Leave undefined for an empty body. _OPTIONAL_ default: `undefined`.
    * `form`: A `String` or an `Object` containing the multipart/form-data options or a path to the JSON file containing them
    * `headers`: An `Object` containing the headers of the request. _OPTIONAL_ default: `{}`.
    * `initialContext`: An object that you'd like to initialize your context with. Check out [an example of initializing context](./samples/init-context.js). _OPTIONAL_
    * `setupClient`: A `Function` which will be passed the `Client` object for each connection to be made. This can be used to customise each individual connection headers and body using the API shown below. The changes you make to the client in this function will take precedence over the default `body` and `headers` you pass in here. There is an example of this in the samples folder. _OPTIONAL_ default: `function noop () {}`. When using `workers`, you need to supply a file path that default exports a function instead (Check out the [workers](#workers) section for more details).
    * `verifyBody`: A `Function` which will be passed the response body for each completed request. Each request, whose `verifyBody` function does not return a truthy value, is counted in `mismatches`. This function will take precedence over the `expectBody`. There is an example of this in the samples folder. When using `workers`, you need to supply a file path that default exports a function (Check out the [workers](#workers) section for more details).
    * `maxConnectionRequests`: A `Number` stating the max requests to make per connection. `amount` takes precedence if both are set. _OPTIONAL_
    * `maxOverallRequests`: A `Number` stating the max requests to make overall. Can't be less than `connections`. `maxConnectionRequests` takes precedence if both are set. _OPTIONAL_
    * `connectionRate`: A `Number` stating the rate of requests to make per second from each individual connection. No rate limiting by default. _OPTIONAL_
    * `overallRate`: A `Number` stating the rate of requests to make per second from all connections. `connectionRate` takes precedence if both are set. No rate limiting by default. _OPTIONAL_
    * `ignoreCoordinatedOmission`: A `Boolean` which disables the correction of latencies to compensate for the coordinated omission issue. Does not make sense when no rate of requests has been specified (`connectionRate` or `overallRate`). _OPTIONAL_ default: `false`.
    * `reconnectRate`: A `Number` that makes the individual connections disconnect and reconnect to the server whenever it has sent that number of requests. _OPTIONAL_
    * `requests`: An `Array` of `Object`s which represents the sequence of requests to make while benchmarking. Can be used in conjunction with the `body`, `headers` and `method` params above. Check the samples folder for an example of how this might be used. _OPTIONAL_. Contained objects can have these attributes:
       * `body`: When present, will override `opts.body`. _OPTIONAL_
       * `headers`: When present, will override `opts.headers`. _OPTIONAL_
       * `method`: When present, will override `opts.method`. _OPTIONAL_
       * `path`: When present, will override `opts.path`. _OPTIONAL_
       * `setupRequest`: A `Function` you may provide to mutate the raw `request` object, e.g. `request.method = 'GET'`. It takes `request` (Object) and `context` (Object) parameters, and must return the modified request. When it returns a falsey value, autocannon will restart from first request. When using `workers`, you need to supply a file path that default exports a function instead (Check out [workers](#workers) section for more details) _OPTIONAL_
       * `onResponse`: A `Function` you may provide to process the received response. It takes `status` (Number), `body` (String) `context` (Object) parameters and `headers` (Key-Value Object). When using `workers`, you need to supply a file path that default exports a function instead (Check out [workers](#workers) section for more details) _OPTIONAL_
    * `har`: an `Object` of parsed [HAR](https://w3c.github.io/web-performance/specs/HAR/Overview.html) content. Autocannon will extra and use `entries.request`: `requests`, `method`, `form` and `body` options will be ignored. _NOTE_: you must ensure that entries are targeting the same domain as `url` option. _OPTIONAL_
    * `idReplacement`: A `Boolean` which enables the replacement of `[<id>]` tags within the request body with a randomly generated ID, allowing for unique fields to be sent with requests. Check out [an example of programmatic usage](./samples/using-id-replacement.js) that can be found in the samples. _OPTIONAL_ default: `false`
    * `forever`: A `Boolean` which allows you to setup an instance of autocannon that restarts indefinitely after emitting results with the `done` event. Useful for efficiently restarting your instance. To stop running forever, you must cause a `SIGINT` or call the `.stop()` function on your instance. _OPTIONAL_ default: `false`
    * `servername`: A `String` identifying the server name for the SNI (Server Name Indication) TLS extension. _OPTIONAL_ default: Defaults to the hostname of the URL when it is not an IP address.
    * `excludeErrorStats`: A `Boolean` which allows you to disable tracking non-2xx code responses in latency and bytes per second calculations. _OPTIONAL_ default: `false`.
    * `expectBody`: A `String` representing the expected response body. Each request whose response body is not equal to `expectBody`is counted in `mismatches`. If enabled, mismatches count towards bailout. _OPTIONAL_
    * `tlsOptions`: An `Object` that is passed into `tls.connect` call ([Full list of options](https://nodejs.org/api/tls.html#tls_tls_connect_port_host_options_callback)). Note: this only applies if your URL is secure.
    * `skipAggregateResult`: A `Boolean` which allows you to disable the aggregate result phase of an instance run. See [autocannon.aggregateResult](<#autocannon.aggregateResult(results[, opts])>)
* `cb`: The callback which is called on completion of a benchmark. Takes the following params. _OPTIONAL_.
    * `err`: If there was an error encountered with the run.
    * `results`: The results of the run.

**Returns** an instance/event emitter for tracking progress, etc. If `cb` is omitted, the return value can also be used as a Promise.

### Customizing sent requests

When running, autocannon will create as many `Client` objects as desired connections. They will run in parallel until the benchmark is over (duration or total number of requests).
Each client will loop over the `requests` array, would it contain one or several requests.

While going through available requests, the client will maintain a `context`: an object you can use in `onResponse` and `setupRequest` functions, to store and read some contextual data.
Please check the `request-context.js` file in samples.

Note that `context` object will be reset to `initialContext` (or `{}` it is not provided) when restarting to the first available request, ensuring similar runs.

### Combining connections, overallRate and amount

When combining a fixed `amount` of requests with concurrent `connections` and an `overallRate` limit, autocannon will distribute the requests and the intended rate over all connections. If the `overallRate` is not integer divisible, autocannon will configure some connection clients with a higher and some with a lower number of requests/second rate. If now the `amount` *is* integer divisible, all connection clients get the same number of requests. This means that the clients with a higher request rate will finish earlier, than the others, leading to a drop in the perceived request rate.

Example: `connections = 10, overallRate = 17, amount = 5000`


### autocannon.track(instance[, opts])

Track the progress of your autocannon, programmatically.

* `instance`: The instance of autocannon. _REQUIRED_.
* `opts`: Configuration options for tracking. This can have the following attributes. _OPTIONAL_.
    * `outputStream`: The stream to output to. default: `process.stderr`.
    * `renderProgressBar`: A truthy value to enable the rendering of the progress bar. default: `true`.
    * `renderResultsTable`: A truthy value to enable the rendering of the results table. default: `true`.
    * `renderLatencyTable`: A truthy value to enable the rendering of the advanced latency table. default: `false`.
    * `progressBarString`: A `string` defining the format of the progress display output. Must be valid input for the [progress bar module](http://npm.im/progress). default: `'running [:bar] :percent'`.

Example that just prints the table of results on completion:

```js
'use strict'

const autocannon = require('autocannon')

const instance = autocannon({
  url: 'http://localhost:3000'
}, console.log)

// this is used to kill the instance on CTRL-C
process.once('SIGINT', () => {
  instance.stop()
})

// just render results
autocannon.track(instance, {renderProgressBar: false})
```

Check out [this example](./samples/track-run.js) to see it in use, as well.

### autocannon.printResult(resultObject[, opts])

Returns a text string containing the result tables.

* `resultObject`: The result object of autocannon. _REQUIRED_.
* `opts`: Configuration options for generating the tables. These may include the following attributes. _OPTIONAL_.
    * `outputStream`: The stream to which output is directed. It is primarily used to check if the terminal supports color. default: `process.stderr`.
    * `renderResultsTable`: A truthy value to enable the creation of the results table. default: `true`.
    * `renderLatencyTable`: A truthy value to enable the creation of the latency table. default: `false`.

Example:

```js
"use strict";

const { stdout } = require("node:process");
const autocannon = require("autocannon");

function print(result) {
  stdout.write(autocannon.printResult(result));
}

autocannon({ url: "http://localhost:3000" }, (err, result) => print(result));
```

### autocannon.aggregateResult(results[, opts])

Aggregate the results of one or more autocannon instance runs, where the instances of autocannon have been run with the `skipAggregateResult` option.

This is an advanced use case, where you might be running a load test using autocannon across multiple machines and therefore need to defer aggregating the results to a later time.

* `results`: An array of autocannon instance results, where the instances have been run with the `skipAggregateResult` option set to true. _REQUIRED_.
* `opts`: This is a subset of the options you would pass to the main autocannon API, so you could use the same options object as the one used to run the instances. See [autocannon](<#autocannon(opts[, cb])>) for full descriptions of the options. _REQUIRED_.
    * `url`: _REQUIRED_
    * `title`: _OPTIONAL_ default: `undefined`
    * `socketPath`: _OPTIONAL_
    * `connections`: _OPTIONAL_ default: `10`.
    * `sampleInt`: _OPTIONAL_ default: `1`
    * `pipelining`: _OPTIONAL_ default: `1`
    * `workers`: _OPTIONAL_ default: `undefined`

### Autocannon events

Because an autocannon instance is an `EventEmitter`, it emits several events. these are below:

* `start`: Emitted once everything has been setup in your autocannon instance and it has started. Useful for if running the instance forever.
* `tick`: Emitted every second this autocannon is running a benchmark. Useful for displaying stats, etc. Used by the `track` function. The `tick` event propagates  an object containing the `counter` and `bytes` values, which can be used for extended reports.
* `done`: Emitted when the autocannon finishes a benchmark. passes the `results` as an argument to the callback.
* `response`: Emitted when the autocannons http-client gets an HTTP response from the server. This passes the following arguments to the callback:
    * `client`: The `http-client` itself. Can be used to modify the headers and body the client will send to the server. API below.
    * `statusCode`: The HTTP status code of the response.
    * `resBytes`: The response byte length.
    * `responseTime`: The time taken to get a response after initiating the request.
* `reqError`: Emitted in the case of a request error e.g. a timeout.
* `error`: Emitted if there is an error during the setup phase of autocannon.

### Results

The results object emitted by `done` and passed to the `autocannon()` callback has these properties:

* `title`: Value of the `title` option passed to `autocannon()`.
* `url`: The URL that was targeted.
* `socketPath`: The UNIX Domain Socket or Windows Named Pipe that was targeted, or `undefined`.
* `requests`: A histogram object containing statistics about the number of requests that were sent per second.
* `latency`: A histogram object containing statistics about response latency.
* `throughput`: A histogram object containing statistics about the response data throughput per second.
* `duration`: The amount of time the test took, **in seconds**.
* `errors`: The number of connection errors (including timeouts) that occurred.
* `timeouts`: The number of connection timeouts that occurred.
* `mismatches`: The number of requests with a mismatched body.
* `start`: A Date object representing when the test started.
* `finish`: A Date object representing when the test ended.
* `connections`: The amount of connections used (value of `opts.connections`).
* `pipelining`: The number of pipelined requests used per connection (value of `opts.pipelining`).
* `non2xx`: The number of non-2xx response status codes received.
* `resets`: How many times the requests pipeline was reset due to `setupRequest` returning a falsey value.
* `statusCodeStats`: Requests counter per status code (e.g. `{ "200": { "count": "500" } }`)

The histogram objects for `requests`, `latency` and `throughput` are [hdr-histogram-percentiles-obj](https://github.com/thekemkid/hdr-histogram-percentiles-obj) objects and have this shape:

* `min`: The lowest value for this statistic.
* `max`: The highest value for this statistic.
* `average`: The average (mean) value.
* `stddev`: The standard deviation.
* `p*`: The XXth percentile value for this statistic. The percentile properties are: `p2_5`, `p50`, `p75`, `p90`, `p97_5`, `p99`, `p99_9`, `p99_99`, `p99_999`.

### `Client` API

This object is passed as the first parameter of both the `setupClient` function and the `response` event from an autocannon instance. You can use this to modify the requests you are sending while benchmarking. This is also an `EventEmitter`, with the events and their params listed below.

* `client.setHeaders(headers)`: Used to modify the headers of the request this client iterator is currently on. `headers` should be an `Object`, or `undefined` if you want to remove your headers.
* `client.setBody(body)`: Used to modify the body of the request this client iterator is currently on. `body` should be a `String` or `Buffer`, or `undefined` if you want to remove the body.
* `client.setHeadersAndBody(headers, body)`: Used to modify both the headers and body this client iterator is currently on. `headers` and `body` should take the same form as above.
* `client.setRequest(request)`: Used to modify the entire request that this client iterator is currently on. Can have `headers`, `body`, `method`, or `path` as attributes. Defaults to the values passed into the autocannon instance when it was created. `Note: call this when modifying multiple request values for faster encoding`
* `client.setRequests(newRequests)`: Used to overwrite the entire requests array that was passed into the instance on initiation. `Note: call this when modifying multiple requests for faster encoding`

### `Client` events

The events a `Client` can emit are listed here:

* `headers`: Emitted when a request sent from this client has received the headers of its reply. This received an `Object` as the parameter.
* `body`: Emitted when a request sent from this client has received the body of a reply. This receives a `Buffer` as the parameter.
* `response`: Emitted when the client has received a completed response for a request it made. This is passed the following arguments:
    * `statusCode`: The HTTP status code of the response.
    * `resBytes`: The response byte length.
    * `responseTime`: The time taken to get a response after initiating the request.
* `reset`: Emitted when the requests pipeline was reset due to `setupRequest` returning a falsey value.

Example using the autocannon events and the client API and events:

```js
'use strict'

const autocannon = require('autocannon')

const instance = autocannon({
  url: 'http://localhost:3000',
  setupClient: setupClient
}, (err, result) => handleResults(result))
// results passed to the callback are the same as those emitted from the done events
instance.on('done', handleResults)

instance.on('tick', () => console.log('ticking'))

instance.on('response', handleResponse)

function setupClient (client) {
  client.on('body', console.log) // console.log a response body when its received
}

function handleResponse (client, statusCode, resBytes, responseTime) {
  console.log(`Got response with code ${statusCode} in ${responseTime} milliseconds`)
  console.log(`response: ${resBytes.toString()}`)

  //update the body or headers
  client.setHeaders({new: 'header'})
  client.setBody('new body')
  client.setHeadersAndBody({new: 'header'}, 'new body')
}

function handleResults(result) {
  // ...
}
```

<a name="limitations"></a>
## Limitations

Autocannon is written in JavaScript for the Node.js runtime and it is CPU-bound.
We have verified that it yields comparable results with `wrk` when benchmarking Node.js
applications using the `http` module.
Nevertheless, it uses significantly more CPU than other tools that compiles to a binary such as `wrk`.
Autocannon can saturate the CPU, e.g. the autocannon process reaches 100%: in those cases,
we recommend using `wrk2`.

As an example, let's consider a run with 1000 connections on a server
with 4 cores with hyperthreading:

* `wrk` uses 2 threads (by default) and an auxiliary one to collect the
  metrics with a total load of the CPU of 20% + 20% + 40%.
* `autocannon` uses a single thread at 80% CPU load.

Both saturates a Node.js process at around 41k req/sec, however,
`autocannon` can saturate sooner because it is single-threaded.

Note that `wrk` does not support HTTP/1.1 pipelining. As a result, `autocannon` can create
more load on the server than wrk for each open connection.

<a name="acknowledgements"></a>
## Acknowledgements

This project was kindly sponsored by [nearForm](http://nearform.com).

Logo and identity designed by Cosmic Fox Design: https://www.behance.net/cosmicfox.

[wrk][wrk] and [wrk2][wrk2] provided great inspiration.

### Chat on Gitter

If you are using autocannon or you have any questions, let us know: [Gitter](https://gitter.im/mcollina/autocannon)

### Contributors

- [Glen Keane](mailto:glenkeane.94@gmail.com) | [Github](https://github.com/GlenTiki)
- [Salman Mitha](mailto:salmanmitha@gmail.com) | [Github](https://github.com/salmanm) | [NPM](https://www.npmjs.com/~salmanm)

## License

Copyright [Matteo Collina](https://github.com/mcollina) and other contributors, Licensed under [MIT](./LICENSE).

[node-gyp]: https://github.com/nodejs/node-gyp#installation
[wrk]: https://github.com/wg/wrk
[wrk2]: https://github.com/giltene/wrk2
