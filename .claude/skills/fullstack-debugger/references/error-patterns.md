# Common Error Patterns & Solutions

## Browser Console Errors

### "Failed to fetch" / "TypeError: Failed to fetch"
**Cause:** Network request failed - usually CORS, network issue, or server down
**Debug:**
```bash
# Test endpoint directly
curl -v https://your-endpoint.workers.dev/api/test

# Check CORS
curl -H "Origin: https://yoursite.com" -v https://your-endpoint.workers.dev/api/test
```
**Fix:** Add CORS headers to worker response

### "Hydration failed because the initial UI does not match"
**Cause:** Server HTML differs from client render (dates, random values, browser APIs)
**Debug:**
```jsx
// Add to suspect component
useEffect(() => {
  console.log('Mounted - client only');
}, []);
```
**Fix:** Wrap dynamic content in client-only component:
```jsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return <Skeleton />;
```

### "Cannot read properties of undefined"
**Cause:** Accessing nested property before data loads
**Fix:**
```jsx
// Before
data.user.name

// After
data?.user?.name ?? 'Unknown'
```

### "Invalid hook call"
**Cause:** Hooks called conditionally, in loops, or outside components
**Debug:** Check for early returns before hooks
**Fix:** Move hooks to top of component, before any conditionals

---

## Supabase Errors

### Empty results (no error, but data = [])
**Cause:** RLS policy blocking access (99% of cases)
**Debug:**
```sql
-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Test as anon
SET ROLE anon;
SELECT * FROM your_table LIMIT 1;
```
**Fix:** Add SELECT policy: `CREATE POLICY "name" ON table FOR SELECT USING (true);`

### "JWT expired"
**Cause:** Session token expired
**Fix:**
```javascript
// Refresh session
const { data, error } = await supabase.auth.refreshSession();
```

### "relation does not exist"
**Cause:** Table doesn't exist, wrong schema, or typo
**Debug:**
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

### "new row violates row-level security policy"
**Cause:** INSERT/UPDATE blocked by RLS
**Debug:** Check INSERT/UPDATE policies, verify auth.uid() matches

---

## Cloudflare Worker Errors

### 1101 Worker threw exception
**Cause:** Unhandled exception in worker code
**Debug:**
```bash
cd workers/your-worker
npx wrangler tail
# Then trigger the error
```
**Fix:** Add try/catch, check for undefined values

### 1102 Worker exceeded CPU time limit
**Cause:** Worker took too long (50ms free, 30s paid)
**Fix:** Optimize code, use streaming, cache results

### 524 A timeout occurred
**Cause:** Worker took longer than 100 seconds
**Fix:** Break into smaller operations, use Durable Objects

### KV "key not found"
**Cause:** Key doesn't exist or expired
**Debug:**
```bash
npx wrangler kv:key get --namespace-id=YOUR_NS "your:key"
```

---

## Next.js Build Errors

### "Page X couldn't be rendered statically"
**Cause:** Using dynamic APIs (cookies, headers, searchParams) without proper handling
**Fix:**
```typescript
// Add to page
export const dynamic = 'force-dynamic';
// or wrap in Suspense
```

### "Module not found: Can't resolve 'X'"
**Cause:** Missing dependency, wrong import path, or server/client mismatch
**Debug:**
```bash
npm ls X  # Check if installed
grep -r "from 'X'" src/  # Find imports
```
**Fix:** `npm install X` or fix import path

### "You're importing a component that needs useState"
**Cause:** Using client hook in server component
**Fix:** Add `'use client'` directive at top of file

### Out of memory during build
**Cause:** Large pages, too many images, complex dependencies
**Fix:**
```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

---

## TypeScript Errors

### "Cannot find module" (but it exists)
**Cause:** Stale TypeScript cache
**Fix:**
```bash
rm -rf node_modules/.cache/typescript tsconfig.tsbuildinfo
npx tsc --build --clean
```

### "Type X is not assignable to type Y"
**Debug:** Look at both types, find the mismatch
**Fix:** Adjust type, add assertion, or fix data

### "Object is possibly 'undefined'"
**Fix:** Add null check or optional chaining:
```typescript
// Before
user.name

// After
user?.name ?? 'default'
```

---

## Authentication Issues

### User stuck in logged-out state
**Debug:**
```javascript
// In browser console
console.log(await supabase.auth.getSession());
localStorage.getItem('sb-xxx-auth-token');
```
**Common causes:**
- Wrong Supabase URL (http vs https)
- Site URL mismatch in Supabase dashboard
- Cookie blocked (Safari, incognito)

### Redirect loop on auth
**Cause:** Auth callback not handling state correctly
**Fix:** Check redirect URLs in Supabase dashboard match your app

---

## Performance Issues

### Slow initial load
**Debug:**
```bash
# Check bundle size
npx @next/bundle-analyzer
```
**Fix:**
- Dynamic imports for large components
- Image optimization
- Remove unused dependencies

### "Stale closure" / state not updating
**Cause:** Callback using old state value
**Fix:** Use functional update or add to dependency array:
```javascript
setCount(prev => prev + 1);  // Not setCount(count + 1)
```

---

## Deployment Issues

### Works locally, fails in production
**Debug checklist:**
1. Environment variables set in Cloudflare Pages?
2. Build command correct?
3. Output directory correct (`out` for static)?
4. Node version matches?

### Changes not reflecting after deploy
**Cause:** CDN/browser caching
**Fix:**
```bash
# Purge Cloudflare cache
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE/purge_cache" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"purge_everything":true}'

# Or add cache busting
?v=2 to resource URLs
```
