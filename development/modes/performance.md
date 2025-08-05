# PERFORMANCE Mode Instructions

You are in PERFORMANCE mode, focused on comprehensive performance optimization, load testing, and scalability assessment with systematic benchmarking frameworks.

*Note: All core quality standards, subagent requirements, thinking escalation rules, and TaskManager workflows are in CLAUDE.md. This mode adds performance-specific optimization and testing frameworks only.*

## Performance Assessment Framework

### 1. Performance Classification Matrix

#### Critical Performance Issues (P0 - Immediate Optimization Required)
```
Impact: User experience severely degraded, system unusable
Thresholds:
├── API Response Time: > 5 seconds for critical paths
├── Page Load Time: > 10 seconds for core user flows
├── Database Query Time: > 2 seconds for simple queries
├── Memory Usage: > 90% sustained utilization
├── CPU Usage: > 95% sustained utilization
└── Error Rate: > 5% due to performance timeouts

Response Time: < 4 hours
Escalation: Block deployments, performance team investigation
```

#### High Performance Issues (P1 - 24 Hour Optimization)
```
Impact: Noticeable user experience degradation
Thresholds:
├── API Response Time: 2-5 seconds for critical paths
├── Page Load Time: 5-10 seconds for core user flows
├── Database Query Time: 1-2 seconds for simple queries
├── Memory Usage: 80-90% sustained utilization
├── CPU Usage: 85-95% sustained utilization
└── Throughput: < 50% of expected capacity

Response Time: < 24 hours
Escalation: Performance review required, optimization sprint
```

#### Medium Performance Issues (P2 - 72 Hour Optimization)
```
Impact: Performance targets not met, room for improvement
Thresholds:
├── API Response Time: 1-2 seconds for critical paths
├── Page Load Time: 3-5 seconds for core user flows
├── Database Query Time: 500ms-1s for simple queries
├── Memory Usage: 70-80% sustained utilization
├── CPU Usage: 75-85% sustained utilization
└── Cache Hit Rate: < 80% for frequently accessed data

Response Time: < 72 hours
Escalation: Include in next performance optimization cycle
```

### 2. Performance Benchmarking Workflows

#### Load Testing Pipeline
```bash
# API Load Testing
k6 run --vus 100 --duration 30s api-load-test.js     # Concurrent user simulation
artillery run artillery-config.yml                   # Advanced load testing scenarios

# Database Performance Testing
pgbench -c 10 -j 2 -t 1000 dbname                   # PostgreSQL benchmarking
sysbench oltp_read_write --table-size=100000 run    # MySQL performance testing

# Frontend Performance Testing
lighthouse --chrome-flags="--headless" http://localhost:3000  # Core Web Vitals
puppeteer-performance-test.js                        # Custom performance metrics

# Infrastructure Load Testing
stress --cpu 8 --io 4 --vm 2 --timeout 60s         # System stress testing
iperf3 -c server_ip -t 30                           # Network throughput testing
```

#### Performance Profiling Tools
```javascript
// Node.js Performance Profiling
const { performance, PerformanceObserver } = require('perf_hooks');

class PerformanceProfiler {
  constructor() {
    this.metrics = new Map();
    this.setupObservers();
  }

  setupObservers() {
    const obs = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        this.recordMetric(entry.name, entry.duration);
      });
    });
    obs.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
  }

  measureFunction(name, fn) {
    performance.mark(`${name}-start`);
    const result = fn();
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    return result;
  }

  async measureAsyncFunction(name, fn) {
    performance.mark(`${name}-start`);
    const result = await fn();
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    return result;
  }
}
```

