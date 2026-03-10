const t0 = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });

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
      "jsonBody": "{\"text\":\"={{ \\\"Please review: \\\" + $execution.resumeFormUrl }}\"}"
    },
    "executeOnce": true
  }
});

const wait1 = node({
  type: 'n8n-nodes-base.wait', version: 1.1,
  config: {
    "name": "Wait 1",
    "parameters": {
      "resume": "form",
      "formTitle": "Approval Required",
      "formFields": {
        "values": [
          {
            "fieldLabel": "Decision",
            "fieldType": "select",
            "fieldOptions": {
              "values": [
                {
                  "option": "Approve"
                },
                {
                  "option": "Reject"
                }
              ]
            }
          },
          {
            "fieldLabel": "Notes",
            "fieldType": "text"
          }
        ]
      }
    },
    "executeOnce": true
  }
});

const wait2 = node({
  type: 'n8n-nodes-base.wait', version: 1.1,
  config: {
    "name": "Wait 2",
    "parameters": {
      "resume": "specificTime",
      "dateTime": "2024-12-25T00:00:00Z"
    },
    "executeOnce": true
  }
});

const http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.example.com/complete",
    "parameters": {
      "method": "POST",
      "url": "https://api.example.com/complete",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"status\":\"done\"}"
    },
    "executeOnce": true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1).to(wait1).to(wait2).to(http2));
