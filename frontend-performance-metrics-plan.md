# Frontend Performance Metrics Reporter Plan

## Overview
Create a simple, lightweight custom Playwright test reporter that collects performance metrics from test attachments and sends them to a webhook endpoint with git context.

## Scope
- **Location**: `packages/testing/playwright/reporters/metrics-reporter.js`
- **Purpose**: Extract metrics from test attachments and send to webhook
- **Integration**: Optional reporter in Playwright configuration
- **Dependencies**: `git-rev-sync` for git information

## Simple Implementation Goals
1. **Silent Operation**: Skip silently if no metrics or missing testInfo
2. **Attachment-Based**: Only process `metric:*` attachments 
3. **Minimal Data**: Test name, metric name/value/unit, git info
4. **Webhook Only**: Send JSON payload to configured endpoint
5. **No Storage/Dashboard**: Just the reporter component

## Implementation

### Core Reporter Structure
```javascript
// packages/testing/playwright/reporters/metrics-reporter.js
import gitRevSync from 'git-rev-sync';

class MetricsReporter {
  constructor(options = {}) {
    this.webhookUrl = options.webhookUrl || process.env.METRICS_WEBHOOK_URL;
  }

  async onTestEnd(test, result) {
    if (!this.webhookUrl || result.status === 'skipped') return;
    
    const metrics = this.collectMetrics(result);
    if (metrics.length > 0) {
      await this.sendMetrics(test, metrics);
    }
  }

  collectMetrics(result) {
    const metrics = [];
    
    result.attachments.forEach(attachment => {
      if (attachment.name.startsWith('metric:')) {
        const metricName = attachment.name.replace('metric:', '');
        try {
          const data = JSON.parse(attachment.body.toString());
          metrics.push({ 
            name: metricName, 
            value: data.value, 
            unit: data.unit || null 
          });
        } catch (e) {
          // Skip invalid metric attachments silently
        }
      }
    });
    
    return metrics;
  }

  async sendMetrics(test, metrics) {
    const gitInfo = this.getGitInfo();
    
    for (const metric of metrics) {
      const payload = {
        test_name: test.title,
        metric_name: metric.name,
        metric_value: metric.value,
        metric_unit: metric.unit,
        commit: gitInfo.commit,
        branch: gitInfo.branch,
        timestamp: new Date().toISOString()
      };
      
      try {
        await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (e) {
        // Fail silently - don't break tests
        console.warn('Failed to send metric:', e.message);
      }
    }
  }

  getGitInfo() {
    try {
      return {
        commit: gitRevSync.long(),
        branch: gitRevSync.branch()
      };
    } catch (e) {
      return { commit: null, branch: null };
    }
  }
}

export default MetricsReporter;
```

### Usage in Tests
Tests can attach metrics using the simplified format:
```javascript
test('dashboard performance', async ({ page }, testInfo) => {
  await page.goto('/dashboard');
  
  // Test logic...
  
  // Attach performance metric
  const memory = await page.evaluate(() => performance.memory);
  await testInfo.attach('metric:memory_used', {
    body: JSON.stringify({ value: memory.usedJSHeapSize, unit: 'bytes' })
  });
});
```

### Webhook Payload Format
The reporter sends this simple JSON payload:
```javascript
{
  test_name: 'dashboard performance',
  metric_name: 'memory_used',
  metric_value: 15728640,
  metric_unit: 'bytes',
  commit: 'abc123def456789',
  branch: 'feature/performance-improvements',
  timestamp: '2025-08-28T10:00:00Z'
}
```

### Configuration
```javascript
// playwright.config.js
export default {
  reporter: [
    ['html'],
    ['./reporters/metrics-reporter.js']  // Simple, no options needed
  ],
};
```

### Environment Variables
```bash
# Only one required
METRICS_WEBHOOK_URL=https://your-webhook-endpoint.com/metrics
```

## Implementation Steps

1. **Create the reporter file** at `packages/testing/playwright/reporters/metrics-reporter.js`
2. **Install dependency**: `npm install git-rev-sync`
3. **Add to Playwright config** as optional reporter
4. **Test with a simple metric attachment** in any existing test

## Error Handling
- **Silent failures**: Network errors won't break tests
- **Invalid JSON**: Malformed attachments are skipped
- **Missing git info**: Returns null values gracefully
- **No webhook URL**: Reporter does nothing

---

This simplified approach focuses purely on the reporter functionality - extracting metrics from test attachments and sending them to a webhook with git context. No dashboard, no storage, no complex configuration needed.