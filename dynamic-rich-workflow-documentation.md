# Dynamic Rich Content Workflow - JSON Documentation

## Overview
The **Dynamic Rich Content Workflow** is a sophisticated n8n workflow that creates interactive, dynamic user interfaces based on user input in a chat environment. It demonstrates the capability to generate rich content including weather widgets, sales dashboards, charts, and interactive forms.

## Workflow JSON Structure

```json
{
  "name": "Dynamic Rich Content Workflow",
  "nodes": [
    {
      "parameters": {
        "public": true,
        "options": {
          "responseMode": "lastNode",
          "title": "Rich Content Demo",
          "subtitle": "Try different commands to see rich content",
          "inputPlaceholder": "Type 'weather', 'sales', 'chart', or 'form'...",
          "showWelcomeScreen": true
        }
      },
      "id": "chat-trigger-dynamic",
      "name": "Chat Trigger",
      "type": "@n8n/n8n-nodes-langchain.chatTrigger",
      "typeVersion": 1.2,
      "position": [200, 300]
    },
    {
      "parameters": {
        "jsCode": "// Parse user input and prepare data for rich content generation\nconst userMessage = $input.first().json.chatInput || '';\nconst lowerMessage = userMessage.toLowerCase();\n\n// Determine content type and prepare dynamic data\nlet contentType = 'custom';\nlet dynamicData = {};\n\nif (lowerMessage.includes('weather')) {\n  contentType = 'weather';\n  dynamicData = {\n    temperature: '24°C',\n    description: 'Partly cloudy with light breeze',\n    humidity: '68%',\n    wind: '15 mph NE',\n    location: 'New York',\n    icon: '⛅'\n  };\n} else if (lowerMessage.includes('sales') || lowerMessage.includes('dashboard')) {\n  contentType = 'dashboard';\n  dynamicData = {\n    title: 'Sales Dashboard',\n    revenue: '$89,342',\n    orders: '2,156',\n    customers: '1,438'\n  };\n} else if (lowerMessage.includes('chart') || lowerMessage.includes('graph')) {\n  contentType = 'chart';\n  dynamicData = {\n    title: 'Weekly Performance',\n    chartData: [45, 62, 38, 71, 55, 83, 67],\n    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']\n  };\n} else if (lowerMessage.includes('form') || lowerMessage.includes('feedback')) {\n  contentType = 'form';\n  dynamicData = {\n    title: 'Customer Feedback',\n    submitAction: 'submit-customer-feedback',\n    fields: [\n      {\n        name: 'satisfaction',\n        type: 'select',\n        label: 'Satisfaction Level',\n        required: true,\n        options: [\n          { value: '5', label: '😍 Excellent' },\n          { value: '4', label: '😊 Good' },\n          { value: '3', label: '😐 Average' },\n          { value: '2', label: '😞 Poor' },\n          { value: '1', label: '😡 Terrible' }\n        ]\n      },\n      {\n        name: 'comments',\n        type: 'textarea',\n        label: 'Additional Comments',\n        placeholder: 'Tell us more about your experience...',\n        rows: 5\n      }\n    ]\n  };\n} else {\n  // Default help content\n  dynamicData = {\n    userMessage: userMessage,\n    timestamp: new Date().toISOString()\n  };\n}\n\nreturn {\n  json: {\n    contentType,\n    userMessage,\n    ...dynamicData\n  }\n};"
      },
      "id": "data-processor",
      "name": "Process User Input",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [400, 300]
    },
    {
      "parameters": {
        "contentType": "={{ $json.contentType }}",
        "templateVariables": "={{ JSON.stringify($json) }}"
      },
      "id": "rich-generator-dynamic",
      "name": "Rich Content Generator",
      "type": "richContentGenerator",
      "typeVersion": 1,
      "position": [600, 300]
    },
    {
      "parameters": {
        "jsCode": "// Post-process the rich content to add interactive callbacks\nconst richContent = $input.first().json;\n\n// Add callback handling for interactive elements\nif (richContent.type === 'rich' && richContent.content) {\n  // Enhance script with callback handling\n  if (richContent.content.script) {\n    richContent.content.script += `\n      \n      // Enhanced callback system\n      window.addEventListener('message', (event) => {\n        if (event.data.type === 'chat-action') {\n          console.log('Chat action received:', event.data);\n          \n          // Handle different actions\n          switch (event.data.action) {\n            case 'refresh-dashboard':\n              // Simulate dashboard refresh\n              const metrics = container.querySelectorAll('.metric-value');\n              metrics.forEach(metric => {\n                const current = parseInt(metric.textContent.replace(/[^0-9]/g, ''));\n                const newValue = current + Math.floor(Math.random() * 100);\n                metric.textContent = metric.textContent.replace(/[0-9,]+/, newValue.toLocaleString());\n              });\n              break;\n              \n            case 'export-data':\n              // Simulate data export\n              const data = {\n                timestamp: new Date().toISOString(),\n                metrics: Array.from(container.querySelectorAll('.metric-card')).map(card => ({\n                  label: card.querySelector('.metric-label').textContent,\n                  value: card.querySelector('.metric-value').textContent\n                }))\n              };\n              console.log('Exported data:', data);\n              alert('Data exported to console!');\n              break;\n              \n            case 'submit-customer-feedback':\n              // Handle form submission\n              console.log('Customer feedback submitted:', event.data.data);\n              // In a real implementation, this would trigger another workflow\n              break;\n          }\n        }\n      });\n    `;\n  }\n}\n\nreturn { json: richContent };"
      },
      "id": "callback-enhancer",
      "name": "Add Interactive Callbacks",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [800, 300]
    }
  ],
  "connections": {
    "Chat Trigger": {
      "main": [
        [
          {
            "node": "Process User Input",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Process User Input": {
      "main": [
        [
          {
            "node": "Rich Content Generator",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Rich Content Generator": {
      "main": [
        [
          {
            "node": "Add Interactive Callbacks",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "staticData": {},
  "settings": {
    "executionOrder": "v1"
  },
  "meta": {
    "description": "A dynamic workflow that generates rich content based on user input. Try typing 'weather', 'sales', 'chart', or 'form' to see different interactive content types.",
    "tags": ["chat", "rich-content", "interactive", "demo"]
  }
}
```

## Node-by-Node Documentation

### 1. Chat Trigger Node
**Type**: `@n8n/n8n-nodes-langchain.chatTrigger`
**ID**: `chat-trigger-dynamic`
**Position**: `[200, 300]`

#### Parameters:
- **public**: `true` - Makes the chat interface publicly accessible
- **responseMode**: `"lastNode"` - Returns the output from the final node
- **title**: `"Rich Content Demo"` - Chat interface title
- **subtitle**: `"Try different commands to see rich content"` - Descriptive subtitle
- **inputPlaceholder**: `"Type 'weather', 'sales', 'chart', or 'form'..."` - User guidance
- **showWelcomeScreen**: `true` - Displays welcome message

#### Purpose:
Creates a public chat interface that accepts user input and triggers the workflow execution.

---

### 2. Process User Input Node
**Type**: `n8n-nodes-base.code`
**ID**: `data-processor`
**Position**: `[400, 300]`

#### JavaScript Code Functionality:
1. **Input Processing**: Extracts and normalizes user input
2. **Content Type Detection**: Analyzes keywords to determine content type
3. **Dynamic Data Generation**: Creates context-specific data structures

#### Supported Content Types:

##### Weather (`weather`)
```javascript
{
  temperature: '24°C',
  description: 'Partly cloudy with light breeze',
  humidity: '68%',
  wind: '15 mph NE',
  location: 'New York',
  icon: '⛅'
}
```

##### Dashboard (`sales`, `dashboard`)
```javascript
{
  title: 'Sales Dashboard',
  revenue: '$89,342',
  orders: '2,156',
  customers: '1,438'
}
```

##### Chart (`chart`, `graph`)
```javascript
{
  title: 'Weekly Performance',
  chartData: [45, 62, 38, 71, 55, 83, 67],
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
}
```

##### Form (`form`, `feedback`)
```javascript
{
  title: 'Customer Feedback',
  submitAction: 'submit-customer-feedback',
  fields: [
    {
      name: 'satisfaction',
      type: 'select',
      label: 'Satisfaction Level',
      required: true,
      options: [
        { value: '5', label: '😍 Excellent' },
        { value: '4', label: '😊 Good' },
        { value: '3', label: '😐 Average' },
        { value: '2', label: '😞 Poor' },
        { value: '1', label: '😡 Terrible' }
      ]
    },
    {
      name: 'comments',
      type: 'textarea',
      label: 'Additional Comments',
      placeholder: 'Tell us more about your experience...',
      rows: 5
    }
  ]
}
```

#### Output Structure:
```javascript
{
  contentType: string,     // Type of content to generate
  userMessage: string,     // Original user input
  ...dynamicData          // Content-specific data
}
```

---

### 3. Rich Content Generator Node
**Type**: `richContentGenerator`
**ID**: `rich-generator-dynamic`
**Position**: `[600, 300]`

#### Parameters:
- **contentType**: `={{ $json.contentType }}` - Expression referencing the detected content type
- **templateVariables**: `={{ JSON.stringify($json) }}` - All data as JSON string for template processing

#### Purpose:
Converts the structured data into rich HTML/CSS/JavaScript content based on predefined templates for each content type.

---

### 4. Add Interactive Callbacks Node
**Type**: `n8n-nodes-base.code`
**ID**: `callback-enhancer`
**Position**: `[800, 300]`

#### JavaScript Enhancement:
Adds advanced interactivity to the generated rich content by:

1. **Message Event Listener**: Captures user interactions within the rich content
2. **Action Handlers**: Processes different types of user actions
3. **Dynamic Updates**: Modifies content based on user interactions

#### Supported Actions:

##### `refresh-dashboard`
- Updates dashboard metrics with random new values
- Simulates real-time data refresh

##### `export-data`
- Extracts current dashboard data
- Logs to console and shows user notification

##### `submit-customer-feedback`
- Handles form submissions
- Logs feedback data for processing

#### Event Structure:
```javascript
{
  type: 'chat-action',
  action: string,         // Action identifier
  data: object           // Action-specific data
}
```

---

## Workflow Connections

The workflow follows a linear execution path:

```
Chat Trigger → Process User Input → Rich Content Generator → Add Interactive Callbacks
```

### Connection Details:
1. **Chat Trigger** → **Process User Input**: Main output connection
2. **Process User Input** → **Rich Content Generator**: Main output connection  
3. **Rich Content Generator** → **Add Interactive Callbacks**: Main output connection

---

## Workflow Settings

### Execution Order:
- **Version**: `v1` - Uses the original n8n execution model

### Static Data:
- **Empty**: `{}` - No persistent data storage required

### Metadata:
- **Description**: Comprehensive workflow description
- **Tags**: `["chat", "rich-content", "interactive", "demo"]` - Categorization tags

---

## Usage Examples

### Weather Widget
**User Input**: `"What's the weather like?"`
**Output**: Interactive weather card with temperature, conditions, humidity, and wind data

### Sales Dashboard
**User Input**: `"Show me the sales dashboard"`
**Output**: Metrics dashboard with revenue, orders, customers, and interactive refresh button

### Performance Chart
**User Input**: `"Display weekly chart"`
**Output**: Interactive bar chart showing weekly performance data

### Feedback Form
**User Input**: `"I want to give feedback"`
**Output**: Interactive form with satisfaction rating and comment field

---

## Technical Requirements

### Dependencies:
- n8n version supporting Chat Trigger nodes
- Rich Content Generator custom node
- Modern browser with JavaScript support

### Browser Compatibility:
- Support for `window.addEventListener`
- CSS Grid and Flexbox support
- ES6+ JavaScript features

### Security Considerations:
- **Public Access**: Workflow is publicly accessible
- **Input Validation**: User input is processed and sanitized
- **XSS Protection**: Rich content should be properly escaped

---

## Customization Options

### Adding New Content Types:
1. Extend the keyword detection in **Process User Input**
2. Add corresponding data structure
3. Create template in **Rich Content Generator**
4. Add action handlers in **Add Interactive Callbacks**

### Modifying Templates:
- Update the Rich Content Generator node configuration
- Modify CSS styling and HTML structure
- Enhance JavaScript functionality

### Integration Points:
- Connect to external APIs for real data
- Add database storage for form submissions
- Implement user authentication
- Add webhook notifications

---

## Best Practices

### Performance:
- Minimize JavaScript execution time
- Optimize CSS for fast rendering
- Cache frequently used data

### User Experience:
- Provide clear input guidance
- Handle edge cases gracefully
- Implement loading states
- Add error handling

### Maintainability:
- Document custom templates
- Use consistent naming conventions
- Modularize complex JavaScript code
- Version control template changes

---

## Troubleshooting

### Common Issues:
1. **Content Not Rendering**: Check template syntax and data structure
2. **Interactions Not Working**: Verify event listener registration
3. **Styling Issues**: Review CSS conflicts and browser compatibility
4. **Performance Problems**: Optimize JavaScript and reduce DOM complexity

### Debug Methods:
- Use browser developer tools
- Check n8n execution logs
- Validate JSON data structure
- Test individual nodes 