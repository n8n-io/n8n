# Authentication & Authorization

> **⚠️ Notice**: This documentation was created by AI and not properly reviewed by the team yet.

## Overview

n8n implements a comprehensive authentication and authorization system supporting multiple auth methods, role-based access control (RBAC), and project-based permissions. This document covers the auth flow, session management, and permission system.

## TODO: Document the Following

### Authentication Methods

#### Email/Password Authentication
- **Controller**: `/packages/cli/src/controllers/auth.controller.ts`
- **Service**: `/packages/cli/src/services/auth.service.ts`
- Password hashing (bcrypt)
- Account activation flow
- Password reset mechanism

#### JWT Token System
- Access token structure and claims
- Refresh token implementation
- Token rotation strategy
- Expiration and renewal
- Storage: cookies vs localStorage

#### External Authentication

##### LDAP Integration
- **Config**: LDAP connection settings
- **Sync**: User synchronization
- **Mapping**: Attribute mapping
- **Groups**: Role assignment

##### SAML/SSO
- **Location**: `/packages/cli/src/sso/`
- Identity provider integration
- Metadata exchange
- Assertion validation
- JIT provisioning

##### OAuth2
- Provider configuration
- Authorization flow
- Token exchange
- Profile mapping

### Session Management

#### Session Lifecycle
```
Login -> JWT Creation -> Cookie Setting -> Request Validation -> Refresh -> Logout
```

#### Cookie Security
- HttpOnly flags
- Secure flag (HTTPS)
- SameSite settings
- CSRF protection

#### Session Storage
- Redis session store (optional)
- In-memory fallback
- Session data structure
- Cleanup strategies

### Authorization System

#### RBAC Implementation
- **Package**: `@n8n/permissions`
- **Roles**: Owner, Admin, Member, User
- **Permissions**: Granular action control
- **Inheritance**: Role hierarchy

#### Permission Model

```typescript
interface Permission {
  resource: Resource;
  action: Action;
  scope?: Scope;
}

enum Resource {
  WORKFLOW = 'workflow',
  CREDENTIAL = 'credential',
  USER = 'user',
  // ...
}

enum Action {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',
  // ...
}
```

#### Project-Based Permissions
- **Entity**: ProjectRelation
- Team workspace isolation
- Resource sharing within projects
- Cross-project access

### Middleware Architecture

#### Authentication Middleware
- **Location**: `/packages/cli/src/middlewares/auth.ts`
- JWT validation
- User loading
- Route protection

#### Authorization Middleware
- Permission checking
- Resource ownership validation
- Scope verification
- Audit logging

### API Security

#### API Key Management
- **Entity**: ApiKey
- Key generation and storage
- Rate limiting per key
- Scope restrictions
- Rotation policy

#### Request Authentication Flow
1. Extract token/key from request
2. Validate authentication method
3. Load user context
4. Check permissions
5. Audit log access

### Multi-tenancy (Enterprise)

#### Tenant Isolation
- Data separation strategies
- Cross-tenant security
- Admin capabilities
- Audit requirements

#### License-based Features
- Feature flags by license
- User limits enforcement
- Advanced auth methods
- Compliance features

### Security Best Practices

#### Password Security
- Minimum requirements
- Complexity rules
- History tracking
- Breach detection

#### Token Security
- Secure generation
- Storage encryption
- Rotation policies
- Revocation mechanisms

#### Audit Logging
- Authentication events
- Authorization failures
- Permission changes
- Sensitive operations

### Frontend Integration

#### Auth State Management
- User store structure
- Permission caching
- Token refresh logic
- Logout handling

#### Route Guards
- Navigation protection
- Permission-based UI
- Dynamic menu generation
- Feature visibility

### Common Patterns

#### Permission Checking
```typescript
// Controller level
@RestController()
@Authorized()
class WorkflowController {
  @Get('/:id')
  @RequirePermission('workflow', 'read')
  async getWorkflow() {}
}

// Service level
if (!user.hasPermission('workflow', 'update', workflow)) {
  throw new ForbiddenError();
}
```

#### Custom Auth Providers
- Provider interface
- Registration process
- User mapping
- Error handling

## Key Questions to Answer

1. How does JWT refresh token rotation work?
2. What's the permission inheritance model?
3. How are API keys different from user tokens?
4. How does project-based isolation work?
5. What audit events are logged?
6. How is CSRF protection implemented?
7. What's the SSO user provisioning flow?
8. How are permissions cached and invalidated?

## Related Documentation

- [Database Architecture](./database-architecture.md) - User and permission entities
- [API Architecture](./api-architecture.md) - Protected endpoints
- [Frontend State Management](./frontend-state-management.md) - Auth state

## Code Locations to Explore

- `/packages/cli/src/controllers/auth.controller.ts` - Auth endpoints
- `/packages/cli/src/services/auth.service.ts` - Auth business logic
- `/packages/cli/src/middlewares/auth.ts` - Auth middleware
- `/packages/@n8n/permissions/src/` - Permission system
- `/packages/cli/src/sso/` - SSO implementations
- `/packages/cli/src/rbac/` - Role definitions
