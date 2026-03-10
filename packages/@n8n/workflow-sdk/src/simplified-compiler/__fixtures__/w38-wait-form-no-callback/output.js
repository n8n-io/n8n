const t0 = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.example.com/prepare",
    "parameters": {
      "method": "POST",
      "url": "https://api.example.com/prepare",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"step\":\"init\"}"
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
      "formTitle": "Enter Details",
      "formDescription": "Please fill in the required information",
      "formFields": {
        "values": [
          {
            "fieldLabel": "Name",
            "fieldType": "text"
          },
          {
            "fieldLabel": "Email",
            "fieldType": "text"
          }
        ]
      }
    },
    "executeOnce": true
  }
});

const agg1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Collect formData',
    parameters: {
      jsCode: `// @aggregate: formData\nconst _raw = $('Wait 1').all().map(i => i.json);\nconst formData = _raw.length === 1 ? _raw[0] : _raw;\nreturn [{ json: { formData } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.example.com/submit",
    "parameters": {
      "method": "POST",
      "url": "https://api.example.com/submit",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "={{ { \"name\": $('Collect formData').first().json.formData.Name, \"email\": $('Collect formData').first().json.formData.Email } }}"
    },
    "executeOnce": true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1).to(wait1).to(agg1).to(http2));
