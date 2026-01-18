return workflow('mXgQJT7qXMEFQAow', 'Server-Side Meta Ads Tracking Template [PUBLIC]', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.webhook', version: 2.1, config: { parameters: {
      path: 'meta-conversion-api',
      options: {},
      httpMethod: 'POST',
      responseMode: 'responseNode'
    }, position: [-976, 0] } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '9545094c-a24a-4689-b212-4bc351f8f08b',
            name: 'normalized_email',
            type: 'string',
            value: '={{ $json.body.email.trim().toLowerCase() }}'
          },
          {
            id: 'fe26118b-5e9e-4c3f-acf0-e995a32779d1',
            name: 'normalized_phone',
            type: 'string',
            value: '={{ $json.body.phone.replace(/\\D/g, \'\') }}'
          },
          {
            id: '59a2b784-44c4-44c4-bf28-2e8a27cc8975',
            name: 'firstName',
            type: 'string',
            value: '={{ $json.body.firstName.trim().toLowerCase() }}'
          },
          {
            id: '72ada7ed-e895-445e-ac4f-f5d8102ba46a',
            name: 'lastName',
            type: 'string',
            value: '={{ $json.body.lastName.trim().toLowerCase() }}'
          }
        ]
      }
    }, position: [-752, 0], name: 'Edit Normalize PII' } }))
  .then(node({ type: 'n8n-nodes-base.crypto', version: 1, config: { parameters: {
      type: 'SHA256',
      value: '={{ $json.normalized_email }}',
      dataPropertyName: 'hashed_em'
    }, position: [-512, 0], name: 'Crypto - Hash Email' } }))
  .then(node({ type: 'n8n-nodes-base.crypto', version: 1, config: { parameters: {
      type: 'SHA256',
      value: '={{ $json.normalized_phone }}',
      dataPropertyName: 'hashed_ph'
    }, position: [-256, 0], name: 'Crypto - Hash Phone' } }))
  .then(node({ type: 'n8n-nodes-base.crypto', version: 1, config: { parameters: {
      type: 'SHA256',
      value: '={{ $json.firstName }}',
      dataPropertyName: 'hashed_firstName'
    }, position: [-48, 0], name: 'Crypto - First Name' } }))
  .then(node({ type: 'n8n-nodes-base.crypto', version: 1, config: { parameters: {
      type: 'SHA256',
      value: '={{ $json.lastName }}',
      dataPropertyName: 'hashed_lastName'
    }, position: [160, 0], name: 'Crypto - Last Name' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'c2ccdb0e-05c6-4f02-9daf-c495a261d82a',
            name: 'conversion_timestamp',
            type: 'number',
            value: '={{ Math.floor(Date.now() / 1000) }}'
          },
          {
            id: 'a434a6c6-c4fe-48a1-b808-58cf42378f1d',
            name: 'event_name',
            type: 'string',
            value: 'SubmitApplication'
          },
          {
            id: '1323fcc0-95e8-461b-9cb5-f0106b10345d',
            name: 'hashed_em',
            type: 'string',
            value: '={{ $(\'Crypto - Hash Email\').item.json.hashed_em }}'
          },
          {
            id: '7a276391-9aab-41a1-8514-63b0c5350011',
            name: 'hashed_ph',
            type: 'string',
            value: '={{ $json.hashed_ph }}'
          },
          {
            id: '19d9b649-873f-4018-b7b9-a7070143abb1',
            name: 'hashed_firstName',
            type: 'string',
            value: '={{ $json.hashed_firstName }}'
          },
          {
            id: '15d5a6d2-6c71-40a4-8ad8-fe929d94e9b4',
            name: 'hashed_lastName',
            type: 'string',
            value: '={{ $json.hashed_lastName }}'
          },
          {
            id: 'dda7617f-a148-4b8f-9459-50baa386507e',
            name: 'fbc',
            type: 'string',
            value: '={{ $(\'Webhook\').item.json.body.fbc }}'
          },
          {
            id: 'fab3e276-ead2-4654-ae09-5f6f3bcef3e6',
            name: 'fbp',
            type: 'string',
            value: '={{ $(\'Webhook\').item.json.body.fbp }}'
          },
          {
            id: '8bf3b47f-f737-4262-8f86-27f287ed6560',
            name: 'ipAddress',
            type: 'string',
            value: '={{ $(\'Webhook\').item.json.headers[\'x-forwarded-for\'] }}'
          },
          {
            id: '4f88bdd9-d7cf-4f8e-84b3-db55f50e10ed',
            name: 'userAgent',
            type: 'string',
            value: '={{ $(\'Webhook\').item.json.headers[\'user-agent\'] }}'
          }
        ]
      }
    }, position: [400, 0], name: 'Set - Compute Timestamps & Map Fields' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Get the incoming data from the previous node.\n// n8n provides this as the \'$json\' variable.\nconst incomingData = $json;\n\n// Create the final, perfectly structured payload for the Facebook CAPI node.\nconst capiPayload = {\n  data: [\n    {\n      event_name: incomingData.event_name,\n      event_time: incomingData.conversion_timestamp,\n      action_source: \'website\',\n\n      // Build the user_data object by mapping your fields to Meta\'s fields.\n      user_data: {\n        // --- These are the two lines we are fixing ---\n        // We are now 100% sure they match your input data.\n        fn: incomingData.hashed_firstName,\n        ln: incomingData.hashed_lastName,\n\n        // The rest of the mapping\n        em: incomingData.hashed_em,\n        ph: incomingData.hashed_ph,\n        fbc: incomingData.fbc,\n        fbp: incomingData.fbp,\n        client_ip_address: incomingData.ipAddress,\n        client_user_agent: incomingData.userAgent,\n      },\n    },\n  ],\n};\n\n// Return the transformed data so the next node can use it.\nreturn capiPayload;'
    }, position: [624, 0], name: 'Preparing for HTTP Request Payload' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://graph.facebook.com/v24.0/PIXEL_ID_HERE/events',
      method: 'POST',
      options: {},
      jsonBody: '={{ $json }}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpBearerAuth',
      headerParameters: {
        parameters: [{ name: 'Content-Type', value: 'application/json' }]
      }
    }, position: [864, 0], name: 'Sending Events To Facebook Pixel' } }))
  .then(node({ type: 'n8n-nodes-base.respondToWebhook', version: 1.4, config: { parameters: {
      options: { responseCode: 200 },
      respondWith: 'allIncomingItems'
    }, position: [1072, 0], name: 'Respond to Webhook' } }))
  .add(sticky('## Send Server-Side Conversions to the Meta Ads API (CAPI)\n\nThis workflow acts as a server-side endpoint to send conversion events directly to the Meta (Facebook) Conversions API. This helps you get more accurate ad tracking that isn\'t affected by browser ad blockers or iOS privacy changes.\n\n**Watch the full setup tutorial on YouTube:**\nhttps://youtu.be/_fdMPIYEvFM\n\n## How it works\n1.  **Webhook Trigger:** It starts when it receives data at its unique URL.\n2.  **Normalize & Hash PII:** It cleans up the user data (email, phone, etc.) and securely hashes it using SHA-256, as required by Meta.\n3.  **Format Payload:** It assembles the hashed data, event details, and browser info (`fbc`, `fbp`, IP address) into a perfectly structured payload for the CAPI.\n4.  **Send to Meta:** It sends the final data directly to Meta\'s servers.\n\n## ⚠️ How to set up\n### Step 1: Configure Your Data Source\nThis workflow is triggered by a Webhook. You need to send data to it from your website form, CRM, or backend. The data **MUST** be sent as a JSON object.\n\nThe required fields are `email`, `phone`, `firstName`, `lastName`, `fbc`, and `fbp`. For a live example of the data structure, please see the **pinned data on the Webhook node**.\n\n### Step 2: Configure the Workflow\n1.  **Copy the Webhook URL:** Click on the "Webhook" trigger node and copy the **Test URL** for testing, or the **Production URL** for your live application.\n2.  **Customize Event Name (Optional):** In the "Set - Compute Timestamps & Map Fields" node, you can change the `event_name` from `SubmitApplication` to whatever you need (e.g., `Purchase`, `Lead`).\n3.  **Add Your Meta Pixel ID:** In the final "Sending Events To Facebook Pixel" node, replace `PIXEL_ID_HERE` in the **URL** with your actual Meta Pixel ID.\n4.  **Add Your Access Token:** In the same node, go to the **Authentication** tab and create a new **Bearer YOUR_TOKEN_HERE** credential. Paste the CAPI Access Token you generated from Meta Events Manager.', { position: [-1840, -448], width: 592, height: 880 }))
  .add(sticky('**👇 STEP 1: START HERE**\n\nThis is your endpoint. Copy the URL from this node and configure your website form or backend to send a POST request with a JSON body to it.\n\nSee the main yellow note and the **pinned data on this node** for the required JSON data structure!', { name: 'Sticky Note1', position: [-1056, 160], height: 272 }))
  .add(sticky('**🔒 STEP 2: SECURE & HASH DATA**\n\nThis section automatically cleans and hashes the incoming user data to meet Meta\'s CAPI requirements.\n\nNo configuration is needed here—it just works!', { name: 'Sticky Note2', color: 4, position: [-560, 160], width: 864, height: 128 }))
  .add(sticky('**🚀 STEP 3: SEND TO META**\n\nThis is the final and most important step.\n\n**Action Required:**\n1.  Replace **`PIXEL_ID_HERE`** in the **URL** with your real Meta Pixel ID.\n2.  Under **Authentication**, create a new **Bearer YOUR_TOKEN_HERE** credential and paste in your CAPI Access Token from Meta Events Manager.', { name: 'Sticky Note3', position: [752, 176], width: 512, height: 224 }))