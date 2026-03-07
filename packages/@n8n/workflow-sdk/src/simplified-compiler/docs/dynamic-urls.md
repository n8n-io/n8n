# Dynamic URL Expressions (BinaryExpression URLs)

When an HTTP call URL is a string concatenation (e.g., `'https://api.com/posts/' + created.id`), the compiler resolves it to an n8n expression: `={{ 'https://api.com/posts/' + $('POST api.com/posts').first().json.id }}`.

## Compiler Side (`compiler.ts`)
- **`resolveUrlExpression(node, ctx)`**: Recursively walks a `BinaryExpression` AST node (operator `+`). For each operand:
  - `Literal` -> wrap in quotes (`'value'`)
  - `Identifier`/`MemberExpression` -> use `resolveExpressionFromAST()`, strip `={{ }}` wrapper for bare expression
  - `BinaryExpression` -> recurse
  - Returns `={{ left + right }}` (n8n expression)
- **`urlAstNode` on `IOCall`**: When `extractStringLiteral()` returns `undefined` and the URL argument is a `BinaryExpression`, the raw AST node is stored on the IOCall. Resolution happens lazily in `generateHttpSDK()` (not during extraction) -- this is critical because `flushPendingCode()` must run first to populate `varSourceMap` with variables declared in preceding Code nodes.
- **Key timing insight**: `extractIOCall()` runs before `processIOCall()` (which calls `flushPendingCode()`). If URL resolution happened during extraction, variables from pending code wouldn't be in `varSourceMap` yet. Lazy resolution in `generateHttpSDK()` (called after `flushPendingCode`) ensures all variables are available.

## Decompiler Side (`simplified-generator.ts`)
- **`resolveUrlArg(url, ctx)`**: Detects expression URLs (starts with `={{`), splits on top-level `+`, resolves `$('NodeName')` references back to variable names via `resolveExpression()`.
- **`splitOnPlus(expr)`**: Splits an expression string on `+` operators while respecting quotes and parentheses depth.
- Used in `emitHttpNode()` instead of plain `'${url}'` quoting.

## Node Naming
When the URL is an expression (starts with `={{`), `extractHttpCall()` generates the node name as `${METHOD} Request` (e.g., `GET Request`) since the URL can't be parsed as a static URL for hostname extraction.
