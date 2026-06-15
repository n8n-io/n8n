import { extractWorkflowCode, stripImportStatements, SDK_IMPORT_STATEMENT } from '../extract-code';

describe('extractWorkflowCode', () => {
	it('should extract code from typescript code block', () => {
		const response = `Here's the workflow:

\`\`\`typescript
const start = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Start' }
});
export default workflow('test', 'Test').add(start);
\`\`\``;

		const code = extractWorkflowCode(response);
		expect(code).toContain('const start = trigger');
		expect(code).toContain("export default workflow('test', 'Test').add(start);");
		expect(code).not.toContain('```');
	});

	it('should extract code from ts code block', () => {
		const response = `\`\`\`ts
const start = trigger({...});
export default workflow('test', 'Test').add(start);
\`\`\``;

		const code = extractWorkflowCode(response);
		expect(code).toContain('const start = trigger');
		expect(code).not.toContain('```');
	});

	it('should extract code from javascript code block', () => {
		const response = `\`\`\`javascript
const start = trigger({...});
export default workflow('test', 'Test').add(start);
\`\`\``;

		const code = extractWorkflowCode(response);
		expect(code).toContain('const start = trigger');
		expect(code).not.toContain('```');
	});

	it('should extract code from js code block', () => {
		const response = `\`\`\`js
const start = trigger({...});
export default workflow('test', 'Test').add(start);
\`\`\``;

		const code = extractWorkflowCode(response);
		expect(code).toContain('const start = trigger');
		expect(code).not.toContain('```');
	});

	it('should extract code from code block without language tag', () => {
		const response = `\`\`\`
const start = trigger({...});
export default workflow('test', 'Test').add(start);
\`\`\``;

		const code = extractWorkflowCode(response);
		expect(code).toContain('const start');
		expect(code).not.toContain('```');
	});

	it('should return trimmed response if no code block found', () => {
		const response = `  const start = trigger({...});
export default workflow('test', 'Test').add(start);  `;

		const code = extractWorkflowCode(response);
		expect(code).toBe(`const start = trigger({...});
export default workflow('test', 'Test').add(start);`);
	});

	it('should handle response with text before and after code block', () => {
		const response = `Let me generate that workflow for you.

\`\`\`typescript
const start = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Start', position: [240, 300] }
});

export default workflow('hello-world', 'Hello World')
  .add(start);
\`\`\`

This workflow will start manually when triggered.`;

		const code = extractWorkflowCode(response);
		expect(code).toContain('const start = trigger');
		expect(code).toContain('.add(start);');
		expect(code).not.toContain('Let me generate');
		expect(code).not.toContain('This workflow will');
		expect(code).not.toContain('```');
	});

	it('should preserve newlines and indentation within code block', () => {
		const response = `\`\`\`typescript
const start = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: {
    name: 'Start',
    position: [240, 300]
  }
});
\`\`\``;

		const code = extractWorkflowCode(response);
		// Should contain proper indentation
		expect(code).toContain('  type:');
		expect(code).toContain('  config:');
		expect(code).toContain('    name:');
	});

	it('should handle empty code block', () => {
		const response = `\`\`\`typescript
\`\`\``;

		const code = extractWorkflowCode(response);
		expect(code).toBe('');
	});

	it('should strip the SDK import statement from code blocks', () => {
		const response = `\`\`\`typescript
import { workflow, node, trigger } from '@n8n/workflow-sdk';

const start = trigger({...});
export default workflow('test', 'Test').add(start);
\`\`\``;

		const code = extractWorkflowCode(response);
		expect(code).not.toContain('import');
		expect(code).toContain('const start = trigger');
	});

	it('should strip multi-line imports from code blocks', () => {
		const response = `\`\`\`typescript
import {
  workflow,
  node,
  trigger
} from '@n8n/workflow-sdk';

const start = trigger({...});
\`\`\``;

		const code = extractWorkflowCode(response);
		expect(code).not.toContain('import');
		expect(code).toContain('const start = trigger');
	});
});

