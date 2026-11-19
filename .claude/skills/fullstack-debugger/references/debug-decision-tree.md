# Debug Decision Tree

Use this flowchart to systematically identify the source of issues.

## Starting Point

```
Is there an error message?
├── YES → Go to "Error Analysis"
└── NO  → Go to "Unexpected Behavior"
```

---

## Error Analysis

```
Where does the error appear?
│
├── Browser Console (Red text)
│   ├── "Failed to fetch" / CORS
│   │   └── → Check Worker CORS headers
│   │       → Test: curl -H "Origin: https://site.com" <endpoint>
│   │
│   ├── "Hydration failed"
│   │   └── → Client/server mismatch
│   │       → Add 'use client' or useEffect wrapper
│   │
│   ├── "TypeError: Cannot read properties of undefined"
│   │   └── → Data not loaded yet
│   │       → Add optional chaining (?.) or loading state
│   │
│   └── Other JS error
│       └── → Check stack trace, find component
│           → Add error boundary for graceful handling
│
├── Network Tab (Red request)
│   ├── Status 401/403
│   │   └── → Authentication issue
│   │       → Check JWT, Supabase session, RLS policies
│   │
│   ├── Status 404
│   │   └── → Wrong URL or resource deleted
│   │       → Verify endpoint exists, check typos
│   │
│   ├── Status 500
│   │   └── → Server/Worker error
│   │       → Check wrangler tail or Supabase logs
│   │
│   └── Status 0 / Canceled
│       └── → Request never completed
│           → Check CORS, network, or component unmounted
│
├── Build/Terminal
│   ├── TypeScript error
│   │   └── → Type mismatch or cache issue
│   │       → Fix types or clear TS cache
│   │
│   ├── "Module not found"
│   │   └── → Missing dependency or wrong path
│   │       → npm install or fix import
│   │
│   └── "Page couldn't be rendered statically"
│       └── → Dynamic API in static context
│           → Add 'force-dynamic' or generateStaticParams
│
└── Supabase Dashboard
    ├── Auth error
    │   └── → Check redirect URLs, email templates
    │
    └── Query error
        └── → Check RLS policies, table exists
```

---

## Unexpected Behavior

```
What's happening vs expected?
│
├── Data is empty (but should have results)
│   ├── API returning empty?
│   │   └── Check Network tab response body
│   │       ├── Empty array [] → RLS blocking
│   │       ├── Has data → Frontend not displaying
│   │       └── Error in response → API issue
│   │
│   └── Data loads then disappears?
│       └── → Component remounting or state reset
│           → Check parent key props, auth redirects
│
├── Data is stale (showing old values)
│   ├── Changed in Supabase but not showing?
│   │   └── → Cache issue (browser, React Query, or KV)
│   │       → Clear all caches, check cache headers
│   │
│   └── Changed in code but not deployed?
│       └── → Check deployment succeeded
│           → Purge CDN cache
│
├── UI looks wrong
│   ├── Layout broken?
│   │   └── → CSS issue, check Tailwind classes
│   │       → Inspect element, check applied styles
│   │
│   ├── Flash of unstyled content?
│   │   └── → CSS not loading fast enough
│   │       → Check font loading, critical CSS
│   │
│   └── Different on mobile vs desktop?
│       └── → Responsive breakpoints
│           → Check Tailwind sm:/md:/lg: classes
│
├── Auth not working
│   ├── Can't log in?
│   │   └── → Check Supabase Auth settings
│   │       → Verify redirect URLs match
│   │
│   ├── Logged in but shows as logged out?
│   │   └── → Session not persisting
│   │       → Check cookies, localStorage, AuthContext
│   │
│   └── Works locally, fails in production?
│       └── → Environment variables missing
│           → Check Cloudflare Pages env vars
│
└── Slow performance
    ├── Initial load slow?
    │   └── → Bundle too large
    │       → Analyze with next/bundle-analyzer
    │
    ├── Interactions slow?
    │   └── → Re-renders or heavy computation
    │       → Profile with React DevTools
    │
    └── API calls slow?
        └── → Backend or network issue
            → Check wrangler tail for timing
```

---

## Quick Diagnostic Commands

```bash
# 1. Is the site even reachable?
curl -s -o /dev/null -w "%{http_code}" https://yoursite.com

# 2. Is the API working?
curl -s https://your-worker.workers.dev/health

# 3. Are CORS headers present?
curl -s -D - -o /dev/null -H "Origin: https://yoursite.com" https://your-api.com/endpoint

# 4. What's in the worker logs?
cd workers/your-worker && npx wrangler tail

# 5. Is Supabase accessible?
node -e "require('@supabase/supabase-js').createClient('URL','KEY').from('table').select('*').limit(1).then(console.log)"

# 6. Is the build clean?
npm run build 2>&1 | grep -E "(error|Error|failed)"

# 7. TypeScript happy?
npx tsc --noEmit 2>&1 | head -20
```

---

## Layer Isolation Test

When you can't tell which layer is broken:

```
1. Test Supabase directly (dashboard or curl)
   └── Works? → Problem is NOT Supabase

2. Test Worker directly (curl, no browser)
   └── Works? → Problem is NOT Worker

3. Test in browser devtools (Network tab)
   └── Request succeeds? → Problem is frontend code

4. Test locally (npm run dev)
   └── Works locally? → Problem is deployment/config

5. Test in incognito (fresh state)
   └── Works in incognito? → Problem is cached state
```

---

## The "Nothing Is Working" Checklist

When everything seems broken:

```
[ ] Is the internet working? (ping google.com)
[ ] Is Node running correctly? (node -v)
[ ] Are dependencies installed? (npm ls --depth=0)
[ ] Is the dev server running? (npm run dev)
[ ] Are environment variables set? (echo $NEXT_PUBLIC_...)
[ ] Is git clean or are there conflicts? (git status)
[ ] Did you save all files? (check unsaved indicators)
[ ] Is the TypeScript cache haunting you? (clear it!)
[ ] Are you on the right branch? (git branch --show-current)
[ ] Did something change recently? (git log -5)
```
