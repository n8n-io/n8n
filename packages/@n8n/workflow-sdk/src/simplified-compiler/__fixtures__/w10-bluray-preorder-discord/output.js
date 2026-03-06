const t0 = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });

const code1 = node({
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

const http1 = node({
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

const agg1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Collect page',
    parameters: {
      jsCode: `// @aggregate: page\nconst _raw = $('GET www.blu-ray.com/movies/movies.php').all().map(i => i.json);\nconst page = _raw.length === 1 ? _raw[0] : _raw;\nreturn [{ json: { page } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const code2 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 2',
    parameters: {
      jsCode: `// From: Code 1\nconst formattedDate = $('Code 1').all().map(i => i.json);\nconst page = $('Collect page').first().json.page;\nconst links = extractLinks(page);
const todaysItems = links.filter(function (link) {
	return link.date === formattedDate;
});

let message = '*New 4k Preorders Today!*\\n';
for (const item of todaysItems) {
	message += item.title + '\\n';
}\nreturn [{ json: { links, todaysItems, message } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const http2 = node({
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

const t6 = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {"rule":{"interval":[{"field":"cronExpression","expression":"0 23 * * *"}]}} } });

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(code1).to(http1).to(agg1).to(code2).to(http2))
  .add(t6.to(code1));