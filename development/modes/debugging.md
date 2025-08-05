# DEBUGGING Mode Instructions

You are in DEBUGGING mode, focused on systematic root cause analysis, error investigation, and diagnostic problem-solving with structured debugging methodologies.

*Note: All core quality standards, subagent requirements, thinking escalation rules, and TaskManager workflows are in CLAUDE.md. This mode adds debugging-specific investigation and resolution frameworks only.*

## Debugging Classification Framework

### 1. Issue Severity and Impact Matrix

#### Critical Production Issues (P0 - Immediate Investigation)
```
Impact: System down, data loss, security breach
Symptoms:
├── Complete service unavailability (5xx errors)
├── Database connection failures or corruption
├── Memory leaks causing system crashes
├── Security incidents or data exposure
├── Payment processing failures
└── Authentication system failures

Response Time: < 15 minutes
Escalation: Incident commander + on-call team
Investigation: Full debugging team mobilization
```

#### High-Impact Issues (P1 - Urgent Investigation)
```
Impact: Major functionality broken, user experience severely degraded
Symptoms:
├── Core features not working (login, checkout, data access)
├── Significant performance degradation (>5s response times)
├── High error rates (>5% of requests failing)
├── Data inconsistency in critical business processes
├── Integration failures with critical third-party services
└── Mobile app crashes or infinite loading states

Response Time: < 1 hour
Escalation: Engineering lead + product owner
Investigation: Dedicated debugging resources assigned
```

#### Medium-Impact Issues (P2 - Standard Investigation)
```
Impact: Feature partially broken, user experience affected
Symptoms:
├── Non-critical features malfunctioning
├── Moderate performance issues (2-5s response times)
├── Intermittent errors (1-5% failure rate)
├── UI display issues or broken styling
├── Non-critical integrations failing
└── Logging or monitoring gaps

Response Time: < 4 hours
Escalation: Development team
Investigation: Standard debugging workflow
```

### 2. Systematic Debugging Methodology

#### Root Cause Analysis Framework (5 Whys + Fishbone)
```
1. PROBLEM DEFINITION
   ├── Exact error symptoms and reproduction steps
   ├── Impact scope (users affected, systems involved)
   ├── Timeline (when issue started, frequency)
   └── Environmental context (recent changes, deployments)

2. INITIAL HYPOTHESIS FORMATION
   ├── Most likely causes based on symptoms
   ├── Recent changes that could be related
   ├── Similar historical issues and resolutions
   └── System components involved in error path

3. SYSTEMATIC INVESTIGATION
   ├── Log analysis and error pattern identification
   ├── System metrics and performance data review
   ├── Database query analysis and data validation
   └── Code flow analysis and dependency mapping

4. HYPOTHESIS TESTING
   ├── Controlled reproduction of the issue
   ├── Isolated component testing
   ├── A/B testing with potential fixes
   └── Load testing under various conditions

5. ROOT CAUSE IDENTIFICATION
   ├── Primary cause with supporting evidence
   ├── Contributing factors and conditions
   ├── Failure points in system design
   └── Prevention strategies for future occurrences
```

#### Evidence Collection Protocol
```bash
# Systematic Evidence Collection Script
#!/bin/bash

ISSUE_ID=$1
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
EVIDENCE_DIR="./debugging/issue_${ISSUE_ID}_${TIMESTAMP}"

mkdir -p "$EVIDENCE_DIR"

echo "Collecting evidence for issue: $ISSUE_ID"
echo "Evidence directory: $EVIDENCE_DIR"

# 1. System State Collection
echo "Collecting system state..."
kubectl get pods -o wide > "$EVIDENCE_DIR/pods_state.txt"
kubectl get events --sort-by=.metadata.creationTimestamp > "$EVIDENCE_DIR/k8s_events.txt"
docker stats --no-stream > "$EVIDENCE_DIR/container_stats.txt"

# 2. Application Logs
echo "Collecting application logs..."
kubectl logs -l app=myapp --since=1h > "$EVIDENCE_DIR/app_logs.txt"
kubectl logs -l app=myapp --previous > "$EVIDENCE_DIR/app_logs_previous.txt"

# 3. System Metrics
echo "Collecting system metrics..."
curl -s 'http://prometheus:9090/api/v1/query_range?query=cpu_usage&start='$(date -d '1 hour ago' '+%s')'&end='$(date '+%s')'&step=60' > "$EVIDENCE_DIR/cpu_metrics.json"
curl -s 'http://prometheus:9090/api/v1/query_range?query=memory_usage&start='$(date -d '1 hour ago' '+%s')'&end='$(date '+%s')'&step=60' > "$EVIDENCE_DIR/memory_metrics.json"

# 4. Database State
echo "Collecting database information..."
psql -h database -U user -d dbname -c "SELECT * FROM pg_stat_activity;" > "$EVIDENCE_DIR/db_connections.txt"
psql -h database -U user -d dbname -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 20;" > "$EVIDENCE_DIR/slow_queries.txt"

# 5. Network State
echo "Collecting network information..."
netstat -tulpn > "$EVIDENCE_DIR/network_connections.txt"
ss -tulpn > "$EVIDENCE_DIR/socket_stats.txt"

echo "Evidence collection completed: $EVIDENCE_DIR"
```

