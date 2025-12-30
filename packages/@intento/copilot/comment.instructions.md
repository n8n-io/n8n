# GitHub Copilot Instructions — TypeScript Commenting

**Model**: Claude Sonnet 4.5
**Applies to**: **/*.{ts,tsx}
**Works with**: `review.instructions.md` for code review workflow

## Purpose

Create minimal, high-signal comments that help Copilot reviewers catch bugs and help developers use code correctly. Comments should provide context that enables faster, more accurate code review and prevent incorrect API usage.

**Core Philosophy:**
> "Code tells you how, comments tell you why." — Jeff Atwood

### Comments That Help Reviewers

Good comments enable reviewers to:
- Quickly understand non-obvious constraints and invariants
- Identify when business logic is correctly implemented
- Spot edge cases that need validation
- Verify error handling matches requirements
- Assess whether API contracts are maintained

### Comments That Help Developers

Good comments enable developers to:
- Use APIs correctly without reading implementation
- Understand valid input ranges and constraints
- Know which errors to handle and when
- Recognize performance characteristics (O(n), async, blocking)
- Follow intended usage patterns and avoid antipatterns

### What NOT to Comment

- Information already in TypeScript types or code structure
- Mechanics of how code works (let code speak)
- Excuses for unclear code (refactor instead)
- Decorative elements without information value

## Workflow

### Decision Tree: To Comment or Not?

Execute these checks **in order** before adding any comment:

**1. Can the code be clearer?**
- Refactor first: better naming, extract function, simplify logic
- If YES → Refactor, then reassess
- If NO → Continue to step 2

**2. Does this help reviewers catch bugs?**
- Invariants that must hold: `// NOTE: items must be sorted before binary search`
- Non-obvious validation rules: `// NOTE: maxAttempts capped at 50 to prevent infinite loops`
- Error recovery strategy: `// NOTE: Retry with exponential backoff, max 5 attempts`
- If YES → Add comment, DONE
- If NO → Continue to step 3

**3. Will developers misuse this without documentation?**
- Valid ranges not in types: `@param timeout - Must be 1000-600000ms`
- Required call sequences: `// NOTE: Call init() before execute()`
- Performance implications: `// O(n²) - use only for small datasets (n < 100)`
- If YES → Add comment, DONE
- If NO → Continue to step 4

**4. Is this a workaround or edge case?**
- External system bugs: `// WORKAROUND: API returns null for empty, not []`
- Browser quirks: `// NOTE: Chrome requires explicit Promise.resolve() here`
- Unexpected behavior: `// NOTE: JSONTokener.nextValue() may return value equals() to null`
- If YES → Add comment with external link if available, DONE
- If NO → **Skip comment** (would be noise)

## Comment Types

### TSDoc for Public APIs

**Required for**: All exported functions, classes, interfaces, types, enums

**Purpose**: Enable correct usage without reading implementation + help reviewers verify API contracts

**Minimal structure** (omit tags that add no value):
```typescript
/**
 * One-sentence summary of WHAT + WHY (not HOW).
 *
 * @param name - Add ONLY if: constraints, valid ranges, special values not in type
 * @returns - Add ONLY if: semantic meaning, side effects, or conditions affect return value
 * @throws - Add ONLY if: callers should handle this error (not internal bugs)
 */
