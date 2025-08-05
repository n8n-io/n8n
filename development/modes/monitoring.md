# MONITORING Mode Instructions

You are in MONITORING mode, focused on comprehensive observability, alerting systems, and operational dashboard creation with proactive monitoring strategies.

*Note: All core quality standards, subagent requirements, thinking escalation rules, and TaskManager workflows are in CLAUDE.md. This mode adds monitoring-specific observability and alerting frameworks only.*

## Monitoring Strategy Framework

### 1. Observability Pillars Implementation

#### Metrics Collection Strategy
```
Golden Signals (SRE Methodology):
├── Latency: Response time distribution and percentiles
├── Traffic: Request rate and throughput patterns
├── Errors: Error rate and failure classifications
└── Saturation: Resource utilization and capacity metrics

Application Metrics:
├── Business metrics (conversions, user actions, revenue)
├── Custom metrics (feature usage, workflow completion)
├── Performance metrics (database queries, cache hits)
└── Security metrics (authentication failures, suspicious activity)
```

#### Distributed Tracing Implementation
```javascript
// OpenTelemetry Tracing Setup
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

class DistributedTracing {
  constructor(serviceName, environment) {
    this.sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
      }),
      traceExporter: new JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT,
      }),
      metricExporter: new PrometheusExporter({
        port: 9464,
      }),
    });
  }

  start() {
    this.sdk.start();
    console.log('Distributed tracing initialized successfully');
  }

  createSpan(name, attributes = {}) {
    const tracer = trace.getTracer('application-tracer');
    return tracer.startSpan(name, {
      attributes: {
        ...attributes,
        'service.operation': name,
        'trace.timestamp': Date.now(),
      }
    });
  }

  recordCustomMetric(name, value, attributes = {}) {
    const meter = metrics.getMeter('application-metrics');
    const counter = meter.createCounter(name, {
      description: `Custom metric: ${name}`,
    });
    
    counter.add(value, attributes);
  }
}
```

#### Structured Logging Framework
```python
import logging
import json
import time
from datetime import datetime
from contextvars import ContextVar

# Context variables for request tracing
trace_id = ContextVar('trace_id', default=None)
span_id = ContextVar('span_id', default=None)
user_id = ContextVar('user_id', default=None)

class StructuredLogger:
    def __init__(self, service_name, environment):
        self.service_name = service_name
        self.environment = environment
        self.logger = logging.getLogger(service_name)
        
        # Configure structured logging
        handler = logging.StreamHandler()
        handler.setFormatter(StructuredFormatter())
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)
    
    def log(self, level, message, **kwargs):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': level,
            'service': self.service_name,
            'environment': self.environment,
            'message': message,
            'trace_id': trace_id.get(),
            'span_id': span_id.get(),
            'user_id': user_id.get(),
            **kwargs
        }
        
        self.logger.log(getattr(logging, level.upper()), json.dumps(log_entry))
    
    def info(self, message, **kwargs):
        self.log('info', message, **kwargs)
    
    def error(self, message, error=None, **kwargs):
        error_data = {}
        if error:
            error_data = {
                'error_type': type(error).__name__,
                'error_message': str(error),
                'stack_trace': traceback.format_exc()
            }
        
        self.log('error', message, **error_data, **kwargs)
    
    def business_event(self, event_name, **kwargs):
        self.log('info', f'Business event: {event_name}', 
                event_type='business_event',
                event_name=event_name,
                **kwargs)

class StructuredFormatter(logging.Formatter):
    def format(self, record):
        return record.getMessage()
```

### 2. Alert Configuration Framework