## Debugging Investigation Patterns

### 1. Performance Issue Investigation

#### Performance Bottleneck Analysis
```python
class PerformanceDebugger:
    def __init__(self):
        self.profiler = cProfile.Profile()
        self.memory_tracker = tracemalloc
        
    def debug_slow_endpoint(self, endpoint_function):
        """Comprehensive performance debugging for slow endpoints"""
        
        # 1. CPU Profiling
        self.profiler.enable()
        try:
            result = endpoint_function()
        finally:
            self.profiler.disable()
            
        # Analyze CPU usage
        stats = pstats.Stats(self.profiler)
        stats.sort_stats('cumulative')
        
        print("Top CPU consuming functions:")
        stats.print_stats(10)
        
        # 2. Memory Profiling
        current, peak = tracemalloc.get_traced_memory()
        print(f"Current memory usage: {current / 1024 / 1024:.1f} MB")
        print(f"Peak memory usage: {peak / 1024 / 1024:.1f} MB")
        
        # 3. Database Query Analysis
        with DatabaseProfiler() as db_profiler:
            # Re-run function to capture DB queries
            endpoint_function()
            
        print("Database Query Analysis:")
        for query in db_profiler.get_slow_queries():
            print(f"Query: {query.sql}")
            print(f"Duration: {query.duration}ms")
            print(f"Rows: {query.row_count}")
            print("---")
            
        return result
        
    def analyze_memory_leak(self, suspected_function):
        """Memory leak detection and analysis"""
        tracemalloc.start()
        
        # Baseline memory measurement
        baseline_snapshot = tracemalloc.take_snapshot()
        
        # Run suspected function multiple times
        for i in range(100):
            suspected_function()
            
        # Take final snapshot
        final_snapshot = tracemalloc.take_snapshot()
        
        # Compare snapshots
        top_stats = final_snapshot.compare_to(baseline_snapshot, 'lineno')
        
        print("Top 10 memory growth locations:")
        for stat in top_stats[:10]:
            print(f"{stat.traceback.format()[-1]}")
            print(f"Size diff: {stat.size_diff / 1024:.1f} KB")
            print(f"Count diff: {stat.count_diff}")
            print("---")
```

#### Database Performance Debugging
```sql
-- Database Performance Investigation Queries

-- 1. Identify Blocking Queries
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity 
    ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
JOIN pg_catalog.pg_stat_activity blocking_activity 
    ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;

-- 2. Find Unused Indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes 
WHERE idx_tup_read = 0 
    AND idx_tup_fetch = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- 3. Analyze Query Performance
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 20;
```

### 2. Error Pattern Analysis

