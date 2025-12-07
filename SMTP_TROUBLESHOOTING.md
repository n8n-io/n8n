# SMTP Node Not Working - Troubleshooting Guide

## Problem Statement
- SMTP node test connection never succeeds (hangs forever)
- Same credentials work immediately on a different n8n fork
- App runs fine after data table performance fixes
- Node saves but never completes test

## ✅ Ruled Out
1. **Custom SMTP Code** - No modifications to SMTP node or credentials (verified via git diff)
2. **SMTP Credentials** - Same creds work on other instance
3. **Data Table Performance** - Fixed and no longer blocking app
4. **Build Errors** - Build succeeds after Zod fix

## Potential Root Causes

### 1. **Network/DNS Issues in Railway Production** ⚠️ HIGH PROBABILITY
**Symptoms**: Hangs on test, never times out, never succeeds
**Cause**: Railway container cannot reach SMTP server

**Check**:
```bash
# SSH into Railway container and test
nc -zv smtp.gmail.com 587
# or
telnet smtp.gmail.com 587
```

**Possible Issues**:
- Railway firewall blocking SMTP ports (25, 465, 587, 2525)
- DNS resolution failing in production
- IPv6/IPv4 mismatch
- Egress IP blocked by SMTP provider

**Fix**:
- Check Railway network settings
- Whitelist Railway's egress IPs in SMTP provider
- Try different SMTP port (587 vs 465 vs 2525)
- Add to `.env`:
  ```
  NODE_TLS_REJECT_UNAUTHORIZED=0  # Only for testing!
  ```

---

### 2. **Execution Timeout Too Short** ⚠️ MEDIUM PROBABILITY
**Symptoms**: Test connection times out silently
**Cause**: Default timeout killing SMTP connection before it completes

**Current Setting**:
- `EXECUTIONS_TIMEOUT=-1` (unlimited by default)
- `EXECUTIONS_TIMEOUT_MAX=3600` (1 hour max)

**Check Railway .env**:
```bash
echo $EXECUTIONS_TIMEOUT
echo $EXECUTIONS_TIMEOUT_MAX
```

**Fix**:
Add to Railway environment variables:
```
EXECUTIONS_TIMEOUT=-1
EXECUTIONS_TIMEOUT_MAX=7200
```

---

### 3. **Database Connection Pool Exhaustion** ⚠️ LOW-MEDIUM PROBABILITY
**Symptoms**: App works but individual nodes timeout
**Cause**: 100+ data tables consuming all DB connections

**Check Database Pool Settings**:
Default n8n pool size: Not explicitly set (uses TypeORM defaults)

**Fix**:
Add to Railway `.env`:
```
DB_POSTGRESDB_POOL_SIZE=50
N8N_CONCURRENCY_PRODUCTION_LIMIT=10
```

---

### 4. **Node.js HTTP/S Agent Timeout** ⚠️ MEDIUM-HIGH PROBABILITY
**Symptoms**: HTTP requests hang indefinitely
**Cause**: Default Node.js socket timeout too aggressive or missing

**Check**:
n8n uses `axios` for HTTP requests - default timeout is NONE (waits forever)

**Fix**:
Add to Railway `.env`:
```
GENERIC_TIMEZONE=America/New_York  # Or your timezone
N8N_DEFAULT_BINARY_DATA_MODE=filesystem  # Reduce memory pressure
```

If that doesn't work, you need to patch the SMTP node to add explicit timeouts.

---

### 5. **Memory Pressure from Large Database** ⚠️ LOW PROBABILITY
**Symptoms**: App works but specific operations timeout
**Cause**: Railway container running out of memory

**Check Railway Logs**:
```bash
# Look for:
- "JavaScript heap out of memory"
- Container restarts
- OOM kills
```

**Fix**:
- Upgrade Railway instance size
- Add to `.env`:
  ```
  NODE_OPTIONS=--max-old-space-size=4096
  ```

---

### 6. **SSL/TLS Certificate Issues** ⚠️ MEDIUM PROBABILITY
**Symptoms**: Connection fails silently on SSL handshake
**Cause**: Railway container missing CA certificates or TLS mismatch

**Fix**:
Add to Railway `.env`:
```
NODE_TLS_REJECT_UNAUTHORIZED=0  # TEST ONLY - NOT FOR PRODUCTION
```

