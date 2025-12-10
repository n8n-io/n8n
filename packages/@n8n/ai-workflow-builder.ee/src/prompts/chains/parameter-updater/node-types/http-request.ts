export const HTTP_REQUEST_GUIDE = `
### HTTP Request Node Updates

#### IMPORTANT - Credential Security

**NEVER hardcode credentials** (API keys, tokens, passwords, secrets) in the HTTP Request node parameters.
Instead, ALWAYS use n8n's built-in credential system:

1. Set \`authentication\` to \`"genericCredentialType"\`
2. Set \`genericAuthType\` to the appropriate credential type:
   - \`"httpHeaderAuth"\` - For API keys sent in headers (X-API-Key, Authorization, etc.)
   - \`"httpBearerAuth"\` - For Bearer token authentication
   - \`"httpQueryAuth"\` - For API keys sent as query parameters
   - \`"httpBasicAuth"\` - For username/password authentication
   - \`"oAuth2Api"\` - For OAuth 2.0 authentication

**DO NOT:**
- Put API keys or tokens directly in header values
- Store credentials in Set nodes and reference them with expressions
- Hardcode Bearer tokens in Authorization headers

**DO:**
- Use the authentication parameter with the appropriate credential type
- Let users configure their credentials securely in n8n's credential manager

#### Common Parameters
- **url**: The endpoint URL (can use expressions)
- **method**: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- **authentication**: Type of auth (none, genericCredentialType, etc.)
- **sendHeaders**: Boolean to enable custom headers
- **headerParameters**: Array of header key-value pairs
- **sendBody**: Boolean to enable request body (for POST/PUT/PATCH)
- **bodyParameters**: Array of body parameters or raw body content
- **contentType**: json, form, raw, etc.
- **options**: Additional options like timeout, proxy, etc.

#### Header Structure
{
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "Header-Name",
        "value": "Header Value or {{ expression }}"
      }
    ]
  }
}

#### Body Structure (JSON)
{
  "sendBody": true,
  "contentType": "json",
  "bodyParameters": {
    "parameters": [
      {
        "name": "fieldName",
        "value": "fieldValue or {{ expression }}"
      }
    ]
  }
}

#### Authentication Options
- **none**: No authentication
- **genericCredentialType**: Use stored credentials
- **predefinedCredentialType**: Use specific credential type
- Can also set custom auth headers

#### Common Patterns
1. **Adding API Key Header**:
   - Enable sendHeaders
   - Add header with name "X-API-Key" or "Authorization"

2. **Setting Request Body**:
   - Enable sendBody
   - Set contentType (usually "json")
   - Add parameters to bodyParameters.parameters array

3. **Dynamic URLs**:
   - Can use expressions: "=https://api.example.com/{{ $('Set').item.json.endpoint }}"
   - Can reference previous node data

4. **Query Parameters**:
   - Can be part of URL or set in options.queryParameters

#### Example: HTTP Request with Authentication and Body
Current Parameters:
{
  "method": "GET",
  "url": "https://api.example.com/data"
}

Requested Changes:
- Change to POST method
- Add API key authentication (using n8n credentials)
- Add JSON body with user ID and status

Expected Output:
{
  "method": "POST",
  "url": "https://api.example.com/data",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  },
  "sendBody": true,
  "contentType": "json",
  "bodyParameters": {
    "parameters": [
      {
        "name": "userId",
        "value": "={{ $('Previous Node').item.json.id }}"
      },
      {
        "name": "status",
        "value": "active"
      }
    ]
  },
  "options": {}
}

Note: The API key is handled by the httpHeaderAuth credential, NOT hardcoded in the header parameters.
The user will configure their API key securely in n8n's credential manager.`;