```

**Critical guidelines for reviewers:**

1. **Constraints and validation rules** (helps reviewers verify boundaries):
   ```typescript
   /**
    * Creates abort signal with timeout, optionally chained to parent signal.
    *
    * @param timeout - Must be 1000-600000ms to prevent premature/infinite waits
    * @param parent - Optional parent signal for cancellation chain
    * @throws AbortError if parent signal already aborted
    */
   ```

2. **Business logic and invariants** (helps reviewers verify correctness):
   ```typescript
   /**
    * Calculates retry delay using exponential backoff with jitter.
    *
    * Base delay scaled so exponential growth reaches maxDelayMs at final retry.
    * Jitter prevents thundering herd via uniform random variance.
    *
    * @param attempt - Zero-based retry attempt number (0 returns 0 delay)
    * @throws RangeError if attempt < 0 or >= maxAttempts
    */
   ```

3. **Performance characteristics** (helps reviewers spot scalability issues):
   ```typescript
   /**
    * Validates decorator coverage and parameter extraction for context instances.
    *
    * O(n) where n = parameter count. Fails fast on metadata issues before instantiation.
    *
    * @throws CoreError if decorator coverage incomplete or validation fails
    */
   ```

4. **Call sequences and preconditions** (helps reviewers verify usage patterns):
   ```typescript
   /**
    * Initializes hook with required dependencies before registration.
    *
    * Must be called before execute(). Hook will not be registered if init() fails.
    *
    * @throws Error if initialization fails and hook should not be registered
    */
   ```

**When to omit JSDoc entirely:**
- Private/internal symbols with self-explanatory names and types
- Simple getters/setters without validation or side effects
- Methods where name + signature + types tell the complete story
- Override methods where parent JSDoc applies

### Inline Comments for Implementation Logic

**Purpose**: Help reviewers verify correctness and help developers understand non-obvious behavior

**Use `//` comments for** (on their own line above code):

1. **Invariants and constraints** (critical for reviewers):
   ```typescript
   // NOTE: Decorators execute bottom-to-top, so we prepend to maintain left-to-right parameter order
   const meta = [collection ? `${collection}.${key}` : key, ...(existing as string[])];
   ```

2. **Error categories** (helps reviewers assess error handling):
   ```typescript
   // All errors prefixed with 🐞 [BUG] indicate developer errors that should be caught during development,
   // not production runtime issues. These represent incorrect decorator usage or configuration.
   const ERROR = { /* ... */ };
   ```

3. **Workarounds for external bugs** (must include link):
   ```typescript
   // WORKAROUND: API returns null instead of [] for empty collections (see issue #1234)
   // https://github.com/vendor/project/issues/1234
   const items = response.items ?? [];
   ```

4. **Performance optimizations** (justify the complexity):
   ```typescript
   // NOTE: Base delay scaled so exponential growth reaches maxDelayMs at final retry
   const baseDelay = this.maxDelayMs / 2 ** (this.maxAttempts - 1);
   // NOTE: Jitter prevents thundering herd via uniform random variance
   const jitter = this.maxJitter * (Math.random() - 0.5) * 2 * baseDelay;
   ```

5. **Edge cases and boundary conditions**:
   ```typescript
   // NOTE: JSONTokener.nextValue() may return a value equals() to null
   if (value == null || value.equals(null)) {
     return null;
   }
   ```

**Standard prefixes** (helps reviewers categorize issues):
- `// NOTE:` - Important constraint, invariant, or context
- `// WORKAROUND:` or `// HACK:` - Non-ideal solution (always explain why + link to issue)
- `// TODO:` - Planned improvement (link to issue tracker when possible)
- `// FIXME:` - Known bug that needs correction (link to issue)

**Always include external links for:**
- Stack Overflow code: `// via https://stackoverflow.com/a/12345678/...`
- Specifications: `// RFC 4180 suggests CRLF line termination`
- Bug trackers: `// see issue #1234` or full URL
- Tutorials/articles that influenced design decisions

### Error Message Constants

**Special pattern for validation and error messages:**

When defining error message objects, use inline comments to document:
- **Error category** (developer error vs runtime error vs user error)
- **When this error occurs** (trigger conditions)
- **How to prevent/fix** (if not obvious)

```typescript
// All errors prefixed with 🐞 [BUG] indicate developer errors that should be caught during development,
// not production runtime issues. These represent incorrect decorator usage or configuration.
const ERROR = {
  wrongDecoratorUsage: (where: string) =>
    `🐞 [BUG] at '${where}'. The @mapTo decorator can only be applied to constructor parameters.`,

  noMetadataFound: (where: string) =>
    `🐞 [BUG] at '${where}'. No mapping metadata. Apply @mapTo decorator to all constructor parameters.`,

  invalidContext: (where: string, reason: string) =>
    `🐞 [BUG] at '${where}'. Created context is invalid: ${reason}. Ensure the n8n node definition follow the validation rules.`,
};
```

This pattern helps reviewers:
- Quickly identify error severity (developer bug vs user input error)
- Verify error messages provide actionable guidance
- Ensure error categories match error handling strategy

