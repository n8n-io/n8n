// --- Sub-workflow: notifyTeam ---
const fn_notifyTeam_t0 = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: { inputSource: 'passthrough' } } });

const fn_notifyTeam_http1 = node({
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
      "jsonBody": "{\"text\":\"={{ $('When Executed by Another Workflow').first().json.message }}\"}"
    },
    "executeOnce": true
  }
});

const notifyTeamWorkflow = workflow('notifyTeam', 'notifyTeam')
  .add(fn_notifyTeam_t0.to(fn_notifyTeam_http1));

// --- Main workflow ---
const t0 = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET api.example.com/status",
    "parameters": {
      "method": "GET",
      "url": "https://api.example.com/status",
      "options": {}
    },
    "executeOnce": true
  }
});

const set1 = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: {
    "name": "Set notifyTeam params",
    "parameters": {
      "options": {},
      "assignments": {
        "assignments": [
          {
            "id": "assign_0",
            "name": "message",
            "type": "string",
            "value": "={{ $('GET api.example.com/status').first().json.summary }}"
          }
        ]
      }
    },
    "executeOnce": true
  }
});

const exec1 = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: {
    name: 'notifyTeam',
    parameters: {
      source: 'parameter',
      workflowJson: notifyTeamWorkflow,
      options: {}
    },
    executeOnce: true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1).to(set1).to(exec1));