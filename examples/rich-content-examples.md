# Rich Content Examples for n8n Workflows

This document provides examples of how to create rich content in n8n workflows that will be properly rendered in the chat interface.

## Basic Rich Content Structure

For rich content to be detected and rendered properly, your workflow's final output should have this structure:

```json
{
  "type": "rich",
  "content": {
    "html": "<h2>Your HTML content here</h2>",
    "css": ".custom-class { color: blue; }",
    "components": [],
    "data": {},
    "sanitize": "basic"
  }
}
```

## Example 1: Simple Rich Content

Create a workflow that outputs:

```json
{
  "type": "rich",
  "content": {
    "html": "<h2>🎯 Welcome to Rich Content!</h2><p>This is a <strong>rich content</strong> example.</p>",
    "css": ".welcome { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; }",
    "sanitize": "basic"
  }
}
```

## Example 2: Interactive Dashboard

```json
{
  "type": "rich",
  "content": {
    "html": "<div class='dashboard'><h2>📊 Sales Dashboard</h2><div id='metrics'></div></div>",
    "css": ".dashboard { background: #f5f5f5; padding: 20px; border-radius: 8px; } .metric { display: inline-block; margin: 10px; padding: 15px; background: white; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }",
    "components": [
      {
        "type": "button",
        "id": "refresh-btn",
        "props": {
          "innerHTML": "🔄 Refresh Data"
        },
        "style": {
          "background": "#4CAF50",
          "color": "white",
          "padding": "10px 20px",
          "border": "none",
          "border-radius": "5px",
          "cursor": "pointer"
        },
        "events": {
          "click": "console.log('Refreshing data...'); location.reload();"
        }
      }
    ],
    "data": {
      "sales": 12500,
      "leads": 45,
      "conversion": "18.5%"
    },
    "script": "document.getElementById('metrics').innerHTML = `<div class='metric'>Sales: $${data.sales}</div><div class='metric'>Leads: ${data.leads}</div><div class='metric'>Conversion: ${data.conversion}</div>`;",
    "sanitize": "basic"
  }
}
```

## Example 3: Data Visualization

```json
{
  "type": "rich",
  "content": {
    "html": "<div class='chart-container'><h3>📈 Monthly Revenue</h3><canvas id='revenue-chart'></canvas></div>",
    "css": ".chart-container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }",
    "data": {
      "months": ["Jan", "Feb", "Mar", "Apr", "May"],
      "revenue": [4200, 5100, 4800, 6200, 5900]
    },
    "script": "const ctx = document.getElementById('revenue-chart').getContext('2d'); const chart = new Chart(ctx, { type: 'line', data: { labels: data.months, datasets: [{ label: 'Revenue', data: data.revenue, borderColor: '#3498db', fill: false }] } });",
    "sanitize": "none"
  }
}
```

## Testing Your Rich Content

1. **Create a Code node** in your workflow
2. **Set the code** to return one of the examples above:
   ```javascript
   return [
     {
       json: {
         type: "rich",
         content: {
           html: "<h2>🎯 Test Rich Content</h2><p>This is working!</p>",
           css: ".test { color: blue; background: #f0f0f0; padding: 15px; border-radius: 5px; }",
           sanitize: "basic"
         }
       }
     }
   ];
   ```

3. **Configure the Webhook Response** to use "First Entry JSON" mode
4. **Test the webhook** - you should see rich content instead of raw JSON

## Troubleshooting

- **Getting raw JSON?** Make sure your output has `type: "rich"` and `content` properties
- **Content not styled?** Check that your CSS is being applied and sanitization level is appropriate
- **Scripts not running?** Use `sanitize: "none"` for JavaScript execution (be careful with security)
- **Components not interactive?** Make sure event handlers are properly defined in the `events` property

## Security Considerations

- **Basic sanitization**: Allows most HTML/CSS but removes dangerous elements
- **Strict sanitization**: Only allows basic formatting tags
- **No sanitization**: Allows everything including scripts (use with caution)

Choose the appropriate sanitization level based on your security requirements. 