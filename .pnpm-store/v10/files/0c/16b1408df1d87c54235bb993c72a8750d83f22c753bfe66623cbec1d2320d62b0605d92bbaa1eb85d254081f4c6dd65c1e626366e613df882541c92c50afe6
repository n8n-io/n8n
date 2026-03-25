/// <reference types="node" />

import { IncomingHttpHeaders } from "http";

declare namespace autocannon {
    interface Options {
        /**
         * The given target. Can be http or https.
         */
        url: string;

        /**
         * A path to a Unix Domain Socket or a Windows Named Pipe.
         * A `url` is still required in order to send the correct Host header and path.
         */
        socketPath?: string;

        /**
         * The number of concurrent connections.
         * @default 10
         */
        connections?: number;

        /**
         * The number of seconds to run the autocannon.
         * Can be a [timestring](https://www.npmjs.com/package/timestring).
         * @default 10
         */
        duration?: number | string;

        /**
         * A `Number` stating the amount of requests to make before ending the test.
         * This overrides duration and takes precedence, so the test won't end
         * until the amount of requests needed to be completed are completed.
         */
        amount?: number;

        /**
         * The number of seconds to wait for a response before timeout.
         * @default 10
         */
        timeout?: number;

        /**
         *  The number of [pipelined requests](https://en.wikipedia.org/wiki/HTTP_pipelining) for each connection.
         * Will cause the `Client` API to throw when greater than 1
         * @default 1
         */
        pipelining?: number;

        /**
         * The threshold of the number of errors when making the requests to the server before this instance bail's out.
         * This instance will take all existing results so far and aggregate them into the results.
         * If none passed here, the instance will ignore errors and never bail out.
         */
        bailout?: number;

        /**
         * The http method to use.
         * @default 'GET'
         */
        method?: Request["method"];

        /**
         * A `String` to be added to the results for identification.
         */
        title?: string;

        /**
         * A `String` or a `Buffer` containing the body of the request.
         *
         * Insert one or more randomly generated IDs into the body by including `[<id>]`
         * where the randomly generated ID should be inserted (Must also set idReplacement to true).
         *
         * This can be useful in soak testing POST endpoints where one or more fields must be unique.
         *
         * Leave undefined for an empty body.
         */
        body?: Request["body"];

        /**
         * An `Object` containing the headers of the request.
         * @default {}
         */
        headers?: Request["headers"];

        /**
         * A `Function` which will be passed the Client object for each connection to be made.
         * This can be used to customize each individual connection headers and body using the API shown below.
         *
         * The changes you make to the client in this function will take precedence over the default body and headers you pass in here.
         *
         * @default noop(){}
         */
        setupClient?: (client: Client) => void;

        /**
         * A `Number` stating the max requests to make per connection.
         * `amount` takes precedence if both are set.
         */
        maxConnectionRequests?: number;

        /**
         * A `Number` stating the max requests to make overall.
         * Can't be less than `connections`.
         */
        maxOverallRequests?: number;

        /**
         * A `Number` stating the rate of requests to make per second from each individual connection.
         * No rate limiting by default.
         */
        connectionRate?: number;

        /**
         * A `Number` stating the rate of requests to make per second from all connections.
         * `connectionRate` takes precedence if both are set.
         * No rate limiting by default.
         */
        overallRate?: number;

        /**
         * A `Number` which makes the individual connections disconnect and reconnect to the server
         * whenever it has sent that number of requests.
         */
        reconnectRate?: number;

        /**
         * An `Array` of `Objects` which represents the sequence of requests to make while benchmarking.
         * Can be used in conjunction with the `body`, `headers` and `method` params above.
         *
         * The `Objects` in this array can have `body`, `headers`, `method`, or `path` attributes, which overwrite those that are passed in this `opts` object.
         * Therefore, the ones in this (`opts`) object take precedence and should be viewed as defaults.
         */
        requests?: Request[];

        /**
         * A `Boolean` which enables the replacement of `[<id>]` tags within the request body with a randomly generated ID,
         * allowing for unique fields to be sent with requests.
         * @default false
         */
        idReplacement?: boolean;

