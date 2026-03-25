const onFinished = require('on-finished');
const promClient = require('prom-client');
const normalizePath = require('./normalizePath');
const normalizeStatusCode = require('./normalizeStatusCode');

function matchVsRegExps(element, regexps) {
  for (const regexp of regexps) {
    if (regexp instanceof RegExp) {
      if (element.match(regexp)) {
        return true;
      }
    } else if (element === regexp) {
      return true;
    }
  }
  return false;
}

function clusterMetrics() {
  const aggregatorRegistry = new promClient.AggregatorRegistry();

  const metricsMiddleware = function(req, res) {
    function sendClusterMetrics(clusterMetrics) {
      res.set('Content-Type', aggregatorRegistry.contentType);
      res.send(clusterMetrics);
    }

    function sendClusterMetricsError(err) {
      console.error(err);
      return res.sendStatus(500);
    }

    // since prom-client@13 clusterMetrics() method doesn't take cb param,
    // but we provide it anyway, as at this stage it's unknown which version of prom-client is used
    const response = aggregatorRegistry.clusterMetrics((err, clusterMetrics) => {
      if (err) {
        return sendClusterMetricsError(err);
      }
      sendClusterMetrics(clusterMetrics);
    });

    // if we find out that it was a promise and our cb was useless...
    if (response && response.then) {
      response
        .then(result => sendClusterMetrics(result))
        .catch(err => sendClusterMetricsError(err));
    }
  };

  return metricsMiddleware;
}

function main(opts) {
  if (arguments[2] && arguments[1] && arguments[1].send) {
    arguments[1].status(500)
      .send('<h1>500 Error</h1>\n'
        + '<p>Unexpected 3rd param in express-prom-bundle.\n'
        + '<p>Did you just put express-prom-bundle into app.use '
        + 'without calling it as a function first?');
    return;
  }

  opts = Object.assign(
    {
      autoregister: true,
      includeStatusCode: true,
      normalizePath: main.normalizePath,
      formatStatusCode: main.normalizeStatusCode,
      metricType: 'histogram',
      promClient: {},
      promRegistry: promClient.register,
      metricsApp: null,
    }, opts
  );

  if (opts.prefix
    || opts.keepDefaultMetrics !== undefined
    || opts.whitelist !== undefined
    || opts.blacklist !== undefined
  ) {
    throw new Error(
      'express-prom-bundle detected one of the obsolete options: '
      + 'prefix, keepDefaultMetrics, whitelist, blacklist. '
      + 'Please refer to oficial docs. '
      + 'Most likely you upgraded the module without the necessary code changes'
    );
  }

  if (opts.promClient.collectDefaultMetrics) {
    promClient.collectDefaultMetrics(opts.promClient.collectDefaultMetrics);
  }

  const httpMetricName = opts.httpDurationMetricName || 'http_request_duration_seconds';

  function makeHttpMetric() {
    const labels = ['status_code'];
    if (opts.includeMethod) {
      labels.push('method');
    }
    if (opts.includePath) {
      labels.push('path');
    }
    if (opts.customLabels) {
      labels.push.apply(labels, Object.keys(opts.customLabels));
    }

    if (opts.metricType === 'summary') {
      return new promClient.Summary({
        name: httpMetricName,
        help: 'duration summary of http responses labeled with: ' + labels.join(', '),
        labelNames: labels,
        percentiles: opts.percentiles || [0.5, 0.75, 0.95, 0.98, 0.99, 0.999],
        maxAgeSeconds:  opts.maxAgeSeconds,
        ageBuckets: opts.ageBuckets,
        registers: [opts.promRegistry],
        pruneAgedBuckets: opts.pruneAgedBuckets
      });
    } else if (opts.metricType === 'histogram' || !opts.metricType) {
      return new promClient.Histogram({
        name: httpMetricName,
        help: 'duration histogram of http responses labeled with: ' + labels.join(', '),
        labelNames: labels,
        buckets: opts.buckets || [0.003, 0.03, 0.1, 0.3, 1.5, 10],
        registers: [opts.promRegistry]
      });
    } else {
      throw new Error('metricType option must be histogram or summary');
    }
  }

  const metrics = {
    [httpMetricName]: makeHttpMetric()
  };

  if (opts.includeUp !== false) {
    let prefix = '';
    if (opts.promClient && opts.promClient.collectDefaultMetrics) {
      prefix = opts.promClient.collectDefaultMetrics.prefix || '';
    }
    metrics.up = new promClient.Gauge({
      name: `${prefix}up`,
      help: '1 = up, 0 = not up',
      registers: [opts.promRegistry]
    });
    metrics.up.set(1);
  }

  const metricsMiddleware = function(req, res, next) {
    const sendSuccesss = (output) => {
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end(output);
    };

    const metricsResponse = opts.promRegistry.metrics();
    // starting from prom-client@13 .metrics() returns a Promise
    if (metricsResponse.then) {
      metricsResponse
        .then(output => sendSuccesss(output))
        .catch(err => next(err));
    } else {
      // compatibility fallback for previous versions of prom-client@<=12
      sendSuccesss(metricsResponse);
    }
  };

  const metricsMatch = opts.metricsPath instanceof RegExp ? opts.metricsPath
    : new RegExp('^' + (opts.metricsPath || '/metrics') + '/?$');

  if (typeof opts.bypass === 'function') {
    opts.bypass = {
      onRequest: opts.bypass
    };
  } else if (!opts.bypass) {
    opts.bypass = {};
  }

  const middleware = function (req, res, next) {
    const path = req.originalUrl || req.url; // originalUrl gets lost in koa-connect?

    if (opts.autoregister && path.match(metricsMatch)) {
      return metricsMiddleware(req, res, next);
    }

    // bypass() is checked only after /metrics was processed
    // if you wish to disable /metrics use autoregister:false instead
    if (opts.bypass.onRequest && opts.bypass.onRequest(req)) {
      return next();
    }

    if (opts.excludeRoutes && matchVsRegExps(path, opts.excludeRoutes)) {
      return next();
    }

    const labels = {};
    const timer = metrics[httpMetricName].startTimer(labels);

    onFinished(res, () => {
      if (opts.bypass.onFinish && opts.bypass.onFinish(req, res)) {
        return;
      }

      if (opts.includeStatusCode) {
        labels.status_code = opts.formatStatusCode(res, opts);
      }
      if (opts.includeMethod) {
        labels.method = req.method;
      }
      if (opts.includePath) {
        labels.path = opts.normalizePath instanceof Function
          ? opts.normalizePath(req, opts)
          : main.normalizePath(req, opts);
      }
      if (opts.customLabels) {
        Object.assign(labels, opts.customLabels);
      }
      if (opts.transformLabels) {
        opts.transformLabels(labels, req, res);
      }
      timer();
    });

    next();
  };

  if (opts.metricsApp) {
    opts.metricsApp.get(opts.metricsPath || '/metrics', (req, res) => {
      res.set('Content-Type', opts.promRegistry.contentType);
      opts.promRegistry.metrics()
        .then(metrics => res.end(metrics));
    });
  }

  middleware.metrics = metrics;
  middleware.promClient = promClient;
  middleware.metricsMiddleware = metricsMiddleware;
  return middleware;
}

// this is kept only for compatibility with the code relying on older version
main.promClient = promClient;

main.normalizePath = normalizePath;
main.normalizeStatusCode = normalizeStatusCode;
main.clusterMetrics = clusterMetrics;
module.exports = main;
