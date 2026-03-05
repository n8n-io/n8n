const t0 = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { pinData: [{"triggered":true}] } });

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
    "executeOnce": true,
    "pinData": [
      {
        "data": "<html><body><table><tr><td>Alien (1979)</td><td>January 15, 2025</td></tr></table></body></html>"
      }
    ]
  }
});

const code2 = node({
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

const t5 = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {"rule":{"interval":[{"field":"cronExpression","expression":"0 23 * * *"}]}} } });

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(code1).to(http1).to(code2).to(http2))
  .add(t5.to(code1));