        /**
         * A `Boolean` which allows you to setup an instance of autocannon that restarts indefinitely after emitting results with the `done` event.
         * Useful for efficiently restarting your instance. To stop running forever, you must cause a `SIGINT` or call the `.stop()` function on your instance.
         * @default false
         */
        forever?: boolean;

        /**
         * A `String` identifying the server name for the SNI (Server Name Indication) TLS extension.
         */
        servername?: string;

        /**
         * A `Boolean` which allows you to disable tracking non 2xx code responses in latency and bytes per second calculations.
         * @default false
         */
        excludeErrorStats?: boolean;

        /**
         * The number of worker threads to use to fire requests.
         */
        workers?: number;

        /**
         * The number of milliseconds to elapse between taking samples. This controls the sample interval,
         * & therefore the total number of samples, which affects statistical analyses.
         * @default 1
         */
        sampleInt?: number;

        /**
         * A String or an Object containing the multipart/form-data options or a path to the JSON file containing them
         */
        form?: string | object;

        /**
         * An object that you'd like to initialize your context with.
         */
        initialContext?: object;

        /**
         * A Function which will be passed the response body for each completed request. Each request, whose verifyBody
         * function does not return a truthy value, is counted in mismatches
         */
        verifyBody?: (body: Request["body"]) => boolean;

        /**
         * A Boolean which disables the correction of latencies to compensate for the coordinated omission issue.
         * Does not make sense when no rate of requests has been specified (connectionRate or overallRate)
         */
        ignoreCoordinatedOmission?: boolean;

        /**
         * an Object of parsed HAR content. Autocannon will extra and use entries.request: requests, method, form
         * and body options will be ignored.
         * NOTE: you must ensure that entries are targeting the same domain as url option.
         */
        har?: object;

        /**
         * A String representing the expected response body. Each request whose response body is not equal to
         * expectBody is counted in mismatches
         */
        expectBody?: string;

        /**
         * An Object that is passed into tls.connect call.
         * Note: this only applies if your URL is secure.
         */
        tlsOptions?: object;

        /**
         * A Boolean which allows you to disable the aggregate result phase of an instance run.
         */
        skipAggregateResult?: boolean;

        /**
         * A Boolean which allows you to print connection errors to stderr.
         * @default false
         */
        debug?: boolean;
    }

    interface Request {
        /**
         * When present, will override opts.body
         */
        body?: string | Buffer | undefined;
        /**
         * When present, will override opts.headers
         */
        headers?: IncomingHttpHeaders | undefined;
        /**
         * When present, will override opts.method
         */
        method?:
            | "ACL"
            | "BIND"
            | "CHECKOUT"
            | "CONNECT"
            | "COPY"
            | "DELETE"
            | "GET"
            | "HEAD"
            | "LINK"
            | "LOCK"
            | "M-SEARCH"
            | "MERGE"
            | "MKACTIVITY"
            | "MKCALENDAR"
            | "MKCOL"
            | "MOVE"
            | "NOTIFY"
            | "OPTIONS"
            | "PATCH"
            | "POST"
            | "PROPFIND"
            | "PROPPATCH"
            | "PURGE"
            | "PUT"
            | "REBIND"
            | "REPORT"
            | "SEARCH"
            | "SOURCE"
            | "SUBSCRIBE"
            | "TRACE"
            | "UNBIND"
            | "UNLINK"
            | "UNLOCK"
            | "UNSUBSCRIBE"
            | undefined;
        /**
         * When present, will override opts.path
         */
        path?: string | undefined;
        /**
         * A Function you may provide to mutate the raw request object, e.g. request.method = 'GET'.
         *
         * It must return the modified request.
         *
         * When it returns a falsy value, autocannon will restart from first request.
         *
         * When using workers, you need to supply a file path that default exports a function instead.
         */
        setupRequest?: ((request: Request, context: object) => Request) | string | undefined;
        /**
         * A Function you may provide to process the received response.
         *
         * When using workers, you need to supply a file path that default exports a function instead.
         */
        onResponse?:
            | ((status: number, body: string, context: object, headers: Request["headers"]) => void)
            | string
            | undefined;
    }

