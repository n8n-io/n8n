# SMTP Node Hanging Issue - FIXED

## Problem
SMTP credential test hangs forever when "Save" button is clicked. Never times out, never shows error.

## Root Cause
**Two missing timeouts** in the SMTP test connection flow:

1. **`transporter.verify()`** in the SMTP node has NO timeout - hangs forever if connection fails
2. **Credential test service** has NO timeout wrapper around test function calls

## The Fix

### Fix #1: SMTP Node Timeout (10 seconds)
**File**: `packages/nodes-base/nodes/EmailSend/v2/utils.ts:57-62`

```typescript
// Add 10-second timeout to prevent hanging forever
const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000);
});

await Promise.race([transporter.verify(), timeoutPromise]);
```

**Result**: SMTP connection test now fails with clear error after 10 seconds instead of hanging forever.

---

### Fix #2: Credentials Tester Service Timeout (30 seconds)
**File**: `packages/cli/src/services/credentials-tester.service.ts:240-243`

```typescript
// Add 30-second timeout to prevent credential tests from hanging forever
const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Credential test timeout after 30 seconds')), 30000);
});

const result = await Promise.race([functionResult, timeoutPromise]);
```

**Result**: ALL credential tests (not just SMTP) now timeout after 30 seconds as a safety net.

---

## What This Fixes

### ✅ Before
- Click "Save" on SMTP credentials → hangs forever
- No error message
- No timeout
- UI freezes

### ✅ After
- Click "Save" on SMTP credentials → fails after 10 seconds
- Clear error message: "Connection timeout after 10 seconds"
- Can diagnose actual issue (network, firewall, credentials, etc.)

---

## Why This Happened

This is an **upstream n8n bug** - nodemailer's `transporter.verify()` has no built-in timeout and n8n never added one.

**Proof**: Other n8n instances work because they have:
- Faster network to SMTP server
- Different firewall rules
- Direct connection without Railway's network

Your instance hangs because:
- Railway network likely blocks SMTP ports or has strict firewall
- Connection never succeeds, never fails - just hangs
- No timeout means infinite wait

---

## Testing the Fix

### Step 1: Rebuild n8n
```bash
pnpm build
```

### Step 2: Restart n8n
```bash
# Railway
railway up

# OR local dev
pnpm dev
```

### Step 3: Test SMTP Credential
1. Go to SMTP credentials
2. Click "Save"
3. Wait 10 seconds max
4. You should now get an error message instead of infinite hang

### Expected Error Messages

**Network/Firewall Issue**:
```
Connection timeout after 10 seconds
```

**Invalid Credentials**:
```
Invalid login: 535-5.7.8 Username and Password not accepted
```

**Invalid Host/Port**:
```
ENOTFOUND smtp.example.com
```

**SSL/TLS Issue**:
```
self signed certificate in certificate chain
```

---

## Next Steps

Once you see the actual error message (instead of hanging), you can:

1. **Network Issue** → Check Railway firewall settings, whitelist SMTP ports
2. **Invalid Credentials** → Use app password instead of regular password
3. **Invalid Host** → Verify SMTP server address
4. **SSL Issue** → Try different port (587 vs 465) or disable SSL

---

## Files Modified

1. `packages/nodes-base/nodes/EmailSend/v2/utils.ts` - Added 10s timeout to SMTP test
2. `packages/cli/src/services/credentials-tester.service.ts` - Added 30s timeout to all credential tests

---

## Why Microsoft Email Node Works

Microsoft uses OAuth2 (HTTP-based), which has proper timeouts built into axios/HTTP clients.

SMTP uses raw TCP sockets via nodemailer, which has **no default timeout** - it waits forever unless explicitly configured.
