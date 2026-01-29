import { extractWorkflowCode } from '../extract-code';

describe('extractWorkflowCode', () => {
	it('should extract code from typescript code block', () => {
		const response = `Here's the workflow:

\`\`\`typescript
const start = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Start' }
});
return workflow('test', 'Test').add(start);
\`\`\``;

		const code = extractWorkflowCode(response);
		expect(code).toContain('const start = trigger');
		expect(code).toContain("return workflow('test', 'Test').add(start);");
		expect(code).not.toContain('```');
	});

	it('should extract code from ts code block', () => {
		const response = `\`\`\`ts
const start = trigger({...});
return workflow('test', 'Test').add(start);
\`\`\``;

		const code = extractWorkflowCode(response);
		expect(code).toContain('const start = trigger');
		expect(code).not.toContain('```');
	});

	it('should extract code from code block without language tag', () => {
		const response = `\`\`\`
const start = trigger({...});
return workflow('test', 'Test').add(start);
\`\`\``;

		const code = extractWorkflowCode(response);
		expect(code).toContain('const start');
		expect(code).not.toContain('```');
	});

	it('should return trimmed response if no code block found', () => {
		const response = `  const start = trigger({...});
return workflow('test', 'Test').add(start);  `;

		const code = extractWorkflowCode(response);
		expect(code).toBe(`const start = trigger({...});
return workflow('test', 'Test').add(start);`);
	});

	it('should handle response with text before and after code block', () => {
		const response = `Let me generate that workflow for you.

\`\`\`typescript
const start = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Start', position: [240, 300] }
});

return workflow('hello-world', 'Hello World')
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
});
