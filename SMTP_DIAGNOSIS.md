# SMTP Connection Timeout - Diagnosis & Solutions

## Error Message
```
Couldn't connect with these settings
Connection timeout after 10 seconds
```

## What This Means
Railway **cannot reach your SMTP server** within 10 seconds. The connection is being blocked or timing out.

---

## Quick Diagnostic Checklist

### 1. What SMTP Provider Are You Using?
- [ ] Gmail (smtp.gmail.com)
- [ ] Outlook/Hotmail (smtp-mail.outlook.com or smtp.office365.com)
- [ ] Yahoo (smtp.mail.yahoo.com)
- [ ] Custom/Business SMTP server
- [ ] SendGrid/Mailgun/SES

### 2. What Port Are You Using?
- [ ] **Port 587** (STARTTLS - recommended)
- [ ] **Port 465** (SSL/TLS)
- [ ] **Port 25** (Plain - usually blocked)
- [ ] **Port 2525** (Alternative)

### 3. SSL/TLS Settings
- [ ] **SSL/TLS enabled** (for port 465)
- [ ] **SSL/TLS disabled** (for port 587 with STARTTLS)

---

## Most Common Issues & Fixes

### Issue #1: Railway Blocks SMTP Ports (MOST LIKELY)
**Symptom**: Timeout on all SMTP connections
**Cause**: Railway/cloud providers often block outbound SMTP ports to prevent spam

**Solution A - Use SMTP Relay Service**:
Instead of direct Gmail/Outlook, use a relay service that Railway allows:

1. **SendGrid** (Recommended)
   - Host: `smtp.sendgrid.net`
   - Port: `587` or `2525`
   - SSL/TLS: Disabled (uses STARTTLS)
   - Free tier: 100 emails/day
   - Sign up: https://sendgrid.com/

2. **Mailgun**
   - Host: `smtp.mailgun.org`
   - Port: `587`
   - Free tier: 5,000 emails/month

3. **Amazon SES**
   - Host: `email-smtp.us-east-1.amazonaws.com` (or your region)
   - Port: `587`
   - Cheapest at scale

**Solution B - Try Alternative Port**:
```
Try port 2525 instead of 587
Some providers support this as an alternative
```

---

### Issue #2: Gmail Requires App Password
**Symptom**: Timeout or "Username and Password not accepted"
**Cause**: Gmail blocks "less secure apps" and regular passwords

**Fix**:
1. Go to https://myaccount.google.com/apppasswords
2. Create new app password
3. Use that password instead of your regular Gmail password
4. Make sure 2-Step Verification is enabled first

---

### Issue #3: Railway Needs Egress IP Whitelisted
**Symptom**: Works on other servers, times out on Railway
**Cause**: Your SMTP server firewall blocks Railway's IP range

**Fix**:
1. Find Railway's egress IP:
   ```bash
   railway run curl ifconfig.me
   ```
2. Whitelist that IP in your SMTP server's firewall

---

### Issue #4: Wrong Host/Port Combination

**Gmail**:
```
Host: smtp.gmail.com
Port: 587
SSL/TLS: Disabled (will use STARTTLS)
Username: your-email@gmail.com
Password: app password (not regular password)
```

**Outlook/Office365**:
```
Host: smtp.office365.com
Port: 587
SSL/TLS: Disabled (will use STARTTLS)
Username: your-email@outlook.com
Password: your password
```

**Outlook.com/Hotmail**:
```
Host: smtp-mail.outlook.com
Port: 587
SSL/TLS: Disabled
```

---

## Testing Steps

### Step 1: Test SMTP from Railway Console
```bash
# SSH into Railway
railway shell

# Test if SMTP port is open
nc -zv smtp.gmail.com 587
# OR
telnet smtp.gmail.com 587

# If timeout → Railway blocks SMTP
# If "Connected" → Credential or config issue
```

### Step 2: Try SendGrid Instead
1. Sign up: https://sendgrid.com/
2. Create API key → Settings → API Keys
3. In n8n SMTP settings:
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - Username: `apikey` (literally the word "apikey")
   - Password: `YOUR_SENDGRID_API_KEY`
   - SSL/TLS: **Disabled**

### Step 3: Check Railway Network Settings
```bash
# In Railway dashboard, check:
- Service Variables → add if missing:
  SMTP_HOST=smtp.sendgrid.net
  SMTP_PORT=587

- Networking → Ensure no firewall rules blocking port 587
```

---

## Recommended Solution

**Switch to SendGrid** (5 minutes setup):

1. **Sign up**: https://sendgrid.com/
2. **Verify sender**: Settings → Sender Authentication → Verify single sender
3. **Create API key**: Settings → API Keys → Create API Key
4. **In n8n**:
   ```
   Host: smtp.sendgrid.net
   Port: 587
   User: apikey
   Password: <your-api-key>
   SSL/TLS: Disabled
   ```
5. **Test** - Should work immediately

**Why this works**:
- SendGrid designed for cloud platforms
- Uses port 587 which Railway doesn't block
- No IP whitelisting needed
- Better deliverability than Gmail
- Free tier is generous

---

## Alternative: Use Microsoft Email Node Instead

Since you said Microsoft email node works:

1. Delete SMTP node
2. Use "Microsoft Outlook" node instead
3. Configure OAuth2 authentication
4. Works perfectly because it uses HTTP (port 443) not SMTP

**Advantage**: No SMTP port issues, works on any cloud platform

---

## If You Must Use Gmail SMTP

1. **Create app password**: https://myaccount.google.com/apppasswords
2. **Try both ports**:
   - Port 587 with SSL/TLS disabled
   - Port 465 with SSL/TLS enabled
3. **If still timeout → Railway blocks it, must use SendGrid**

---

## Quick Fix Summary

**Fastest Solution** (5 min):
```
Switch to SendGrid
Host: smtp.sendgrid.net
Port: 587
User: apikey
Pass: <your-sendgrid-api-key>
SSL: Disabled
```

**If Must Use Gmail** (10 min):
```
1. Enable 2FA on Gmail
2. Create app password
3. Try port 587 first, then 465
4. If timeout → Railway blocks it
```

**Nuclear Option** (0 min):
```
Use Microsoft Outlook node instead of SMTP
Already works, uses HTTP not SMTP
```
