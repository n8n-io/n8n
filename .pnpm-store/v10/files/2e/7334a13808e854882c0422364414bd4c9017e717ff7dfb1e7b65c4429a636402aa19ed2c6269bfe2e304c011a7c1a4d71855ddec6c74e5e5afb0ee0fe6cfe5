[![build status](https://travis-ci.org/jochen-schweizer/express-prom-bundle.png)](https://travis-ci.org/jochen-schweizer/express-prom-bundle) [![Coverage Status](https://coveralls.io/repos/github/jochen-schweizer/express-prom-bundle/badge.svg?branch=master)](https://coveralls.io/github/jochen-schweizer/express-prom-bundle?branch=master) [![license](https://img.shields.io/github/license/mashape/apistatus.svg?maxAge=2592000)](https://www.tldrlegal.com/l/mit) [![NPM version](https://badge.fury.io/js/express-prom-bundle.png)](http://badge.fury.io/js/express-prom-bundle)

# express prometheus bundle

Express middleware with popular prometheus metrics in one bundle. It's also compatible with koa v1 and v2 (see below).

This library uses **prom-client v15+** as a peer dependency. See: https://github.com/siimon/prom-client

If you need a support for older versions of prom-client (v12-v14), downgrade to express-prom-bundle v6.6.0

Included metrics:

* `up`: normally is just 1
* `http_request_duration_seconds`: http latency histogram/summary labeled with `status_code`, `method` and `path`

## Install

```
npm install prom-client express-prom-bundle
```

## Sample Usage

```javascript
const promBundle = require("express-prom-bundle");
const app = require("express")();
const metricsMiddleware = promBundle({includeMethod: true});

app.use(metricsMiddleware);
app.use(/* your middleware */);
app.listen(3000);
```

* call your endpoints
* see your metrics here: [http://localhost:3000/metrics](http://localhost:3000/metrics)

**ALERT!**

The order in which the routes are registered is important, since
**only the routes registered after the express-prom-bundle will be measured**

You can use this to your advantage to bypass some of the routes.
See the example below.

## Options

Which labels to include in `http_request_duration_seconds` metric:

* **includeStatusCode**: HTTP status code (200, 400, 404 etc.), default: **true**
* **includeMethod**: HTTP method (GET, PUT, ...), default: **false**
* **includePath**: URL path (see important details below), default: **false**
* **customLabels**: an object containing extra labels, e.g. ```{project_name: 'hello_world'}```.
  Most useful together with **transformLabels** callback, otherwise it's better to use native Prometheus relabeling.
* **includeUp**: include an auxiliary "up"-metric which always returns 1, default: **true**
* **metricsPath**: replace the `/metrics` route with a **regex** or exact **string**. Note: it is highly recommended to just stick to the default
* **metricType**: histogram/summary selection. See more details below
* **httpDurationMetricName**: Allows you change the name of HTTP duration metric, default: **`http_request_duration_seconds`**.

### metricType option ###

Two metric types are supported for `http_request_duration_seconds` metric:
* [histogram](https://prometheus.io/docs/concepts/metric_types/#histogram) (default)
* [summary](https://prometheus.io/docs/concepts/metric_types/#summary)

Additional options for **histogram**:
* **buckets**: buckets used for the `http_request_duration_seconds` histogram

Additional options for **summary**:
* **percentiles**: percentiles used for `http_request_duration_seconds` summary
* **ageBuckets**: ageBuckets configures how many buckets we have in our sliding window for the summary
* **maxAgeSeconds**: the maxAgeSeconds will tell how old a bucket can be before it is reset
* **pruneAgedBuckets**: When enabled, timed out buckets will be removed entirely. By default, buckets are reset to 0.

### Transformation callbacks ###

* **normalizePath**: `function(req)`  or `Array`
  * if function is provided, then it should generate path value from express `req`
  * if array is provided, then it should be an array of tuples `[regex, replacement]`. The `regex` can be a string and is automatically converted into JS regex.
  * ... see more details in the section below
* **urlValueParser**: options passed when instantiating [url-value-parser](https://github.com/disjunction/url-value-parser).
  This is the easiest way to customize which parts of the URL should be replaced with "#val".
  See the [docs](https://github.com/disjunction/url-value-parser) of url-value-parser module for details.
* **formatStatusCode**: `function(res)` producing final status code from express `res` object, e.g. you can combine `200`, `201` and `204` to just `2xx`.
* **transformLabels**: `function(labels, req, res)` transforms the **labels** object, e.g. setting dynamic values to **customLabels**
* **urlPathReplacement**: replacement string for the values (default: "#val")

### Other options ###

* **autoregister**: if `/metrics` endpoint should be registered (default: **true**)
* **promClient**: options for promClient startup, e.g. **collectDefaultMetrics**. This option was added
  to keep `express-prom-bundle` runnable using confit (e.g. with kraken.js) without writing any JS code,
  see [advanced example](https://github.com/jochen-schweizer/express-prom-bundle/blob/master/advanced-example.js)
* **promRegistry**: Optional `promClient.Registry` instance to attach metrics to. Defaults to global `promClient.register`.
* **metricsApp**: Allows you to attach the metrics endpoint to a different express app. You probably want to use it in combination with `autoregister: false`.
* **bypass**: An object that takes onRequest and onFinish callbacks that determines whether the given request should be excluded in the metrics. Default:

  ```js
  {
    onRequest: (req) => false,
    onFinish: (req, res) => false
  }
  ```

  `onRequest` is run directly in the middleware chain, before the request is processed. `onFinish` is run after the request has been processed, and has access to the express response object in addition to the request object. Both callbacks are optional, and if one or both returns true the request is excluded.

  As a shorthand, just the onRequest callback can be used instead of the object.


### More details on includePath option

Let's say you want to have  latency statistics by URL path,
e.g. separate metrics for `/my-app/user/`, `/products/by-category` etc.

Just taking `req.path` as a label value won't work as IDs are often part of the URL,
like `/user/12352/profile`. So what we actually need is a path template.
The module tries to figure out what parts of the path are values or IDs,
and what is an actual path. The example mentioned before would be
normalized to `/user/#val/profile` and that will become the value for the label.
These conversions are handled by `normalizePath` function.

You can extend this magical behavior by providing
additional RegExp rules to be performed,
or override `normalizePath` with your own function.

#### Example 1 (add custom RegExp):

```javascript
app.use(promBundle({
  normalizePath: [
    // collect paths like "/customer/johnbobson" as just one "/custom/#name"
    ['^/customer/.*', '/customer/#name'],

    // collect paths like "/bobjohnson/order-list" as just one "/#name/order-list"
    ['^.*/order-list', '/#name/order-list']
  ],
  urlValueParser: {
    minHexLength: 5,
    extraMasks: [
      'ORD[0-9]{5,}' // replace strings like ORD1243423, ORD673562 as #val
    ]
  }
}));
```

#### Example 2 (override normalizePath function):

```javascript
app.use(promBundle(/* options? */));

// let's reuse the existing one and just add some
// functionality on top
const originalNormalize = promBundle.normalizePath;
promBundle.normalizePath = (req, opts) => {
  const path = originalNormalize(req, opts);
  // count all docs as one path, but /docs/login as a separate one
  return (path.match(/^\/docs/) && !path.match(/^\/login/)) ? '/docs/*' : path;
};
```

For more details:
 * [url-value-parser](https://www.npmjs.com/package/url-value-parser) - magic behind automatic path normalization
 * [normalizePath.js](https://github.com/jochen-schweizer/express-prom-bundle/blob/master/src/normalizePath.js) - source code for path processing


#### Example 3 (return express route definition):

```javascript
app.use(promBundle(/* options? */));

promBundle.normalizePath = (req, opts) => {
  // Return the path of the express route (i.e. /v1/user/:id or /v1/timer/automated/:userid/:timerid")
  return req.route?.path ?? "NULL";
};
```

## express example

setup std. metrics but exclude `up`-metric:

```javascript
const express = require("express");
const app = express();
const promBundle = require("express-prom-bundle");

// calls to this route will not appear in metrics
// because it's applied before promBundle
app.get("/status", (req, res) => res.send("i am healthy"));

// register metrics collection for all routes
// ... except those starting with /foo
app.use("/((?!foo))*", promBundle({includePath: true}));

// this call will NOT appear in metrics,
// because express will skip the metrics middleware
app.get("/foo", (req, res) => res.send("bar"));

// calls to this route will appear in metrics
app.get("/hello", (req, res) => res.send("ok"));

app.listen(3000);
```

See an [advanced example on github](https://github.com/jochen-schweizer/express-prom-bundle/blob/master/advanced-example.js)

## koa v2 example

```javascript
const promBundle = require("express-prom-bundle");
const Koa = require("koa");
const c2k = require("koa-connect");
const metricsMiddleware = promBundle({/* options */ });

const app = new Koa();

app.use(c2k(metricsMiddleware));
app.use(/* your middleware */);
app.listen(3000);
```

## using with cluster

You'll need to use an additional **clusterMetrics()** middleware.

In the example below the master process will expose an API with a single endpoint `/metrics`
which returns an aggregate of all metrics from all the workers.

``` javascript
const cluster = require('cluster');
const promBundle = require('express-prom-bundle');
const promClient = require('prom-client');
const numCPUs = Math.max(2, require('os').cpus().length);
const express = require('express');

if (cluster.isMaster) {
    for (let i = 1; i < numCPUs; i++) {
        cluster.fork();
    }

    const metricsApp = express();
    metricsApp.use('/metrics', promBundle.clusterMetrics());
    metricsApp.listen(9999);

    console.log('cluster metrics listening on 9999');
    console.log('call localhost:9999/metrics for aggregated metrics');
} else {
    new promClient.AggregatorRegistry();
    const app = express();
    app.use(promBundle({
        autoregister: false, // disable /metrics for single workers
        includeMethod: true
    }));
    app.use((req, res) => res.send(`hello from pid ${process.pid}\n`));
    app.listen(3000);
    console.log(`worker ${process.pid} listening on 3000`);
}
```

## using with kraken.js

Here is meddleware config sample, which can be used in a standard **kraken.js** application.
In this case the stats for URI paths and HTTP methods are collected separately,
while replacing all HEX values starting from 5 characters and all IP addresses in the path as #val.

```json
{
  "middleware": {
    "expressPromBundle": {
      "route": "/((?!status|favicon.ico|robots.txt))*",
      "priority": 0,
      "module": {
        "name": "express-prom-bundle",
        "arguments": [
          {
            "includeMethod": true,
            "includePath": true,
            "buckets": [0.1, 1, 5],
            "promClient": {
              "collectDefaultMetrics": {
              }
            },
            "urlValueParser": {
              "minHexLength": 5,
              "extraMasks": [
                "^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$"
              ]
            }
          }
        ]
      }
    }
  }
}
```

## License

MIT