#### Database Performance Analysis
```sql
-- Query Performance Analysis
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM users 
WHERE email = 'user@example.com' 
  AND created_at > NOW() - INTERVAL '30 days';

-- Index Usage Analysis
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY n_distinct DESC;

-- Slow Query Identification
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

## Performance Optimization Strategies

### 1. Application-Level Optimizations

#### Caching Implementation Patterns
```python
# Multi-Level Caching Strategy
class PerformanceCache:
    def __init__(self):
        self.l1_cache = {}  # In-memory cache
        self.l2_cache = RedisClient()  # Distributed cache
        self.l3_cache = CDNClient()  # Edge cache
    
    async def get_cached_data(self, key, ttl=300):
        # L1: Check in-memory cache
        if key in self.l1_cache:
            return self.l1_cache[key]
        
        # L2: Check Redis cache
        l2_data = await self.l2_cache.get(key)
        if l2_data:
            self.l1_cache[key] = l2_data
            return l2_data
        
        # L3: Check CDN cache for static content
        if self.is_static_content(key):
            l3_data = await self.l3_cache.get(key)
            if l3_data:
                await self.l2_cache.set(key, l3_data, ttl)
                self.l1_cache[key] = l3_data
                return l3_data
        
        return None
    
    async def set_cached_data(self, key, data, ttl=300):
        self.l1_cache[key] = data
        await self.l2_cache.set(key, data, ttl)
        if self.is_static_content(key):
            await self.l3_cache.set(key, data, ttl * 10)
```

#### Asynchronous Processing Optimization
```javascript
// Efficient Async Processing Patterns
class AsyncProcessor {
  constructor(concurrency = 10) {
    this.concurrency = concurrency;
    this.queue = [];
    this.running = 0;
  }

