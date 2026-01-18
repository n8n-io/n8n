return workflow('', 'Apply to Jobs from Excel and Track Application Status', { executionOrder: 'v1' })
  .add(node({ type: 'n8n-nodes-base.cron', version: 1, config: { parameters: {
      rule: {
        interval: [{ field: 'cronExpression', expression: '0 9 * * 1-5' }]
      }
    }, position: [240, 480], name: '🕘 Daily Application Trigger' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'spreadsheet-id',
            name: 'spreadsheetId',
            type: 'string',
            value: 'REPLACE_WITH_YOUR_GOOGLE_SHEET_ID'
          },
          {
            id: 'resume-url',
            name: 'resumeUrl',
            type: 'string',
            value: 'https://drive.google.com/file/d/YOUR_RESUME_ID/view'
          },
          {
            id: 'cover-letter',
            name: 'coverLetterTemplate',
            type: 'string',
            value: 'Dear Hiring Manager,\n\nI am excited to apply for the {{position}} role at {{company}}. With my experience in software development and {{skills}}, I believe I would be a valuable addition to your team.\n\nI am particularly drawn to {{company}} because of your innovation in the tech industry. I would love to contribute to your continued success.\n\nBest regards,\nYour Name'
          },
          {
            id: 'user-email',
            name: 'userEmail',
            type: 'string',
            value: 'user@example.com'
          }
        ]
      }
    }, position: [460, 480], name: '⚙️ Configuration' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4, config: { parameters: {
      range: 'A:J',
      keyRow: 1,
      dataMode: 'autoMapInputData',
      sheetName: 'Jobs',
      documentId: '={{ $json.spreadsheetId }}',
      requestMethod: 'GET',
      authentication: 'oAuth2'
    }, position: [680, 480], name: '📖 Read Jobs Sheet' } }))
  .then(node({ type: 'n8n-nodes-base.filter', version: 2, config: { parameters: {
      conditions: {
        options: {
          leftValue: '',
          caseSensitive: true,
          typeValidation: 'strict'
        },
        combinator: 'and',
        conditions: [
          {
            id: 'not-applied',
            operator: { type: 'string', operation: 'equals' },
            leftValue: '={{ $json.Status }}',
            rightValue: 'Not Applied'
          },
          {
            id: 'has-url',
            operator: { type: 'string', operation: 'isNotEmpty' },
            leftValue: '={{ $json.Job_URL }}',
            rightValue: ''
          }
        ]
      }
    }, position: [900, 480], name: '🎯 Filter Pending Applications' } }))
  .then(node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: { reset: false }, batchSize: 1 }, position: [1120, 480], name: '🔄 Process Jobs One by One' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'job-platform',
            name: 'platform',
            type: 'string',
            value: '={{ $json.Job_URL.includes(\'linkedin.com\') ? \'linkedin\' : $json.Job_URL.includes(\'indeed.com\') ? \'indeed\' : \'generic\' }}'
          },
          {
            id: 'personalized-cover',
            name: 'personalizedCoverLetter',
            type: 'string',
            value: '={{ $(\'Configuration\').first().json.coverLetterTemplate.replace(\'{{position}}\', $json.Position).replace(\'{{company}}\', $json.Company).replace(\'{{skills}}\', \'relevant technical skills\') }}'
          },
          {
            id: 'application-date',
            name: 'applicationDate',
            type: 'string',
            value: '={{ $now.format(\'yyyy-MM-dd\') }}'
          },
          {
            id: 'resume-url',
            name: 'resumeUrl',
            type: 'string',
            value: '={{ $(\'Configuration\').first().json.resumeUrl }}'
          }
        ]
      }
    }, position: [1340, 480], name: '📝 Prepare Application Data' } }))
  .then(switchCase([node({ type: 'n8n-nodes-base.httpRequest', version: 4, config: { parameters: {
      url: 'https://api.linkedin.com/v2/jobs/applications',
      options: { retry: { enabled: true, maxTries: 3 }, timeout: 30000 },
      sendBody: true,
      sendHeaders: true,
      requestMethod: 'POST',
      authentication: 'predefinedCredentialType',
      bodyParameters: {
        parameters: [
          { name: 'jobId', value: '={{ $json.Job_ID }}' },
          {
            name: 'coverLetter',
            value: '={{ $json.personalizedCoverLetter }}'
          },
          { name: 'resumeUrl', value: '={{ $json.resumeUrl }}' }
        ]
      },
      headerParameters: {
        parameters: [{ name: 'Content-Type', value: 'application/json' }]
      },
      nodeCredentialType: 'linkedInOAuth2Api'
    }, position: [1780, 380], name: '💼 Apply via LinkedIn' } }), node({ type: 'n8n-nodes-base.httpRequest', version: 4, config: { parameters: {
      url: 'https://api.indeed.com/ads/applications',
      options: { retry: { enabled: true, maxTries: 3 }, timeout: 30000 },
      sendBody: true,
      sendHeaders: true,
      requestMethod: 'POST',
      authentication: 'predefinedCredentialType',
      bodyParameters: {
        parameters: [
          { name: 'jobkey', value: '={{ $json.Job_ID }}' },
          {
            name: 'message',
            value: '={{ $json.personalizedCoverLetter }}'
          }
        ]
      },
      headerParameters: {
        parameters: [{ name: 'Content-Type', value: 'application/json' }]
      },
      nodeCredentialType: 'indeedApi'
    }, position: [1780, 580], name: '🔍 Apply via Indeed' } })], { version: 3, parameters: {
      conditions: {
        options: {
          leftValue: '',
          caseSensitive: true,
          typeValidation: 'strict'
        },
        combinator: 'and',
        conditions: [
          {
            id: 'linkedin-check',
            operator: { type: 'string', operation: 'equals' },
            leftValue: '={{ $json.platform }}',
            rightValue: 'linkedin'
          }
        ]
      }
    }, name: '🔀 Route by Platform' }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'application-status',
            name: 'applicationStatus',
            type: 'string',
            value: '={{ $json.statusCode >= 200 && $json.statusCode < 300 ? \'Applied\' : \'Failed\' }}'
          },
          {
            id: 'app-id',
            name: 'applicationId',
            type: 'string',
            value: '={{ $json.body?.applicationId || $json.body?.id || \'AUTO_\' + $now.format(\'yyyyMMddHHmmss\') }}'
          },
          {
            id: 'status-notes',
            name: 'statusNotes',
            type: 'string',
            value: '={{ $json.statusCode >= 200 && $json.statusCode < 300 ? \'Application submitted successfully via \' + $(\'Prepare Application Data\').first().json.platform : \'Application failed: \' + $json.statusCode }}'
          },
          {
            id: 'job-data',
            name: 'originalJobData',
            type: 'object',
            value: '={{ $(\'Prepare Application Data\').first().json }}'
          }
        ]
      }
    }, position: [2000, 480], name: '📊 Process Application Result' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4, config: { parameters: {
      range: 'D{{ $json.originalJobData.row_index }}:H{{ $json.originalJobData.row_index }}',
      keyRow: 1,
      values: {
        values: [
          [
            '={{ $json.applicationStatus }}',
            '={{ $json.originalJobData.applicationDate }}',
            '={{ $json.originalJobData.applicationDate }}',
            '={{ $json.applicationId }}',
            '={{ $json.statusNotes }}'
          ]
        ]
      },
      dataMode: 'autoMapInputData',
      sheetName: 'Jobs',
      documentId: '={{ $(\'Configuration\').first().json.spreadsheetId }}',
      requestMethod: 'UPDATE',
      authentication: 'oAuth2',
      valueInputMode: 'raw'
    }, position: [2220, 480], name: '📝 Update Job Status' } }))
  .then(node({ type: 'n8n-nodes-base.gmail', version: 2, config: { parameters: {
      email: '={{ $(\'Configuration\').first().json.userEmail }}',
      message: '<h3>Application Status Update</h3>\n<p><strong>Company:</strong> {{ $json.originalJobData.Company }}</p>\n<p><strong>Position:</strong> {{ $json.originalJobData.Position }}</p>\n<p><strong>Status:</strong> {{ $json.applicationStatus }}</p>\n<p><strong>Date:</strong> {{ $json.originalJobData.applicationDate }}</p>\n<p><strong>Platform:</strong> {{ $json.originalJobData.platform }}</p>\n<p><strong>Notes:</strong> {{ $json.statusNotes }}</p>\n<p><strong>Application ID:</strong> {{ $json.applicationId }}</p>',
      subject: 'Job Application: {{ $json.originalJobData.Company }} - {{ $json.originalJobData.Position }}',
      operation: 'sendEmail',
      emailFormat: 'html'
    }, position: [2440, 480], name: '📧 Send Application Notification' } }))
  .add(node({ type: 'n8n-nodes-base.cron', version: 1, config: { parameters: {
      rule: {
        interval: [{ field: 'cronExpression', expression: '0 10 */2 * *' }]
      }
    }, position: [240, 980], name: '🕐 Status Check Trigger' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4, config: { parameters: {
      range: 'A:J',
      keyRow: 1,
      dataMode: 'autoMapInputData',
      sheetName: 'Jobs',
      documentId: '={{ $(\'Configuration\').first().json.spreadsheetId }}',
      requestMethod: 'GET',
      authentication: 'oAuth2'
    }, position: [460, 980], name: '📖 Read Applied Jobs' } }))
  .then(node({ type: 'n8n-nodes-base.filter', version: 2, config: { parameters: {
      conditions: {
        options: {
          leftValue: '',
          caseSensitive: true,
          typeValidation: 'strict'
        },
        combinator: 'and',
        conditions: [
          {
            id: 'applied-filter',
            operator: { type: 'string', operation: 'equals' },
            leftValue: '={{ $json.Status }}',
            rightValue: 'Applied'
          }
        ]
      }
    }, position: [680, 980], name: '🎯 Filter Applied Jobs' } }))
  .then(node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: { reset: false }, batchSize: 1 }, position: [900, 980], name: '🔄 Check Status One by One' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'mock-status',
            name: 'newStatus',
            type: 'string',
            value: '={{ [\'Applied\', \'Under Review\', \'Interview Scheduled\', \'Rejected\'][Math.floor(Math.random() * 4)] }}'
          },
          {
            id: 'check-date',
            name: 'checkDate',
            type: 'string',
            value: '={{ $now.format(\'yyyy-MM-dd\') }}'
          },
          {
            id: 'status-notes',
            name: 'statusNotes',
            type: 'string',
            value: 'Status checked automatically via API'
          }
        ]
      }
    }, position: [1120, 980], name: '🔍 Mock Status Check' } }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.googleSheets', version: 4, config: { parameters: {
      range: 'D{{ $json.row_index }}:F{{ $json.row_index }}',
      keyRow: 1,
      values: {
        values: [
          [
            '={{ $json.newStatus }}',
            '={{ $json.Applied_Date }}',
            '={{ $json.checkDate }}'
          ]
        ]
      },
      dataMode: 'autoMapInputData',
      sheetName: 'Jobs',
      documentId: '={{ $(\'Configuration\').first().json.spreadsheetId }}',
      requestMethod: 'UPDATE',
      authentication: 'oAuth2',
      valueInputMode: 'raw'
    }, position: [1560, 980], name: '📝 Update Changed Status' } }), null], { version: 2, parameters: {
      conditions: {
        options: {
          leftValue: '',
          caseSensitive: true,
          typeValidation: 'strict'
        },
        combinator: 'and',
        conditions: [
          {
            id: 'status-changed',
            operator: { type: 'string', operation: 'notEquals' },
            leftValue: '={{ $json.Status }}',
            rightValue: '={{ $json.newStatus }}'
          }
        ]
      }
    }, name: '🔄 Check if Status Changed' }))
  .then(node({ type: 'n8n-nodes-base.gmail', version: 2, config: { parameters: {
      email: '={{ $(\'Configuration\').first().json.userEmail }}',
      message: '<h3>Application Status Changed</h3>\n<p><strong>Company:</strong> {{ $json.Company }}</p>\n<p><strong>Position:</strong> {{ $json.Position }}</p>\n<p><strong>Previous Status:</strong> {{ $json.Status }}</p>\n<p><strong>New Status:</strong> {{ $json.newStatus }}</p>\n<p><strong>Last Checked:</strong> {{ $json.checkDate }}</p>\n<p><strong>Notes:</strong> {{ $json.statusNotes }}</p>',
      subject: 'Status Update: {{ $json.Company }} - {{ $json.Position }}',
      operation: 'sendEmail',
      emailFormat: 'html'
    }, position: [1780, 980], name: '📧 Send Status Update' } }))
  .add(sticky('## 🎯 Job Application Automation System\n\n**What it does:**\n- Reads job listings from Google Sheets\n- Automatically applies to jobs with personalized cover letters\n- Tracks application status every 2 days\n- Sends email notifications for updates\n- Maintains complete application history\n\n**Who\'s it for:**\n- Job seekers wanting to automate repetitive applications\n- Recruiters managing bulk applications\n- Career coaches tracking client progress\n\n**Requirements:**\n- Google Sheets with job data\n- Gmail account for notifications\n- Resume stored online (Google Drive recommended)\n- Job platform API access (LinkedIn, Indeed)\n\n**Setup Instructions:**\n1. Create Google Sheet with required columns\n2. Configure your spreadsheet ID in \'Configuration\' node\n3. Set up Google Sheets and Gmail credentials\n4. Update email addresses in notification nodes\n5. Test with 1-2 jobs before full automation\n\n**⚠️ Important:** Replace mock HTTP requests with actual job platform APIs. Current implementation is for demonstration purposes.', { name: '📋 Template Overview', color: 4, position: [380, 160], width: 389, height: 464 }))
  .add(sticky('## 📊 Excel Sheet Structure\n\nRequired columns:\n- Job_ID: Unique identifier\n- Company: Company name\n- Position: Job title\n- Status: Not Applied, Applied, etc.\n- Applied_Date: Application date\n- Last_Checked: Last status check\n- Application_ID: Platform reference\n- Notes: Additional info\n- Job_URL: Direct job link\n- Priority: High, Medium, Low', { name: '📊 Sheet Structure', color: 7, position: [820, 160], width: 295, height: 284 }))
  .add(sticky('## 🔧 Configuration Setup\n\n1. Replace \'YOUR_GOOGLE_SHEET_ID\' with actual ID\n2. Add your resume URL (Google Drive link)\n3. Customize cover letter template\n4. Update email addresses\n\n**Security Note:** Never hardcode API keys!\nUse n8n\'s credential store for all auth.', { name: '⚙️ Setup Notes', color: 6, position: [1180, 160], width: 295, height: 224 }))
  .add(sticky('## 📈 Status Tracking Workflow\n\nThis section runs every 2 days to:\n- Check status of applied jobs\n- Update the spreadsheet\n- Send notifications for changes\n\n**Note:** Replace mock status checks with actual API calls to job platforms for real status updates.', { name: '📊 Status Tracking Info', color: 7, position: [380, 740], width: 329, height: 204 }))