#### Systematic Error Investigation
```javascript
class ErrorInvestigator {
  constructor() {
    this.errorPatterns = new Map();
    this.contextTracker = new Map();
  }

  analyzeErrorLogs(logEntries) {
    const errorAnalysis = {
      patterns: new Map(),
      timeline: [],
      correlations: [],
      rootCauses: []
    };

    // 1. Pattern Recognition
    logEntries.forEach(entry => {
      const pattern = this.extractErrorPattern(entry);
      if (pattern) {
        if (!errorAnalysis.patterns.has(pattern.signature)) {
          errorAnalysis.patterns.set(pattern.signature, {
            count: 0,
            firstSeen: entry.timestamp,
            lastSeen: entry.timestamp,
            examples: []
          });
        }
        
        const patternData = errorAnalysis.patterns.get(pattern.signature);
        patternData.count++;
        patternData.lastSeen = entry.timestamp;
        
        if (patternData.examples.length < 5) {
          patternData.examples.push(entry);
        }
      }
    });

    // 2. Timeline Analysis
    errorAnalysis.timeline = this.buildErrorTimeline(logEntries);

    // 3. Correlation Detection
    errorAnalysis.correlations = this.findCorrelations(logEntries);

    return errorAnalysis;
  }

  extractErrorPattern(logEntry) {
    // Remove variable parts (IDs, timestamps, etc.) to identify patterns
    const normalizedMessage = logEntry.message
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'TIMESTAMP')
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, 'UUID')
      .replace(/\b\d+\b/g, 'NUMBER')
      .replace(/\/[\w\-._]+\//g, '/PATH/');

    return {
      signature: normalizedMessage,
      level: logEntry.level,
      source: logEntry.source,
      stackTrace: logEntry.stackTrace
    };
  }

  findCorrelations(logEntries) {
    const correlations = [];
    const windowSize = 5 * 60 * 1000; // 5 minute window

    for (let i = 0; i < logEntries.length; i++) {
      const currentEntry = logEntries[i];
      const relatedEntries = [];

      // Look for entries within time window
      for (let j = i + 1; j < logEntries.length; j++) {
        const otherEntry = logEntries[j];
        const timeDiff = otherEntry.timestamp - currentEntry.timestamp;
        
        if (timeDiff > windowSize) break;
        
        if (this.areEventsRelated(currentEntry, otherEntry)) {
          relatedEntries.push(otherEntry);
        }
      }

      if (relatedEntries.length > 0) {
        correlations.push({
          trigger: currentEntry,
          related: relatedEntries,
          confidence: this.calculateCorrelationConfidence(currentEntry, relatedEntries)
        });
      }
    }

    return correlations.sort((a, b) => b.confidence - a.confidence);
  }
}
```

### 3. Integration Debugging

#### API Integration Debugging
```python
class IntegrationDebugger:
    def __init__(self):
        self.http_client = httpx.Client()
        self.request_history = []
        
    def debug_api_integration(self, api_endpoint, payload):
        """Comprehensive API integration debugging"""
        
        debug_info = {
            'request': None,
            'response': None,
            'network_timing': {},
            'ssl_info': {},
            'dns_resolution': {},
            'issues_found': []
        }
        
        try:
            # 1. DNS Resolution Check
            import socket
            start_time = time.time()
            hostname = urllib.parse.urlparse(api_endpoint).hostname
            ip_address = socket.gethostbyname(hostname)
            debug_info['dns_resolution'] = {
                'hostname': hostname,
                'ip_address': ip_address,
                'resolution_time': time.time() - start_time
            }
            
            # 2. SSL Certificate Validation
            if api_endpoint.startswith('https://'):
                debug_info['ssl_info'] = self.validate_ssl_certificate(hostname)
            
            # 3. Network Connectivity Test
            start_time = time.time()
            response = self.http_client.post(
                api_endpoint,
                json=payload,
                timeout=30.0
            )
            total_time = time.time() - start_time
            
            debug_info['network_timing'] = {
                'total_time': total_time,
                'status_code': response.status_code,
                'response_size': len(response.content)
            }
            
            debug_info['request'] = {
                'url': api_endpoint,
                'method': 'POST',
                'headers': dict(response.request.headers),
                'payload': payload
            }
            
            debug_info['response'] = {
                'status_code': response.status_code,
                'headers': dict(response.headers),
                'body': response.text[:1000]  # First 1000 chars
            }
            
            # 4. Response Analysis
            if response.status_code != 200:
                debug_info['issues_found'].append({
                    'type': 'http_error',
                    'message': f'HTTP {response.status_code}: {response.text}'
                })
            
            # 5. Payload Validation
            try:
                response_data = response.json()
                if 'error' in response_data:
                    debug_info['issues_found'].append({
                        'type': 'api_error',
                        'message': response_data['error']
                    })
            except ValueError:
                debug_info['issues_found'].append({
                    'type': 'json_parse_error',
                    'message': 'Response is not valid JSON'
                })
                
        except httpx.TimeoutException:
            debug_info['issues_found'].append({
                'type': 'timeout',
                'message': 'Request timed out after 30 seconds'
            })
        except httpx.ConnectError as e:
            debug_info['issues_found'].append({
                'type': 'connection_error',
                'message': str(e)
            })
        except Exception as e:
            debug_info['issues_found'].append({
                'type': 'unknown_error',
                'message': str(e)
            })
            
        return debug_info
        
    def validate_ssl_certificate(self, hostname):
        """SSL certificate validation and debugging"""
        import ssl
        import socket
        
        context = ssl.create_default_context()
        
        try:
            with socket.create_connection((hostname, 443), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    
                    return {
                        'valid': True,
                        'subject': dict(x[0] for x in cert['subject']),
                        'issuer': dict(x[0] for x in cert['issuer']),
                        'version': cert['version'],
                        'expires': cert['notAfter']
                    }
        except ssl.SSLError as e:
            return {
                'valid': False,
                'error': str(e)
            }
```