If that works, the issue is SSL certs. Proper fix:
```bash
# In Railway Dockerfile (if using custom image)
RUN apt-get update && apt-get install -y ca-certificates
RUN update-ca-certificates
```

---

### 7. **Rate Limiting / IP Reputation** ⚠️ LOW PROBABILITY
**Symptoms**: Works on one instance, not on Railway
**Cause**: SMTP provider blocking Railway's IP range

**Check**:
- Gmail/Outlook may block cloud provider IPs
- Previous Railway users may have spammed from same IP

**Test**:
Try a different SMTP provider:
- SendGrid
- Mailgun
- Amazon SES

---

### 8. **Credential Encryption Key Mismatch** ⚠️ LOW PROBABILITY
**Symptoms**: Node saves but credentials fail at runtime
**Cause**: Different `N8N_ENCRYPTION_KEY` between environments

**Check Railway `.env`**:
```bash
echo $N8N_ENCRYPTION_KEY
```

**Fix**:
Ensure Railway has the SAME encryption key as your working instance.

---

### 9. **SMTP Provider Requires App Password** ⚠️ MEDIUM PROBABILITY
**Symptoms**: Works with regular password elsewhere, fails on Railway
**Cause**: Gmail/Outlook require app-specific passwords for "less secure apps"

**Fix**:
- Gmail: Generate app password at https://myaccount.google.com/apppasswords
- Outlook: Use app password instead of regular password
- Remove 2FA requirement or use OAuth2

---

### 10. **Railway HTTP Proxy Interference** ⚠️ LOW PROBABILITY
**Symptoms**: HTTP works, SMTP doesn't
**Cause**: Railway routing SMTP through HTTP proxy

**Check**:
```bash
echo $HTTP_PROXY
echo $HTTPS_PROXY
echo $NO_PROXY
```

**Fix**:
Add to Railway `.env`:
```
NO_PROXY=*
```

---

## Diagnostic Steps

### Step 1: Enable Debug Logging
Add to Railway `.env`:
```
N8N_LOG_LEVEL=debug
N8N_LOG_OUTPUT=console
DB_LOGGING_ENABLED=true
```

Restart Railway and check logs for SMTP connection attempts.

### Step 2: Test from Railway Container
SSH into Railway:
```bash
railway shell
```

Test SMTP connectivity:
```bash
telnet smtp.gmail.com 587
# OR
curl -v telnet://smtp.gmail.com:587
```

### Step 3: Compare Working vs Broken Instance
Check differences:
```bash
# Working instance
env | grep -E "N8N_|DB_|EXECUTIONS_|NODE_"

# Railway instance
railway env | grep -E "N8N_|DB_|EXECUTIONS_|NODE_"
```

### Step 4: Test with Minimal Workflow
Create a workflow with JUST the SMTP node:
- No data tables
- No variables
- Hardcoded credentials
- Simple "test" message

If this works → data table size is still an issue
If this fails → network/Railway issue

### Step 5: Check Railway Service Logs
```bash
railway logs --tail 100
```

Look for:
- Connection timeout errors
- DNS resolution failures
- SSL handshake errors
- Memory errors

---

## Quick Fix Checklist

Add these to Railway environment variables:

```bash
# Network & Timeouts
EXECUTIONS_TIMEOUT=-1
EXECUTIONS_TIMEOUT_MAX=7200
NODE_OPTIONS=--max-old-space-size=4096

# Debug
N8N_LOG_LEVEL=debug
N8N_LOG_OUTPUT=console

# Database
DB_POSTGRESDB_POOL_SIZE=50
N8N_CONCURRENCY_PRODUCTION_LIMIT=10

# Performance
N8N_DEFAULT_BINARY_DATA_MODE=filesystem

# SSL (TEST ONLY)
NODE_TLS_REJECT_UNAUTHORIZED=0
```

Restart Railway and test SMTP again.

---

## Most Likely Culprits (Ranked)

1. **Railway network blocking SMTP ports** (70% probability)
2. **SMTP provider blocking Railway IPs** (15% probability)
3. **App password required instead of regular password** (10% probability)
4. **Execution timeout killing connection** (3% probability)
5. **Database pool exhaustion** (2% probability)

---

## Next Steps

1. Check Railway logs for SMTP connection errors
2. Test SMTP connectivity from Railway container
3. Try different SMTP provider (SendGrid, Mailgun)
4. Compare env vars between working and broken instance
5. Enable debug logging and analyze connection attempts
