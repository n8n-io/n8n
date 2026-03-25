# Axios Migration Guide

> **Migrating from Axios 0.x to 1.x**
> 
> This guide helps developers upgrade from Axios 0.x to 1.x by documenting breaking changes, providing migration strategies, and offering solutions to common upgrade challenges.

## Table of Contents

- [Overview](#overview)
- [Breaking Changes](#breaking-changes)
- [Error Handling Migration](#error-handling-migration)
- [API Changes](#api-changes)
- [Configuration Changes](#configuration-changes)
- [Migration Strategies](#migration-strategies)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)

## Overview

Axios 1.x introduced several breaking changes to improve consistency, security, and developer experience. While these changes provide better error handling and more predictable behavior, they require code updates when migrating from 0.x versions.

### Key Changes Summary

| Area | 0.x Behavior | 1.x Behavior | Impact |
|------|--------------|--------------|--------|
| Error Handling | Selective throwing | Consistent throwing | High |
| JSON Parsing | Lenient | Strict | Medium |
| Browser Support | IE11+ | Modern browsers | Low-Medium |
| TypeScript | Partial | Full support | Low |

### Migration Complexity

- **Simple applications**: 1-2 hours
- **Medium applications**: 1-2 days  
- **Large applications with complex error handling**: 3-5 days

## Breaking Changes

### 1. Error Handling Changes

**The most significant change in Axios 1.x is how errors are handled.**

#### 0.x Behavior
```javascript
// Axios 0.x - Some HTTP error codes didn't throw
axios.get('/api/data')
  .then(response => {
    // Response interceptor could handle all errors
    console.log('Success:', response.data);
  });

// Response interceptor handled everything
axios.interceptors.response.use(
  response => response,
  error => {
    handleError(error);
    // Error was "handled" and didn't propagate
  }
);
```

#### 1.x Behavior
```javascript
// Axios 1.x - All HTTP errors throw consistently
axios.get('/api/data')
  .then(response => {
    console.log('Success:', response.data);
  })
  .catch(error => {
    // Must handle errors at call site or they propagate
    console.error('Request failed:', error);
  });

// Response interceptor must re-throw or return rejected promise
axios.interceptors.response.use(
  response => response,
  error => {
    handleError(error);
    // Must explicitly handle propagation
    return Promise.reject(error); // or throw error;
  }
);
```

#### Impact
- **Response interceptors** can no longer "swallow" errors silently
- **Every API call** must handle errors explicitly or they become unhandled promise rejections
- **Centralized error handling** requires new patterns

### 2. JSON Parsing Changes

#### 0.x Behavior
```javascript
// Axios 0.x - Lenient JSON parsing
// Would attempt to parse even invalid JSON
response.data; // Might contain partial data or fallbacks
```

#### 1.x Behavior
```javascript
// Axios 1.x - Strict JSON parsing
// Throws clear errors for invalid JSON
try {
  const data = response.data;
} catch (error) {
  // Handle JSON parsing errors explicitly
}
```

### 3. Request/Response Transform Changes

#### 0.x Behavior
```javascript
// Implicit transformations with some edge cases
transformRequest: [function (data) {
  // Less predictable behavior
  return data;
}]
```

#### 1.x Behavior
```javascript
// More consistent transformation pipeline
transformRequest: [function (data, headers) {
  // Headers parameter always available
  // More predictable behavior
  return data;
}]
```

### 4. Browser Support Changes

- **0.x**: Supported IE11 and older browsers
- **1.x**: Requires modern browsers with Promise support
- **Polyfills**: May be needed for older browser support

## Error Handling Migration

The error handling changes are the most complex part of migrating to Axios 1.x. Here are proven strategies:

### Strategy 1: Centralized Error Handling with Error Boundary

```javascript
// Create a centralized error handler
class ApiErrorHandler {
  constructor() {
    this.setupInterceptors();
  }

  setupInterceptors() {
    axios.interceptors.response.use(
      response => response,
      error => {
        // Centralized error processing
        this.processError(error);
        
        // Return a resolved promise with error info for handled errors
        if (this.isHandledError(error)) {
          return Promise.resolve({
            data: null,
            error: this.normalizeError(error),
            handled: true
          });
        }
        
        // Re-throw unhandled errors
        return Promise.reject(error);
      }
    );
  }

  processError(error) {
    // Log errors
    console.error('API Error:', error);
    
    // Show user notifications
    if (error.response?.status === 401) {
      this.handleAuthError();
    } else if (error.response?.status >= 500) {
      this.showErrorNotification('Server error occurred');
    }
  }

  isHandledError(error) {
    // Define which errors are "handled" centrally
    const handledStatuses = [401, 403, 404, 422, 500, 502, 503];
    return handledStatuses.includes(error.response?.status);
  }

  normalizeError(error) {
    return {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      code: error.response?.data?.code || error.code
    };
  }

  handleAuthError() {
    // Redirect to login, clear tokens, etc.
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  showErrorNotification(message) {
    // Show user-friendly error message
    console.error(message); // Replace with your notification system
  }
}

// Initialize globally
const errorHandler = new ApiErrorHandler();

// Usage in components/services
async function fetchUserData(userId) {
  try {
    const response = await axios.get(`/api/users/${userId}`);
    
    // Check if error was handled centrally
    if (response.handled) {
      return { data: null, error: response.error };
    }
    
    return { data: response.data, error: null };
  } catch (error) {
    // Unhandled errors still need local handling
    return { data: null, error: { message: 'Unexpected error occurred' } };
  }
}
```

### Strategy 2: Wrapper Function Pattern

```javascript
// Create a wrapper that provides 0.x-like behavior
function createApiWrapper() {
  const api = axios.create();
  
  // Add response interceptor for centralized handling
  api.interceptors.response.use(
    response => response,
    error => {
      // Handle common errors centrally
      if (error.response?.status === 401) {
        // Handle auth errors
        handleAuthError();
      }
      
      if (error.response?.status >= 500) {
        // Handle server errors
        showServerErrorNotification();
      }
      
      // Always reject to maintain error propagation
      return Promise.reject(error);
    }
  );

  // Wrapper function that mimics 0.x behavior
  function safeRequest(requestConfig, options = {}) {
    return api(requestConfig)
      .then(response => response)
      .catch(error => {
        if (options.suppressErrors) {
          // Return error info instead of throwing
          return {
            data: null,
            error: {
              status: error.response?.status,
              message: error.response?.data?.message || error.message
            }
          };
        }
        throw error;
      });
  }

  return { safeRequest, axios: api };
}

// Usage
const { safeRequest } = createApiWrapper();

// For calls where you want centralized error handling
const result = await safeRequest(
  { method: 'get', url: '/api/data' },
  { suppressErrors: true }
);

if (result.error) {
  // Handle error case
  console.log('Request failed:', result.error.message);
} else {
  // Handle success case
  console.log('Data:', result.data);
}
```

### Strategy 3: Global Error Handler with Custom Events

```javascript
// Set up global error handling with events
class GlobalErrorHandler extends EventTarget {
  constructor() {
    super();
    this.setupInterceptors();
  }

  setupInterceptors() {
    axios.interceptors.response.use(
      response => response,
      error => {
        // Emit custom event for global handling
        this.dispatchEvent(new CustomEvent('apiError', {
          detail: { error, timestamp: new Date() }
        }));

        // Always reject to maintain proper error flow
        return Promise.reject(error);
      }
    );
  }
}

const globalErrorHandler = new GlobalErrorHandler();

// Set up global listeners
globalErrorHandler.addEventListener('apiError', (event) => {
  const { error } = event.detail;
  
  // Centralized error logic
  if (error.response?.status === 401) {
    handleAuthError();
  }
  
  if (error.response?.status >= 500) {
    showErrorNotification('Server error occurred');
  }
});

// Usage remains clean
async function apiCall() {
  try {
    const response = await axios.get('/api/data');
    return response.data;
  } catch (error) {
    // Error was already handled globally
    // Just handle component-specific logic
    return null;
  }
}
```

## API Changes

### Request Configuration

#### 0.x to 1.x Changes
```javascript
// 0.x - Some properties had different defaults
const config = {
  timeout: 0, // No timeout by default
  maxContentLength: -1, // No limit
};

// 1.x - More secure defaults
const config = {
  timeout: 0, // Still no timeout, but easier to configure
  maxContentLength: 2000, // Default limit for security
  maxBodyLength: 2000, // New property
};
```

### Response Object

The response object structure remains largely the same, but error responses are more consistent:

```javascript
// Both 0.x and 1.x
response = {
  data: {}, // Response body
  status: 200, // HTTP status
  statusText: 'OK', // HTTP status message  
  headers: {}, // Response headers
  config: {}, // Request config
  request: {} // Request object
};

// Error responses are more consistent in 1.x
error.response = {
  data: {}, // Error response body
  status: 404, // HTTP error status
  statusText: 'Not Found',
  headers: {},
  config: {},
  request: {}
};
```

## Configuration Changes

### Default Configuration Updates

```javascript
// 0.x defaults
axios.defaults.timeout = 0; // No timeout
axios.defaults.maxContentLength = -1; // No limit

// 1.x defaults (more secure)
axios.defaults.timeout = 0; // Still no timeout
axios.defaults.maxContentLength = 2000; // 2MB limit
axios.defaults.maxBodyLength = 2000; // 2MB limit
```

### Instance Configuration

```javascript
// 0.x - Instance creation
const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 1000,
});

// 1.x - Same API, but more options available
const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 1000,
  maxBodyLength: Infinity, // Override default if needed
  maxContentLength: Infinity,
});
```

## Migration Strategies

### Step-by-Step Migration Process

#### Phase 1: Preparation
1. **Audit Current Error Handling**
   ```bash
   # Find all axios usage
   grep -r "axios\." src/
   grep -r "\.catch" src/
   grep -r "interceptors" src/
   ```

2. **Identify Patterns**
   - Response interceptors that handle errors
   - Components that rely on centralized error handling
   - Authentication and retry logic

3. **Create Test Cases**
   ```javascript
   // Test current error handling behavior
   describe('Error Handling Migration', () => {
     it('should handle 401 errors consistently', async () => {
       // Test authentication error flows
     });
     
     it('should handle 500 errors with user feedback', async () => {
       // Test server error handling
     });
   });
   ```

#### Phase 2: Implementation
1. **Update Dependencies**
   ```bash
   npm update axios
   ```

2. **Implement New Error Handling**
   - Choose one of the strategies above
   - Update response interceptors
   - Add error handling to API calls

3. **Update Authentication Logic**
   ```javascript
   // 0.x pattern
   axios.interceptors.response.use(null, error => {
     if (error.response?.status === 401) {
       logout();
       // Error was "handled"
     }
   });

   // 1.x pattern
   axios.interceptors.response.use(
     response => response,
     error => {
       if (error.response?.status === 401) {
         logout();
       }
       return Promise.reject(error); // Always propagate
     }
   );
   ```

#### Phase 3: Testing and Validation
1. **Test Error Scenarios**
   - Network failures
   - HTTP error codes (401, 403, 404, 500, etc.)
   - Timeout errors
   - JSON parsing errors

2. **Validate User Experience**
   - Error messages are shown appropriately
   - Authentication redirects work
   - Loading states are handled correctly

### Gradual Migration Approach

For large applications, consider gradual migration:

```javascript
// Create a compatibility layer
const axiosCompat = {
  // Use new axios instance for new code
  v1: axios.create({
    // 1.x configuration
  }),
  
  // Wrapper for legacy code
  legacy: createLegacyWrapper(axios.create({
    // Configuration that mimics 0.x behavior
  }))
};

function createLegacyWrapper(axiosInstance) {
  // Add interceptors that provide 0.x-like behavior
  axiosInstance.interceptors.response.use(
    response => response,
    error => {
      // Handle errors in 0.x style for legacy code
      handleLegacyError(error);
      // Don't propagate certain errors
      if (shouldSuppressError(error)) {
        return Promise.resolve({ data: null, error: true });
      }
      return Promise.reject(error);
    }
  );
  
  return axiosInstance;
}
```

## Common Patterns

### Authentication Interceptors

#### Updated Authentication Pattern
```javascript
// Token refresh interceptor for 1.x
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Wait for token refresh
        return new Promise(resolve => {
          subscribeTokenRefresh(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(axios(originalRequest));
          });
        });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        const newToken = await refreshToken();
        onTokenRefreshed(newToken);
        isRefreshing = false;
        
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        logout();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

### Retry Logic

```javascript
// Retry interceptor for 1.x
function createRetryInterceptor(maxRetries = 3, retryDelay = 1000) {
  return axios.interceptors.response.use(
    response => response,
    async error => {
      const config = error.config;
      
      if (!config || !config.retry) {
        return Promise.reject(error);
      }
      
      config.__retryCount = config.__retryCount || 0;
      
      if (config.__retryCount >= maxRetries) {
        return Promise.reject(error);
      }
      
      config.__retryCount += 1;
      
      // Exponential backoff
      const delay = retryDelay * Math.pow(2, config.__retryCount - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return axios(config);
    }
  );
}

// Usage
const api = axios.create();
createRetryInterceptor(3, 1000);

// Make request with retry
api.get('/api/data', { retry: true });
```

### Loading State Management

```javascript
// Loading interceptor for 1.x
class LoadingManager {
  constructor() {
    this.requests = new Set();
    this.setupInterceptors();
  }
  
  setupInterceptors() {
    axios.interceptors.request.use(config => {
      this.requests.add(config);
      this.updateLoadingState();
      return config;
    });
    
    axios.interceptors.response.use(
      response => {
        this.requests.delete(response.config);
        this.updateLoadingState();
        return response;
      },
      error => {
        this.requests.delete(error.config);
        this.updateLoadingState();
        return Promise.reject(error);
      }
    );
  }
  
  updateLoadingState() {
    const isLoading = this.requests.size > 0;
    // Update your loading UI
    document.body.classList.toggle('loading', isLoading);
  }
}

const loadingManager = new LoadingManager();
```

## Troubleshooting

### Common Migration Issues

#### Issue 1: Unhandled Promise Rejections

**Problem:**
```javascript
// This pattern worked in 0.x but causes unhandled rejections in 1.x
axios.get('/api/data'); // No .catch() handler
```

**Solution:**
```javascript
// Always handle promises
axios.get('/api/data')
  .catch(error => {
    // Handle error appropriately
    console.error('Request failed:', error.message);
  });

// Or use async/await with try/catch
async function fetchData() {
  try {
    const response = await axios.get('/api/data');
    return response.data;
  } catch (error) {
    console.error('Request failed:', error.message);
    return null;
  }
}
```

#### Issue 2: Response Interceptors Not "Handling" Errors

**Problem:**
```javascript
// 0.x style - interceptor "handled" errors
axios.interceptors.response.use(null, error => {
  showErrorMessage(error.message);
  // Error was considered "handled"
});
```

**Solution:**
```javascript
// 1.x style - explicitly control error propagation
axios.interceptors.response.use(
  response => response,
  error => {
    showErrorMessage(error.message);
    
    // Choose whether to propagate the error
    if (shouldPropagateError(error)) {
      return Promise.reject(error);
    }
    
    // Return success-like response for "handled" errors
    return Promise.resolve({
      data: null,
      handled: true,
      error: normalizeError(error)
    });
  }
);
```

#### Issue 3: JSON Parsing Errors

**Problem:**
```javascript
// 1.x is stricter about JSON parsing
// This might throw where 0.x was lenient
const data = response.data;
```

**Solution:**
```javascript
// Add response transformer for better error handling
axios.defaults.transformResponse = [
  function (data) {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        // Handle JSON parsing errors gracefully
        console.warn('Invalid JSON response:', data);
        return { error: 'Invalid JSON', rawData: data };
      }
    }
    return data;
  }
];
```

#### Issue 4: TypeScript Errors After Upgrade

**Problem:**
```typescript
// TypeScript errors after upgrade
const response = await axios.get('/api/data');
// Property 'someProperty' does not exist on type 'any'
```

**Solution:**
```typescript
// Define proper interfaces
interface ApiResponse {
  data: any;
  message: string;
  success: boolean;
}

const response = await axios.get<ApiResponse>('/api/data');
// Now properly typed
console.log(response.data.data);
```

### Debug Migration Issues

#### Enable Debug Logging
```javascript
// Add request/response logging
axios.interceptors.request.use(config => {
  console.log('Request:', config);
  return config;
});

axios.interceptors.response.use(
  response => {
    console.log('Response:', response);
    return response;
  },
  error => {
    console.log('Error:', error);
    return Promise.reject(error);
  }
);
```

#### Compare Behavior
```javascript
// Create side-by-side comparison during migration
const axios0x = require('axios-0x'); // Keep old version for testing
const axios1x = require('axios');

async function compareRequests(config) {
  try {
    const [result0x, result1x] = await Promise.allSettled([
      axios0x(config),
      axios1x(config)
    ]);
    
    console.log('0.x result:', result0x);
    console.log('1.x result:', result1x);
  } catch (error) {
    console.log('Comparison error:', error);
  }
}
```

## Resources

### Official Documentation
- [Axios 1.x Documentation](https://axios-http.com/)
- [Axios GitHub Repository](https://github.com/axios/axios)
- [Axios Changelog](https://github.com/axios/axios/blob/main/CHANGELOG.md)

### Migration Tools
- [Axios Migration Codemod](https://github.com/axios/axios-migration-codemod) *(if available)*
- [ESLint Rules for Axios 1.x](https://github.com/axios/eslint-plugin-axios) *(if available)*

### Community Resources
- [Stack Overflow - Axios Migration Questions](https://stackoverflow.com/questions/tagged/axios+migration)
- [GitHub Discussions](https://github.com/axios/axios/discussions)
- [Axios Discord Community](https://discord.gg/axios) *(if available)*

### Related Issues
- [Error Handling Changes Discussion](https://github.com/axios/axios/issues/7208)
- [Migration Guide Request](https://github.com/axios/axios/issues/xxxx) *(link to related issues)*

---

## Need Help?

If you encounter issues during migration that aren't covered in this guide:

1. **Search existing issues** in the [Axios GitHub repository](https://github.com/axios/axios/issues)
2. **Ask questions** in [GitHub Discussions](https://github.com/axios/axios/discussions)
3. **Contribute improvements** to this migration guide

---

*This migration guide is maintained by the community. If you find errors or have suggestions, please [open an issue](https://github.com/axios/axios/issues) or submit a pull request.*