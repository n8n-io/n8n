# Expression System

> **⚠️ Notice**: This documentation was created by AI and not properly reviewed by the team yet.

## Overview

The n8n expression system enables dynamic data access and transformation within workflows. This document covers the expression parsing, evaluation, and the data proxy system that powers expressions like `{{ $json.field }}` and `{{ $node['HTTP Request'].json.data }}`.

## TODO: Document the Following

### Expression Engine

#### Expression Class
- **Location**: `/packages/workflow/src/expression.ts`
- **Core functionality**:
  - Expression parsing and tokenization
  - JavaScript evaluation in sandboxed environment
  - Error handling and reporting
  - Performance optimizations

#### Expression Syntax
- Basic expressions: `{{ $json.field }}`
- Complex expressions: `{{ $node['NodeName'].json.data[0].id }}`
- JavaScript expressions: `{{ new Date().toISOString() }}`
- Function calls: `{{ $now.format('YYYY-MM-DD') }}`

### Data Proxy System

#### WorkflowDataProxy
- **Location**: `/packages/workflow/src/workflow-data-proxy.ts`
- **Purpose**: Provides the magic variables ($json, $node, etc.)
- **Implementation**: Proxy-based data access
- **Security**: Sandboxing and access control

#### Available Variables
- `$json` - Current node's input data
- `$node` - Access to any node's output
- `$input` - Current node's input methods
- `$execution` - Execution metadata
- `$workflow` - Workflow metadata
- `$env` - Environment variables
- `$vars` - n8n variables
- `$now` - Current date/time
- `$today` - Today's date
- `$jmesPath` - JMESPath queries

### Security & Sandboxing

#### Code Execution Safety
- How expressions are sandboxed
- Prevented operations (file system, network, etc.)
- Resource limits
- Input sanitization

#### Access Control
- Environment variable access restrictions
- Credential data protection
- Workflow variable scoping

### Expression Evaluation Pipeline

1. **Parsing Phase**
   - Tokenization of expression string
   - Syntax validation
   - AST generation

2. **Resolution Phase**
   - Variable resolution
   - Data context building
   - Reference validation

3. **Evaluation Phase**
   - JavaScript execution
   - Result transformation
   - Error handling

### Performance Optimization

#### Caching Strategies
- Expression result caching
- Parsed expression caching
- Data proxy caching

#### Large Data Handling
- Lazy evaluation
- Memory management
- Streaming support

### Custom Functions and Extensions

#### Built-in Functions
- Date/time functions
- String manipulation
- Array operations
- Object utilities

#### Adding Custom Functions
- Extension points
- Registration mechanism
- Type safety

## Key Questions to Answer

1. How are expressions parsed and evaluated?
2. What security measures prevent malicious code execution?
3. How does the data proxy system work internally?
4. What are the performance implications of complex expressions?
5. How can custom functions be added to the expression system?
6. What are the limits on expression complexity?
7. How are circular references prevented?
8. How does expression evaluation work with large datasets?

## Related Documentation

- [Workflow Execution Engine](./workflow-execution-engine.md) - How expressions fit into execution
- [Data Flow](./data-flow.md) - Data transformation pipeline
- [Node Execution Contexts](./node-execution-contexts.md) - Expression availability per context

## Code Locations to Explore

- `/packages/workflow/src/expression.ts` - Main expression evaluator
- `/packages/workflow/src/workflow-data-proxy.ts` - Data proxy implementation
- `/packages/workflow/src/workflow-data-proxy-helpers.ts` - Helper functions
- `/packages/workflow/src/workflow-data-proxy-env-provider.ts` - Environment variable handling
- `/packages/workflow/src/expression-extensions/` - Built-in expression functions
- `/packages/core/src/expression-evaluator.ts` - Expression evaluation context