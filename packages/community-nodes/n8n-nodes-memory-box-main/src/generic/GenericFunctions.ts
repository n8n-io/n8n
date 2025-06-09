import {
  IExecuteFunctions,
  IHookFunctions,
  ILoadOptionsFunctions,
  IDataObject,
  IHttpRequestOptions,
  IHttpRequestMethods,
  NodeApiError,
} from 'n8n-workflow';

/**
 * Make an API request to Memory Box
 */
export async function memoryBoxApiRequest(
  this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
  method: IHttpRequestMethods,
  endpoint: string,
  body: IDataObject = {},
  qs: IDataObject = {},
  uri?: string,
) {
  const credentials = await this.getCredentials('memoryBoxApi');

  // Ensure the URL ends with a slash
  let apiUrl = credentials.apiUrl as string;
  if (!apiUrl.endsWith('/')) {
    apiUrl += '/';
  }

  // Build full API path
  const path = uri || `v2/${endpoint}`;
  const url = `${apiUrl}${path}`;

  const options: IHttpRequestOptions = {
    method,
    body,
    qs,
    url,
    json: true,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${credentials.token}`,
    },
  };

  try {
    return await this.helpers.httpRequest(options);
  } catch (error) {
    // Handle the error with proper typing
    const errorData = error as Error;
    throw new NodeApiError(this.getNode(), { message: errorData.message || 'Unknown error occurred' });
  }
}

/**
 * Format a date for Memory Box (YYYY-MM-DD)
 */
export function formatDateForMemoryBox(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

/**
 * Check if memory already has a date prefix, if not add it
 */
export function validateAndFormatMemory(text: string): string {
  // Check if memory already has a date prefix
  if (!text.match(/^\d{4}-\d{2}-\d{2}/)) {
    const today = new Date();
    const formattedDate = formatDateForMemoryBox(today);
    return `${formattedDate}\n\n${text}`;
  }
  return text;
}

/**
 * Extract memory items from Memory Box response
 */
export function extractItems(response: any): any[] {
  // Handle the new response format with items property
  if (response && typeof response === 'object' && response.items && Array.isArray(response.items)) {
    return response.items;
  }
  
  // Handle legacy array format
  if (Array.isArray(response)) {
    return response;
  }
  
  // Return empty array as fallback
  return [];
}
