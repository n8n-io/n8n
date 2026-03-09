// OpenTelemetry tracing bootstrap for n8n on N|Solid runtime
// This file must be loaded via --require before any application code
// so the SDK can hook into Node.js modules before they are imported.
// Exports runtime metrics (CPU, memory, event loop, handles) as OTel gauges.

'use strict';

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader, MeterProvider } = require('@opentelemetry/sdk-metrics');
const resourcesPkg = require('@opentelemetry/resources');
const { metrics } = require('@opentelemetry/api');
const {
  ATTR_SERVICE_NAME,
  ATTR_HOST_NAME,
  ATTR_PROCESS_PID,
  ATTR_PROCESS_RUNTIME_NAME,
  ATTR_PROCESS_RUNTIME_VERSION,
} = require('@opentelemetry/semantic-conventions');

const os = require('os');
const v8 = require('v8');

// Get OTLP endpoint from environment (supports both NSOLID_OTLP_CONFIG and OTEL_* vars)
let OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
if (!OTLP_ENDPOINT) {
  try {
    const otlpConfig = JSON.parse(process.env.NSOLID_OTLP_CONFIG || '{}');
    OTLP_ENDPOINT = otlpConfig.url?.replace('/v1/traces', '').replace('/v1/metrics', '');
  } catch (e) {
    OTLP_ENDPOINT = 'http://localhost:4318';
  }
}

// Get service name from environment
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || process.env.NSOLID_APP || process.env.NSOLID_APPNAME || 'n8n';

// Create Resource in a way that's compatible across @opentelemetry/resources versions
const resourceAttributes = {
  [ATTR_SERVICE_NAME]: SERVICE_NAME,
  [ATTR_HOST_NAME]: os.hostname(),
  [ATTR_PROCESS_PID]: String(process.pid),
  [ATTR_PROCESS_RUNTIME_NAME]: 'nodejs',
  [ATTR_PROCESS_RUNTIME_VERSION]: process.version,
  'process.command': process.argv[1] || 'n8n',
  'process.command_args': JSON.stringify(process.argv),
  'process.executable.name': 'node',
  'process.executable.path': process.execPath,
  'process.runtime.description': 'Node.js',
  'telemetry.sdk.name': 'opentelemetry',
  'telemetry.sdk.version': '1.23.0',
};

let resource;
if (typeof resourcesPkg.createResource === 'function') {
  resource = resourcesPkg.createResource(resourceAttributes);
} else {
  const ResourceClass = resourcesPkg.Resource || resourcesPkg.default || resourcesPkg;
  if (typeof ResourceClass === 'function') {
    resource = new ResourceClass(resourceAttributes);
  } else {
    // Fallback: create a plain Resource-like object (best-effort)
    resource = { attributes: resourceAttributes };
  }
}

const traceExporter = new OTLPTraceExporter({
  url: `${OTLP_ENDPOINT}/v1/traces`,
});

const metricExporter = new OTLPMetricExporter({
  url: `${OTLP_ENDPOINT}/v1/metrics`,
});

const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 10_000, // Export metrics every 10 seconds
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Enable HTTP, DNS, Express etc. automatically
      '@opentelemetry/instrumentation-fs': { enabled: false }, // too noisy
    }),
  ],
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

const meter = metrics.getMeter('n8n-runtime-metrics', '1.0.0');

// Memory gauges
meter.createObservableGauge('process.memory.heap_used', {
  description: 'Heap memory used in bytes',
  unit: 'By',
}).addCallback((obs) => {
  obs.observe(process.memoryUsage().heapUsed);
});

meter.createObservableGauge('process.memory.heap_total', {
  description: 'Total heap memory in bytes',
  unit: 'By',
}).addCallback((obs) => {
  obs.observe(process.memoryUsage().heapTotal);
});

meter.createObservableGauge('process.memory.rss', {
  description: 'Resident set size in bytes',
  unit: 'By',
}).addCallback((obs) => {
  obs.observe(process.memoryUsage().rss);
});

meter.createObservableGauge('process.memory.external', {
  description: 'External memory used in bytes (C++ objects)',
  unit: 'By',
}).addCallback((obs) => {
  obs.observe(process.memoryUsage().external);
});

// CPU gauges (percentage since last sample)
let prevCpu = process.cpuUsage();
let prevCpuTime = process.hrtime.bigint();

meter.createObservableGauge('process.cpu.percent', {
  description: 'Total CPU usage as a percentage (0-100)',
  unit: '%',
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
  unit: 'ms',
}).addCallback((obs) => {
  obs.observe(eventLoopLag);
});

let eventLoopLag = 0;
function measureEventLoopLag() {
  const start = process.hrtime.bigint();
  setTimeout(() => {
    eventLoopLag = Number(process.hrtime.bigint() - start) / 1e6; // ns to ms
    measureEventLoopLag();
  }, 0);
}
measureEventLoopLag();

// V8 heap statistics
meter.createObservableGauge('nodejs.heap.size_limit', {
  description: 'V8 heap size limit in bytes',
  unit: 'By',
}).addCallback((obs) => {
  obs.observe(v8.getHeapStatistics().heap_size_limit);
});

// Active handles and requests
meter.createObservableGauge('nodejs.active_handles', {
  description: 'Number of active libuv handles',
}).addCallback((obs) => {
  obs.observe(process._getActiveHandles ? process._getActiveHandles().length : 0);
});

meter.createObservableGauge('nodejs.active_requests', {
  description: 'Number of active libuv requests',
}).addCallback((obs) => {
  obs.observe(process._getActiveRequests ? process._getActiveRequests().length : 0);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown().then(
    () => console.log('OpenTelemetry SDK shut down'),
    (err) => console.error('Error shutting down SDK', err),
  );
});