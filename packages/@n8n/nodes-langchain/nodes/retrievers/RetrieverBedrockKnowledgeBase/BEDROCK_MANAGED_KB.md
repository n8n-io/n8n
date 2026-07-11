# Bedrock Managed Knowledge Base Support

## Overview
Adds an n8n retriever node that queries Amazon Bedrock Knowledge Bases for managed retrieval in workflow automations.

## Usage
In n8n workflow editor:
1. Add the **Bedrock Knowledge Base Retriever** node
2. Configure AWS credentials and Knowledge Base ID
3. Connect to an AI Agent or Chain node as a retriever sub-node

```json
{
  "node": "RetrieverBedrockKnowledgeBase",
  "parameters": {
    "knowledgeBaseId": "YOUR_KB_ID",
    "region": "us-east-1",
    "useAgenticRetrieval": true,
    "maxResults": 5
  }
}
```

## Configuration
| Variable | Description | Default |
|---|---|---|
| KNOWLEDGE_BASE_ID | Bedrock Knowledge Base ID | None |
| AWS_REGION | AWS region for the KB | us-east-1 |
| USE_AGENTIC_RETRIEVAL | Enable agentic retrieval | true |
| MAX_RESULTS | Maximum retrieval results | 5 |

## Features
- Managed search (no vector store needed)
- Agentic retrieval with query decomposition + reranking
- Automatic fallback to plain Retrieve if agentic fails
- Multi-source support (S3, Web, Confluence, SharePoint)
- Visual configuration via n8n node properties panel

## SDK Requirements
- @aws-sdk/client-bedrock-agent-runtime >= 3.700
- n8n >= 1.0

## Required IAM Permissions
```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:Retrieve",
    "bedrock:AgenticRetrieve"
  ],
  "Resource": "arn:aws:bedrock:<region>:<account-id>:knowledge-base/<kb-id>"
}
```

## References
- [Build a Managed Knowledge Base](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-build-managed.html)
- [Retrieve API](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-retrieve.html)
- [Agentic Retrieval](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-agentic.html)
