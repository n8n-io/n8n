# Tool Design Best Practices for Multi-Agent Systems

## Overview

This document outlines comprehensive best practices for designing tools that work effectively within multi-agent systems. Tools are the primary interface between agents and external capabilities, making their design critical for system success.

## Core Principles

### 1. Single Responsibility Principle
Each tool should have a clear, focused purpose:
- **Do one thing well:** Avoid multi-purpose tools that try to solve many problems
- **Clear boundaries:** Well-defined input/output contracts
- **Predictable behavior:** Consistent results for similar inputs
- **Easy to understand:** Purpose should be obvious from name and description

### 2. Idempotency
Tools should produce consistent results:
- **Safe operations:** Read operations should never modify state
- **Repeatable operations:** Same input should yield same output (when possible)
- **State handling:** Clear semantics for state-modifying operations
- **Error recovery:** Failed operations should be safely retryable

### 3. Composability
Tools should work well together:
- **Standard interfaces:** Consistent input/output formats
- **Minimal assumptions:** Don't assume specific calling contexts
- **Chain-friendly:** Output of one tool can be input to another
- **Modular design:** Tools can be combined in different ways

### 4. Robustness
Tools should handle edge cases gracefully:
- **Input validation:** Comprehensive validation of all inputs
- **Error handling:** Graceful degradation on failures
- **Resource management:** Proper cleanup and resource management
- **Timeout handling:** Operations should have reasonable timeouts

## Input Schema Design

### Schema Structure
```json
{
  "type": "object",
  "properties": {
    "parameter_name": {
      "type": "string",
      "description": "Clear, specific description",
      "examples": ["example1", "example2"],
      "minLength": 1,
      "maxLength": 1000
    }
  },
  "required": ["parameter_name"],
  "additionalProperties": false
}
```

### Parameter Guidelines

#### Required vs Optional Parameters
- **Required parameters:** Essential for tool function
- **Optional parameters:** Provide additional control or customization
- **Default values:** Sensible defaults for optional parameters
- **Parameter groups:** Related parameters should be grouped logically

#### Parameter Types
- **Primitives:** string, number, boolean for simple values
- **Arrays:** For lists of similar items
- **Objects:** For complex structured data
- **Enums:** For fixed sets of valid values
- **Unions:** When multiple types are acceptable

#### Validation Rules
- **String validation:**
  - Length constraints (minLength, maxLength)
  - Pattern matching for formats (email, URL, etc.)
  - Character set restrictions
  - Content filtering for security

- **Numeric validation:**
  - Range constraints (minimum, maximum)
  - Multiple restrictions (multipleOf)
  - Precision requirements
  - Special value handling (NaN, infinity)

- **Array validation:**
  - Size constraints (minItems, maxItems)
  - Item type validation
  - Uniqueness requirements
  - Ordering requirements

- **Object validation:**
  - Required property enforcement
  - Additional property policies
  - Nested validation rules
  - Dependency validation

### Input Examples

#### Good Example:
```json
{
  "name": "search_web",
  "description": "Search the web for information",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search query string",
        "minLength": 1,
        "maxLength": 500,
        "examples": ["latest AI developments", "weather forecast"]
      },
      "limit": {
        "type": "integer",
        "description": "Maximum number of results to return",
        "minimum": 1,
        "maximum": 100,
        "default": 10
      },
      "language": {
        "type": "string",
        "description": "Language code for search results",
        "enum": ["en", "es", "fr", "de"],
        "default": "en"
      }
    },
    "required": ["query"],
    "additionalProperties": false
  }
}
```

#### Bad Example:
```json
{
  "name": "do_stuff",
  "description": "Does various operations",
  "parameters": {
    "type": "object",
    "properties": {
      "data": {
        "type": "string",
        "description": "Some data"
      }
    },
    "additionalProperties": true
  }
}
```

## Output Schema Design

### Response Structure
```json
{
  "success": true,
  "data": {
    // Actual response data
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "execution_time_ms": 234,
    "version": "1.0"
  },
  "warnings": [],
  "pagination": {
    "total": 100,
    "page": 1,
    "per_page": 10,
    "has_next": true
  }
}
```