describe('stripImportStatements', () => {
	it('should strip the SDK import statement', () => {
		const code = `${SDK_IMPORT_STATEMENT}

const start = trigger({...});
export default workflow('test', 'Test').add(start);`;

		const result = stripImportStatements(code);
		expect(result).not.toContain('import');
		expect(result).toContain('const start');
	});

	it('should strip multiple import statements', () => {
		const code = `import { workflow } from '@n8n/workflow-sdk';
import { something } from 'other';

const start = trigger({...});`;

		const result = stripImportStatements(code);
		expect(result).not.toContain('import');
		expect(result).toContain('const start');
	});

	it('should strip side-effect imports', () => {
		const code = `import 'some-polyfill';
import { workflow } from '@n8n/workflow-sdk';

const start = trigger({...});`;

		const result = stripImportStatements(code);
		expect(result).not.toContain('import');
		expect(result).toContain('const start');
	});

	it('should strip default imports', () => {
		const code = `import sdk from '@n8n/workflow-sdk';

const start = trigger({...});`;

		const result = stripImportStatements(code);
		expect(result).not.toContain('import');
		expect(result).toContain('const start');
	});

	it('should strip namespace imports', () => {
		const code = `import * as sdk from '@n8n/workflow-sdk';

const start = trigger({...});`;

		const result = stripImportStatements(code);
		expect(result).not.toContain('import');
		expect(result).toContain('const start');
	});

	it('should handle code with no imports', () => {
		const code = `const start = trigger({...});
export default workflow('test', 'Test').add(start);`;

		const result = stripImportStatements(code);
		expect(result).toBe(code);
	});
});

describe('SDK_IMPORT_STATEMENT', () => {
	it('should contain all core functions', () => {
		expect(SDK_IMPORT_STATEMENT).toContain('workflow');
		expect(SDK_IMPORT_STATEMENT).toContain('node');
		expect(SDK_IMPORT_STATEMENT).toContain('trigger');
		expect(SDK_IMPORT_STATEMENT).toContain('sticky');
		expect(SDK_IMPORT_STATEMENT).toContain('placeholder');
		expect(SDK_IMPORT_STATEMENT).toContain('newCredential');
		expect(SDK_IMPORT_STATEMENT).toContain('expr');
	});

	it('should contain control flow functions', () => {
		expect(SDK_IMPORT_STATEMENT).toContain('ifElse');
		expect(SDK_IMPORT_STATEMENT).toContain('switchCase');
		expect(SDK_IMPORT_STATEMENT).toContain('merge');
		expect(SDK_IMPORT_STATEMENT).toContain('splitInBatches');
		expect(SDK_IMPORT_STATEMENT).toContain('nextBatch');
	});

	it('should contain AI functions', () => {
		expect(SDK_IMPORT_STATEMENT).toContain('languageModel');
		expect(SDK_IMPORT_STATEMENT).toContain('memory');
		expect(SDK_IMPORT_STATEMENT).toContain('tool');
		expect(SDK_IMPORT_STATEMENT).toContain('outputParser');
		expect(SDK_IMPORT_STATEMENT).toContain('embedding');
		expect(SDK_IMPORT_STATEMENT).toContain('embeddings');
		expect(SDK_IMPORT_STATEMENT).toContain('vectorStore');
		expect(SDK_IMPORT_STATEMENT).toContain('retriever');
		expect(SDK_IMPORT_STATEMENT).toContain('documentLoader');
		expect(SDK_IMPORT_STATEMENT).toContain('textSplitter');
		expect(SDK_IMPORT_STATEMENT).toContain('reranker');
		expect(SDK_IMPORT_STATEMENT).toContain('fromAi');
	});

	it('should be a valid import statement', () => {
		expect(SDK_IMPORT_STATEMENT).toMatch(/^import \{.*\} from '@n8n\/workflow-sdk';$/);
	});
});
