# MCP Tool Design Patterns

## Tool Naming Conventions

### Action-Oriented Names
```typescript
// ✅ Good: verb_noun format
"get_user"           // Read operation
"create_document"    // Create operation
"update_settings"    // Update operation
"delete_item"        // Delete operation
"search_products"    // Search operation
"analyze_sentiment"  // Analysis operation
"validate_schema"    // Validation operation

// ❌ Bad: Vague or generic
"process"            // What does it process?
"handle"             // Handle what?
"data"               // Not a verb
"user_stuff"         // Informal
```

### Consistent Prefixes
```typescript
// CRUD operations
"create_*", "get_*", "list_*", "update_*", "delete_*"

// Bulk operations
"batch_create_*", "bulk_update_*"

// Search/filter
"search_*", "find_*", "filter_*"

// Analysis
"analyze_*", "compute_*", "calculate_*"

// Validation
"validate_*", "check_*", "verify_*"
```

## Input Schema Patterns

### Basic Types with Constraints
```typescript
{
  type: "object",
  properties: {
    // String with length and pattern
    username: {
      type: "string",
      minLength: 3,
      maxLength: 50,
      pattern: "^[a-zA-Z0-9_-]+$",
      description: "Username (alphanumeric, underscore, hyphen)"
    },

    // Number with range
    age: {
      type: "integer",
      minimum: 0,
      maximum: 150,
      description: "User age in years"
    },

    // Enum for fixed options
    status: {
      type: "string",
      enum: ["active", "inactive", "pending"],
      description: "Account status"
    },

    // Array with item constraints
    tags: {
      type: "array",
      items: { type: "string", maxLength: 50 },
      maxItems: 10,
      uniqueItems: true,
      description: "Tags for categorization"
    },

    // Boolean with default
    sendNotification: {
      type: "boolean",
      default: true,
      description: "Whether to send notification"
    }
  },
  required: ["username"],
  additionalProperties: false
}
```

### Complex Object Schemas
```typescript
{
  type: "object",
  properties: {
    filter: {
      type: "object",
      properties: {
        dateRange: {
          type: "object",
          properties: {
            start: { type: "string", format: "date-time" },
            end: { type: "string", format: "date-time" }
          },
          required: ["start", "end"]
        },
        status: {
          type: "array",
          items: { type: "string", enum: ["open", "closed", "pending"] }
        },
        assignee: { type: "string" }
      }
    },
    pagination: {
      type: "object",
      properties: {
        page: { type: "integer", minimum: 1, default: 1 },
        pageSize: { type: "integer", minimum: 1, maximum: 100, default: 20 }
      }
    },
    sort: {
      type: "object",
      properties: {
        field: { type: "string", enum: ["created", "updated", "priority"] },
        direction: { type: "string", enum: ["asc", "desc"], default: "desc" }
      }
    }
  }
}
```

### Optional vs Required Fields
```typescript
// Make required fields explicit
{
  required: ["userId", "action"],  // Must be provided
  properties: {
    userId: { type: "string" },      // Required
    action: { type: "string" },      // Required
    reason: { type: "string" },      // Optional
    notify: { type: "boolean", default: false }  // Optional with default
  }
}
```

## Output Format Patterns

### Consistent Success Response
```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  metadata?: {
    requestId: string;
    timestamp: string;
    duration: number;
  };
}

// Example
{
  success: true,
  data: {
    user: {
      id: "123",
      name: "John",
      email: "john@example.com"
    }
  },
  metadata: {
    requestId: "req-abc123",
    timestamp: "2024-01-15T10:30:00Z",
    duration: 45
  }
}
```

### Consistent Error Response
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    requestId: string;
    timestamp: string;
  };
}

// Example
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid input parameters",
    details: {
      field: "email",
      issue: "Invalid email format"
    }
  },
  metadata: {
    requestId: "req-xyz789",
    timestamp: "2024-01-15T10:30:00Z"
  }
}
```

### List Response with Pagination
```typescript
interface ListResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Example
{
  success: true,
  data: [
    { id: "1", name: "Item 1" },
    { id: "2", name: "Item 2" }
  ],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 157,
    totalPages: 8,
    hasNext: true,
    hasPrevious: false
  }
}
```

## Tool Description Best Practices

### Good Descriptions
```typescript
{
  name: "search_documents",
  description: `Search documents by content, metadata, or full-text query.

Supports:
- Full-text search across document content
- Filtering by date range, author, tags
- Pagination and sorting

Returns matching documents with relevance scores.

Example: Search for "quarterly report" in finance documents from 2024.`,

  inputSchema: { /* ... */ }
}
```

### Document Edge Cases
```typescript
{
  name: "delete_user",
  description: `Permanently delete a user and all associated data.

WARNING: This action is irreversible.

What gets deleted:
- User profile
- All user documents
- Activity history
- Preferences

What is preserved:
- Audit logs (for compliance)
- Shared documents owned by others

Requires: admin role or user deleting own account.`,

  inputSchema: { /* ... */ }
}
```

## Tool Grouping Strategies

### By Domain
```typescript
// User management tools
"user_create", "user_get", "user_update", "user_delete", "user_list"

