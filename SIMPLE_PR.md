Fix unexpected workflow cancellations

Workflows were getting cancelled without clear reasons, making debugging difficult.

Fixed:
- Added better error handling in active-executions.ts
- Improved logging to show why executions are cancelled
- Added source tracking for cancellations
- Enhanced cleanup error handling with proper type checking

Before:
```
Error during execution cleanup: [object Object]
```

After:
```
Stopping execution - Reason: Timeout after 300s (Source: System)
```

The fix helps users understand why their workflows are being cancelled and provides better debugging information.

Closes #19944