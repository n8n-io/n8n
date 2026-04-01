# Coding Conventions

**Analysis Date:** 2026-04-01

## Naming Patterns

**Files:**
- Backend services: kebab-case with `.service` suffix (e.g., `oauth.service.ts`, `test-runner.service.ee.ts`)
- Backend controllers: kebab-case with `.controller` suffix (e.g., `test-runs.controller.ee.ts`)
- Frontend composables: camelCase with `use` prefix (e.g., `useKeybindings.ts`, `useIntersectionObserver.ts`)
- Vue components: PascalCase (e.g., `CanvasPage.ts` for page objects in Playwright)
- Test files: same name as source file with `.test.ts`, `.spec.ts`, or `__tests__/` directory suffix
- Enterprise Edition files: `.ee` suffix in filename (e.g., `test-runs.controller.ee.ts`, `test-runner.service.ee.ts`)

**Functions:**
- camelCase for all functions and methods
- Private methods prefixed with `_` or use `private` keyword in classes
- Async functions use `async` keyword explicitly

**Variables:**
- camelCase for variable declarations
- UPPER_SNAKE_CASE for constants (e.g., `MAX_CSRF_AGE`, `WORKFLOWS_DIR`)
- Ref/ref-like values: descriptive camelCase (e.g., `layoutMap`, `mockCallback`, `mockUser`)

**Types:**
- PascalCase for interfaces and types
- Type names may use `T` suffix optionally (e.g., `type KeyMap`, `type WorkflowConfigItem`)
- Generic types: descriptive names (e.g., `jest.Mocked<T>`, `jest.Mock<T>`)
- Discriminated unions for complex types (e.g., `KeyboardEventHandler` = function | object with `disabled` and `run`)

## Code Style

**Formatting:**
- Prettier with tabs (tabWidth: 2)
- Line length: 100 characters
- Semicolons: required
- Trailing commas: all
- Single quotes: yes
- Arrow function parentheses: always

**Linting:**
- ESLint with shared n8n configs (`@n8n/eslint-config/node`, `@n8n/eslint-config/frontend`)
- Custom n8n rules for backend module patterns and imports
- Many rules run as warnings to allow incremental cleanup (not blockers)
- Filename casing enforced: `kebab-case` for backend files

**Type Safety:**
- NEVER use `any` type - use proper types or `unknown`
- Avoid `as` type assertions - use type guards with `instanceof` or narrow types naturally
- Exception: `as` is acceptable in test code (e.g., test fixtures)
- Type casts in tests use `.mock<T>()` or `jest.Mocked<T>` for typed mocks

## Import Organization

**Order:**
1. Node.js built-ins (e.g., `crypto`, `child_process`)
2. Third-party packages (e.g., `express`, `axios`, `vue`)
3. Type imports from third-party (e.g., `type { Response }`)
4. Monorepo packages with `@n8n` scope
5. Local absolute imports with `@/` prefix (path-aliased)
6. Relative imports (avoided when possible)

**Path Aliases:**
- `@/` = `src/` (for backend)
- `@/` = `src/` (for frontend)
- `@n8n/` = n8n-scoped packages from monorepo (e.g., `@n8n/db`, `@n8n/di`, `@n8n/backend-common`)
- `n8n-workflow`, `n8n-core` = public npm packages

**Example:**
```typescript
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { AuthenticatedRequest, CredentialsEntity } from '@n8n/db';
import { CredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Response } from 'express';
import { UnexpectedError } from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { AuthError } from '@/errors/response-errors/auth.error';
import { validateOAuthUrl } from '@/oauth/validate-oauth-url';
```

## Error Handling

**Error Types:**
- Use `UnexpectedError`, `OperationalError`, `UserError` from `n8n-workflow` for workflow-related errors
- Use `ApplicationError` and response-specific errors in backend (e.g., `NotFoundError`, `ConflictError`, `AuthError` from `@/errors/response-errors/`)
- DO NOT use deprecated `ApplicationError` in CLI and nodes
- Import error classes: `import { NotFoundError } from '@/errors/response-errors/not-found.error';`

**Patterns:**
- Use `instanceof` checks for error type discrimination (e.g., `if (error instanceof UnexpectedError)`)
- Include context in error construction: `throw new NotFoundError('Workflow not found');`
- Chain errors with context object: `new UnexpectedError('Error message', { cause: originalError })`
- Log errors with structured context: `this.logger.error('Error occurred', { error, userId, workflowId })`

