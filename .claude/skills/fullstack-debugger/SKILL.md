---
name: fullstack-debugger
description: 'Expert debugger for Next.js + Cloudflare Workers + Supabase stacks. Systematic troubleshooting for auth, caching, workers, RLS, CORS, and build issues. Activate on: ''debug'', ''not working'',
  ''error'', ''broken'', ''500'', ''401'', ''403'', ''cache issue'', ''RLS'', ''CORS''. NOT for: feature development (use language skills), architecture design (use system-architect).'
allowed-tools: Read,Write,Edit,Bash,Grep,Glob,WebFetch,mcp__supabase__*,mcp__playwright__*
metadata:
  category: Code Quality & Testing
  pairs-with:
  - skill: devops-automator
    reason: Deployment and infrastructure issues
  - skill: site-reliability-engineer
    reason: Production incidents
  tags:
  - debugging
  - nextjs
  - cloudflare-workers
  - supabase
  - troubleshooting
---

# Fullstack Debugger

Expert debugger for modern web stacks: Next.js 15, Cloudflare Workers, Supabase, and edge deployments. Systematic, evidence-based troubleshooting.

## Activation Triggers

**Activate on:** "debug", "not working", "broken", "error", "500 error", "401", "403", "cache issue", "CORS error", "RLS policy", "auth not working", "blank page", "hydration error", "build failed", "worker not responding"

**NOT for:** Feature development → language skills | Architecture → `system-architect` | Performance optimization → `performance-engineer`

## Debug Philosophy

```
1. REPRODUCE → Can you make it fail consistently?
2. ISOLATE   → Which layer is broken?
3. EVIDENCE  → What do logs/network/state show?
4. HYPOTHESIZE → What could cause this?
5. TEST      → Validate one hypothesis at a time
6. FIX       → Minimal change that resolves issue
7. VERIFY    → Confirm fix doesn't break other things
```

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    DEBUGGING LAYERS                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: Browser/Client                                    │
│  ├── Console errors, network tab, React DevTools           │
│  ├── localStorage/sessionStorage state                     │
│  └── React Query cache state                               │
│                                                             │
│  Layer 2: Next.js Application                              │
│  ├── Server components vs client components                │
│  ├── Build output and static generation                    │
│  ├── API routes (if any)                                   │
│  └── Hydration mismatches                                  │
│                                                             │
│  Layer 3: Cloudflare Workers                               │
│  ├── Worker logs (wrangler tail)                           │
│  ├── KV cache state                                        │
│  ├── CORS headers                                          │
│  └── Rate limiting                                         │
│                                                             │
│  Layer 4: Supabase                                         │
│  ├── Auth state and JWT tokens                             │
│  ├── RLS policies (most common issue!)                     │
│  ├── Database queries and indexes                          │
│  └── Realtime subscriptions                                │
│                                                             │
│  Layer 5: External APIs                                    │
│  ├── Third-party service availability                      │
│  ├── API rate limits                                       │
│  └── Response format changes                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Quick Diagnosis Commands

### Check Everything At Once

```bash
# Run from next-app/ directory
echo "=== Build Check ===" && npm run build 2>&1 | tail -20
echo "=== TypeScript ===" && npx tsc --noEmit 2>&1 | head -20
echo "=== Lint ===" && npm run lint 2>&1 | head -20
echo "=== Git Status ===" && git status --short
```

### Supabase RLS Diagnosis

```bash
# Check if RLS is blocking queries (most common issue!)
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_ANON_KEY'
);

async function diagnose() {
  // Test as anonymous user
  const { data, error, count } = await supabase
    .from('YOUR_TABLE')
    .select('*', { count: 'exact' })
    .limit(5);

  console.log('Error:', error);
  console.log('Count:', count);
  console.log('Sample:', data);
}
diagnose();
"
```

### Worker Health Check

```bash
# Check if workers are responding
curl -s -o /dev/null -w "%{http_code}" https://YOUR-WORKER.workers.dev/health

# Check CORS headers
curl -s -D - -o /dev/null -H "Origin: https://yoursite.com" \
  https://YOUR-WORKER.workers.dev/api/endpoint | grep -iE "(access-control|x-)"

# Stream worker logs
cd workers/your-worker && npx wrangler tail
```

### Cache Inspection

```bash
# Check Cloudflare KV cache
npx wrangler kv:key list --namespace-id=YOUR_NAMESPACE_ID | head -20

# Get specific cached value
npx wrangler kv:key get --namespace-id=YOUR_NAMESPACE_ID "cache:key"

# Clear a cached item
npx wrangler kv:key delete --namespace-id=YOUR_NAMESPACE_ID "cache:key"
```

