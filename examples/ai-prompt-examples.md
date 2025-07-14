# AI Prompt Examples for JSON-Only Rich Content

## Basic JSON-Only Instruction

```
IMPORTANT: Return ONLY a valid JSON object. Do not include any explanatory text, markdown formatting, or code blocks. Your entire response must be parseable JSON.

Generate a rich content object with the following structure:
{
  "type": "rich",
  "content": {
    "html": "your HTML here",
    "css": "your CSS here", 
    "script": "your JavaScript here",
    "sanitize": false
  }
}
```

## Specific Examples

### Example 1: Weather Card
**Prompt:**
```
Return ONLY JSON. Create a weather card for New York, 72°F, sunny:

Expected format:
{
  "type": "rich",
  "content": {
    "html": "...",
    "css": "...",
    "script": "...",
    "sanitize": false
  }
}
```

**AI Response:**
```json
{
  "type": "rich",
  "content": {
    "html": "<div class='weather-card'><div class='city'>New York</div><div class='temp'>72°F</div><div class='condition'>☀️ Sunny</div></div>",
    "css": ".weather-card { background: linear-gradient(135deg, #74b9ff, #0984e3); padding: 20px; border-radius: 15px; color: white; text-align: center; font-family: Arial, sans-serif; } .city { font-size: 18px; margin-bottom: 10px; } .temp { font-size: 32px; font-weight: bold; margin: 10px 0; } .condition { font-size: 16px; }",
    "script": "",
    "sanitize": false
  }
}
```

### Example 2: Interactive Form
**Prompt:**
```
JSON ONLY. Create a contact form with name, email, message fields that submits to n8n chat:

Required structure:
{
  "type": "rich", 
  "content": {
    "html": "...",
    "css": "...",
    "script": "...",
    "sanitize": false
  }
}
```

**AI Response:**
```json
{
  "type": "rich",
  "content": {
    "html": "<form id='contactForm'><h3>Contact Us</h3><input type='text' name='name' placeholder='Your Name' required><input type='email' name='email' placeholder='Your Email' required><textarea name='message' placeholder='Your Message' required></textarea><button type='submit'>Send Message</button></form>",
    "css": "#contactForm { max-width: 400px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9; } #contactForm h3 { margin-top: 0; color: #333; } #contactForm input, #contactForm textarea { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; } #contactForm button { background: #007cba; color: white; padding: 12px 20px; border: none; border-radius: 4px; cursor: pointer; width: 100%; } #contactForm button:hover { background: #005a87; }",
    "script": "document.getElementById('contactForm').addEventListener('submit', function(e) { e.preventDefault(); const formData = new FormData(this); const data = Object.fromEntries(formData.entries()); const chatInput = window.parent.document.querySelector('.chat-input textarea') || window.parent.document.querySelector('[data-test-id=\"chat-input\"]'); if (chatInput) { chatInput.value = `Contact Form Submission:\\nName: ${data.name}\\nEmail: ${data.email}\\nMessage: ${data.message}`; chatInput.dispatchEvent(new Event('input', { bubbles: true })); } });",
    "sanitize": false
  }
}
```

## Advanced System Prompt Template

```
You are a Rich Content Generator AI. Your role is to create interactive web components for n8n workflows.

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON - no explanations, no markdown, no code blocks
2. Your entire response must be parseable as JSON
3. Use this exact structure:

{
  "type": "rich",
  "content": {
    "html": "Complete HTML structure",
    "css": "Complete CSS styling", 
    "script": "Complete JavaScript functionality",
    "sanitize": false
  }
}

REQUIREMENTS:
- HTML: Self-contained, semantic markup
- CSS: Modern styling, responsive design
- JavaScript: Interactive functionality, form submissions to n8n chat
- Use chat integration: chatInput.value = "your message"; chatInput.dispatchEvent(new Event('input', { bubbles: true }));

Create: [specific request here]
```

## Chat Integration Code Pattern

For any forms or interactive elements, always include this JavaScript pattern:

```javascript
// Form submission to n8n chat
function submitToChat(message) {
  const chatInput = window.parent.document.querySelector('.chat-input textarea') || 
                   window.parent.document.querySelector('[data-test-id="chat-input"]');
  if (chatInput) {
    chatInput.value = message;
    chatInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
```

## Testing Your JSON

To validate your AI's JSON response:
1. Copy the response
2. Use `JSON.parse()` in browser console
3. Check for syntax errors
4. Verify all required fields are present

Example validation:
```javascript
const response = /* AI response here */;
try {
  const parsed = JSON.parse(response);
  console.log("Valid JSON:", parsed.type === "rich");
} catch (e) {
  console.error("Invalid JSON:", e.message);
}
``` 