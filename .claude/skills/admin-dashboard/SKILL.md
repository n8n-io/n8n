---
name: admin-dashboard
description: Extend and modify the admin dashboard, developer portal, and operations console. Use when adding new admin tabs, metrics, monitoring features, or internal tools. Activates for dashboard development,
  analytics, user management, and internal tooling.
allowed-tools: Read,Write,Edit,Bash(npm:*,npx:*)
metadata:
  category: Productivity & Meta
  tags:
  - dashboard
  - admin
  - internal-tools
  pairs-with:
  - skill: reactive-dashboard-performance
    reason: Performance optimization patterns keep admin dashboards responsive under heavy data loads
  - skill: supabase-admin
    reason: Admin dashboards typically display and manage Supabase-backed data and user records
  - skill: logging-observability
    reason: Admin consoles surface the metrics and logs that observability systems collect
---

# Admin & Developer Suite Development

This skill helps you extend the admin dashboard and build internal tools following the established patterns.

## Architecture Overview

```
/admin     - Admin Dashboard (user metrics, access control, audit)
/dev       - Developer Portal (docs, code browser, feature map) [PLANNED]
/ops       - Operations Console (infrastructure, logs, incidents) [PLANNED]
```

See `docs/ADMIN-DEVELOPER-SUITE.md` for the full design specification.

## Current Admin Dashboard Structure

Location: `src/app/admin/page.tsx`

### Existing Tabs

| Tab | Purpose | Data Source |
|-----|---------|-------------|
| Overview | Quick stats (users, check-ins, messages) | `/api/admin/stats` |
| Funnel | User engagement waterfall | `/api/admin/stats` |
| Page Views | Analytics by page path | `/api/admin/stats` |
| Users | User roster with activity | `/api/admin/stats` |
| Access Requests | Pending/approved/denied requests | `/api/admin/access-requests` |
| Allowed Emails | Email whitelist management | `/api/admin/allowed-emails` |
| Email Templates | Preview system emails | Local data |

### Planned Tabs (from design)

| Tab | Purpose | Status |
|-----|---------|--------|
| Production Health | API latency, Core Web Vitals | Pending |
| Error Tracking | HIPAA-safe error aggregation | Pending |
| External Services | Anthropic, DB, Push status | Pending |
| AI Analytics | Conversation metrics, tokens | Pending |
| Audit Logs | HIPAA compliance viewer | Pending |

## Adding a New Admin Tab

### 1. Create the Tab Content Component

```typescript
// In src/app/admin/page.tsx, add a new tab component

function ProductionHealthTab() {
  const [metrics, setMetrics] = useState<APIMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      const res = await fetch('/api/admin/metrics');
      const data = await res.json();
      setMetrics(data);
      setLoading(false);
    }
    fetchMetrics();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Uptime" value={metrics.uptime} />
        <StatCard label="Avg Latency" value={`${metrics.avgLatency}ms`} />
        <StatCard label="Errors (24h)" value={metrics.errorCount} />
        <StatCard label="Active Users" value={metrics.activeUsers} />
      </div>
      {/* More content */}
    </div>
  );
}
```

### 2. Add the Tab to the Tab List

```typescript
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'health', label: 'Production Health' }, // NEW
  { id: 'funnel', label: 'Funnel' },
  // ...
];
```

### 3. Add the Tab Content Renderer

```typescript
function renderTabContent(tabId: string) {
  switch (tabId) {
    case 'overview':
      return <OverviewTab stats={stats} />;
    case 'health':
      return <ProductionHealthTab />; // NEW
    // ...
  }
}
```

## Creating Admin API Endpoints

### Pattern: Admin Stats Endpoint

```typescript
// src/app/api/admin/metrics/route.ts
import { requireAdmin } from '@/db/secure-db';
import { createRateLimiter } from '@/lib/rate-limit';
import { logAdminAction } from '@/lib/hipaa/audit';

const rateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 60,
  keyPrefix: 'admin:metrics'
});

export async function GET(request: Request) {
  // 1. Check admin access
  const admin = await requireAdmin();
  if (!admin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2. Apply rate limiting
  const rateLimitResult = await rateLimiter.check(admin.id);
  if (!rateLimitResult.allowed) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitResult.headers }
    );
  }

  // 3. Log admin action
  await logAdminAction(
    admin.id,
    AuditAction.ADMIN_STATS_VIEW,
    'metrics',
    null
  );

  // 4. Fetch and return data
  const metrics = await getAPIMetrics();
  return Response.json(metrics);
}
```

## Key Patterns

### StatCard Component

```typescript
function StatCard({
  label,
  value,
  trend,
  status
}: {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'good' | 'warning' | 'error';
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {trend && <TrendIndicator direction={trend} />}
      {status && <StatusBadge status={status} />}
    </div>
  );
}
```

### Data Fetching Pattern

```typescript
// Use SWR or React Query for real-time updates
import useSWR from 'swr';

function useAdminMetrics() {
  const { data, error, isLoading } = useSWR(
    '/api/admin/metrics',
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30s
  );

  return { metrics: data, error, isLoading };
}
```

### HIPAA-Safe Error Display

```typescript
// Never show user-specific error details
function ErrorList({ errors }: { errors: AggregatedError[] }) {
  return (
    <div>
      {errors.map(error => (
        <div key={error.hash}>
          <span className="font-mono">{error.type}</span>
          <span>{error.path}</span>
          <span>{error.count} occurrences</span>
          <span>{error.affectedUsers} users</span>
          {/* NO user IDs, NO error messages with PHI */}
        </div>
      ))}
    </div>
  );
}
```

## Database Tables for Admin Features

Existing tables:
- `adminUsers` - Admin role assignments
- `allowedEmails` - Email whitelist
- `accessRequests` - Access request queue
- `auditLog` - HIPAA audit trail
- `pageViews` - Navigation analytics

Planned tables (from design):
- `api_metrics` - API timing data
- `app_errors` - Aggregated errors
- `service_health` - External service status
- `conversation_analytics` - AI chat metadata
- `incidents` - Incident tracking

## Access Control

```typescript
// Always use requireAdmin() for admin routes
import { requireAdmin } from '@/db/secure-db';

// For super-admin only features
const admin = await requireAdmin();
if (admin.role !== 'super_admin') {
  return Response.json({ error: 'Super admin required' }, { status: 403 });
}
```

## Testing Admin Features

```typescript
// Mock admin authentication for tests
vi.mock('@/db/secure-db', () => ({
  requireAdmin: vi.fn().mockResolvedValue({
    id: 'test-admin',
    role: 'admin'
  })
}));

describe('Admin Metrics Endpoint', () => {
  it('returns metrics for authenticated admin', async () => {
    const response = await GET(mockRequest);
    expect(response.status).toBe(200);
  });

  it('returns 403 for non-admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(null);
    const response = await GET(mockRequest);
    expect(response.status).toBe(403);
  });
});
```

## Design Resources

- Full design spec: `docs/ADMIN-DEVELOPER-SUITE.md`
- Design system: Use existing components from `src/components/ui/`
- Colors: Follow therapeutic palette (navy, teal, coral, cream)
