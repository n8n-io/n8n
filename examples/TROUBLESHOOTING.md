# File Upload Troubleshooting

## ❌ Error: "The requested webhook is not registered"

### Problem
```
ResponseError: The requested webhook "POST file-upload" is not registered.
```

### Solution

**The workflow is not activated!** Follow these steps:

1. **Open n8n:** Go to https://www.n8n.nmhl.us

2. **Find your workflow:** Look for "File Upload Example" workflow

3. **Activate it:**
   - Click the toggle switch in the top right
   - It should turn from gray to active (usually green/blue)
   - Make sure it says "Active"

4. **Verify the webhook path:**
   - Click on the Webhook node
   - Check that "Path" is set to: `file-upload`
   - The full URL should be: `https://www.n8n.nmhl.us/webhook/file-upload`

5. **Test again:**
   - Open `file-upload-form.html` in browser
   - Upload a file
   - Should work now!

---

## Using Test vs Production URLs

### Test URL (while building)
```
https://www.n8n.nmhl.us/webhook-test/file-upload
```
- Use while developing workflow
- Workflow doesn't need to be activated
- Click "Listen for Test Event" in n8n editor

### Production URL (for live use)
```
https://www.n8n.nmhl.us/webhook/file-upload
```
- Use in production/live forms
- **Workflow MUST be activated**
- Works 24/7 automatically

---

## Quick Test Commands

### Test if webhook is registered
```bash
curl -X POST https://www.n8n.nmhl.us/webhook/file-upload \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

**Expected response when activated:**
- Should get a response (even if it's an error about missing files)
- Should NOT say "not registered"

### Test with actual file
```bash
curl -X POST https://www.n8n.nmhl.us/webhook/file-upload \
  -F "file=@/path/to/test.pdf"
```

**Expected response:**
```json
{
  "success": true,
  "message": "Files uploaded successfully"
}
```

---

## Common Issues

### Issue: CORS Error in Browser Console

**Error message:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**
The webhook node should handle CORS automatically. If you're still getting errors:

1. Check if you have a reverse proxy (nginx/apache)
2. Add CORS headers to your proxy config
3. Or use the test URL first to verify it works

---

### Issue: File Too Large

**Error message:**
```
413 Payload Too Large
```

**Solution:**
Increase n8n payload size limit:

```bash
# In your n8n environment variables
N8N_PAYLOAD_SIZE_MAX=100  # MB
```

Or in docker-compose.yml:
```yaml
environment:
  - N8N_PAYLOAD_SIZE_MAX=100
```

---

### Issue: Upload Timeout

**Error message:**
```
Upload timeout
```

**Solution:**
1. Try smaller files first
2. Check your internet connection
3. Increase timeout in HTML form (line 393):
   ```javascript
   xhr.timeout = 120000; // 2 minutes
   ```

---

### Issue: "No files were uploaded" Error

**Problem:** Files selected but webhook doesn't see them

**Solution:**
Check the form field names match what webhook expects:

In HTML form:
```javascript
formData.append('file0', file);  // Good
formData.append('file', file);   // Also good
```

In n8n workflow:
```javascript
// Files available as:
$json.binary.file0
$json.binary.file1
// etc.
```

---

## Debug Mode

### Enable Console Logging

Add this to the HTML form (after line 233):

```javascript
// Add detailed logging
xhr.addEventListener('readystatechange', () => {
    console.log('XHR State:', xhr.readyState, 'Status:', xhr.status);
});

console.log('Uploading to:', WEBHOOK_URL);
console.log('Files:', selectedFiles);
console.log('FormData keys:', Array.from(formData.keys()));
```

### Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try uploading a file
4. Look for errors or status messages

### Check n8n Execution Log

1. Go to n8n → Executions (left sidebar)
2. Look for recent executions
3. Click on an execution to see details
4. Check the data received by webhook

---

## Verification Checklist

- [ ] Workflow is imported in n8n
- [ ] Workflow is **ACTIVATED** (toggle switch on)
- [ ] Webhook path is set to `file-upload`
- [ ] HTML form has correct webhook URL
- [ ] Workflow execution appears in n8n when you upload
- [ ] Files appear in the execution data under `binary`
- [ ] Success response is returned to browser

---

## Still Not Working?

### Step 1: Test with curl first

```bash
curl -X POST https://www.n8n.nmhl.us/webhook/file-upload \
  -F "test=data"
```

If this returns "not registered" → **activate the workflow!**

### Step 2: Use Test URL while developing

Change HTML form to use test URL:
```javascript
const WEBHOOK_URL = 'https://www.n8n.nmhl.us/webhook-test/file-upload';
```

Then in n8n:
1. Open the workflow
2. Click "Listen for Test Event" on webhook node
3. Upload a file in the HTML form
4. Should see execution appear immediately

### Step 3: Check n8n logs

Your n8n server logs show:
```
Received request for unknown webhook: The requested webhook "POST file-upload" is not registered.
```

This means: **The workflow is NOT active!**

---

## Need More Help?

1. Screenshot your n8n workflow (with webhook node settings visible)
2. Screenshot the browser console errors
3. Share the error message from n8n execution log
4. Verify workflow activation status

The most common issue is: **Forgetting to activate the workflow!**
