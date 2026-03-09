const t0 = trigger({ type: 'n8n-nodes-base.jiraTrigger', version: 1, config: { parameters: {"events":["jira:issue_created"]} , credentials: { jiraSoftwareCloudApi: { name: 'My Jira Account', id: '' } } } });

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
      "jsonBody": "{\"channel\":\"#dev\",\"text\":\"New Jira issue created\"}"
    },
    "executeOnce": true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1));