## Debugging Tools and Techniques

### 1. Advanced Logging Strategies

#### Structured Debugging Logs
```javascript
class DebugLogger {
  constructor() {
    this.traceId = this.generateTraceId();
    this.breadcrumbs = [];
  }

  logDebugPoint(location, data = {}) {
    const debugEntry = {
      timestamp: new Date().toISOString(),
      traceId: this.traceId,
      location: location,
      data: this.sanitizeData(data),
      stackTrace: this.getStackTrace(),
      memoryUsage: process.memoryUsage(),
      breadcrumbs: [...this.breadcrumbs]
    };

    console.log(JSON.stringify(debugEntry, null, 2));
    
    // Keep breadcrumb trail
    this.breadcrumbs.push({
      location: location,
      timestamp: debugEntry.timestamp
    });

    // Limit breadcrumb history
    if (this.breadcrumbs.length > 20) {
      this.breadcrumbs.shift();
    }
  }

  logPerformancePoint(label, operation) {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();

    try {
      const result = operation();
      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();

      this.logDebugPoint(`PERF_${label}`, {
        duration_ns: Number(endTime - startTime),
        duration_ms: Number(endTime - startTime) / 1_000_000,
        memory_delta: {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal
        }
      });

      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      
      this.logDebugPoint(`PERF_ERROR_${label}`, {
        duration_ns: Number(endTime - startTime),
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }

  sanitizeData(data) {
    // Remove sensitive information from debug logs
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
    
    return JSON.parse(JSON.stringify(data, (key, value) => {
      if (sensitiveKeys.some(sensitive => 
          key.toLowerCase().includes(sensitive))) {
        return '[REDACTED]';
      }
      return value;
    }));
  }
}
```

### 2. Interactive Debugging

#### Remote Debugging Setup
```python
# Remote debugging capability for production issues
import pdb
import sys
import traceback
from contextlib import contextmanager

class RemoteDebugger:
    def __init__(self, enabled=False):
        self.enabled = enabled
        self.breakpoints = set()
        
    @contextmanager
    def debug_context(self, label="DEBUG"):
        """Context manager for debugging specific code blocks"""
        if not self.enabled:
            yield
            return
            
        print(f"[DEBUG] Entering {label}")
        try:
            yield
        except Exception as e:
            print(f"[DEBUG] Exception in {label}: {e}")
            print(f"[DEBUG] Traceback:")
            traceback.print_exc()
            
            # Enter interactive debugging mode
            pdb.post_mortem()
            raise
        finally:
            print(f"[DEBUG] Exiting {label}")
    
    def conditional_breakpoint(self, condition, message="Breakpoint hit"):
        """Only break if condition is met"""
        if self.enabled and condition:
            print(f"[DEBUG] {message}")
            pdb.set_trace()
    
    def trace_function_calls(self, func):
        """Decorator to trace function entry/exit"""
        if not self.enabled:
            return func
            
        def wrapper(*args, **kwargs):
            print(f"[TRACE] Entering {func.__name__}")
            print(f"[TRACE] Args: {args}")
            print(f"[TRACE] Kwargs: {kwargs}")
            
            try:
                result = func(*args, **kwargs)
                print(f"[TRACE] Exiting {func.__name__} with result: {result}")
                return result
            except Exception as e:
                print(f"[TRACE] Exception in {func.__name__}: {e}")
                raise
                
        return wrapper

# Usage example
debugger = RemoteDebugger(enabled=True)

@debugger.trace_function_calls
def problematic_function(data):
    with debugger.debug_context("DATA_PROCESSING"):
        # Process data here
        result = process_data(data)
        
        # Conditional breakpoint
        debugger.conditional_breakpoint(
            len(result) == 0, 
            "Empty result detected"
        )
        
        return result
```

## Issue Resolution Workflows

### 1. Systematic Problem Resolution