## Logging

**Framework:** Logger from `@n8n/backend-common` (injected via dependency injection)

**Patterns:**
- Inject `Logger` in constructor: `constructor(private readonly logger: Logger) {}`
- Use log levels: `debug()`, `info()`, `warn()`, `error()`
- Pass structured context as second argument: `this.logger.debug('Event name', { key: value })`
- No console.log in production code
- Frontend may use `console` for development but avoid in shipped code

**Example:**
```typescript
this.logger.debug('Starting new test run', { workflowId });
this.logger.error('Test case execution failed', { error: e.message, testCaseId });
```

## Comments

**When to Comment:**
- Explain WHY, not WHAT - code explains the what
- Business logic that isn't obvious from code alone
- Non-obvious algorithm choices
- Links to external specs or RFCs (e.g., `// RFC 9728 OAuth discovery`)
- Security considerations that aren't reflected in code

**JSDoc/TSDoc:**
- Use for public APIs and exported functions
- Document parameters with `@param`, return type with `@returns`
- Include `@example` blocks for complex usage
- Use for composable hooks and service methods
- Avoid over-documenting obvious accessor methods

**Example:**
```typescript
/**
 * Binds a `keydown` event to `document` and calls the appropriate
 * handlers based on the given `keymap`. The keymap is a map from
 * shortcut strings to handlers. The shortcut strings can contain
 * multiple shortcuts separated by `|`.
 *
 * @example
 * ```ts
 * {
 *   'ctrl+a': () => console.log('ctrl+a'),
 *   'ctrl+b|ctrl+c': () => console.log('ctrl+b or ctrl+c'),
 * }
 * ```
 */
export const useKeybindings = (keymap: MaybeRefOrGetter<KeyMap>) => { ... }
```

## Function Design

**Size:** Keep functions focused and single-purpose. Large functions (>50 lines) are decomposed into smaller helpers.

**Parameters:**
- Prefer named parameters in objects for 2+ parameters
- Use readonly modifiers on parameter objects when not modified
- Type parameters explicitly - avoid implicit `any`
- Use optional parameters with `?` for optional fields

**Return Values:**
- Explicit return type annotations on all functions
- Return structured objects for multiple values
- Use union types for conditional returns (e.g., `Promise<T | null>`)
- Async functions always return `Promise<T>`

**Example:**
```typescript
private async assertUserHasAccessToWorkflow(workflowId: string, user: User): Promise<void> {
  const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
    'workflow:read',
  ]);

  if (!workflow) {
    throw new NotFoundError('Workflow not found');
  }
}
```

## Module Design

**Exports:**
- Named exports preferred for functions, types, interfaces
- Default exports only for classes (services, controllers, etc.)
- Re-export related types from main index files
- Use `export type` for type-only exports to improve tree-shaking

**Barrel Files:**
- `index.ts` files export public API from directories
- Include types, interfaces, functions, but not internal utilities
- Path aliases resolve through barrel files

**Example:**
```typescript
// services/index.ts
export { CredentialsFinderService } from './credentials-finder.service';
export { CredentialsHelper } from './credentials-helper';
export type { ICredentialDataDecryptedObject } from './types';
```

## Dependency Injection

**Pattern:** Constructor injection with `@n8n/di` Service decorator

**Example:**
```typescript
@Service()
export class OauthService {
  constructor(
    private readonly logger: Logger,
    private readonly credentialsHelper: CredentialsHelper,
    private readonly credentialsRepository: CredentialsRepository,
  ) {}
}
```

## Frontend Specific Conventions

**Vue Composables:**
- Start with `use` prefix (e.g., `useKeybindings`, `useIntersectionObserver`)
- Export composable function as default or named export
- Return object with state (refs) and methods
- Use `onScopeDispose` for cleanup instead of `onUnmounted`
- Type composable return values explicitly

**Pinia Stores:**
- Define in `src/app/stores/` directory
- Use `.store.ts` suffix (e.g., `workflowDocument.store.ts`)
- Export store function for setup (not default)
- Define types in corresponding `.types.ts` file

**CSS/Styling:**
- Use CSS variables from `--color-*`, `--spacing-*`, `--font-*` tokens
- NEVER hardcode pixel values for spacing
- Use `var()` for color, spacing, typography references
- See `packages/frontend/AGENTS.md` for complete variable reference

---

*Convention analysis: 2026-04-01*
