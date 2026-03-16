# LinkedIn Post Generator Agent

AI-powered LinkedIn post generator that researches trending topics and creates professional content using Azure OpenAI.

## Capabilities

- **Topic Research**: Fetches trending topics from the last 4 days across tech, business, and world news
- **Impact Analysis**: Evaluates topic relevance for LinkedIn and X engagement
- **Content Generation**: Creates professional LinkedIn posts with hooks, insights, and CTAs
- **Persona Adaptation**: Writes in customizable professional personas (CTO, Founder, Engineer, etc.)
- **Hashtag Optimization**: Suggests relevant hashtags for maximum reach

## Setup

### Prerequisites
- Azure OpenAI API key with a deployed model (e.g., `gpt-4o`)
- n8n instance running

### Configuration Steps
1. Import the workflow template from `packages/frontend/editor-ui/src/features/workflows/templates/utils/samples/linkedin_post_generator.json`
2. Open the **Azure OpenAI Chat Model** node and configure your credentials:
   - API Key
   - Resource Name
   - API Version (default: `2025-03-01-preview`)
   - Model (your deployment name)
3. Click **Open Chat** to start generating posts

## Usage Examples

### Research trending topics
```
> What are the trending AI topics this week? Generate a LinkedIn post about the most impactful one.
```

### Write with a specific persona
```
> Write a LinkedIn post about cloud-native security from a CTO perspective.
```

### Topic-specific post
```
> Create a LinkedIn post about the impact of generative AI on software development productivity.
```

### News-driven content
```
> Research the latest developments in quantum computing and create a thought-leadership post.
```

## Workflow Architecture

```
┌─────────────────┐     ┌──────────────────┐
│  Chat Trigger    │────▶│  LinkedIn Post    │
│  (User Input)    │     │  Agent (AI)       │
└─────────────────┘     └────────┬─────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
              ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
              │ Trending   │ │ Topic │ │ Location  │
              │ News Feed  │ │Search │ │ Context   │
              └───────────┘ └───────┘ └───────────┘
```

## Related Resources

- [Workflow Template](../../packages/frontend/editor-ui/src/features/workflows/templates/utils/samples/linkedin_post_generator.json)
- [Azure OpenAI Credentials](../../packages/@n8n/nodes-langchain/credentials/AzureOpenAiApi.credentials.ts)
- [n8n AI Agent Docs](https://docs.n8n.io/advanced-ai/)