#### Alert Severity Classification
```yaml
# Alert Severity Levels and Response Procedures
alert_levels:
  critical:
    description: "System down, major functionality broken, data loss"
    response_time: "< 5 minutes"
    escalation: ["on-call-engineer", "incident-commander", "engineering-manager"]
    notification_channels: ["pagerduty", "phone", "slack-critical"]
    examples:
      - "Service completely unavailable (>50% error rate)"
      - "Database connection failures"
      - "Security breach detected"
      - "Payment processing completely down"
    
  high:
    description: "Major degradation, significant user impact"
    response_time: "< 15 minutes"
    escalation: ["on-call-engineer", "team-lead"]
    notification_channels: ["pagerduty", "slack-alerts"]
    examples:
      - "Response time > 5 seconds for critical endpoints"
      - "Error rate > 5% for important features"
      - "Key integrations failing"
      - "High memory/CPU usage (>90%)"
    
  medium:
    description: "Performance degradation, minor functionality issues"
    response_time: "< 1 hour"
    escalation: ["on-call-engineer"]
    notification_channels: ["slack-alerts", "email"]
    examples:
      - "Response time > 2 seconds"
      - "Error rate > 1%"
      - "Queue lengths growing"
      - "Cache hit rate < 80%"
    
  low:
    description: "Informational, trend monitoring"
    response_time: "Next business day"
    escalation: ["team-channel"]
    notification_channels: ["slack-info"]
    examples:
      - "Disk usage > 80%"
      - "Unusual traffic patterns"
      - "Minor configuration warnings"
      - "Deployment notifications"
```

#### Prometheus Alert Rules
```yaml
# Prometheus Alert Rules Configuration
groups:
  - name: application_alerts
    rules:
      # Critical Alerts
      - alert: ServiceDown
        expr: up{job="api-service"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"
          runbook_url: "https://runbooks.company.com/service-down"
      
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"
      
      # High Priority Alerts
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 2.0
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"
      
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_activity_count > 80
        for: 3m
        labels:
          severity: high
        annotations:
          summary: "High number of database connections"
          description: "Database has {{ $value }} active connections"
      
      # Medium Priority Alerts
      - alert: QueueLengthGrowing
        expr: increase(queue_length[10m]) > 100
        for: 5m
        labels:
          severity: medium
        annotations:
          summary: "Queue length growing rapidly"
          description: "Queue length increased by {{ $value }} in 10 minutes"

  - name: infrastructure_alerts
    rules:
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.85
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value | humanizePercentage }}"
      
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 10m
        labels:
          severity: medium
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value }}%"
      
      - alert: DiskSpaceRunningOut
        expr: (node_filesystem_size_bytes - node_filesystem_free_bytes) / node_filesystem_size_bytes > 0.8
        for: 5m
        labels:
          severity: medium
        annotations:
          summary: "Disk space running out on {{ $labels.instance }}"
          description: "Disk usage is {{ $value | humanizePercentage }}"
```

### 3. Dashboard Creation Framework

#### Executive Dashboard Configuration
```json
{
  "dashboard": {
    "title": "Executive Overview Dashboard",
    "tags": ["executive", "overview"],
    "refresh": "5m",
    "time": {
      "from": "now-24h",
      "to": "now"
    },
    "panels": [
      {
        "title": "Service Health Overview",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job=~\".*-service\"} == 1",
            "legendFormat": "{{ job }}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "green", "value": 1}
              ]
            }
          }
        }
      },
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m]))",
            "legendFormat": "Requests/sec"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph", 
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))",
            "legendFormat": "Error Rate"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "max": 0.1
          }
        }
      },
      {
        "title": "Business Metrics",
        "type": "table",
        "targets": [
          {
            "expr": "increase(business_events_total{event_type=\"purchase\"}[1h])",
            "legendFormat": "Purchases (Last Hour)"
          },
          {
            "expr": "increase(business_events_total{event_type=\"signup\"}[1h])",
            "legendFormat": "Signups (Last Hour)"
          }
        ]
      }
    ]
  }
}
```

