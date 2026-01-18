import { mock } from 'jest-mock-extended';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { z } from 'zod';

import { N8nStructuredOutputParser } from './N8nStructuredOutputParser';

describe('N8nStructuredOutputParser', () => {
	let mockContext: jest.Mocked<ISupplyDataFunctions>;

	beforeEach(() => {
		mockContext = mock<ISupplyDataFunctions>();
		mockContext.addInputData.mockReturnValue({ index: 0 });
		mockContext.addOutputData.mockReturnValue(undefined);
		mockContext.getNode.mockReturnValue({
			name: 'Test Node',
			type: 'n8n-nodes-langchain.outputParserStructured',
			typeVersion: 1.3,
			position: [0, 0],
		} as INode);
	});

	// Bug AI-1852
	describe('Backticks in JSON string values', () => {
		it('should parse JSON containing markdown code blocks in string values', async () => {
			const schema = z.object({
				output: z.object({
					message: z.string(),
					status: z.string(),
				}),
			});

			const parser = new N8nStructuredOutputParser(mockContext, schema);

			// This is the exact problematic output from the bug report
			// Valid JSON wrapped in code fence, but contains backticks INSIDE the message field
			const problematicOutput = `\`\`\`json
{
  "output": {
    "message": "## Example\\n\`\`\`bash\\n--set globals.enable=false\\n\`\`\`\\n",
    "status": "completed"
  }
}
\`\`\``;

			const result = await parser.parse(problematicOutput);

			expect(result).toEqual({
				output: {
					message: '## Example\n```bash\n--set globals.enable=false\n```\n',
					status: 'completed',
				},
			});
		});

		it('should parse JSON containing multiple code blocks in string values', async () => {
			const schema = z.object({
				output: z.object({
					content: z.string(),
				}),
			});

			const parser = new N8nStructuredOutputParser(mockContext, schema);

			const multipleCodeBlocksOutput = `\`\`\`json
{
  "output": {
    "content": "First example:\\n\`\`\`javascript\\nconst x = 1;\\n\`\`\`\\n\\nSecond example:\\n\`\`\`python\\nprint('hello')\\n\`\`\`"
  }
}
\`\`\``;

			const result = await parser.parse(multipleCodeBlocksOutput);

			expect(result).toEqual({
				output: {
					content:
						"First example:\n```javascript\nconst x = 1;\n```\n\nSecond example:\n```python\nprint('hello')\n```",
				},
			});
		});

		it('should parse nested markdown in complex JSON structures', async () => {
			const schema = z.object({
				output: z.object({
					steps: z.array(
						z.object({
							title: z.string(),
							description: z.string(),
							code: z.string(),
						}),
					),
				}),
			});

			const parser = new N8nStructuredOutputParser(mockContext, schema);

			const complexOutput = `\`\`\`json
{
  "output": {
    "steps": [
      {
        "title": "Step 1",
        "description": "Run this command:\\n\`\`\`bash\\nnpm install\\n\`\`\`",
        "code": "npm install"
      }
    ]
  }
}
\`\`\``;

			const result = await parser.parse(complexOutput);

			expect(result).toEqual({
				output: {
					steps: [
						{
							title: 'Step 1',
							description: 'Run this command:\n```bash\nnpm install\n```',
							code: 'npm install',
						},
					],
				},
			});
		});
	});

	describe('Valid JSON parsing', () => {
		it('should parse valid JSON without code fence', async () => {
			const schema = z.object({
				output: z.object({
					message: z.string(),
					status: z.string(),
				}),
			});

			const parser = new N8nStructuredOutputParser(mockContext, schema);

			const validOutput = `{
  "output": {
    "message": "Simple message",
    "status": "completed"
  }
}`;

			const result = await parser.parse(validOutput);

			expect(result).toEqual({
				output: {
					message: 'Simple message',
					status: 'completed',
				},
			});
		});

		it('should parse valid JSON wrapped in code fence without internal backticks', async () => {
			const schema = z.object({
				output: z.object({
					message: z.string(),
					status: z.string(),
				}),
			});

			const parser = new N8nStructuredOutputParser(mockContext, schema);

			const validOutput = `\`\`\`json
{
  "output": {
    "message": "Simple message",
    "status": "completed"
  }
}
\`\`\``;

			const result = await parser.parse(validOutput);

			expect(result).toEqual({
				output: {
					message: 'Simple message',
					status: 'completed',
				},
			});
		});

		it('should parse JSON with escaped quotes and newlines', async () => {
			const schema = z.object({
				output: z.object({
					message: z.string(),
				}),
			});

			const parser = new N8nStructuredOutputParser(mockContext, schema);

			const validOutput = `{
  "output": {
    "message": "Line 1\\nLine 2\\n\\"quoted\\""
  }
}`;

			const result = await parser.parse(validOutput);

			expect(result).toEqual({
				output: {
					message: 'Line 1\nLine 2\n"quoted"',
				},
			});
		});

		it('should handle code fence with json language marker', async () => {
			const schema = z.object({
				output: z.object({
					data: z.string(),
				}),
			});

			const parser = new N8nStructuredOutputParser(mockContext, schema);

			const validOutput = `\`\`\`json
{
  "output": {
    "data": "test"
  }
}
\`\`\``;

			const result = await parser.parse(validOutput);

			expect(result).toEqual({
				output: {
					data: 'test',
				},
			});
		});

		it('should handle code fence without language marker', async () => {
			const schema = z.object({
				output: z.object({
					data: z.string(),
				}),
			});

			const parser = new N8nStructuredOutputParser(mockContext, schema);

			const validOutput = `\`\`\`
{
  "output": {
    "data": "test"
  }
}
\`\`\``;

			const result = await parser.parse(validOutput);

			expect(result).toEqual({
				output: {
					data: 'test',
				},
			});
		});
	});

	describe('Error handling', () => {
		it('should handle invalid JSON gracefully', async () => {
			const schema = z.object({
				output: z.object({
					message: z.string(),
				}),
			});

			const parser = new N8nStructuredOutputParser(mockContext, schema);

			const invalidOutput = 'not valid json';

			await expect(parser.parse(invalidOutput)).rejects.toThrow(
				"Model output doesn't fit required format",
			);
		});

		it('should handle empty output', async () => {
			const schema = z.object({
				output: z.object({
					message: z.string(),
				}),
			});

			const parser = new N8nStructuredOutputParser(mockContext, schema);

			const emptyOutput = '{}';

			await expect(parser.parse(emptyOutput)).rejects.toThrow(
				"Model output doesn't fit required format",
			);
		});

		it('should handle schema mismatch', async () => {
			const schema = z.object({
				output: z.object({
					message: z.string(),
					requiredField: z.string(),
				}),
			});

			const parser = new N8nStructuredOutputParser(mockContext, schema);

			const mismatchOutput = `{
  "output": {
    "message": "Test"
  }
}`;

			await expect(parser.parse(mismatchOutput)).rejects.toThrow(
				"Model output doesn't fit required format",
			);
		});
	});

	describe('Context integration', () => {
		it('should call addInputData with correct parameters', async () => {
			const schema = z.object({
				output: z.object({
					message: z.string(),
				}),
			});

			const parser = new N8nStructuredOutputParser(mockContext, schema);

			const validOutput = '{"output": {"message": "test"}}';

			await parser.parse(validOutput);

			expect(mockContext.addInputData).toHaveBeenCalledWith(NodeConnectionTypes.AiOutputParser, [
				[{ json: { action: 'parse', text: validOutput } }],
			]);
		});

		it('should call addOutputData with parsed result', async () => {
			const schema = z.object({
				output: z.object({
					message: z.string(),
				}),
			});

			const parser = new N8nStructuredOutputParser(mockContext, schema);

			const validOutput = '{"output": {"message": "test"}}';

			await parser.parse(validOutput);

			expect(mockContext.addOutputData).toHaveBeenCalledWith(
				NodeConnectionTypes.AiOutputParser,
				0,
				[[{ json: { action: 'parse', response: { output: { message: 'test' } } } }]],
			);
		});
	});
});
