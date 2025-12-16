# Translation Features - AI Assistant Creation Prompt

## Purpose
Use this prompt template when asking Claude or Copilot to help create new translation features. This ensures consistency with the established conventions and rules.

---

## Feature Creation Prompt Template

```
I need to create a new translation feature for the n8n Translation package.

### Feature Details
- **Feature Name**: [FEATURE_NAME_IN_UPPERCASE_SNAKE_CASE]
- **Purpose**: [Brief description of what this feature does]
- **Use Case**: [Why would users need this feature]

### Feature Behavior
- **Inputs/Parameters**: [List the configuration parameters needed]
- **Outputs/Effects**: [What does the feature do/return]
- **Dependencies**: [Does it depend on other features? List them]

### Specific Requirements
[Add any specific requirements or constraints]

### Reference
Please follow the rules in FEATURE_CREATION_RULES.md:
- Feature names: UPPERCASE_SNAKE_CASE
- Parameter names: camelCase using pattern {featureName}{propertyName}
- Display names: Title Case, descriptive and user-friendly
- All descriptions must explain: what it does, how it works, and expected outcomes
- Include type constraints (min/max values) where applicable
- Use conditional display options (displayOptions.show) for dependent fields
- Each parameter needs: displayName, name, type, default, description

### Deliverables
Please generate:

1. **TranslationFeatures Configuration**
   - Add to TranslationFeatures.ts export const
   - Include JSDoc comments for feature and each property
   - Follow the array structure: [props] as INodeProperties[]

2. **Parameter Extraction Code**
   - Code for extracting these parameters in the consuming class
   - Use exact parameter names (camelCase)
   - No default values in extraction (use feature defaults)
   - Include proper TypeScript type casting

3. **Documentation**
   - Updated property descriptions in JSDoc
   - Conditional field explanations
   - Example values/scenarios

### Validation Checklist
Before finalizing, ensure:
- [ ] Feature name is UPPERCASE_SNAKE_CASE
- [ ] All parameters use camelCase (featureName + propertyName)
- [ ] displayName values are Title Case and descriptive
- [ ] All descriptions include what/how/examples
- [ ] Options have descriptive labels ("Label - effect/outcome")
- [ ] Type constraints are set (minValue, maxValue, numberStepSize)
- [ ] displayOptions.show references match exact parameter names
- [ ] Dependent fields only show when prerequisites are met
- [ ] Parameter extraction code matches feature configuration
- [ ] No default values in parameter extraction
```

---

## Example Usage

### Example Prompt for Rate Limiting Feature

```
I need to create a new translation feature for the n8n Translation package.

### Feature Details
- **Feature Name**: RATE_LIMITING
- **Purpose**: Simulate API rate limiting scenarios for testing
- **Use Case**: Users want to test how their workflows handle rate-limited translation requests

### Feature Behavior
- **Inputs/Parameters**: 
  - Enable/disable rate limiting
  - Request limit (number of requests allowed)
  - Time window (seconds before limit resets)
  - Response code when limited (e.g., 429)
- **Outputs/Effects**: Returns rate limit error when limit is exceeded
- **Dependencies**: None

### Specific Requirements
- Request counter should reset after time window
- Should return HTTP 429 by default
- Limit should be 10 requests per time window by default

Reference the FEATURE_CREATION_RULES.md for conventions.

Deliverables:
1. TranslationFeatures configuration (add to TranslationFeatures.ts)
2. Parameter extraction code for DryRunTranslationSupplier
3. Documentation with examples
4. Validation checklist confirmation
```

---

## Quick Reference Sections

### When to Use This Prompt
- Creating a new feature configuration
- Adding parameters to an existing feature
- Extending the translation mock/test capabilities
- Implementing new test scenarios

### What to Include
1. **Feature name** - Always in UPPERCASE_SNAKE_CASE
2. **Detailed description** - What, why, and use cases
3. **Parameter list** - All inputs needed
4. **Expected behavior** - What happens and outcomes
5. **Reference** - Link to FEATURE_CREATION_RULES.md

### What You'll Get Back
1. **Type-safe configuration** - Ready to add to TranslationFeatures.ts
2. **Parameter extraction code** - Properly typed and named
3. **Full documentation** - JSDoc comments and descriptions
4. **Validation checklist** - Ensures all rules are followed

---

## Common Feature Patterns

### Pattern 1: Boolean Toggle + Dependent Options
```
Enable feature (boolean)
→ Choose variant (options) - shows only when enabled
→ Configure variant (number/string) - shows only when enabled
```

### Pattern 2: Multiple Independent Options
```
Option A (boolean/options)
Option B (boolean/options)
Option C (number) - independent, always visible
```

### Pattern 3: Conditional Chain
```
Master toggle (boolean)
→ Primary setting (options) - shows when enabled
  → Sub-setting A (number) - shows when primary = "A"
  → Sub-setting B (string) - shows when primary = "B"
```

---

## Tips for Better Prompts

✅ **DO:**
- Be specific about use cases
- List all parameters upfront
- Mention dependencies
- Reference the rules document
- Ask for validation checklist

❌ **DON'T:**
- Use vague descriptions
- Forget to include display names for options
- Mix camelCase and snake_case
- Skip type constraints where applicable
- Forget about conditional display logic

---

## Integration Steps

Once Claude/Copilot generates the feature:

1. **Review the configuration** - Verify naming and structure
2. **Update TranslationFeatures.ts** - Add the feature export
3. **Update consuming class** - Add parameter extraction code
4. **Add JSDoc comments** - File-level documentation
5. **Run validation** - Use the provided checklist
6. **Test the feature** - Verify in the application

---

## Support Resources

- **Full Rules**: See `FEATURE_CREATION_RULES.md`
- **Examples**: Check existing features:
  - `DELAY` - Simple toggle with numeric configuration
  - `MOCKED_TRANSLATION` - Option-driven with conditionals
- **Type Reference**: n8n INodeProperties documentation
- **Questions**: Refer to feature examples in TranslationFeatures.ts