    /**
     * Autocannon instance/event emitter for tracking progress, etc.
     */
    interface Instance extends NodeJS.EventEmitter {
        /**
         * Emitted once everything has been setup in your autocannon instance and it has started.
         * Useful for if running the instance forever.
         */
        on(event: "start", listener: () => void): this;

        /**
         * Emitted every second this autocannon is running a benchmark.
         * Useful for displaying stats, etc. Used by the `track` function.
         */
        on(event: "tick", listener: () => void): this; // tslint:disable-line:unified-signatures

        /**
         * Emitted when the autocannon finishes a benchmark.
         */
        on(event: "done", listener: (result: Result) => void): this;

        /**
         * Emitted when the autocannons http-client gets a http response from the server.
         */
        on(
            event: "response",
            listener: (client: Client, statusCode: number, resBytes: number, responseTime: number) => void,
        ): this;

        /**
         * Emitted in the case of a request error e.g. a timeout.
         */
        on(event: "reqError", listener: (err: any) => void): this;

        /**
         * Emitted if there is an error during the setup phase of autocannon.
         */
        on(event: "error", listener: (err: any) => void): this; // tslint:disable-line:unified-signatures

        /**
         * Stop autocannon.
         */
        stop(): void;
    }

    /**
     * This object is passed as the first parameter of both the `setupClient` function and the `response` event from an autocannon instance.
     *
     * You can use this to modify the requests you are sending while benchmarking.
     */
    interface Client extends NodeJS.EventEmitter {
        /**
         * Used to modify the headers of the request this client iterator is currently on.
         * @param headers - should be an `Object`, or `undefined` if you want to remove your headers.
         */
        setHeaders(headers: IncomingHttpHeaders | undefined): void;

        /**
         * Used to modify the body of the request this client iterator is currently on. body
         * @param body - should be a `String` or `Buffer`, or `undefined` if you want to remove the body.
         */
        setBody(body: string | Buffer | undefined): void;

        /**
         * Used to modify the both the headers and body this client iterator is currently on.
         * @param headers - should be an `Object`, or `undefined` if you want to remove your headers.
         * @param body - should be a `String` or `Buffer`, or `undefined` if you want to remove the body.
         */
        setHeadersAndBody(headers: IncomingHttpHeaders | undefined, body: string | Buffer | undefined): void;

        /**
         * Used to modify the both the entire request that this client iterator is currently on.
         * Defaults to the values passed into the autocannon instance when it was created.
         *
         * _Note: call this when modifying multiple request values for faster encoding._
         */
        setRequest(request: Request): void;

        /**
         * Used to overwrite the entire requests array that was passed into the instance on initiation.
         *
         * _Note: call this when modifying multiple requests for faster encoding._
         */
        setRequests(newRequests: Request[]): void;

        /**
         * Emitted when a request sent from this client has received the headers of its reply.
         */
        on(event: "headers", listener: (headers: IncomingHttpHeaders) => void): this;

        /**
         * Emitted when a request sent from this client has received the body of a reply.
         */
        on(event: "body", listener: (body: Buffer) => void): this;

        /**
         * Emitted when the client has received a completed response for a request it made.
         */
        on(event: "response", listener: (statusCode: number, resBytes: number, responseTime: number) => void): this;
    }

    /**
     * The results object emitted by `done` and passed to the `autocannon()` callback.
     */
    interface Result {
        /** Value of the `title` option passed to `autocannon()`. */
        title: string | undefined;

        /** The URL that was targeted. */
        url: string;

        /** The UNIX Domain Socket or Windows Named Pipe that was targeted, or `undefined`. */
        socketPath: string | undefined;

        /** A histogram object containing statistics about the amount of requests that were sent per second. */
        requests: Histogram & { sent: number };

        /** A histogram object containing statistics about response latency. */
        latency: Histogram;

        /** A histogram object containing statistics about the response data throughput per second. */
        throughput: Histogram;

        /** The amount of time the test took, **in seconds**. */
        duration: number;

        /** The number of connection errors (including timeouts) that occurred. */
        errors: number;

        /** The number of connection timeouts that occurred. */
        timeouts: number;