## Anti-Patterns That Harm Review Quality

### ❌ Comments That Duplicate Code or Types
**Problem**: Noise that slows review and gets outdated
```typescript
// BAD - just repeats the code
// Loop through users array
for (const user of users) {
  processUser(user);  // Call processUser function
}

// BAD - just repeats the type
/**
 * Sets the name.
 * @param name - The name to set
 */
setName(name: string): void
```

**Fix**: Delete redundant comments, or add actual value:
```typescript
// GOOD - explains business constraint
// Process users in batches to avoid overwhelming the API rate limit (max 10/sec)
for (const user of users) {
  processUser(user);
}

// GOOD - documents constraint and side effect
/**
 * Updates the user's display name and triggers profile sync.
 * @param name - Must be 2-50 characters, letters and spaces only
 */
setName(name: string): void
```

### ❌ Comments That Excuse Bad Code
**Problem**: Hides design issues that should be fixed
```typescript
// BAD - comment admits code is confusing
// NOTE: This is confusing but it works
const x = ((a + b) * c) / (d - e) + f;
```

**Fix**: Refactor first, then reassess if comment needed:
```typescript
// GOOD - clear code needs no excuse
const subtotal = (a + b) * c;
const adjustment = d - e;
const total = subtotal / adjustment + f;
```

### ❌ Vague Comments That Don't Help Reviewers
**Problem**: Provides no actionable information for verification
```typescript
// BAD - too vague to verify
// Handle the data
const result = processData(data);

// BAD - uncertain language raises questions
// This might work for most cases
return value ?? defaultValue;
```

**Fix**: Be specific about WHAT and WHY:
```typescript
// GOOD - specific transformation for reviewer to verify
// Transform raw API response into normalized entities for cache storage
const result = processData(data);

// GOOD - documents fallback strategy
// NOTE: API returns null for missing values, use empty array as fallback
return value ?? [];
```

### ❌ Maintenance Hazards
**Problem**: Technical debt that accumulates and misleads reviewers
- Commented-out dead code (use git history instead)
- Stale comments contradicting current behavior
- Decorative separators and ASCII art
- TODOs without issue links or context

## Formatting Standards

**Readability for reviewers:**
- Wrap at ~100 characters
- Use Markdown in TSDoc: backticks for `identifiers`, lists for steps, code blocks for examples
- Professional tone with precise technical terminology
- Multi-line inline comments use multiple `//` lines, not `/* */` blocks

**Placement rules:**
- JSDoc goes **before** decorators: `/** doc */ @Decorator() class X`
- Inline comments go on their own line **above** code, not at line end
- Blank line before comment block, no blank line between comment and code

**Writing style for clarity:**
- Active voice, present tense: "Returns X" not "Will return X"
- Every word adds value - no filler phrases
- Precise technical terms, consistent across codebase
- No humor, sarcasm, or cultural references that don't translate

## Examples: High-Signal Comments for Review

### ✅ Documents Constraint for Reviewer Verification
```typescript
/**
 * Calculates retry delay using exponential backoff with jitter.
 *
 * @param attempt - Zero-based retry attempt number (0 returns 0 delay)
 * @returns Calculated delay in milliseconds, capped at maxDelayMs
 * @throws RangeError if attempt < 0 or >= maxAttempts
 */
calculateDelay(attempt: number): number {
  if (attempt === 0) return 0;
  if (attempt < 0) throw new RangeError(`Execution attempt must be non-negative, but got ${attempt}`);

  // NOTE: Base delay scaled so exponential growth reaches maxDelayMs at final retry
  const baseDelay = this.maxDelayMs / 2 ** (this.maxAttempts - 1);
  // NOTE: Jitter prevents thundering herd via uniform random variance
  const jitter = this.maxJitter * (Math.random() - 0.5) * 2 * baseDelay;

  return Math.min(this.maxDelayMs, baseDelay * 2 ** attempt + jitter);
}
```
**Why good**: Reviewer can verify formula correctness, boundary checks, and mathematical properties