### Data Consistency
- **Predictable structure:** Same structure regardless of success/failure
- **Type consistency:** Same data types across different calls
- **Null handling:** Clear semantics for missing/null values
- **Empty responses:** Consistent handling of empty result sets

### Metadata Inclusion
- **Execution time:** Performance monitoring
- **Timestamps:** Audit trails and debugging
- **Version information:** Compatibility tracking
- **Request identifiers:** Correlation and debugging

## Error Handling

### Error Response Structure
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "The provided query is too short",
    "details": {
      "field": "query",
      "provided_length": 0,
      "minimum_length": 1
    },
    "retry_after": null,
    "documentation_url": "https://docs.example.com/errors#INVALID_INPUT"
  },
  "request_id": "req_12345"
}
```

### Error Categories

#### Client Errors (4xx equivalent)
- **INVALID_INPUT:** Malformed or invalid parameters
- **MISSING_PARAMETER:** Required parameter not provided
- **VALIDATION_ERROR:** Parameter fails validation rules
- **AUTHENTICATION_ERROR:** Invalid or missing credentials
- **PERMISSION_ERROR:** Insufficient permissions
- **RATE_LIMIT_ERROR:** Too many requests

#### Server Errors (5xx equivalent)
- **INTERNAL_ERROR:** Unexpected server error
- **SERVICE_UNAVAILABLE:** Downstream service unavailable
- **TIMEOUT_ERROR:** Operation timed out
- **RESOURCE_EXHAUSTED:** Out of resources (memory, disk, etc.)
- **DEPENDENCY_ERROR:** External dependency failed

#### Tool-Specific Errors
- **DATA_NOT_FOUND:** Requested data doesn't exist
- **FORMAT_ERROR:** Data in unexpected format
- **PROCESSING_ERROR:** Error during data processing
- **CONFIGURATION_ERROR:** Tool misconfiguration

### Error Recovery Strategies

#### Retry Logic
```json
{
  "retry_policy": {
    "max_attempts": 3,
    "backoff_strategy": "exponential",
    "base_delay_ms": 1000,
    "max_delay_ms": 30000,
    "retryable_errors": [
      "TIMEOUT_ERROR",
      "SERVICE_UNAVAILABLE",
      "RATE_LIMIT_ERROR"
    ]
  }
}
```

#### Fallback Behaviors
- **Graceful degradation:** Partial results when possible
- **Alternative approaches:** Different methods to achieve same goal
- **Cached responses:** Return stale data if fresh data unavailable
- **Default responses:** Safe default when specific response impossible

## Security Considerations

### Input Sanitization
- **SQL injection prevention:** Parameterized queries
- **XSS prevention:** HTML encoding of outputs
- **Command injection prevention:** Input validation and sandboxing
- **Path traversal prevention:** Path validation and restrictions

### Authentication and Authorization
- **API key management:** Secure storage and rotation
- **Token validation:** JWT validation and expiration
- **Permission checking:** Role-based access control
- **Audit logging:** Security event logging

### Data Protection
- **PII handling:** Detection and protection of personal data
- **Encryption:** Data encryption in transit and at rest
- **Data retention:** Compliance with retention policies
- **Access logging:** Who accessed what data when

## Performance Optimization

### Response Time
- **Caching strategies:** Result caching for repeated requests
- **Connection pooling:** Reuse connections to external services
- **Async processing:** Non-blocking operations where possible
- **Resource optimization:** Efficient resource utilization

### Throughput
- **Batch operations:** Support for bulk operations
- **Parallel processing:** Concurrent execution where safe
- **Load balancing:** Distribute load across instances
- **Resource scaling:** Auto-scaling based on demand

### Resource Management
- **Memory usage:** Efficient memory allocation and cleanup
- **CPU optimization:** Avoid unnecessary computations
- **Network efficiency:** Minimize network round trips
- **Storage optimization:** Efficient data structures and storage

## Testing Strategies

### Unit Testing
```python
def test_search_web_valid_input():
    result = search_web("test query", limit=5)
    assert result["success"] is True
    assert len(result["data"]["results"]) <= 5

def test_search_web_invalid_input():
    result = search_web("", limit=5)
    assert result["success"] is False
    assert result["error"]["code"] == "INVALID_INPUT"
