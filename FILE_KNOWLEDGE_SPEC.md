# File Knowledge for Personal Agents


## Overview

File Knowledge allows users to provide contextual knowledge as file attachments to their personal agents. The agent generates answers based on this information, enabling more relevant responses within the agent's specific domain.

## Prerequisites

### Database Support

The SQLite implementation uses the [sqlite-vec](https://github.com/asg017/sqlite-vec) NPM package and works out of the box.

For PostgreSQL to work, the [pgvector](https://github.com/pgvector/pgvector) extension must be available when the instance version is upgraded. During migration, the script attempts to enable the extension. If the extension is not available or the enablement fails, table creation is skipped and PDF file uploads remain unavailable for that instance [Should we allow the instance admin to add pgvector when they are ready?].

In both cases, sufficient disk space is required to store the new vector table [How much?].

### Credentials

Chat users can upload PDF files to agents using base LLM models from providers in [List 1] below by default. For base LLM models from providers in [List 2] to work, an admin user must set a default credential for one of the providers in [List 1] on the settings page [Should we make this configurable by chat users themselves?].

#### List 1: Default support

- OpenAI
- Google Gemini
- Azure OpenAI
- Ollama
- AWS Bedrock
- Cohere
- Mistral Cloud

#### List 2: Support with extra embedding credential

- Anthropic
- Vercel AI Gateway
- xAI Grok
- Groq
- OpenRouter
- DeepSeek

Embeddings are not compatible between providers. When switching the base model provider, embeddings are regenerated for all PDF files attached to the agent.


## Cost (for the user)

Creating embeddings incurs costs, but they tend to be significantly cheaper than text generation. For example, see https://platform.openai.com/docs/pricing#embeddings