#### Operational Dashboard for Engineering Teams
```javascript
// Grafana Dashboard Configuration (JavaScript format)
const operationalDashboard = {
  dashboard: {
    title: "Operational Dashboard - Engineering",
    tags: ["operations", "engineering"],
    editable: true,
    graphTooltip: 1,
    
    panels: [
      // System Health Panel
      {
        title: "System Health Matrix",
        type: "heatmap",
        targets: [{
          expr: 'avg_over_time(up{job=~".*-service"}[5m])',
          legendFormat: "{{ job }}"
        }],
        xAxis: { show: true },
        yAxis: { show: true, logBase: 1 },
        color: { mode: "spectrum" }
      },
      
      // Performance Metrics
      {
        title: "Response Time Distribution",
        type: "graph",
        targets: [
          {
            expr: 'histogram_quantile(0.50, http_request_duration_seconds)',
            legendFormat: "50th percentile"
          },
          {
            expr: 'histogram_quantile(0.95, http_request_duration_seconds)',
            legendFormat: "95th percentile"
          },
          {
            expr: 'histogram_quantile(0.99, http_request_duration_seconds)',
            legendFormat: "99th percentile"
          }
        ],
        yAxes: [{ unit: "s", min: 0 }]
      },
      
      // Database Performance
      {
        title: "Database Performance",
        type: "graph",
        targets: [
          {
            expr: 'avg(pg_stat_database_tup_fetched) by (datname)',
            legendFormat: "{{ datname }} - Tuples Fetched"
          },
          {
            expr: 'avg(pg_stat_database_blk_read_time) by (datname)',
            legendFormat: "{{ datname }} - Block Read Time"
          }
        ]
      },
      
      // Error Analysis
      {
        title: "Error Analysis by Endpoint",
        type: "table",
        targets: [{
          expr: 'sum(rate(http_requests_total{status=~"4..|5.."}[5m])) by (method, handler)',
          format: "table",
          instant: true
        }],
        transformations: [
          {
            id: "organize",
            options: {
              excludeByName: { "Time": true },
              indexByName: { "method": 0, "handler": 1, "Value": 2 },
              renameByName: { "Value": "Error Rate" }
            }
          }
        ]
      }
    ],
    
    // Template Variables
    templating: {
      list: [
        {
          name: "environment",
          type: "query",
          query: 'label_values(up, environment)',
          current: { value: "production", text: "production" }
        },
        {
          name: "service",
          type: "query", 
          query: 'label_values(up{environment="$environment"}, job)',
          current: { value: "all", text: "All" }
        }
      ]
    }
  }
};
```

## Application Performance Monitoring (APM)

### 1. Custom Metrics Implementation

#### Business Metrics Collection
```python
from prometheus_client import Counter, Histogram, Gauge, generate_latest
import time
from functools import wraps

class BusinessMetrics:
    def __init__(self):
        # Business Event Counters
        self.user_registrations = Counter(
            'user_registrations_total',
            'Total number of user registrations',
            ['source', 'plan_type']
        )
        
        self.purchases = Counter(
            'purchases_total',
            'Total number of purchases',
            ['product_category', 'payment_method']
        )
        
        self.feature_usage = Counter(
            'feature_usage_total',
            'Feature usage counter',
            ['feature_name', 'user_tier']
        )
        
        # Performance Metrics
        self.request_duration = Histogram(
            'request_duration_seconds',
            'Request duration in seconds',
            ['method', 'endpoint', 'status_code']
        )
        
        self.active_users = Gauge(
            'active_users_current',
            'Current number of active users'
        )
        
        self.queue_length = Gauge(
            'queue_length_current',
            'Current queue length',
            ['queue_name']
        )
    
    def record_user_registration(self, source, plan_type):
        self.user_registrations.labels(
            source=source, 
            plan_type=plan_type
        ).inc()
    
    def record_purchase(self, product_category, payment_method, amount):
        self.purchases.labels(
            product_category=product_category,
            payment_method=payment_method
        ).inc()
    
    def record_feature_usage(self, feature_name, user_tier):
        self.feature_usage.labels(
            feature_name=feature_name,
            user_tier=user_tier
        ).inc()
    
    def time_request(self, method, endpoint):
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                status_code = 200
                
                try:
                    result = func(*args, **kwargs)
                    return result
                except Exception as e:
                    status_code = 500
                    raise
                finally:
                    duration = time.time() - start_time
                    self.request_duration.labels(
                        method=method,
                        endpoint=endpoint,
                        status_code=status_code
                    ).observe(duration)
            
            return wrapper
        return decorator
    
    def update_active_users(self, count):
        self.active_users.set(count)
    
    def update_queue_length(self, queue_name, length):
        self.queue_length.labels(queue_name=queue_name).set(length)
```

