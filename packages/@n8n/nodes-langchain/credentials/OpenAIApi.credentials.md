# OpenAI API Credentials

Use these credentials to authenticate with OpenAI-compatible APIs in n8n.

## Supported Authentication

OpenAI API credentials use API key authentication with a configurable base URL to support various OpenAI-compatible services.

## Configuration

### API Key
- **Type**: String (Password)
- **Required**: Yes
- **Description**: Your API key for the OpenAI-compatible service

### Base URL
- **Type**: String
- **Required**: Yes
- **Default**: `https://api.openai.com`
- **Description**: Base URL for the OpenAI-compatible API endpoint

## Supported Services

### OpenAI
- **Base URL**: `https://api.openai.com`
- **API Key**: Your OpenAI API key from the OpenAI dashboard

### SiliconFlow
- **Base URL**: `https://api.siliconflow.cn`
- **API Key**: Your SiliconFlow API key
- **Models**: Supports various reranking models like `Qwen/Qwen3-Reranker-8B`

### Custom OpenAI-Compatible APIs
- **Base URL**: Your custom API endpoint (e.g., `https://your-api.example.com`)
- **API Key**: Your service-specific API key

## Setup Instructions

### For OpenAI
1. Sign up at [OpenAI](https://platform.openai.com/)
2. Navigate to API Keys section
3. Create a new API key
4. Copy the key and use it in the credentials

### For SiliconFlow
1. Sign up at [SiliconFlow](https://siliconflow.cn/)
2. Navigate to your dashboard
3. Generate an API key
4. Use `https://api.siliconflow.cn` as the Base URL

### For Custom Services
1. Obtain your API key from your service provider
2. Get the base URL for the API endpoint
3. Ensure the service implements OpenAI-compatible endpoints

## Security Best Practices

- **Never share your API keys** in public repositories or communications
- **Use environment variables** for API keys in production environments
- **Rotate keys regularly** as recommended by your service provider
- **Monitor usage** to detect any unauthorized access

## Testing Credentials

The credentials are automatically tested when saved by making a request to the `/v1/models` endpoint. A successful test indicates:
- The API key is valid
- The base URL is accessible
- The service is responding correctly

## Troubleshooting

### "Couldn't connect with these settings"
- **Check Base URL**: Ensure it's the correct endpoint without trailing paths
- **Verify API Key**: Make sure the key is copied correctly without extra spaces
- **Network Access**: Ensure n8n can reach the API endpoint
- **Service Status**: Check if the API service is operational

### "The resource you are requesting could not be found"
- **Incorrect Base URL**: Make sure you're using the base URL, not a specific endpoint
- **API Version**: Some services may use different API versions
- **Service Compatibility**: Verify the service implements OpenAI-compatible endpoints

### "Authentication failed"
- **Invalid API Key**: Double-check the API key is correct and active
- **Expired Key**: Some API keys may have expiration dates
- **Insufficient Permissions**: Ensure the key has access to the required endpoints

## Related Nodes

These credentials can be used with:
- [Reranker OpenAI](../nodes/rerankers/RerankerOpenAI/RerankerOpenAI.node.md)
- Any future OpenAI-compatible nodes

## API Reference

For detailed API documentation, refer to:
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- Your specific service provider's documentation
