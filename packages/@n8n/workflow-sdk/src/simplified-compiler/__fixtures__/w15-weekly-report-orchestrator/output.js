const t0 = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {"rule":{"interval":[{"field":"cronExpression","expression":"0 9 * * 1"}]}} } });

const wf1 = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.2,
  config: {
    name: 'Run: Generate Sales Report',
    parameters: {
      workflowId: { __rl: true, mode: 'name', value: 'Generate Sales Report' }
    },
    executeOnce: true
  },
  metadata: { varName: 'salesReport' }
});

const wf2 = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.2,
  config: {
    name: 'Run: Generate Support Report',
    parameters: {
      workflowId: { __rl: true, mode: 'name', value: 'Generate Support Report' }
    },
    executeOnce: true
  },
  metadata: { varName: 'supportReport' }
});

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST slack.com/api/chat.postMessage",
    "parameters": {
      "method": "POST",
      "url": "https://slack.com/api/chat.postMessage",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"channel\":\"#reports\",\"text\":\"Weekly reports ready\"}",
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth"
    },
    "executeOnce": true
  , credentials: { httpHeaderAuth: { name: 'Slack', id: '' } }
}
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(wf1).to(wf2).to(http1));