        /** A Date object representing when the test started. */
        start: Date;

        /** A Date object representing when the test ended. */
        finish: Date;

        /** The amount of connections used (value of `options.connections`). */
        connections: number;

        /** The number of pipelined requests used per connection (value of `options.pipelining`). */
        pipelining: number;

        /** The number of non-2xx response status codes received. */
        non2xx: number;

        /** The number of 1xx response status codes received. */
        "1xx": number;

        /** The number of 2xx response status codes received. */
        "2xx": number;

        /** The number of 3xx response status codes received. */
        "3xx": number;

        /** The number of 4xx response status codes received. */
        "4xx": number;

        /** The number of 5xx response status codes received. */
        "5xx": number;

        /** The number of requests with a mismatched body. */
        mismatches: number;

        /** How many times the requests pipeline was reset due to setupRequest returning a falsy value. */
        resets: number;

        /** Requests counter per status code */
        statusCodeStats?: Record<`${number}`, { count?: number }>;
    }

    interface Histogram {
        total: number;

        /** The average (mean) value. */
        average: number;

        /** The average (mean) value */
        mean: number;

        /** The standard deviation. */
        stddev: number;

        /** The lowest value for this statistic. */
        min: number;

        /** The highest value for this statistic. */
        max: number;

        /** The 0.001st percentile value for this statistic. */
        p0_001: number;

        /** The 0.01st percentile value for this statistic. */
        p0_01: number;

        /** The 0.1st percentile value for this statistic. */
        p0_1: number;

        /** The 1st percentile value for this statistic. */
        p1: number;

        /** The 2.5th percentile value for this statistic. */
        p2_5: number;

        /** The 10th percentile value for this statistic. */
        p10: number;

        /** The 25th percentile value for this statistic. */
        p25: number;

        /** The 50th percentile value for this statistic. */
        p50: number;

        /** The 75th percentile value for this statistic. */
        p75: number;

        /** The 90th percentile value for this statistic. */
        p90: number;

        /** The 97.5th percentile value for this statistic. */
        p97_5: number;

        /** The 99th percentile value for this statistic. */
        p99: number;

        /** The 99.9th percentile value for this statistic. */
        p99_9: number;

        /** The 99.99th percentile value for this statistic. */
        p99_99: number;

        /** The 99.999th percentile value for this statistic. */
        p99_999: number;
    }

    interface TrackingOptions {
        /**
         * The stream to output to.
         * @default process.stderr
         */
        outputStream?: NodeJS.WritableStream | undefined;

        /**
         * A truthy value to enable the rendering of the progress bar.
         * @default true
         */
        renderProgressBar?: boolean | undefined;

        /**
         * A truthy value to enable the rendering of the results table.
         * @default true
         */
        renderResultsTable?: boolean | undefined;

        /**
         * A truthy value to enable the rendering of the advanced latency table.
         * @default false
         */
        renderLatencyTable?: boolean | undefined;

        /**
         * A `String` defining the format of the progress display output. Must be valid input for the [progress bar module](https://www.npmjs.com/package/progress).
         * @default 'running [:bar] :percent'
         */
        progressBarString?: string | undefined;
    }
    interface PrintResultOptions {
        /**
         * The stream to output to.
         * @default process.stderr
         */
        outputStream?: NodeJS.WritableStream | undefined;

        /**
         * A truthy value to enable the rendering of the results table.
         * @default true
         */
        renderResultsTable?: boolean | undefined;

        /**
         * A truthy value to enable the rendering of the advanced latency table.
         * @default false
         */
        renderLatencyTable?: boolean | undefined;
    }

    /**
     * Track the progress of your autocannon.
     */
    function track(instance: Instance, options?: TrackingOptions): void;
    /**
     * Return string to print the result tables to the terminal, programmatically.
     */
    function printResult(result: Result, options?: PrintResultOptions): string;
}

/**
 * Start autocannon against the given target.
 */
declare function autocannon(
    options: autocannon.Options,
    callback: (err: any, result: autocannon.Result) => any,
): autocannon.Instance;

declare function autocannon(options: autocannon.Options): Promise<autocannon.Result>;

export = autocannon;