### ✅ Explains Non-Obvious Decorator Behavior
```typescript
export function mapTo(key: string, collection?: string): ParameterDecorator {
  return function (target: object, _propertyKey: string | symbol | undefined, _parameterIndex: number) {
    const existing: unknown = Reflect.getMetadata(CONTEXT_PARAMETER, target) ?? [];
    if (!Array.isArray(existing)) throw new CoreError(ERROR.wrongDecoratorUsage(target.constructor.name));

    // NOTE: Decorators execute bottom-to-top, so we prepend to maintain left-to-right parameter order
    const meta = [collection ? `${collection}.${key}` : key, ...(existing as string[])];
    Reflect.defineMetadata(CONTEXT_PARAMETER, meta, target);
  };
}
```
**Why good**: Explains decorator execution order quirk that affects correctness - critical for reviewers

### ✅ Documents Error Categories
```typescript
// All errors prefixed with 🐞 [BUG] indicate developer errors that should be caught during development,
// not production runtime issues. These represent incorrect decorator usage or configuration.
const ERROR = {
  wrongDecoratorUsage: (where: string) =>
    `🐞 [BUG] at '${where}'. The @mapTo decorator can only be applied to constructor parameters.`,
  noMetadataFound: (where: string) =>
    `🐞 [BUG] at '${where}'. No mapping metadata. Apply @mapTo decorator to all constructor parameters.`,
};
```
**Why good**: Reviewer knows these are developer errors (fail-fast bugs), not user input validation

### ✅ References External Source
```typescript
// Many thanks to Chris Veness at http://www.movable-type.co.uk/scripts/latlong.html
// for the Haversine formula implementation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  // ... formula implementation
}
```
**Why good**: Reviewer can verify against authoritative source, provides attribution

### ❌ Bad: States the Obvious
```typescript
// Get the user
const user = getUser(id);
// Check if user exists
if (user) {
  // Return user name
  return user.name;
}
```
**Why bad**: Just narrates code, wastes reviewer time

### ❌ Bad: Vague and Unverifiable
```typescript
// Handle the data
const result = processData(data);

// This might work
return value ?? defaultValue;
```
**Why bad**: Reviewer can't verify correctness or understand intent

## Quick Reference: Commenting Checklist

### ✅ DO Comment When It Helps Review or Usage

**For Reviewers** (helps catch bugs):
- [ ] Invariants that must hold: `// NOTE: items must be sorted`
- [ ] Non-obvious validation rules and boundaries
- [ ] Error recovery and retry strategies
- [ ] Performance characteristics: `// O(n²) - use only for n < 100`
- [ ] Edge cases and boundary conditions
- [ ] Decorator/reflection magic behavior

**For Developers** (prevents misuse):
- [ ] Valid input ranges not in types: `@param timeout - Must be 1000-600000ms`
- [ ] Required call sequences: `// NOTE: Call init() before execute()`
- [ ] Side effects and state changes
- [ ] Error types callers should handle: `@throws AbortError`
- [ ] Breaking changes and migration paths: `@deprecated Use newMethod() instead`

**For Context** (explains non-obvious decisions):
- [ ] Workarounds with links: `// WORKAROUND: API bug (see issue #123)`
- [ ] Algorithm explanations with formulas or links
- [ ] Business logic not evident from code
- [ ] External source attribution: `// via https://stackoverflow.com/...`

### ❌ DON'T Comment When

- [ ] Code structure and types already tell the story
- [ ] Just restating what code does: `// Loop through users`
- [ ] Excusing unclear code (refactor instead)
- [ ] Adding decorative noise without information
- [ ] Repeating type information: `@param name - The name`

### 🤔 Refactor First If

- [ ] Need to explain WHAT code does (should be self-evident)
- [ ] Variable/function names are unclear
- [ ] Logic is too complex to follow
- [ ] Using comment as crutch for bad design

## Integration with Review Workflow

When Copilot reviewer (using `review.instructions.md`) encounters:
- **Well-commented invariants** → Can verify constraints are enforced
- **Documented error categories** → Can check error handling matches intent
- **Performance annotations** → Can spot O(n²) in hot paths
- **Validation rules in JSDoc** → Can verify boundary checks exist
- **Missing comments on complex logic** → Flags as ⚠️ Should-fix

**Result**: Faster, more accurate reviews that catch bugs before production.
