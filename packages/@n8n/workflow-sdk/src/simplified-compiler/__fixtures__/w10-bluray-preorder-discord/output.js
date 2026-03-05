// --- Sub-workflow: checkBlurays ---
const fn_checkBlurays_t0 = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: { inputSource: 'passthrough' } } });

const fn_checkBlurays_code1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 1',
    parameters: {
      jsCode: `const today = new Date();
const formattedDate = today.toLocaleDateString('en-US', {
	year: 'numeric',
	month: 'long',
	day: '2-digit',
	timeZone: 'America/New_York',
});\nreturn [{ json: { today, formattedDate } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const fn_checkBlurays_http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET www.blu-ray.com/movies/movies.php",
    "parameters": {
      "method": "GET",
      "url": "https://www.blu-ray.com/movies/movies.php?show=newpreorders",
      "options": {}
    },
    "executeOnce": true
  }
});

const fn_checkBlurays_code2 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 2',
    parameters: {
      jsCode: `// From: Code 1\nconst formattedDate = $('Code 1').all().map(i => i.json);\nconst page = $('GET www.blu-ray.com/movies/movies.php').all().map(i => i.json);\nconst links = extractLinks(page);
const todaysItems = links.filter(function (link) {
	return link.date === formattedDate;
});

let message = '*New 4k Preorders Today!*\\n';
for (const item of todaysItems) {
	message += item.title + '\\n';
}\nreturn [{ json: { links, todaysItems, message, item } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const fn_checkBlurays_http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST discord.com/api/webhooks/WEBHOOK...",
    "parameters": {
      "method": "POST",
      "url": "https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"content\":\"={{$json}}\"}"
    },
    "executeOnce": true
  }
});

const checkBluraysWorkflow = workflow('checkBlurays', 'checkBlurays')
  .add(fn_checkBlurays_t0.to(fn_checkBlurays_code1).to(fn_checkBlurays_http1).to(fn_checkBlurays_code2).to(fn_checkBlurays_http2));

// --- Main workflow ---
const t0 = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });

const exec1 = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: {
    name: 'checkBlurays',
    parameters: {
      source: 'parameter',
      workflowJson: checkBluraysWorkflow,
      options: {}
    },
    executeOnce: true
  }
});

const t2 = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {"rule":{"interval":[{"field":"cronExpression","expression":"0 23 * * *"}]}} } });

const exec3 = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: {
    name: 'checkBlurays',
    parameters: {
      source: 'parameter',
      workflowJson: checkBluraysWorkflow,
      options: {}
    },
    executeOnce: true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(exec1))
  .add(t2.to(exec3));