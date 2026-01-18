const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: { rule: { interval: [{ triggerAtHour: 9 }] } },
				position: [-2416, 9072],
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.7,
			config: {
				parameters: {
					options: {},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1sXXVbl2kKdYTzCmZDe7QyeMp1N9wZg9K63oGK2UIaeU/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1sXXVbl2kKdYTzCmZDe7QyeMp1N9wZg9K63oGK2UIaeU',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1sXXVbl2kKdYTzCmZDe7QyeMp1N9wZg9K63oGK2UIaeU/edit?usp=drivesdk',
						cachedResultName: 'New Leads',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-2080, 9232],
				name: 'Get row(s) in sheet3',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.filter',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 2,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: '914418a9-8c96-4959-abb7-ad3bb52f420d',
								operator: { type: 'string', operation: 'empty', singleValue: true },
								leftValue: '={{ $json.Contacted }}',
								rightValue: '',
							},
						],
					},
				},
				position: [-1744, 9088],
				name: 'Filter1',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.7,
			config: {
				parameters: {
					columns: {
						value: { Email: '={{ $json.Email }}', Contacted: 'Yes' },
						schema: [
							{
								id: 'Email',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Email',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Contacted',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Contacted',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Created',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Created',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['Email'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/14T6rilaOl1LBTwNnu7ILE3T1equWOz0noI-OIUaI3zU/edit#gid=0',
						cachedResultName: 'leads',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '14T6rilaOl1LBTwNnu7ILE3T1equWOz0noI-OIUaI3zU',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/14T6rilaOl1LBTwNnu7ILE3T1equWOz0noI-OIUaI3zU/edit?usp=drivesdk',
						cachedResultName: 'New Leads - Real',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-1312, 8736],
				name: 'Append or update row in sheet1',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.microsoftOutlook',
			version: 2,
			config: {
				parameters: {
					subject: 'Build AI Agents & Automations with n8n',
					bodyContent:
						'Hi There,\n\nI help people learn how to build AI agents and create powerful AI automations using n8n. If you’re exploring ways to save time or scale your workflows, I’d love to share what’s possible.\n\nYou can check out my n8n Creator profile here with 70+ ready-to-use automations:\n👉 https://n8n.io/creators/rbreen\n\nIf you’d like help getting started or want to see what AI + n8n can do for your business, just reply to this email.\n\nBest,\nRobert Breen\n📞 +1234567890\n🔗 https://www.linkedin.com/in/robert-breen-29429625/',
					toRecipients: '={{ $json.Email }}',
					additionalFields: {},
				},
				credentials: {
					microsoftOutlookOAuth2Api: {
						id: 'credential-id',
						name: 'microsoftOutlookOAuth2Api Credential',
					},
				},
				position: [-784, 9472],
				name: 'Send a message',
			},
		}),
	)
	.add(
		sticky(
			'## Email new leads from Google Sheets via Outlook on a schedule\n\nSend a templated outreach email to **new leads** in a Google Sheet on a **daily schedule**, then **mark each lead as contacted** so they won’t be emailed twice. Built with: **Schedule Trigger → Google Sheets → Filter → Outlook Send Email → Google Sheets (append/update)**.\n\n',
			{ name: 'Sticky Note58', color: 7, position: [-2688, 8576], width: 2144, height: 1056 },
		),
	)
	.add(
		sticky(
			'## How to set up\n### 1) Google Sheets (OAuth2)\n- In **n8n → Credentials → New → Google Sheets (OAuth2)**, sign in and grant access.  \n- In **Get rows**: select your **Lead Source** sheet (e.g., “New Leads”).  \n- In **Append/Update**: select the sheet you want to mark as contacted (can be the same sheet or a CRM sheet).  \n- Make sure your sheet has at least: `Email`, `Contacted` (blank for new).\n\n### 2) Outlook (Microsoft Graph) OAuth2\n- **n8n Cloud (quick connect):**  \n  - In **Credentials → New → Microsoft Outlook OAuth2**, choose **Connect**, sign in with your Microsoft account, and accept permissions.\n- **Self-hosted (Azure App Registration):**  \n  1) Azure Portal → **App registrations** → **New registration**.  \n  2) Add redirect URL: `https://YOUR_N8N_URL/rest/oauth2-credential/callback`.  \n  3) **API permissions (Delegated):** `offline_access`, `Mail.Send`, `User.Read`. Grant admin consent if required.  \n  4) Create a **Client secret**; copy **Application (client) ID** and **Directory (tenant) ID**.  \n  5) In n8n, create **Microsoft Outlook OAuth2** credential with those values and scopes: `offline_access Mail.Send openid email profile`.  \n- In the **Send a message** node, select that credential and keep `To` mapped to `{{$json.Email}}`.  \n- Customize **Subject** and **Body** to your brand (default provided).\n\n---\n\n\n- 📧 **rbreen@ynteractive.com**  \n- 🔗 **Robert Breen** — https://www.linkedin.com/in/robert-breen-29429625/  \n- 🌐 **ynteractive.com** — https://ynteractive.com\n\n',
			{ name: 'Sticky Note6', position: [-3120, 8576], width: 400, height: 1056 },
		),
	)
	.add(
		sticky(
			'### 1) Connect Google Sheets (OAuth2)\n1. In **n8n → Credentials → New → Google Sheets (OAuth2)**  \n2. Sign in with your Google account and grant access  \n3. In each Google Sheets node, select your **Spreadsheet** and the appropriate **Worksheet**:  \n\n\nhttps://docs.google.com/spreadsheets/d/1sXXVbl2kKdYTzCmZDe7QyeMp1N9wZg9K63oGK2UIaeU/edit#gid=0',
			{ name: 'Sticky Note70', color: 3, position: [-2144, 8784], width: 224, height: 656 },
		),
	)
	.add(
		sticky(
			'### 2) Outlook (Microsoft Graph) OAuth2\n- **n8n Cloud (quick connect):**  \n  - In **Credentials → New → Microsoft Outlook OAuth2**, choose **Connect**, sign in with your Microsoft account, and accept permissions.\n- **Self-hosted (Azure App Registration):**  \n  1) Azure Portal → **App registrations** → **New registration**.  \n  2) Add redirect URL: `https://YOUR_N8N_URL/rest/oauth2-credential/callback`.  \n  3) **API permissions (Delegated):** `offline_access`, `Mail.Send`, `User.Read`. Grant admin consent if required.  \n  4) Create a **Client secret**; copy **Application (client) ID** and **Directory (tenant) ID**.  \n  5) In n8n, create **Microsoft Outlook OAuth2** credential with those values and scopes: `offline_access Mail.Send openid email profile`.  \n- In the **Send a message** node, select that credential and keep `To` mapped to `{{$json.Email}}`.  \n- Customize **Subject** and **Body** to your brand (default provided).\n',
			{ name: 'Sticky Note7', color: 3, position: [-848, 8608], height: 992 },
		),
	);
