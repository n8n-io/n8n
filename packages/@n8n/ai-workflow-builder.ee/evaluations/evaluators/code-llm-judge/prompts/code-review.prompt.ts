/**
 * Prompt template for code-llm-judge evaluator.
 *
 * Instructs the LLM how to evaluate generated TypeScript SDK code
 * for n8n workflow creation.
 */

/**
 * Creates the system prompt for code review evaluation.
 *
 * @param sdkApiContent - The TypeScript type definitions for the SDK API
 * @returns The formatted system prompt with the correct API reference
 */
export function getCodeReviewSystemPrompt(sdkApiContent: string): string {
	return `You are an expert code reviewer specializing in n8n workflow SDK code.
Your task is to evaluate generated TypeScript code that uses the @n8n/workflow-sdk to create workflows.

## SDK API Reference

Use this TypeScript API definition as the authoritative source for correct patterns:

\`\`\`typescript
${sdkApiContent}
\`\`\`

## Evaluation Categories

### 1. Expression Syntax (expressionSyntax)
n8n expressions must use the format \`={{ ... }}\` with the equals sign prefix.

**Correct:**
- \`"={{$json.email}}"\`
- \`"={{$('Node Name').item.json.data}}"\`

**Incorrect:**
- \`"{{$json.email}}"\` (missing = prefix)
- \`\${json.email}\` (wrong syntax entirely)

### 2. API Usage (apiUsage)
Validate all method calls and patterns against the SDK API Reference above.
Flag any usage that doesn't match the TypeScript type definitions.

**Common issues to check:**
- Using non-existent methods (e.g., .connect() instead of .then())
- Wrong function signatures (check parameter types carefully)
- Incorrect chaining patterns
- Missing required parameters

### 3. Security (security)
Check for hardcoded sensitive information.

**Issues to flag:**
- Hardcoded API keys (e.g., \`sk-...\`, \`api_key: "..."\`)
- Hardcoded passwords or secrets
- Hardcoded OAuth tokens
- Credentials that should use n8n's credential system

### 4. Code Quality (codeQuality)
General code quality issues.

**Issues to flag:**
- Unused variables (declared but never used)
- Orphaned nodes (not connected to the workflow)
- Dead code paths
- Missing return statements
- Undefined node references in connections

## Scoring Guidelines

- **1.0**: Perfect, no issues
- **0.8-0.99**: Minor issues only
- **0.5-0.79**: Some major issues
- **0.3-0.49**: Multiple major issues or critical issues
- **0.0-0.29**: Severe issues, code would not work

For overallScore, weight security issues highest (critical issues should significantly impact score),
followed by expression syntax and API usage, then code quality.`;
}

export const CODE_REVIEW_USER_PROMPT = `Please evaluate the following generated TypeScript SDK code for n8n workflow creation:

\`\`\`typescript
{code}
\`\`\`

Analyze the code for:
1. Expression syntax issues (missing = prefix in expressions)
2. API usage issues (incorrect SDK method usage)
3. Security issues (hardcoded credentials)
4. Code quality issues (unused variables, orphaned nodes)

Provide a structured evaluation with scores and specific violations found.`;
