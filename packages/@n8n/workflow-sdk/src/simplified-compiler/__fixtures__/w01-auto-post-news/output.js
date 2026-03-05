const t0 = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {"rule":{"interval":[{"field":"hours","hoursInterval":21}]}} } });

const set1 = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: {
    "name": "Set searchInput",
    "parameters": {
      "options": {},
      "assignments": {
        "assignments": [
          {
            "id": "assign_0",
            "name": "searchInput",
            "type": "string",
            "value": "What's the latest news in artificial intelligence?"
          }
        ]
      }
    },
    "executeOnce": true
  }
});

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.perplexity.ai/chat/completions",
    "parameters": {
      "method": "POST",
      "url": "https://api.perplexity.ai/chat/completions",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"model\":\"llama-3.1-sonar-small-128k-online\",\"messages\":[{\"role\":\"system\",\"content\":\"You are a social media assistant summarizing tech news...\"},{\"role\":\"user\",\"content\":\"={{ $('Set searchInput').first().json.searchInput }}\"}],\"temperature\":0.3}",
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth"
    },
    "executeOnce": true
  , credentials: { httpHeaderAuth: { name: 'Perplexity API', id: '' } }
}
});

const http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.twitter.com/2/tweets",
    "parameters": {
      "method": "POST",
      "url": "https://api.twitter.com/2/tweets",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"text\":\"Latest AI news summary\"}",
      "authentication": "genericCredentialType",
      "genericAuthType": "oAuth2Api"
    },
    "executeOnce": true
  , credentials: { oAuth2Api: { name: 'Twitter OAuth2', id: '' } }
}
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(set1).to(http1).to(http2));