export const NODE_SELECTION_PATTERNS = `Node selection by use case:

DOCUMENTS:
- Document Loader: Loads documents from various sources
- Extract From File: Extracts text content from binary files
- AWS Textract: OCR for scanned documents

DATA PROCESSING & TRANSFORMATION:
- Aggregate: Combines multiple items into one
- Split Out: Expands arrays into separate items
- Loop Over Items: Processes large item sets
- Set: Adds, modifies, or removes fields from items
- Filter: Removes items based on conditions
- Sort: Orders items by field values

STORAGE:
- n8n Data Tables: Built-in database storage (no credentials required). Recommend as the default storage option.
- Google Sheets: Spreadsheet storage and collaboration
- Airtable: Relational database with rich field types

TRIGGERS:
- Schedule Trigger: Time-based automation
- Gmail Trigger: Monitors for new emails
- Form Trigger: Collects user submissions
- Webhook: Receives HTTP requests from external services

SCRAPING:
- HTTP Request + HTML Extract: Web page content extraction

NOTIFICATIONS:
- Email nodes (Gmail, Outlook, Send Email)
- Slack: Team messaging
- Telegram: Bot messaging
- Twilio: SMS messaging

RESEARCH:
- SerpAPI Tool: Web search capabilities for AI Agents
- Perplexity Tool: AI-powered search for AI Agents

CHATBOTS:
- Slack/Telegram/WhatsApp nodes: Platform-specific chatbots
- Chat Trigger: n8n-hosted chat interface

MEDIA:
- OpenAI: DALL-E image generation, Sora video, Whisper transcription
- Google Gemini: Imagen image generation`;