#### Error Tracking and Analysis
```javascript
class ErrorTracker {
  constructor() {
    this.errorCounts = new Map();
    this.errorPatterns = new Map();
    this.recentErrors = [];
  }

  recordError(error, context = {}) {
    const errorSignature = this.generateErrorSignature(error);
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      },
      context: {
        userId: context.userId,
        endpoint: context.endpoint,
        userAgent: context.userAgent,
        requestId: context.requestId,
        ...context
      },
      signature: errorSignature
    };

    // Update error counts
    const currentCount = this.errorCounts.get(errorSignature) || 0;
    this.errorCounts.set(errorSignature, currentCount + 1);

    // Track error patterns
    this.updateErrorPatterns(errorEntry);

    // Keep recent errors (limited to 100)
    this.recentErrors.unshift(errorEntry);
    if (this.recentErrors.length > 100) {
      this.recentErrors.pop();
    }

    // Send to external error tracking service
    this.sendToErrorService(errorEntry);

    // Check if we should alert
    this.checkAlertThresholds(errorSignature);
  }

  generateErrorSignature(error) {
    // Create a signature that groups similar errors
    const normalizedStack = error.stack
      ?.split('\n')[0] // First line of stack trace
      ?.replace(/:\d+:\d+/g, ':XX:XX') // Remove line numbers
      ?.replace(/\/.*?\//g, '/PATH/'); // Remove file paths
    
    return `${error.constructor.name}:${normalizedStack}`;
  }

  updateErrorPatterns(errorEntry) {
    const pattern = {
      hour: new Date().getHours(),
      endpoint: errorEntry.context.endpoint,
      errorType: errorEntry.error.type
    };

    const patternKey = JSON.stringify(pattern);
    const patternCount = this.errorPatterns.get(patternKey) || 0;
    this.errorPatterns.set(patternKey, patternCount + 1);
  }

  checkAlertThresholds(errorSignature) {
    const count = this.errorCounts.get(errorSignature);
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    
    // Count recent occurrences of this error
    const recentCount = this.recentErrors.filter(e => 
      e.signature === errorSignature &&
      Date.now() - new Date(e.timestamp).getTime() < timeWindow
    ).length;

    if (recentCount >= 5) {
      this.triggerAlert('high_error_frequency', {
        errorSignature,
        count: recentCount,
        timeWindow: '5 minutes'
      });
    }
  }

  getErrorAnalysis() {
    return {
      topErrors: Array.from(this.errorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      errorPatterns: Array.from(this.errorPatterns.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      recentErrors: this.recentErrors.slice(0, 20)
    };
  }
}
```

### 2. Health Check Systems