## Common Issues & Solutions

### 1. RLS Policy Blocking Data (Most Common!)

**Symptoms:**
- Query returns empty array but no error
- Works in Supabase dashboard but not in app
- Works for some users but not others

**Diagnosis:**
```sql
-- In Supabase SQL Editor
-- Check what policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'your_table';

-- Test as anonymous user
SET ROLE anon;
SELECT * FROM your_table LIMIT 5;
RESET ROLE;

-- Test as authenticated user
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "user-uuid-here"}';
SELECT * FROM your_table LIMIT 5;
RESET ROLE;
```

**Common Fixes:**
```sql
-- Allow public read access
CREATE POLICY "Allow public read" ON your_table
  FOR SELECT USING (true);

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated read" ON your_table
  FOR SELECT TO authenticated USING (true);

-- Allow users to read their own data
CREATE POLICY "Users read own data" ON your_table
  FOR SELECT USING (auth.uid() = user_id);
```

### 2. CORS Errors

**Symptoms:**
- "Access to fetch blocked by CORS policy"
- Works in Postman but not in browser
- Preflight request fails

**Diagnosis:**
```bash
# Check what CORS headers are returned
curl -s -D - -o /dev/null \
  -H "Origin: https://yoursite.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS \
  https://your-worker.workers.dev/api/endpoint
```

**Fix in Cloudflare Worker:**
```typescript
// In your worker
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or specific domain
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle preflight
if (request.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}

// Add to all responses
return new Response(data, {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
```

### 3. Auth State Not Persisting

**Symptoms:**
- User logged in but shows as logged out on refresh
- Auth works locally but not in production
- Session disappears randomly

**Diagnosis:**
```javascript
// In browser console
console.log('Session:', await supabase.auth.getSession());
console.log('User:', await supabase.auth.getUser());
console.log('LocalStorage:', Object.keys(localStorage).filter(k => k.includes('supabase')));
```

**Common Fixes:**
- Check Supabase URL matches (http vs https, trailing slash)
- Verify site URL in Supabase Auth settings
- Check for cookie blocking (Safari, incognito)
- Ensure AuthContext wraps all components needing auth

### 4. Hydration Mismatch

**Symptoms:**
- "Hydration failed because the initial UI does not match"
- Content flashes on page load
- Different content on server vs client

**Diagnosis:**
```typescript
// Temporarily add to suspect component
useEffect(() => {
  console.log('Client render:', document.body.innerHTML.slice(0, 500));
}, []);
```

**Common Fixes:**
```typescript
// Use client-only rendering for dynamic content
'use client';
import { useState, useEffect } from 'react';

function DynamicContent() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null; // or skeleton
  return <div>{/* dynamic content */}</div>;
}
```

### 5. Worker Not Deploying

**Symptoms:**
- Deploy command succeeds but changes not reflected
- Old code still running
- Intermittent old/new behavior

**Diagnosis:**
```bash
# Check deployment status
npx wrangler deployments list

# View current worker code
npx wrangler deployments view

# Check for multiple environments
npx wrangler whoami
```

**Fixes:**
```bash
# Force redeploy
npx wrangler deploy --force

# Clear Cloudflare cache
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

### 6. TypeScript Cache Haunting

**Symptoms:**
- Errors reference deleted/changed code
- Types don't match current code
- "Cannot find module" for existing files

**Fix:**
```bash
# Nuclear option - clear all caches
rm -rf .next node_modules/.cache tsconfig.tsbuildinfo
npm run build

# Or just TypeScript cache
rm -rf node_modules/.cache/typescript
npx tsc --build --clean
```

### 7. Static Export Issues

**Symptoms:**
- "Error: Page X couldn't be rendered statically"
- Dynamic routes fail in static export
- API routes don't work after deploy

**Diagnosis:**
```bash
# Check next.config for output mode
grep -A5 "output:" next.config.ts

# Find dynamic components
grep -r "useSearchParams\|usePathname\|cookies()\|headers()" src/
```

**Fixes:**
```typescript
// For components using dynamic APIs
export const dynamic = 'force-dynamic';
// or wrap in Suspense with fallback

// For generateStaticParams
export async function generateStaticParams() {
  return [{ slug: 'page1' }, { slug: 'page2' }];
}
```

### 8. Rate Limiting Issues

**Symptoms:**
- 429 errors after several requests
- Works initially then stops
- Different behavior per IP

**Diagnosis:**
```bash
# Check rate limit headers
curl -i https://your-worker.workers.dev/api/endpoint 2>&1 | grep -i ratelimit