#### Issue Resolution Template
```markdown
# Issue Resolution Report

## Issue Summary
- **Issue ID**: DEBUG-2024-001
- **Severity**: P1 - High Impact
- **Reported**: 2024-01-15 14:30 UTC
- **Resolved**: 2024-01-15 16:45 UTC
- **Duration**: 2 hours 15 minutes

## Problem Description
- **Symptoms**: User login attempts failing with 500 errors
- **Impact**: 15% of login attempts failing, 5,000 users affected
- **Environment**: Production
- **Frequency**: Intermittent, every 30-60 seconds

## Investigation Timeline
1. **14:30** - Issue reported by monitoring alerts
2. **14:35** - Initial investigation started
3. **14:45** - Log analysis revealed database connection timeouts
4. **15:00** - Database performance analysis initiated
5. **15:15** - Identified slow query causing connection pool exhaustion
6. **15:30** - Query optimization implemented and tested
7. **16:00** - Fix deployed to production
8. **16:45** - Issue confirmed resolved

## Root Cause Analysis
- **Primary Cause**: Inefficient database query in user authentication
- **Contributing Factors**: 
  - Missing database index on frequently queried column
  - Connection pool size insufficient for peak load
  - Query timeout too aggressive for complex operations

## Evidence Collected
- Application logs showing timeout errors
- Database performance metrics
- Query execution plans
- System resource utilization graphs

## Resolution Implemented
1. Added database index on `users.last_login_attempt` column
2. Optimized authentication query to use proper joins
3. Increased database connection pool size from 10 to 20
4. Adjusted query timeout from 5s to 10s for auth operations

## Prevention Measures
- Added monitoring for database query performance
- Implemented automated index recommendation analysis
- Created alerts for connection pool utilization > 80%
- Scheduled monthly query performance review

## Lessons Learned
- Database performance monitoring needs improvement
- Load testing should include authentication scenarios
- Connection pool sizing should be based on peak load analysis
```

### 2. Post-Resolution Validation

#### Fix Validation Checklist
```bash
#!/bin/bash
# Post-Fix Validation Script

ISSUE_ID=$1
FIX_DESCRIPTION=$2

echo "Validating fix for issue: $ISSUE_ID"
echo "Fix description: $FIX_DESCRIPTION"

# 1. Functional Testing
echo "Running functional tests..."
npm test -- --grep "authentication"
if [ $? -ne 0 ]; then
    echo "FAILED: Functional tests failed"
    exit 1
fi

# 2. Performance Testing
echo "Running performance tests..."
k6 run --vus 50 --duration 5m performance-tests/auth-test.js
if [ $? -ne 0 ]; then
    echo "FAILED: Performance tests failed"
    exit 1
fi

# 3. Load Testing
echo "Running load tests..."
artillery run load-tests/auth-load-test.yml
if [ $? -ne 0 ]; then
    echo "FAILED: Load tests failed"
    exit 1
fi

# 4. Monitoring Validation
echo "Checking monitoring metrics..."
# Wait for metrics to populate
sleep 60

# Check error rate
ERROR_RATE=$(curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])' | jq -r '.data.result[0].value[1]')
if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
    echo "FAILED: Error rate too high: $ERROR_RATE"
    exit 1
fi

# Check response time
RESPONSE_TIME=$(curl -s 'http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95, http_request_duration_seconds)' | jq -r '.data.result[0].value[1]')
if (( $(echo "$RESPONSE_TIME > 2.0" | bc -l) )); then
    echo "FAILED: Response time too high: $RESPONSE_TIME"
    exit 1
fi

echo "SUCCESS: All validation checks passed"
echo "Fix for $ISSUE_ID validated successfully"
```

## Debugging Quality Gates

### Pre-Investigation Preparation
- [ ] **Issue Reproduction**: Reliable steps to reproduce the problem
- [ ] **Environment Assessment**: Clear understanding of affected environment
- [ ] **Impact Analysis**: User and business impact quantified
- [ ] **Resource Allocation**: Appropriate debugging resources assigned
- [ ] **Evidence Collection**: Systematic gathering of logs, metrics, and traces

### Post-Resolution Validation
- [ ] **Fix Verification**: Issue no longer reproducible in test environment
- [ ] **Performance Impact**: No performance regression introduced
- [ ] **Side Effect Analysis**: No unintended consequences in related systems
- [ ] **Monitoring Setup**: Appropriate monitoring to prevent recurrence
- [ ] **Documentation Update**: Issue and resolution documented for future reference

## Mode-Specific Focus

This mode supplements CLAUDE.md with debugging-specific investigation frameworks, systematic root cause analysis methodologies, advanced debugging tools, and comprehensive issue resolution workflows for efficient problem diagnosis and resolution.