# Contributing to @n8n/workflow-json-sdk

Thank you for your interest in contributing to the n8n Workflow JSON SDK! This document provides guidelines and instructions for contributing to this package.

## Development Setup

1. **Prerequisites**
   - Node.js (version specified in `.nvmrc` or `package.json`)
   - pnpm (n8n uses pnpm workspaces)

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Build the Package**
   ```bash
   pnpm build
   ```

## Development Workflow

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode (useful during development)
pnpm test:dev
```

### Type Checking

Always run type checking before committing:

```bash
pnpm typecheck
```

### Linting

```bash
# Run linter
pnpm lint

# Auto-fix linting issues
pnpm lint:fix
```

### Formatting

```bash
# Check formatting
pnpm format:check

# Auto-format code
pnpm format
```

### Running Examples

```bash
# Run the basic workflow example
pnpm example:basic

# Run the AI agent workflow example
pnpm example:ai-agent

# Run the modify workflow example
pnpm example:modify
```

## Code Guidelines

### TypeScript Best Practices

1. **No `any` types** - Use proper types or `unknown` when the type is truly unknown
2. **Avoid type assertions (`as`)** - Use type guards or proper typing instead
3. **Export types** - All public interfaces and types should be exported
4. **Use strict mode** - The project uses strict TypeScript settings

### Code Style

- Follow the existing code style in the project
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and single-purpose

### Testing

- Write tests for all new features
- Ensure existing tests pass before submitting a PR
- Aim for high test coverage
- Use descriptive test names that explain what is being tested

Example test structure:
```typescript
describe('Feature Name', () => {
  it('should do something specific', () => {
    // Arrange
    const wf = workflow();

    // Act
    const result = wf.toJSON();

    // Assert
    expect(result).toBeDefined();
  });
});
```

## Adding New Features

When adding a new feature:

1. **Start with tests** - Write tests that define the expected behavior
2. **Implement the feature** - Write the minimum code to make tests pass
3. **Update documentation** - Add examples and API documentation in README.md
4. **Add an example** - Create a practical example in the `examples/` directory
5. **Run all checks** - Ensure tests, typecheck, and lint all pass

### Example: Adding a New Node Method

```typescript
// 1. Add the method to WorkflowNode class
class WorkflowNode {
  private _customField?: string;

  customField(value: string): this {
    this._customField = value;
    return this;
  }

  toJSON(): WorkflowNodeData {
    // ... existing code
    if (this._customField) node.customField = this._customField;
    return node;
  }
}

// 2. Add tests
it('should support custom field', () => {
  const wf = workflow();
  wf.node('Test')
    .type('n8n-nodes-base.test')
    .parameters({})
    .customField('value');

  const json = wf.toJSON();
  expect(json.nodes[0].customField).toBe('value');
});

// 3. Update README.md with usage example
```

## Pull Request Process

1. **Create a feature branch** from `master`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the guidelines above

3. **Commit your changes** with descriptive commit messages
   ```bash
   git commit -m "feat: add support for custom node fields"
   ```

4. **Run all checks**
   ```bash
   pnpm build
   pnpm test
   pnpm typecheck
   pnpm lint
   ```

5. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Use the PR template
   - Reference any related Linear tickets
   - Provide a clear description of changes
   - Include examples if applicable

## Commit Message Convention

Follow the conventional commits specification:

- `feat:` - A new feature
- `fix:` - A bug fix
- `docs:` - Documentation only changes
- `style:` - Code style changes (formatting, missing semicolons, etc.)
- `refactor:` - Code changes that neither fix a bug nor add a feature
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Changes to build process, dependencies, etc.

Examples:
```
feat: add support for workflow tags
fix: correct connection type handling
docs: update README with new examples
test: add tests for fromJSON function
```

## API Design Principles

When designing new APIs for this SDK:

1. **Fluent Interface** - Methods should be chainable where appropriate
2. **Type Safety** - Leverage TypeScript to catch errors at compile time
3. **Sensible Defaults** - Provide defaults for optional parameters
4. **Consistency** - Follow existing patterns in the codebase
5. **Simplicity** - Make common tasks simple, allow complex tasks to be possible

Example:
```typescript
// Good: Fluent, type-safe, with defaults
wf.node('My Node')
  .type('n8n-nodes-base.set')
  .parameters({})
  .position(100, 200); // chainable

// Good: Flexibility with optional parameters
wf.connection()
  .from(nodeA)
  .to(nodeB);

// Good: Both simple and detailed usage supported
wf.connection()
  .from({ node: nodeA, type: 'ai_tool', index: 0 })
  .to({ node: nodeB, type: 'ai_tool', index: 0 });
```

## Documentation

Good documentation includes:

1. **API Reference** - Document all public methods and types
2. **Examples** - Provide practical, real-world examples
3. **Type Definitions** - Export types for TypeScript users
4. **Migration Guides** - If introducing breaking changes

## Questions?

- Check the main n8n repository's CONTRIBUTING.md
- Ask in the n8n community forums
- Open a discussion on GitHub

Thank you for contributing to making n8n better! 🚀