#### Comprehensive Health Check Implementation
```go
package monitoring

import (
    "context"
    "database/sql"
    "encoding/json"
    "net/http"
    "time"
)

type HealthChecker struct {
    db          *sql.DB
    redisClient RedisClient
    services    map[string]string // service name -> health endpoint
}

type HealthStatus struct {
    Status    string                 `json:"status"`
    Timestamp time.Time              `json:"timestamp"`
    Checks    map[string]CheckResult `json:"checks"`
    Version   string                 `json:"version"`
    Uptime    time.Duration          `json:"uptime"`
}

type CheckResult struct {
    Status      string        `json:"status"`
    Duration    time.Duration `json:"duration"`
    Error       string        `json:"error,omitempty"`
    LastSuccess time.Time     `json:"last_success"`
    Details     interface{}   `json:"details,omitempty"`
}

func (hc *HealthChecker) PerformHealthCheck(ctx context.Context) HealthStatus {
    startTime := time.Now()
    checks := make(map[string]CheckResult)
    
    // Database health check
    checks["database"] = hc.checkDatabase(ctx)
    
    // Redis health check
    checks["redis"] = hc.checkRedis(ctx)
    
    // External services health check
    for serviceName, endpoint := range hc.services {
        checks[serviceName] = hc.checkExternalService(ctx, endpoint)
    }
    
    // Disk space check
    checks["disk_space"] = hc.checkDiskSpace()
    
    // Memory check
    checks["memory"] = hc.checkMemory()
    
    // Determine overall status
    overallStatus := "healthy"
    for _, check := range checks {
        if check.Status != "healthy" {
            overallStatus = "unhealthy"
            break
        }
    }
    
    return HealthStatus{
        Status:    overallStatus,
        Timestamp: time.Now(),
        Checks:    checks,
        Version:   os.Getenv("SERVICE_VERSION"),
        Uptime:    time.Since(startTime),
    }
}

func (hc *HealthChecker) checkDatabase(ctx context.Context) CheckResult {
    start := time.Now()
    
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    
    err := hc.db.PingContext(ctx)
    duration := time.Since(start)
    
    if err != nil {
        return CheckResult{
            Status:   "unhealthy",
            Duration: duration,
            Error:    err.Error(),
        }
    }
    
    // Additional database checks
    var count int
    err = hc.db.QueryRowContext(ctx, "SELECT 1").Scan(&count)
    if err != nil {
        return CheckResult{
            Status:   "unhealthy", 
            Duration: duration,
            Error:    "Query test failed: " + err.Error(),
        }
    }
    
    return CheckResult{
        Status:      "healthy",
        Duration:    duration,
        LastSuccess: time.Now(),
        Details: map[string]interface{}{
            "query_test": "passed",
            "response_time_ms": duration.Milliseconds(),
        },
    }
}

func (hc *HealthChecker) checkExternalService(ctx context.Context, endpoint string) CheckResult {
    start := time.Now()
    
    client := &http.Client{
        Timeout: 10 * time.Second,
    }
    
    req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
    if err != nil {
        return CheckResult{
            Status:   "unhealthy",
            Duration: time.Since(start),
            Error:    "Request creation failed: " + err.Error(),
        }
    }
    
    resp, err := client.Do(req)
    duration := time.Since(start)
    
    if err != nil {
        return CheckResult{
            Status:   "unhealthy",
            Duration: duration,
            Error:    "Request failed: " + err.Error(),
        }
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != http.StatusOK {
        return CheckResult{
            Status:   "unhealthy",
            Duration: duration,
            Error:    fmt.Sprintf("HTTP %d", resp.StatusCode),
        }
    }
    
    return CheckResult{
        Status:      "healthy",
        Duration:    duration,
        LastSuccess: time.Now(),
        Details: map[string]interface{}{
            "status_code": resp.StatusCode,
            "response_time_ms": duration.Milliseconds(),
        },
    }
}
```

## Monitoring Quality Gates

### Pre-Deployment Monitoring Setup
- [ ] **Metrics Collection**: All critical metrics instrumented and collecting data
- [ ] **Alert Configuration**: Appropriate alerts configured for new features
- [ ] **Dashboard Updates**: Monitoring dashboards include new functionality
- [ ] **Health Checks**: Health check endpoints updated for new dependencies
- [ ] **Log Aggregation**: Structured logging implemented for new components
- [ ] **Tracing Setup**: Distributed tracing covers new service interactions

### Post-Deployment Monitoring Validation
- [ ] **Alert Testing**: All alerts tested and firing correctly
- [ ] **Dashboard Functionality**: All dashboard panels displaying correct data
- [ ] **Baseline Establishment**: Performance baselines established for new features
- [ ] **SLA Monitoring**: Service level objectives defined and monitored
- [ ] **Runbook Updates**: Incident response runbooks updated for new scenarios

## Mode-Specific Focus

This mode supplements CLAUDE.md with monitoring-specific observability frameworks, comprehensive alerting strategies, dashboard creation patterns, and proactive monitoring methodologies for maintaining high system reliability and operational visibility.