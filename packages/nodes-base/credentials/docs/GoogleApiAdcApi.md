# Google Application Default Credentials (ADC) Authentication

This document describes how to use Google Application Default Credentials (ADC) for authenticating with Google Vertex AI nodes in n8n.

## Overview

Application Default Credentials (ADC) is a strategy used by Google Cloud client libraries to automatically detect and use credentials from the environment. This allows n8n to authenticate with Google Cloud services without requiring you to manage service account JSON keys.

## Supported Nodes

The following nodes support ADC authentication:

- **Google Vertex Chat Model** (`lmChatGoogleVertex`)
- **Embeddings Google Vertex** (`embeddingsGoogleVertex`)

## When to Use ADC

ADC authentication is ideal when:

1. **Running n8n on Google Cloud Platform (GCP)**
   - On Google Kubernetes Engine (GKE)
   - On Cloud Run
   - On Compute Engine
   - On App Engine

2. **Developing locally with gcloud CLI**
   - When you have the Google Cloud SDK installed and configured

3. **Using Workload Identity Federation**
   - For multi-cloud or on-premises deployments

## Setup Instructions

### Option 1: Running on GCP (Recommended)

When running n8n on GCP, ADC automatically uses the attached service account. No additional configuration is required.

1. Ensure your GCP compute resource (GKE pod, Cloud Run service, etc.) has a service account attached
2. Grant the service account the necessary permissions:
   - `roles/aiplatform.user` for Vertex AI access
   - Additional roles as needed for specific operations

### Option 2: Local Development with gcloud CLI

1. Install the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)

2. Authenticate with your Google account:
   ```bash
   gcloud auth application-default login
   ```

3. (Optional) Set a default project:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

### Option 3: Using a Service Account Key File

Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to your service account JSON key file:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

## Credential Configuration

When creating the ADC credential in n8n:

| Field | Description | Required |
|-------|-------------|----------|
| **Region** | The Google Cloud region for Vertex AI (e.g., `us-central1`). This determines which regional endpoint is used. | Yes |
| **Project ID** | Your Google Cloud project ID. If left empty, it will be auto-detected from ADC. | No |

### Project ID Resolution Order

When using ADC, the project ID is determined in the following order:

1. **Node Parameter Override** - If specified in the node configuration
2. **Credential Configuration** - If specified in the ADC credential
3. **ADC Auto-detection** - From the gcloud configuration or environment

## Comparison: ADC vs Service Account

| Feature | ADC | Service Account |
|---------|-----|-----------------|
| JSON Key Management | Not required | Required |
| Works on GCP without configuration | ✅ | ❌ (needs key) |
| Works locally with gcloud | ✅ | ✅ |
| Key rotation | Automatic (on GCP) | Manual |
| Best for production on GCP | ✅ | ❌ |
| Best for external hosting | ❌ | ✅ |

## Troubleshooting

### "Could not load the default credentials"

This error occurs when ADC cannot find any credentials. Solutions:

1. Run `gcloud auth application-default login` if developing locally
2. Ensure `GOOGLE_APPLICATION_CREDENTIALS` is set if using a key file
3. Verify a service account is attached if running on GCP

### "Permission denied" or "403 Forbidden"

The authenticated identity lacks required permissions:

1. Check IAM permissions for the service account or user
2. Ensure `roles/aiplatform.user` role is granted
3. Verify the project ID is correct

### "Project not found" or "Invalid project"

1. Explicitly set the Project ID in the credential configuration
2. Or set it in the node parameter
3. Verify the project exists and you have access

## Related Links

- [Google Cloud ADC Documentation](https://cloud.google.com/docs/authentication/provide-credentials-adc)
- [Google Cloud Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [n8n Google Vertex Chat Model Documentation](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatgooglevertex/)
- [n8n Embeddings Google Vertex Documentation](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingsgooglevertex/)