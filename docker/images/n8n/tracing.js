// OpenTelemetry tracing bootstrap for n8n on N|Solid runtime
// This file must be loaded via --require before any application code
// so the SDK can hook into Node.js modules before they are imported.
// Exports runtime metrics (CPU, memory, event loop, handles) as OTel gauges.

'use strict';

var NodeSDK = require('@opentelemetry/sdk-node').NodeSDK;
var getNodeAutoInstrumentations = require('@opentelemetry/auto-instrumentations-node').getNodeAutoInstrumentations;
var OTLPTraceExporter = require('@opentelemetry/exporter-trace-otlp-http').OTLPTraceExporter;
var OTLPMetricExporter = require('@opentelemetry/exporter-metrics-otlp-http').OTLPMetricExporter;
var PeriodicExportingMetricReader = require('@opentelemetry/sdk-metrics').PeriodicExportingMetricReader;
var resourcesPkg = require('@opentelemetry/resources');
var metrics = require('@opentelemetry/api').metrics;
var semantic = require('@opentelemetry/semantic-conventions');
var ATTR_SERVICE_NAME = semantic.ATTR_SERVICE_NAME;
var ATTR_HOST_NAME = semantic.ATTR_HOST_NAME;
var ATTR_PROCESS_PID = semantic.ATTR_PROCESS_PID;
var ATTR_PROCESS_RUNTIME_NAME = semantic.ATTR_PROCESS_RUNTIME_NAME;
var ATTR_PROCESS_RUNTIME_VERSION = semantic.ATTR_PROCESS_RUNTIME_VERSION;

var os = require('os');
var v8 = require('v8');

// Get OTLP endpoint from environment (supports both NSOLID_OTLP_CONFIG and OTEL_* vars)
var OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
if (!OTLP_ENDPOINT) {
  try {
    var otlpConfig = {};
    try {
      otlpConfig = JSON.parse(process.env.NSOLID_OTLP_CONFIG || '{}');
    } catch (e) {
      otlpConfig = {};
    }
    var parsedUrl = (otlpConfig && otlpConfig.url) ? otlpConfig.url.replace('/v1/traces', '').replace('/v1/metrics', '') : undefined;
    OTLP_ENDPOINT = parsedUrl || 'http://localhost:4318';
  } catch (e) {
    OTLP_ENDPOINT = 'http://localhost:4318';
  }
}

// Get service name from environment
var SERVICE_NAME = process.env.OTEL_SERVICE_NAME || process.env.NSOLID_APP || process.env.NSOLID_APPNAME || 'n8n';

// Create Resource in a way that's compatible across @opentelemetry/resources versions
var resourceAttributes = {};
resourceAttributes[ATTR_SERVICE_NAME] = SERVICE_NAME;
resourceAttributes[ATTR_HOST_NAME] = os.hostname();
resourceAttributes[ATTR_PROCESS_PID] = String(process.pid);
resourceAttributes[ATTR_PROCESS_RUNTIME_NAME] = 'nodejs';
resourceAttributes[ATTR_PROCESS_RUNTIME_VERSION] = process.version;
resourceAttributes['process.command'] = process.argv[1] || 'n8n';
resourceAttributes['process.command_args'] = JSON.stringify(process.argv);
resourceAttributes['process.executable.name'] = 'node';
resourceAttributes['process.executable.path'] = process.execPath;
resourceAttributes['process.runtime.description'] = 'Node.js';

var resource;
if (typeof resourcesPkg.createResource === 'function') {
  resource = resourcesPkg.createResource(resourceAttributes);
} else {
  var ResourceClass = resourcesPkg.Resource || resourcesPkg.default || resourcesPkg;
  if (typeof ResourceClass === 'function') {
    resource = new ResourceClass(resourceAttributes);
  } else {
    resource = { attributes: resourceAttributes };
  }
}

var traceExporter = new OTLPTraceExporter({
  url: OTLP_ENDPOINT + '/v1/traces'
});