// Document tools
"document_create", "document_get", "document_search", "document_delete"

// Analytics tools
"analytics_get_summary", "analytics_get_trends", "analytics_export"
```

### By Operation Type
```typescript
// Read-only tools (safe)
"get_*", "list_*", "search_*", "count_*"

// Write tools (mutating)
"create_*", "update_*", "delete_*"

// Dangerous tools (require extra confirmation)
"admin_*", "bulk_delete_*", "purge_*"
```

## Idempotency Patterns

### Idempotent Operations
```typescript
// GET operations are naturally idempotent
async function getUser(userId: string) {
  return db.users.findById(userId);
}

// PUT/UPDATE can be idempotent with version checks
async function updateUser(userId: string, data: UserData, version: number) {
  const result = await db.users.updateOne(
    { _id: userId, version },
    { $set: { ...data, version: version + 1 } }
  );

  if (result.modifiedCount === 0) {
    throw new Error("Version conflict - retry with latest version");
  }
}

// DELETE is idempotent (deleting non-existent is OK)
async function deleteUser(userId: string) {
  await db.users.deleteOne({ _id: userId });
  return { deleted: true };  // Same result even if already deleted
}
```

### Idempotency Keys for POST
```typescript
const processedRequests = new Map<string, unknown>();

async function createOrder(
  idempotencyKey: string,
  orderData: OrderData
): Promise<Order> {
  // Check if already processed
  if (processedRequests.has(idempotencyKey)) {
    return processedRequests.get(idempotencyKey) as Order;
  }

  // Process the order
  const order = await db.orders.create(orderData);

  // Cache result
  processedRequests.set(idempotencyKey, order);

  // Cleanup old keys after 24 hours
  setTimeout(() => processedRequests.delete(idempotencyKey), 86400000);

  return order;
}
```

## Batch Operation Patterns

### Batch with Individual Results
```typescript
interface BatchResult<T> {
  success: true;
  results: Array<{
    id: string;
    status: "success" | "error";
    data?: T;
    error?: string;
  }>;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

// Example response
{
  success: true,
  results: [
    { id: "1", status: "success", data: { /* ... */ } },
    { id: "2", status: "error", error: "Not found" },
    { id: "3", status: "success", data: { /* ... */ } }
  ],
  summary: {
    total: 3,
    succeeded: 2,
    failed: 1
  }
}
```

### Batch with Atomic Rollback
```typescript
async function batchCreateWithRollback(items: Item[]): Promise<BatchResult> {
  const session = await db.startSession();
  session.startTransaction();

  try {
    const results = [];
    for (const item of items) {
      const created = await db.items.create([item], { session });
      results.push(created[0]);
    }

    await session.commitTransaction();
    return { success: true, data: results };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

## Progress Reporting for Long Operations

### Streaming Progress
```typescript
{
  name: "process_large_file",
  description: "Process a large file with progress updates",
  inputSchema: {
    type: "object",
    properties: {
      fileId: { type: "string" },
      includeProgress: { type: "boolean", default: true }
    }
  }
}

// Response with progress
{
  success: true,
  data: {
    status: "processing",
    progress: {
      current: 45000,
      total: 100000,
      percentage: 45,
      estimatedTimeRemaining: "2 minutes"
    }
  }
}
```

### Job-Based Pattern
```typescript
// Start job
{
  name: "start_export_job",
  description: "Start an async export job",
}
// Returns: { jobId: "job-123" }

// Check status
{
  name: "get_job_status",
  description: "Check status of an async job",
}
// Returns: { jobId: "job-123", status: "running", progress: 75 }

// Get result
{
  name: "get_job_result",
  description: "Get result of completed job",
}
// Returns: { jobId: "job-123", status: "completed", result: { ... } }
```
