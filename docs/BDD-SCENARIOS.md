# BDD Scenarios — Pokemon Node

These scenarios define the expected behavior of the Pokemon node. Each maps to one or more Jest test cases. Scenarios are validated during TDD (each Red-Green-Refactor cycle implements one scenario) and used as a final acceptance checklist.

**Test framework:** Jest + nock (unit tests) + NodeTestHarness (workflow tests)
**NOT Playwright:** n8n uses Playwright for canvas UI tests, not individual node behavior.

---

## Feature: Node Scaffold

### Scenario: Node is discoverable in the editor
```gherkin
Given the Pokemon node is registered in package.json
When a user searches "Pokemon" in the node picker
Then the node appears with displayName "Pokemon" and icon
```
**Maps to:** Workflow test — node loads without error
**Story:** US-0 (#7)

### Scenario: Node has correct metadata
```gherkin
Given the Pokemon node description
Then displayName is "Pokemon"
And name is "pokemon"
And group is ["input"]
And usableAsTool is true
And description mentions both Get and Get Many operations
```
**Maps to:** Unit test — verify description properties
**Story:** US-0 (#7)

---

## Feature: Get Pokémon by Name (US-2)

### Scenario: Get Pokemon by name with simplified output
```gherkin
Given a Pokemon node with operation "get"
And nameOrId is "pikachu"
And simplify is true
When the node executes
Then the output contains exactly: id, name, height, weight, base_experience, types, abilities, stats, sprite, species
And id is 25
And name is "pikachu"
And types is ["electric"]
And stats.speed is 90
And sprite is a string URL or null
```
**Maps to:** Unit test + workflow test (get.workflow.json with pinData)
**Story:** US-2 (#2)

### Scenario: Get Pokemon by name with full output
```gherkin
Given a Pokemon node with operation "get"
And nameOrId is "pikachu"
And simplify is false
When the node executes
Then the output contains the complete PokeAPI response
And the output includes the moves array
And the output includes all sprite variants
```
**Maps to:** Unit test — verify raw response passthrough
**Story:** US-2 (#2)

### Scenario: Get Pokemon with hyphenated name
```gherkin
Given a Pokemon node with operation "get"
And nameOrId is "mr-mime"
When the node executes
Then the output contains name "mr-mime"
And the request was made to /pokemon/mr-mime
```
**Maps to:** Unit test — verify URL construction with hyphens
**Story:** US-2 (#2)

### Scenario: Get multi-type Pokemon
```gherkin
Given a Pokemon node with operation "get"
And nameOrId is "bulbasaur"
And simplify is true
When the node executes
Then types is ["grass", "poison"]
```
**Maps to:** Unit test — verify multi-type mapping
**Story:** US-2 (#2)

### Scenario: Get Pokemon with null sprite
```gherkin
Given a Pokemon node with operation "get"
And the API returns a Pokemon where sprites.front_default is null
And simplify is true
When the node executes
Then sprite is null
And no error is thrown
```
**Maps to:** Unit test — verify null sprite handling
**Story:** US-2 (#2)

---

## Feature: Get Pokémon by ID (US-3)

### Scenario: Get Pokemon by numeric ID
```gherkin
Given a Pokemon node with operation "get"
And nameOrId is "25"
When the node executes
Then the output contains name "pikachu"
And the request was made to /pokemon/25
```
**Maps to:** Unit test — verify numeric ID works
**Story:** US-3 (#3)

### Scenario: Get Pokemon with ID 0 (does not exist)
```gherkin
Given a Pokemon node with operation "get"
And nameOrId is "0"
When the node executes
Then a NodeApiError is thrown with status 404
```
**Maps to:** Unit test — verify 404 handling for invalid ID
**Story:** US-3 (#3)

---

## Feature: Error Handling

### Scenario: Pokemon not found (404)
```gherkin
Given a Pokemon node with operation "get"
And nameOrId is "notapokemon"
When the node executes
Then a NodeApiError is thrown
And the error indicates the Pokemon was not found
```
**Maps to:** Unit test + workflow test
**Story:** US-2 (#2), US-3 (#3)

### Scenario: Continue on fail
```gherkin
Given a Pokemon node with operation "get"
And nameOrId is "notapokemon"
And continueOnFail is enabled
When the node executes
Then the output contains an item with json.error containing the error message
And the output item has pairedItem matching the input item index
And no exception is thrown
```
**Maps to:** Unit test — verify continueOnFail with pairedItem
**Story:** US-2 (#2), US-3 (#3)

### Scenario: Empty string input
```gherkin
Given a Pokemon node with operation "get"
And nameOrId is ""
When the node executes
Then a NodeOperationError is thrown
And the error message indicates the input is invalid
```
**Maps to:** Unit test — verify empty input rejection
**Story:** US-6 (#6)

---

## Feature: Input Validation / Security (US-6)

### Scenario: Path traversal rejected
```gherkin
Given a Pokemon node with operation "get"
And nameOrId is "../../admin"
When the node executes
Then a NodeOperationError is thrown before any HTTP request is made
```
**Maps to:** Unit test — verify regex rejects path traversal
**Story:** US-6 (#6)

### Scenario: Query injection rejected
```gherkin
Given a Pokemon node with operation "get"
And nameOrId is "pikachu?callback=evil.com"
When the node executes
Then a NodeOperationError is thrown before any HTTP request is made
```
**Maps to:** Unit test — verify regex rejects query params
**Story:** US-6 (#6)

### Scenario: Null byte injection rejected
```gherkin
Given a Pokemon node with operation "get"
And nameOrId is "pikachu%00"
When the node executes
Then a NodeOperationError is thrown before any HTTP request is made
```
**Maps to:** Unit test — verify regex rejects encoded characters
**Story:** US-6 (#6)

### Scenario: Valid hyphenated name accepted
```gherkin
Given a Pokemon node with operation "get"
And nameOrId is "mr-mime"
When the node executes
Then the request proceeds normally (not rejected by validation)
```
**Maps to:** Unit test — verify regex allows hyphens
**Story:** US-6 (#6)

---

## Feature: List Pokémon (US-1)

### Scenario: List Pokemon with default limit
```gherkin
Given a Pokemon node with operation "getAll"
And returnAll is false
And limit is 20
When the node executes
Then the output contains 20 items
And each item has "name" and "url" properties
And no item has "stats" or "types" (stubs only)
```
**Maps to:** Unit test + workflow test (getMany.workflow.json)
**Story:** US-1 (#1)

### Scenario: List Pokemon with custom limit
```gherkin
Given a Pokemon node with operation "getAll"
And returnAll is false
And limit is 5
When the node executes
Then the output contains 5 items
```
**Maps to:** Unit test
**Story:** US-1 (#1)

### Scenario: List extracts results from API envelope
```gherkin
Given a Pokemon node with operation "getAll"
When the API returns { count: 1302, next: "...", previous: null, results: [...] }
Then the output contains only the items from "results"
And the output does NOT contain count, next, or previous fields
```
**Maps to:** Unit test — verify envelope unwrapping
**Story:** US-1 (#1)

---

## Feature: Return All (US-5)

### Scenario: Return All paginates through multiple pages
```gherkin
Given a Pokemon node with operation "getAll"
And returnAll is true
And the API returns page 1 with next pointing to page 2
And the API returns page 2 with next as null
When the node executes
Then the output contains items from both pages combined
And exactly 2 API calls were made
```
**Maps to:** Unit test with 2-page nock mock (QA requirement: single-page mock is vacuous)
**Story:** US-5 (#5)

### Scenario: Return All with pagination circuit breaker
```gherkin
Given a Pokemon node with operation "getAll"
And returnAll is true
And the API returns pages where next is never null (infinite loop)
When more than 50 pages are fetched
Then a NodeOperationError is thrown with a message about too many pages
```
**Maps to:** Unit test — verify circuit breaker
**Story:** US-5 (#5), US-6 (#6)

### Scenario: Limit field hidden when Return All is enabled
```gherkin
Given a Pokemon node with operation "getAll"
And returnAll is true
Then the Limit field is not shown in the UI
```
**Maps to:** Description test — verify displayOptions on limit field
**Story:** US-5 (#5)

---

## Feature: AI Agent Tool Use (US-4)

### Scenario: Node is usable as AI tool
```gherkin
Given the Pokemon node description
Then usableAsTool is true
And each operation has an action string
And the node description explains what each operation returns
```
**Maps to:** Unit test — verify description properties
**Story:** US-4 (#4)

---

## Acceptance Checklist (final validation)

Run after all stories are complete:

- [ ] All unit tests pass: `cd packages/nodes-base && pnpm test Pokemon`
- [ ] All workflow tests pass (NodeTestHarness)
- [ ] Node appears in editor when searching "Pokemon"
- [ ] Get "pikachu" returns simplified data with correct types/stats
- [ ] Get "25" returns same result as Get "pikachu"
- [ ] Get "notapokemon" shows clear error message
- [ ] Get Many with limit 5 returns 5 items
- [ ] Return All returns >100 items (proves pagination works)
- [ ] Simplify toggle changes output shape visibly
- [ ] `pnpm lint` passes in packages/nodes-base
- [ ] `pnpm typecheck` passes in packages/nodes-base
- [ ] `pnpm build` passes
- [ ] Git history shows incremental TDD commits
