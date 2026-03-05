// --- Loop body sub-workflow ---
const loop_event_t0 = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: { inputSource: 'passthrough' } } });

const loop_event_http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST gateway.vexa.ai/bots",
    "parameters": {
      "method": "POST",
      "url": "https://gateway.vexa.ai/bots",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"platform\":\"google_meet\",\"native_meeting_id\":\"meeting123\"}",
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth"
    },
    "executeOnce": true
  , credentials: { httpHeaderAuth: { name: 'Vexa API', id: '' } }
}
});

const loop_event_if1 = ifElse({ version: 2.2, config: { name: 'IF 1', parameters: { conditions: {"conditions":[{"leftValue":"={{ $('When Executed by Another Workflow').first().json.status }}","rightValue":"confirmed","operator":{"type":"string","operation":"equals"}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(loop_event_http1);

const loop_event_http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "DELETE gateway.vexa.ai/bots/meeting123",
    "parameters": {
      "method": "DELETE",
      "url": "https://gateway.vexa.ai/bots/meeting123",
      "options": {},
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth"
    },
    "executeOnce": true
  , credentials: { httpHeaderAuth: { name: 'Vexa API', id: '' } }
}
});

const loop_event_if2 = ifElse({ version: 2.2, config: { name: 'IF 2', parameters: { conditions: {"conditions":[{"leftValue":"={{ $('When Executed by Another Workflow').first().json.status }}","rightValue":"cancelled","operator":{"type":"string","operation":"equals"}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(loop_event_http2);

const _loop_eventWorkflow = workflow('_loop_event', '_loop_event')
  .add(loop_event_t0.to(loop_event_if1).to(loop_event_if2));

// --- Main workflow ---
const t0 = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {"rule":{"interval":[{"field":"minutes","minutesInterval":1}]}} } });

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET www.googleapis.com/calendar/v3/ca...",
    "parameters": {
      "method": "GET",
      "url": "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      "options": {},
      "authentication": "genericCredentialType",
      "genericAuthType": "oAuth2Api"
    },
    "executeOnce": true,
    "pinData": [
      {
        "id": "evt_001",
        "status": "confirmed",
        "summary": "Team Standup",
        "start": {
          "dateTime": "2024-01-15T10:00:00Z"
        }
      }
    ]
  , credentials: { oAuth2Api: { name: 'Google Calendar', id: '' } }
}
});

const code1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Split events',
    parameters: {
      jsCode: `const events = $('GET www.googleapis.com/calendar/v3/ca...').all().map(i => i.json);
return events.map(event => ({ json: event }));`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const exec1 = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: {
    name: 'Loop events',
    parameters: {
      source: 'parameter',
      workflowJson: _loop_eventWorkflow,
      options: {}
    }
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1).to(code1).to(exec1));