# Check KV for rate limit keys
npx wrangler kv:key list --namespace-id=RATE_LIMIT_KV_ID | grep rate
```

**Fixes:**
```bash
# Clear rate limit for an IP
npx wrangler kv:key delete --namespace-id=RATE_LIMIT_KV_ID "rate:192.168.1.1"

# Adjust limits in wrangler.toml
RATE_LIMIT_REQUESTS = "100"
RATE_LIMIT_WINDOW = "3600"
```

### 9. Meeting/Location Data Issues

**Symptoms:**
- No meetings found in certain areas
- Stale meeting data
- Cache showing wrong data

**Diagnosis:**
```bash
# Check cache status for a location
curl -s -D - -o /dev/null \
  -H "Origin: https://yoursite.com" \
  "https://your-proxy.workers.dev/api/all?lat=45.52&lng=-122.68&radius=25" \
  | grep -iE "(x-cache|x-geohash|x-source)"

# Force cache refresh
curl -H "Origin: https://yoursite.com" \
  "https://your-proxy.workers.dev/warm"

# Check Supabase for meeting count
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('URL', 'KEY');
supabase.from('meetings').select('*', { count: 'exact', head: true })
  .then(({count}) => console.log('Total meetings:', count));
"
```

### 10. Build Fails on Cloudflare Pages

**Symptoms:**
- Works locally but fails on deploy
- "Module not found" errors
- Memory exceeded

**Diagnosis:**
```bash
# Check build output locally
NODE_ENV=production npm run build 2>&1 | tee build.log

# Check for conditional imports
grep -r "require(" src/ --include="*.ts" --include="*.tsx"

# Check bundle size
npx next-bundle-analyzer
```

**Fixes:**
```javascript
// next.config.ts - increase memory
module.exports = {
  experimental: {
    memoryBasedWorkersCount: true,
  },
  // Reduce bundle size
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'sharp'];
    return config;
  }
};
```

## Debug Scripts

### `scripts/diagnose.sh`
```bash
#!/bin/bash
# Run all diagnostics

echo "=== Environment ==="
node -v && npm -v

echo "=== Dependencies ==="
npm ls --depth=0 2>&1 | grep -E "(UNMET|missing)"

echo "=== TypeScript ==="
npx tsc --noEmit 2>&1 | head -30

echo "=== Build ==="
npm run build 2>&1 | tail -30

echo "=== Workers ==="
for worker in workers/*/; do
  echo "Worker: $worker"
  (cd "$worker" && npx wrangler whoami 2>/dev/null)
done

echo "=== Supabase ==="
npx supabase status 2>/dev/null || echo "Supabase CLI not configured"
```

### `scripts/check-rls.js`
```javascript
// Check RLS policies are working correctly
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkTable(table) {
  console.log(`\n=== Checking ${table} ===`);
  const { data, error, count } = await supabase
    .from(table)
    .select('*', { count: 'exact' })
    .limit(1);

  if (error) {
    console.log(`ERROR: ${error.message}`);
  } else {
    console.log(`OK: ${count} rows accessible`);
  }
}

// Check critical tables
['profiles', 'meetings', 'forum_posts', 'journal_entries'].forEach(checkTable);
```

## Validation Checklist

```
[ ] Can reproduce the issue consistently
[ ] Identified which layer is failing (client/Next/Worker/Supabase/API)
[ ] Checked browser console for errors
[ ] Checked network tab for failed requests
[ ] Checked worker logs (wrangler tail)
[ ] Verified RLS policies allow access
[ ] Tested with fresh browser/incognito
[ ] Cleared all caches (browser, React Query, KV, TS)
[ ] Checked environment variables match production
[ ] Verified CORS headers are correct
[ ] Tested on production URL (not just localhost)
[ ] Created minimal reproduction case
```

## Output

When debugging, always provide:
1. **Root cause** - What exactly was wrong
2. **Evidence** - Logs, errors, or queries that proved it
3. **Fix** - Minimal code change to resolve
4. **Verification** - How to confirm it's fixed
5. **Prevention** - How to avoid this in future

## Tools Available

- `Read`, `Write`, `Edit` - File operations
- `Bash` - Run commands, curl, wrangler
- `Grep`, `Glob` - Search codebase
- `WebFetch` - Test endpoints
- `mcp__supabase__*` - Direct Supabase operations
- `mcp__playwright__*` - Browser automation for UI testing
