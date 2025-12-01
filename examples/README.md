# n8n File Upload Module

Complete file upload solution for n8n with drag-and-drop web interface.

## 📦 Files in This Directory

- **file-upload-form.html** - Beautiful drag-and-drop upload UI (production-ready)
- **file-upload-workflow.json** - n8n workflow template (import and use)
- **FILE_UPLOAD_QUICKSTART.md** - 5-minute setup guide (start here!)

## 🚀 Quick Start

1. **Import Workflow:**
   - Open n8n → Import from File → Select `file-upload-workflow.json`
   - Activate the workflow

2. **Configure Form:**
   - Open `file-upload-form.html` in text editor
   - Update `WEBHOOK_URL` with your n8n webhook URL
   - Save

3. **Test:**
   - Open `file-upload-form.html` in browser
   - Upload a test file
   - Check n8n execution log

## ✨ Features

- ✅ Drag & drop file uploads
- ✅ Multiple files support
- ✅ Real-time progress tracking
- ✅ Mobile-friendly interface
- ✅ File type icons
- ✅ Size validation
- ✅ Error handling
- ✅ Authentication ready
- ✅ Production-ready code

## 📚 How It Works

The Webhook node in n8n **already has file upload built-in**:

```javascript
// Automatically handles multipart/form-data
// Files available at: $json.binary.file0, file1, etc.
```

See [FILE_UPLOAD_QUICKSTART.md](FILE_UPLOAD_QUICKSTART.md) for complete documentation.

## 🔧 Customization

### Change Upload Path
Edit workflow → Webhook node → Path field

### Add Authentication
Edit workflow → Webhook node → Authentication dropdown

### File Validation
Add IF node after webhook to check:
- File type: `{{ $json.binary.file0.mimeType }}`
- File size: `{{ $json.binary.file0.fileSize }}`

### Save to Cloud Storage
Add after webhook:
- Google Drive node
- AWS S3 node
- Dropbox node
- Any storage integration

## 🎯 Example Use Cases

1. **Resume Upload Portal** - For job applications
2. **Document Processing** - PDF/DOCX analysis
3. **Image Gallery** - Photo uploads with CDN
4. **Invoice Processing** - Extract data from uploads
5. **Support Ticket Attachments** - File support system

## 🛠️ Requirements

- n8n instance (cloud or self-hosted)
- Web server to host HTML form (or use locally)
- HTTPS recommended for production

## 📖 Full Documentation

See [FILE_UPLOAD_QUICKSTART.md](FILE_UPLOAD_QUICKSTART.md) for:
- Detailed setup instructions
- Troubleshooting guide
- Security best practices
- Advanced configurations
- Testing procedures

## 🔒 Security Notes

⚠️ **Always use HTTPS in production**
⚠️ **Enable authentication on public webhooks**
⚠️ **Validate file types and sizes**
⚠️ **Scan uploads from untrusted sources**

## 📞 Support

- n8n Docs: https://docs.n8n.io
- Community: https://community.n8n.io
- Webhook Node Docs: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/

## ✅ Verified

- ✅ Webhook node supports multipart/form-data (built-in)
- ✅ Binary file handling working (tested in production)
- ✅ Multiple file uploads supported
- ✅ Auto cleanup of temp files
- ✅ Mobile-responsive UI
- ✅ Production-ready code

---

**Created:** December 2024
**Status:** Production Ready
**License:** Same as n8n project
