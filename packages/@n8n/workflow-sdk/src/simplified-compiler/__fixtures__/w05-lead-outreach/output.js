// --- Loop body sub-workflow ---
const loop_lead_t0 = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: { inputSource: 'passthrough' } } });

const loop_lead_http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST gmail.googleapis.com/gmail/v1/us...",
    "parameters": {
      "method": "POST",
      "url": "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"to\":\"={{ $('When Executed by Another Workflow').first().json[1] }}\",\"subject\":\"Hello\",\"body\":\"Your outreach message here...\"}",
      "authentication": "genericCredentialType",
      "genericAuthType": "oAuth2Api"
    },
    "executeOnce": true
  , credentials: { oAuth2Api: { name: 'Gmail', id: '' } }
}
});

const loop_lead_http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "PUT sheets.googleapis.com/v4/spreadsh...",
    "parameters": {
      "method": "PUT",
      "url": "https://sheets.googleapis.com/v4/spreadsheets/SPREADSHEET_ID/values/Sheet1",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"values\":[[\"Contacted\"]]}",
      "authentication": "genericCredentialType",
      "genericAuthType": "oAuth2Api"
    },
    "executeOnce": true
  , credentials: { oAuth2Api: { name: 'Google Sheets', id: '' } }
}
});

const _loop_leadWorkflow = workflow('_loop_lead', '_loop_lead')
  .add(loop_lead_t0.to(loop_lead_http1).to(loop_lead_http2));

// --- Main workflow ---
const t0 = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {"rule":{"interval":[{"field":"days","daysInterval":1}]}} } });

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET sheets.googleapis.com/v4/spreadsh...",
    "parameters": {
      "method": "GET",
      "url": "https://sheets.googleapis.com/v4/spreadsheets/SPREADSHEET_ID/values/Sheet1",
      "options": {},
      "authentication": "genericCredentialType",
      "genericAuthType": "oAuth2Api"
    },
    "executeOnce": true
  , credentials: { oAuth2Api: { name: 'Google Sheets', id: '' } }
}
});

const code1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 1',
    parameters: {
      jsCode: `// From: GET sheets.googleapis.com/v4/spreadsh...\nconst leads = $('GET sheets.googleapis.com/v4/spreadsh...').all().map(i => i.json);\nconst newLeads = leads.values.filter(function (row) {
	return row[2] === 'New';
});\nreturn [{ json: { newLeads } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const code2 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Split leads',
    parameters: {
      jsCode: `const newLeads = $('Code 1').all().map(i => i.json);
return newLeads.map(lead => ({ json: lead }));`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const exec1 = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: {
    name: 'Loop leads',
    parameters: {
      source: 'parameter',
      workflowJson: _loop_leadWorkflow,
      options: {}
    }
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1).to(code1).to(code2).to(exec1));