var metricExporter = new OTLPMetricExporter({
  url: OTLP_ENDPOINT + '/v1/metrics'
});

var sdk = new NodeSDK({
  resource: resource,
  traceExporter: traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 10000
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false }
    })
  ]
});

sdk
  .start()
  .then(() => {
    console.log('OpenTelemetry SDK initialized for n8n - exporting to', OTLP_ENDPOINT);
  })
  .catch((err) => {
    console.error('Failed to start OpenTelemetry SDK', err);
    process.exit(1);
  });

// ---------------------------------------------------------------------------
// Custom runtime metrics as OTel observable gauges
// These surface Node.js process health in the same way N|Solid would.
// ---------------------------------------------------------------------------

var meter = metrics.getMeter('n8n-runtime-metrics', '1.0.0');

// Memory gauges
meter.createObservableGauge('process.memory.heap_used', {
  description: 'Heap memory used in bytes',
  unit: 'By'
}).addCallback((obs) => {
  obs.observe(process.memoryUsage().heapUsed);
});

meter.createObservableGauge('process.memory.heap_total', {
  description: 'Total heap memory in bytes',
  unit: 'By'
}).addCallback((obs) => {
  obs.observe(process.memoryUsage().heapTotal);
});

meter.createObservableGauge('process.memory.rss', {
  description: 'Resident set size in bytes',
  unit: 'By'
}).addCallback((obs) => {
  obs.observe(process.memoryUsage().rss);
});

meter.createObservableGauge('process.memory.external', {
  description: 'External memory used in bytes (C++ objects)',
  unit: 'By'
}).addCallback((obs) => {
  obs.observe(process.memoryUsage().external);
});

// CPU gauges (percentage since last sample)
var prevCpu = process.cpuUsage();
var prevCpuTime = process.hrtime.bigint();

meter.createObservableGauge('process.cpu.percent', {
  description: 'Total CPU usage as a percentage (0-100)',
  unit: '%'
}).addCallback((obs) => {
  const now = process.hrtime.bigint();
  const currentCpu = process.cpuUsage();
  const elapsedUs = Number(now - prevCpuTime) / 1000; // ns to us
  if (elapsedUs > 0) {
    const userDelta = currentCpu.user - prevCpu.user;
    const systemDelta = currentCpu.system - prevCpu.system;
    const totalDelta = userDelta + systemDelta;
    const cpuPercent = (totalDelta / elapsedUs) * 100;
    obs.observe(Math.min(cpuPercent, 100));
  }
  prevCpu = currentCpu;
  prevCpuTime = now;
});

// Event loop lag
meter.createObservableGauge('nodejs.eventloop.lag', {
  description: 'Event loop lag in milliseconds',
  unit: 'ms'
}).addCallback((obs) => {
  obs.observe(eventLoopLag);
});

var eventLoopLag = 0;
function measureEventLoopLag() {
  var start = process.hrtime.bigint();
  setTimeout(function () {
    eventLoopLag = Number(process.hrtime.bigint() - start) / 1e6;
    measureEventLoopLag();
  }, 0);
}
measureEventLoopLag();

// V8 heap statistics
meter.createObservableGauge('nodejs.heap.size_limit', {
  description: 'V8 heap size limit in bytes',
  unit: 'By'
}).addCallback((obs) => {
  obs.observe(v8.getHeapStatistics().heap_size_limit);
});

// Active handles and requests
meter.createObservableGauge('nodejs.active_handles', {
  description: 'Number of active libuv handles'
}).addCallback((obs) => {
  obs.observe(process._getActiveHandles ? process._getActiveHandles().length : 0);
});

meter.createObservableGauge('nodejs.active_requests', {
  description: 'Number of active libuv requests'
}).addCallback((obs) => {
  obs.observe(process._getActiveRequests ? process._getActiveRequests().length : 0);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown().then(
    () => console.log('OpenTelemetry SDK shut down'),
    (err) => console.error('Error shutting down SDK', err)
  );
});