```

### Integration Testing
- **End-to-end workflows:** Complete user scenarios
- **External service mocking:** Mock external dependencies
- **Error simulation:** Simulate various error conditions
- **Performance testing:** Load and stress testing

### Contract Testing
- **Schema validation:** Validate against defined schemas
- **Backward compatibility:** Ensure changes don't break clients
- **API versioning:** Test multiple API versions
- **Consumer-driven contracts:** Test from consumer perspective

## Documentation

### Tool Documentation Template
```markdown
# Tool Name

## Description
Brief description of what the tool does.

## Parameters
### Required Parameters
- `parameter_name` (type): Description

### Optional Parameters
- `optional_param` (type, default: value): Description

## Response
Description of response format and data.

## Examples
### Basic Usage
Input:
```json
{
  "parameter_name": "value"
}
```

Output:
```json
{
  "success": true,
  "data": {...}
}
```

## Error Codes
- `ERROR_CODE`: Description of when this error occurs
```

### API Documentation
- **OpenAPI/Swagger specs:** Machine-readable API documentation
- **Interactive examples:** Runnable examples in documentation
- **Code samples:** Examples in multiple programming languages
- **Changelog:** Version history and breaking changes

## Versioning Strategy

### Semantic Versioning
- **Major version:** Breaking changes
- **Minor version:** New features, backward compatible
- **Patch version:** Bug fixes, no new features

### API Evolution
- **Deprecation policy:** How to deprecate old features
- **Migration guides:** Help users upgrade to new versions
- **Backward compatibility:** Support for old versions
- **Feature flags:** Gradual rollout of new features

## Monitoring and Observability

### Metrics Collection
- **Usage metrics:** Call frequency, success rates
- **Performance metrics:** Response times, throughput
- **Error metrics:** Error rates by type
- **Resource metrics:** CPU, memory, network usage

### Logging
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "tool_name": "search_web",
  "request_id": "req_12345",
  "agent_id": "agent_001",
  "input_hash": "abc123",
  "execution_time_ms": 234,
  "success": true,
  "error_code": null
}
```

### Alerting
- **Error rate thresholds:** Alert on high error rates
- **Performance degradation:** Alert on slow responses
- **Resource exhaustion:** Alert on resource limits
- **Service availability:** Alert on service downtime

## Common Anti-Patterns

### Tool Design Anti-Patterns
- **God tools:** Tools that try to do everything
- **Chatty tools:** Tools that require many calls for simple tasks
- **Stateful tools:** Tools that maintain state between calls
- **Inconsistent interfaces:** Tools with different conventions

### Error Handling Anti-Patterns
- **Silent failures:** Failing without proper error reporting
- **Generic errors:** Non-descriptive error messages
- **Inconsistent error formats:** Different error structures
- **No retry guidance:** Not indicating if operation is retryable

### Performance Anti-Patterns
- **Synchronous everything:** Not using async operations where appropriate
- **No caching:** Repeatedly fetching same data
- **Resource leaks:** Not properly cleaning up resources
- **Unbounded operations:** Operations that can run indefinitely

## Best Practices Checklist

### Design Phase
- [ ] Single, clear purpose
- [ ] Well-defined input/output contracts
- [ ] Comprehensive input validation
- [ ] Idempotent operations where possible
- [ ] Error handling strategy defined

### Implementation Phase
- [ ] Robust error handling
- [ ] Input sanitization
- [ ] Resource management
- [ ] Timeout handling
- [ ] Logging implementation

### Testing Phase
- [ ] Unit tests for all functionality
- [ ] Integration tests with dependencies
- [ ] Error condition testing
- [ ] Performance testing
- [ ] Security testing

### Documentation Phase
- [ ] Complete API documentation
- [ ] Usage examples
- [ ] Error code documentation
- [ ] Performance characteristics
- [ ] Security considerations

### Deployment Phase
- [ ] Monitoring setup
- [ ] Alerting configuration
- [ ] Performance baselines
- [ ] Security reviews
- [ ] Operational runbooks

## Conclusion

Well-designed tools are the foundation of effective multi-agent systems. They should be reliable, secure, performant, and easy to use. Following these best practices will result in tools that agents can effectively compose to solve complex problems while maintaining system reliability and security.