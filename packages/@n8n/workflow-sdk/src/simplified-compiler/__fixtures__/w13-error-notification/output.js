const t0 = trigger({ type: 'n8n-nodes-base.errorTrigger', version: 1, config: {} });

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.pagerduty.com/incidents",
    "parameters": {
      "method": "POST",
      "url": "https://api.pagerduty.com/incidents",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"incident\":{\"title\":\"Workflow error detected\",\"body\":{\"type\":\"incident_body\",\"details\":\"An error occurred\"}}}",
      "authentication": "genericCredentialType",
      "genericAuthType": "httpBasicAuth"
    },
    "executeOnce": true
  , credentials: { httpBasicAuth: { name: 'PagerDuty', id: '' } }
}
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1));