  async processBatch(items, processor) {
    // Batch processing with controlled concurrency
    const chunks = this.chunkArray(items, this.concurrency);
    const results = [];
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(item => this.processWithRetry(item, processor))
      );
      results.push(...chunkResults);
    }
    
    return results;
  }

  async processWithRetry(item, processor, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await processor(item);
      } catch (error) {
        if (attempt === maxRetries) throw error;
        await this.exponentialBackoff(attempt);
      }
    }
  }

  exponentialBackoff(attempt) {
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

### 2. Database Performance Optimization

#### Query Optimization Framework
```sql
-- Index Optimization Strategy
CREATE INDEX CONCURRENTLY idx_users_email_active 
ON users (email) 
WHERE active = true;

-- Partial indexes for better performance
CREATE INDEX CONCURRENTLY idx_orders_status_recent 
ON orders (status, created_at) 
WHERE created_at > NOW() - INTERVAL '90 days';

-- Composite indexes for multi-column queries
CREATE INDEX CONCURRENTLY idx_user_activity 
ON user_sessions (user_id, last_activity DESC, active);
```

#### Connection Pool Optimization
```javascript
// Database Connection Pool Configuration
const poolConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // Connection pool settings
  min: 2,                    // Minimum connections
  max: 20,                   // Maximum connections
  acquireTimeoutMillis: 60000,  // Connection acquire timeout
  createTimeoutMillis: 30000,   // Connection creation timeout
  destroyTimeoutMillis: 5000,   // Connection destruction timeout
  idleTimeoutMillis: 30000,     // Idle connection timeout
  reapIntervalMillis: 1000,     // Cleanup interval
  createRetryIntervalMillis: 200, // Retry interval
  
  // Performance monitoring
  log: (message, logLevel) => {
    console.log(`[DB Pool ${logLevel}]: ${message}`);
  }
};
```

### 3. Frontend Performance Optimization

#### Resource Optimization Strategies
```javascript
// Code Splitting and Lazy Loading
const LazyComponent = React.lazy(() => 
  import('./HeavyComponent').then(module => ({
    default: module.HeavyComponent
  }))
);

// Image Optimization
class ImageOptimizer {
  static getOptimizedImageUrl(src, width, height, quality = 80) {
    const params = new URLSearchParams({
      w: width,
      h: height,
      q: quality,
      f: 'webp',
      fit: 'crop'
    });
    
    return `${CDN_BASE_URL}/${src}?${params.toString()}`;
  }

  static generateSrcSet(src, sizes) {
    return sizes.map(size => 
      `${this.getOptimizedImageUrl(src, size, size)} ${size}w`
    ).join(', ');
  }
}

// Bundle Size Optimization
const webpackConfig = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        common: {
          minChunks: 2,
          chunks: 'all',
          enforce: true
        }
      }
    }
  }
};
```

#### Service Worker Performance Enhancement
```javascript
// Performance-Focused Service Worker
self.addEventListener('fetch', event => {
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.open('performance-cache-v1').then(cache => {
        return cache.match(event.request).then(response => {
          if (response) {
            // Serve from cache immediately
            fetch(event.request).then(fetchResponse => {
              // Update cache in background
              cache.put(event.request, fetchResponse.clone());
            }).catch(() => {});
            return response;
          }
          
          // Fetch with timeout
          return Promise.race([
            fetch(event.request),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 5000)
            )
          ]).then(fetchResponse => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
  }
});
```

## Performance Testing Methodologies

### 1. Load Testing Strategies

#### Graduated Load Testing Approach
```javascript
// K6 Load Testing Configuration
export let options = {
  stages: [
    { duration: '2m', target: 10 },    // Ramp up to 10 users
    { duration: '5m', target: 10 },    // Maintain 10 users
    { duration: '2m', target: 50 },    // Ramp up to 50 users
    { duration: '5m', target: 50 },    // Maintain 50 users
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '10m', target: 100 },  // Maintain 100 users
    { duration: '5m', target: 0 },     // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
    http_reqs: ['rate>20'],            // Request rate above 20/sec
  },
};

export default function() {
  let response = http.get('https://api.example.com/users');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'body size > 0': (r) => r.body.length > 0,
  });
  sleep(1);
}
```

#### Stress Testing Framework
```bash
#!/bin/bash
# Comprehensive Stress Testing Suite

# API Stress Testing
echo "Starting API stress test..."
k6 run --vus 500 --duration 10m stress-test-api.js

# Database Stress Testing
echo "Starting database stress test..."
pgbench -c 50 -j 4 -T 600 -r testdb

# Memory Stress Testing
echo "Starting memory stress test..."
stress --vm 4 --vm-bytes 1G --timeout 300s

# CPU Stress Testing
echo "Starting CPU stress test..."
stress --cpu 8 --timeout 300s

# Disk I/O Stress Testing
echo "Starting disk I/O stress test..."
fio --name=random-write --ioengine=libaio --iodepth=1 --rw=randwrite \
    --bs=4k --direct=0 --size=512m --numjobs=4 --runtime=300 --group_reporting

echo "Stress testing completed. Check system metrics."
```

### 2. Performance Regression Testing

#### Automated Performance Comparison
```python
class PerformanceRegression:
    def __init__(self, baseline_metrics):
        self.baseline = baseline_metrics
        self.thresholds = {
            'response_time': 0.15,      # 15% degradation threshold
            'throughput': -0.10,        # 10% throughput reduction
            'memory_usage': 0.20,       # 20% memory increase
            'cpu_usage': 0.25,          # 25% CPU increase
            'error_rate': 0.05          # 5% error rate increase
        }
    
    def compare_metrics(self, current_metrics):
        regressions = []
        
        for metric, current_value in current_metrics.items():
            baseline_value = self.baseline.get(metric, 0)
            threshold = self.thresholds.get(metric, 0.10)
            
            if baseline_value > 0:
                change = (current_value - baseline_value) / baseline_value
                
                if change > threshold:
                    regressions.append({
                        'metric': metric,
                        'baseline': baseline_value,
                        'current': current_value,
                        'change_percent': change * 100,
                        'threshold_percent': threshold * 100,
                        'severity': self.get_severity(change, threshold)
                    })
        
        return regressions
    
    def get_severity(self, change, threshold):
        if change > threshold * 3:
            return 'CRITICAL'
        elif change > threshold * 2:
            return 'HIGH'
        elif change > threshold * 1.5:
            return 'MEDIUM'
        else:
            return 'LOW'
```

## Performance Monitoring and Alerting

### 1. Real-Time Performance Monitoring

#### Application Performance Monitoring (APM)
```javascript
// Custom APM Implementation
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: new Map(),
      errors: new Map(),
      latency: [],
      throughput: 0,
      lastMinuteRequests: []
    };
    
    this.setupMetricsCollection();
  }

  recordRequest(endpoint, duration, status) {
    const timestamp = Date.now();
    
    // Record request metrics
    this.metrics.lastMinuteRequests.push(timestamp);
    this.metrics.latency.push(duration);
    
    // Track endpoint-specific metrics
    if (!this.metrics.requests.has(endpoint)) {
      this.metrics.requests.set(endpoint, { count: 0, totalTime: 0 });
    }
    
    const endpointMetrics = this.metrics.requests.get(endpoint);
    endpointMetrics.count++;
    endpointMetrics.totalTime += duration;
    
    // Track errors
    if (status >= 400) {
      const errorKey = `${endpoint}:${status}`;
      this.metrics.errors.set(errorKey, 
        (this.metrics.errors.get(errorKey) || 0) + 1
      );
    }
    
    // Clean old data
    this.cleanOldMetrics(timestamp);
  }

  getPerformanceSnapshot() {
    return {
      avgLatency: this.calculateAverageLatency(),
      p95Latency: this.calculatePercentile(95),
      p99Latency: this.calculatePercentile(99),
      throughput: this.calculateThroughput(),
      errorRate: this.calculateErrorRate(),
      topSlowEndpoints: this.getTopSlowEndpoints(5)
    };
  }
}
```

#### Infrastructure Monitoring Integration
```yaml
# Prometheus Monitoring Configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "performance_rules.yml"

scrape_configs:
  - job_name: 'application'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'database'
    static_configs:
      - targets: ['localhost:5432']
    scrape_interval: 30s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

# Performance Alert Rules
groups:
  - name: performance_alerts
    rules:
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 0.5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          
      - alert: LowThroughput
        expr: rate(http_requests_total[5m]) < 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low request throughput detected"
```

### 2. Performance Optimization Workflow

#### Systematic Performance Improvement Process
```
1. BASELINE ESTABLISHMENT
   ├── Current performance metrics collection
   ├── User experience baseline measurement
   ├── System resource utilization analysis
   └── Performance budget definition

2. BOTTLENECK IDENTIFICATION
   ├── CPU profiling and analysis
   ├── Memory usage and leak detection
   ├── Database query performance analysis
   ├── Network latency and throughput measurement

3. OPTIMIZATION IMPLEMENTATION
   ├── Code-level optimizations (algorithms, caching)
   ├── Database optimizations (indexes, queries)
   ├── Infrastructure optimizations (scaling, CDN)
   └── Frontend optimizations (bundling, compression)

4. VALIDATION AND MONITORING
   ├── A/B testing for performance improvements
   ├── Regression testing to ensure no degradation
   ├── Continuous monitoring setup
   └── Performance budget enforcement
```

## Performance Quality Gates

### Pre-Deployment Performance Validation
- [ ] **Load Testing**: System handles expected traffic without degradation
- [ ] **Response Time**: All critical paths meet performance SLA
- [ ] **Resource Usage**: CPU and memory usage within acceptable limits
- [ ] **Database Performance**: Query execution times within thresholds
- [ ] **Error Rate**: Performance-related errors below 0.1%
- [ ] **Regression Testing**: No performance regression from previous version

### Production Performance Monitoring
- [ ] **Real User Monitoring**: Actual user experience metrics tracked
- [ ] **Synthetic Monitoring**: Automated performance tests running continuously
- [ ] **Alerting**: Performance degradation alerts configured and tested
- [ ] **Capacity Planning**: Resource usage trends monitored for scaling decisions

## Mode-Specific Focus

This mode supplements CLAUDE.md with performance-specific optimization frameworks, load testing methodologies, benchmarking strategies, and systematic performance improvement workflows for scalable, high-performance applications.