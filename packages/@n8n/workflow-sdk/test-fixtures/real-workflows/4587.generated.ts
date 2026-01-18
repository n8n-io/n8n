return workflow('rDGkfQpVtkD1D6RH', 'Instagram Profile Scraper', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.formTrigger', version: 2.2, config: { parameters: {
      options: {},
      formTitle: 'Instagram profile scraper',
      formFields: { values: [{ fieldLabel: 'Username', requiredField: true }] },
      formDescription: 'Scrapes profile via apify'
    }, name: 'Provide Usernames' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.apify.com/v2/actor-tasks/<TASK_ID>/run-sync-get-dataset-items?token=<YOUR_API_TOKEN>',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "input": {\n    "usernames": [\n      {{ $json.Username }}\n    ],\n    "resultsLimit": 1\n  }\n}',
      sendBody: true,
      specifyBody: 'json'
    }, position: [280, 0], name: 'Scrape Instagram Profile via Apify' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '5dc90212-ac40-4351-a15a-ef9f35ffd389',
            name: 'username',
            type: 'string',
            value: '={{ $json.username }}'
          },
          {
            id: '02339555-2d6b-4d20-a59c-2e8dfa63361c',
            name: 'fullName',
            type: 'string',
            value: '={{ $json.fullName }}'
          },
          {
            id: 'f5a95d72-443d-468a-a1a6-8cc394b93fa4',
            name: 'followersCount',
            type: 'number',
            value: '={{ $json.followersCount }}'
          },
          {
            id: '826fe0c8-4fbe-44e7-abf3-8a73022151f2',
            name: 'followsCount',
            type: 'number',
            value: '={{ $json.followsCount }}'
          },
          {
            id: 'dac8d9cc-5fa8-47d8-859d-d9f164ec20bd',
            name: 'biography',
            type: 'string',
            value: '={{ $json.biography }}'
          },
          {
            id: '4c775459-f8f5-43d1-8b1a-aa122413cd12',
            name: 'profilePicUrl',
            type: 'string',
            value: '={{ $json.profilePicUrl }}'
          }
        ]
      }
    }, position: [660, 0], name: 'Format Instagram Profile Data' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      columns: {
        value: {
          Username: '={{ $json.username }}',
          Biography: '={{ $json.biography }}',
          'Full Name': '={{ $json.fullName }}',
          'Followers Count': '={{ $json.followersCount }}',
          'Following Count': '={{ $json.followsCount }}',
          'Profile Pic URL': '={{ $json.profilePicUrl }}'
        },
        schema: [
          {
            id: 'Username',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Username',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Full Name',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Full Name',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Followers Count',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Followers Count',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Following Count',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Following Count',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Biography',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Biography',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Profile Pic URL',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Profile Pic URL',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: [],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'append',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1VQUy0tfWujh0lyulh0w6UhLGq87f8j8F7uFOaLFUyuQ/edit#gid=0',
        cachedResultName: 'Sheet1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1VQUy0tfWujh0lyulh0w6UhLGq87f8j8F7uFOaLFUyuQ',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1VQUy0tfWujh0lyulh0w6UhLGq87f8j8F7uFOaLFUyuQ/edit?usp=drivesdk',
        cachedResultName: 'Instagram Profile Scraper'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [880, 0], name: 'Append Profile to Google Sheet' } }))
  .add(sticky('### 🔹 **1. `Trigger: On Form Submission`**\n\n* **Node Type:** Manual Trigger (or Webhook if embedded in a real form)\n* **Purpose:** Starts the workflow when a user submits a form with an Instagram username\n* **Expected Input:**\n\n  ```json\n  {\n    "username": "influencer_1"\n  }\n  ```\n\n---\n\n### 🔹 **2. `Scrape Instagram Profile via Apify`**\n\n* **Node Type:** HTTP Request\n\n* **Method:** `POST`\n\n* **URL:**\n\n  ```plaintext\n  https://api.apify.com/v2/actor-tasks/<TASK_ID>/run-sync-get-dataset-items?token=<API_TOKEN>\n  ```\n\n* **Headers:**\n\n  ```json\n  {\n    "Content-Type": "application/json"\n  }\n  ```\n\n* **Body Parameters:**\n\n  ```json\n  {\n    "input": {\n      "usernames": ["={{ $json.username }}"]\n    }\n  }\n  ```\n\n* **Sample Output from Apify:**\n\n  ```json\n  [\n    {\n      "username": "influencer_1",\n      "fullName": "Jane Doe",\n      "followersCount": 12500,\n      "followsCount": 320,\n      "biography": "Travel | Lifestyle 🌍",\n      "profilePicUrl": "https://instagram.com/path/to/pic.jpg",\n      "isPrivate": false,\n      "isVerified": true,\n      "externalUrl": "https://janedoe.com"\n    }\n  ]\n  ```\n\n✅ **Result:** The username submitted from the form is scraped in real time using Apify’s Instagram actor, and the result is passed to the next step.', { color: 3, position: [-40, -1460], width: 500, height: 1660 }))
  .add(sticky('## ✨ SECTION 2: 🛠 Format Data + 📊 Append to Google Sheets\n\n### 🔹 **3. `Format Instagram Profile Data`**\n\n* **Node Type:** Set\n* **Purpose:** Clean and organize the Apify response to match your Google Sheets schema\n* **Fields to Set:**\n\n  | Field Name        | Value                      |\n  | ----------------- | -------------------------- |\n  | `Username`        | `{{$json.username}}`       |\n  | `Full Name`       | `{{$json.fullName}}`       |\n  | `Followers`       | `{{$json.followersCount}}` |\n  | `Following`       | `{{$json.followsCount}}`   |\n  | `Bio`             | `{{$json.biography}}`      |\n  | `Profile Pic URL` | `{{$json.profilePicUrl}}`  |\n  | `Website`         | `{{$json.externalUrl}}`    |\n\n✅ **Result:** The data is transformed into a clean format suitable for logging or outreach tracking.\n\n---\n\n### 🔹 **4. `Append Profile to Google Sheet`**\n\n* **Node Type:** Google Sheets (Append Row)\n* **Setup:**\n\n  * **Sheet Name:** `Scraped_Influencer_Data`\n  * **Columns:** Username, Full Name, Followers, Following, Bio, Profile Pic URL, Website\n* **Purpose:** Stores the formatted data into a centralized Google Sheet for future reference or outreach\n\n✅ **Result:** Your influencer data is persistently stored and ready to be used for marketing, analytics, or CRM integration.\n\n---\n\n## ✅ Final Workflow Summary\n\n```plaintext\n[Form Trigger] \n   ⬇️\n[Apify HTTP Request] \n   ⬇️\n[Format Fields]\n   ⬇️\n[Google Sheet Append]\n```', { name: 'Sticky Note1', color: 6, position: [600, -1240], width: 500, height: 1440 }))
  .add(sticky('=======================================\n            WORKFLOW ASSISTANCE\n=======================================\nFor any questions or support, please contact:\n    Yaron@nofluff.online\n\nExplore more tips and tutorials here:\n   - YouTube: https://www.youtube.com/@YaronBeen/videos\n   - LinkedIn: https://www.linkedin.com/in/yaronbeen/\n=======================================\n', { name: 'Sticky Note9', color: 4, position: [-1800, -1460], width: 1300, height: 320 }))
  .add(sticky('# 🧠 **Workflow Overview: Instagram Profile Scraper using Apify & Google Sheets in n8n**\n\n## 🔍 **Purpose**\n\nThis n8n automation workflow allows you to **scrape Instagram profile data** using the **Apify Instagram Scraper** and **store the results in Google Sheets** for marketing, outreach, or analytics. It\'s designed to be simple, efficient, and extendable — ideal for influencer marketers, social analysts, or growth teams who want actionable Instagram data without writing code.\n\n---\n\n## 🧩 **Core Workflow Logic**\n\n### 💡 What It Does\n\n1. **Receives an Instagram username** (via form or manual trigger)\n2. **Sends the username to Apify** to scrape public profile data\n3. **Extracts key details** (followers, bio, profile pic, etc.)\n4. **Appends the cleaned data** to a structured Google Sheet\n\n---\n\n## 🏗️ **Workflow Structure & Components**\n\n## 📊 **Data Flow Example**\n\n### 🔸 **Input (Submitted via Form or Manual Trigger):**\n\n```json\n{\n  "username": "influencer_1"\n}\n```\n\n### 🔹 **Output (Saved to Google Sheets):**\n\n| Username      | Full Name | Followers | Following | Bio    | Profile Pic URL | Website                                                        |                                            |\n| ------------- | --------- | --------- | --------- | ------ | --------------- | -------------------------------------------------------------- | ------------------------------------------ |\n| influencer\\_1 | Jane Doe  | 12,500    | 320       | Travel | Lifestyle 🌍    | [https://instagram.com/pic.jpg](https://instagram.com/pic.jpg) | [https://janedoe.com](https://janedoe.com) |\n\n---\n\n## 🛠️ **Built With**\n\n* [n8n](https://n8n.io/) – Open-source workflow automation\n* [Apify](https://apify.com/) – Instagram Profile Scraper actor\n* Google Sheets (native integration via n8n)\n\n---\n\n## 🔐 **Authentication & API Notes**\n\n* **Apify Token**: Required in the HTTP Request URL\n* **Google Sheets Access**: OAuth2 credentials configured in n8n\n* **Security Tip**: Store secrets as [n8n environment variables](https://docs.n8n.io/hosting/environment-variables/)\n\n---\n\n## 💼 **Real-World Use Cases**\n\n| Use Case                  | Description                                                   |\n| ------------------------- | ------------------------------------------------------------- |\n| 👩‍💼 Influencer Outreach | Automatically collect Instagram metrics for campaign planning |\n| 📊 Competitor Analysis    | Track follower growth and bio updates for competitors         |\n| 📋 CRM Enrichment         | Enrich influencer records with live Instagram data            |\n\n---\n\n## 🚀 **Enhancements & Ideas**\n\n* 🔁 **Loop from Google Sheets:** Read a batch of usernames and scrape in loop\n* 🚫 **Avoid Duplicates:** Add an `IF` node to skip usernames already scraped\n* 📩 **Send Slack/Email Alerts** when new data is added\n* 🧠 **Filter Low Engagement Accounts** (e.g., if followers < 1,000)\n\n---\n\n## 📸 **Visual Workflow Map**\n\n```plaintext\n[Trigger: On Form Submission]\n          ⬇️\n[Scrape Instagram Profile via Apify]\n          ⬇️\n[Format Instagram Profile Data]\n          ⬇️\n[Append Profile to Google Sheet]\n```\n\n---\n\n## 🧾 **Conclusion**\n\nThis workflow is a **powerful no-code solution** to streamline the process of gathering Instagram profile data. It integrates the flexibility of n8n, the scraping power of Apify, and the accessibility of Google Sheets to form a seamless automation — perfect for creators, marketers, and analysts.\n\n', { name: 'Sticky Note4', color: 4, position: [-1800, -1120], width: 1289, height: 2418 }))