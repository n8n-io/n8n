import type { IExecuteFunctions, IWorkflowDataProxyData } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';
import { normalizeItems } from 'n8n-core';
import type { z } from 'zod';
import type { StructuredOutputParser } from 'langchain/output_parsers';
import { OutputParserStructured } from '../OutputParserStructured.node';

describe('OutputParserStructured', () => {
	let outputParser: OutputParserStructured;
	const thisArg = mock<IExecuteFunctions>({
		helpers: { normalizeItems },
	});
	const workflowDataProxy = mock<IWorkflowDataProxyData>({ $input: mock() });
	thisArg.getWorkflowDataProxy.mockReturnValue(workflowDataProxy);
	thisArg.getNode.mockReturnValue({ typeVersion: 1.1 });
	thisArg.addInputData.mockReturnValue({ index: 0 });
	thisArg.addOutputData.mockReturnValue();

	beforeEach(() => {
		outputParser = new OutputParserStructured();
	});

	describe('supplyData', () => {
		it('should parse a valid JSON schema', async () => {
			const schema = `{
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "age": {
            "type": "number"
          }
        },
				"required": ["name", "age"]
      }`;
			thisArg.getNodeParameter.calledWith('jsonSchema', 0).mockReturnValueOnce(schema);
			const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
				response: StructuredOutputParser<z.ZodType<object, z.ZodTypeDef, object>>;
			};
			const outputObject = { output: { name: 'Mac', age: 27 } };
			const parsersOutput = await response.parse(`Here's the output!
				\`\`\`json
				${JSON.stringify(outputObject)}
				\`\`\`
			`);

			expect(parsersOutput).toEqual(outputObject);
		});
		it('should handle missing required properties', async () => {
			const schema = `{
				"type": "object",
				"properties": {
					"name": {
						"type": "string"
					},
					"age": {
						"type": "number"
					}
				},
				"required": ["name", "age"]
			}`;
			thisArg.getNodeParameter.calledWith('jsonSchema', 0).mockReturnValueOnce(schema);
			const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
				response: StructuredOutputParser<z.ZodType<object, z.ZodTypeDef, object>>;
			};
			const outputObject = { output: { name: 'Mac' } };

			await expect(
				response.parse(`Here's the output!
					\`\`\`json
					${JSON.stringify(outputObject)}
					\`\`\`
				`),
			).rejects.toThrow('Required');
		});

		it('should throw on wrong type', async () => {
			const schema = `{
				"type": "object",
				"properties": {
					"name": {
						"type": "string"
					},
					"age": {
						"type": "number"
					}
				},
				"required": ["name", "age"]
			}`;
			thisArg.getNodeParameter.calledWith('jsonSchema', 0).mockReturnValueOnce(schema);
			const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
				response: StructuredOutputParser<z.ZodType<object, z.ZodTypeDef, object>>;
			};
			const outputObject = { output: { name: 'Mac', age: '27' } };

			await expect(
				response.parse(`Here's the output!
					\`\`\`json
					${JSON.stringify(outputObject)}
					\`\`\`
				`),
			).rejects.toThrow('Expected number, received string');
		});

		it('should parse array output', async () => {
			const schema = `{
				"type": "object",
				"properties": {
					"myArr": {
						"type": "array",
						"items": {
							"type": "object",
							"properties": {
								"name": {
									"type": "string"
								},
								"age": {
									"type": "number"
								}
							},
							"required": ["name", "age"]
						}
					}
				},
				"required": ["myArr"]
			}`;
			thisArg.getNodeParameter.calledWith('jsonSchema', 0).mockReturnValueOnce(schema);
			const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
				response: StructuredOutputParser<z.ZodType<object, z.ZodTypeDef, object>>;
			};
			const outputObject = {
				output: {
					myArr: [
						{ name: 'Mac', age: 27 },
						{ name: 'Alice', age: 25 },
					],
				},
			};
			const parsersOutput = await response.parse(`Here's the output!
				\`\`\`json
				${JSON.stringify(outputObject)}
				\`\`\`
			`);

			expect(parsersOutput).toEqual(outputObject);
		});
	});
});
