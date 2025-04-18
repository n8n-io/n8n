import { mock } from 'jest-mock-extended';
import { normalizeItems } from 'n8n-core';
import {
	jsonParse,
	type INode,
	type ISupplyDataFunctions,
	type IWorkflowDataProxyData,
} from 'n8n-workflow';

import type { N8nStructuredOutputParser } from '@utils/output_parsers/N8nStructuredOutputParser';

import { OutputParserStructured } from '../OutputParserStructured.node';

describe('OutputParserStructured', () => {
	let outputParser: OutputParserStructured;
	const thisArg = mock<ISupplyDataFunctions>({
		helpers: { normalizeItems },
	});
	const workflowDataProxy = mock<IWorkflowDataProxyData>({ $input: mock() });

	beforeEach(() => {
		outputParser = new OutputParserStructured();
		thisArg.getWorkflowDataProxy.mockReturnValue(workflowDataProxy);
		thisArg.addInputData.mockReturnValue({ index: 0 });
		thisArg.addOutputData.mockReturnValue();
	});

	describe('supplyData', () => {
		describe('Version 1.1 and below', () => {
			beforeEach(() => {
				thisArg.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			});

			it('should parse a complex nested schema', async () => {
				const schema = `{
          "type": "object",
          "properties": {
            "user": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "details": {
                  "type": "object",
                  "properties": {
                    "age": { "type": "number" },
                    "hobbies": { "type": "array", "items": { "type": "string" } }
                  }
                }
              }
            },
            "timestamp": { "type": "string", "format": "date-time" }
          },
          "required": ["user", "timestamp"]
        }`;
				thisArg.getNodeParameter.calledWith('jsonSchema', 0).mockReturnValueOnce(schema);
				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};
				const outputObject = {
					output: {
						user: {
							name: 'Alice',
							details: {
								age: 30,
								hobbies: ['reading', 'hiking'],
							},
						},
						timestamp: '2023-04-01T12:00:00Z',
					},
				};
				const parsersOutput = await response.parse(`Here's the complex output:
          \`\`\`json
          ${JSON.stringify(outputObject)}
          \`\`\`
        `);

				expect(parsersOutput).toEqual(outputObject);
			});

			it('should handle optional fields correctly', async () => {
				const schema = `{
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "age": { "type": "number" },
            "email": { "type": "string", "format": "email" }
          },
          "required": ["name"]
        }`;
				thisArg.getNodeParameter.calledWith('jsonSchema', 0).mockReturnValueOnce(schema);
				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};
				const outputObject = {
					output: {
						name: 'Bob',
						email: 'bob@example.com',
					},
				};
				const parsersOutput = await response.parse(`Here's the output with optional fields:
          \`\`\`json
          ${JSON.stringify(outputObject)}
          \`\`\`
        `);

				expect(parsersOutput).toEqual(outputObject);
			});

			it('should handle arrays of objects', async () => {
				const schema = `{
          "type": "object",
          "properties": {
            "users": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": { "type": "number" },
                  "name": { "type": "string" }
                },
                "required": ["id", "name"]
              }
            }
          },
          "required": ["users"]
        }`;
				thisArg.getNodeParameter.calledWith('jsonSchema', 0).mockReturnValueOnce(schema);
				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};
				const outputObject = {
					output: {
						users: [
							{ id: 1, name: 'Alice' },
							{ id: 2, name: 'Bob' },
						],
					},
				};
				const parsersOutput = await response.parse(`Here's the array output:
          \`\`\`json
          ${JSON.stringify(outputObject)}
          \`\`\`
        `);

				expect(parsersOutput).toEqual(outputObject);
			});

			it('should handle empty objects', async () => {
				const schema = `{
          "type": "object",
          "properties": {
            "data": {
              "type": "object"
            }
          },
          "required": ["data"]
        }`;
				thisArg.getNodeParameter.calledWith('jsonSchema', 0).mockReturnValueOnce(schema);
				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};
				const outputObject = {
					output: {
						data: {},
					},
				};
				const parsersOutput = await response.parse(`Here's the empty object output:
          \`\`\`json
          ${JSON.stringify(outputObject)}
          \`\`\`
        `);

				expect(parsersOutput).toEqual(outputObject);
			});

			it('should throw error for null values in non-nullable fields', async () => {
				const schema = `{
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "age": { "type": "number" }
          },
          "required": ["name", "age"]
        }`;
				thisArg.getNodeParameter.calledWith('jsonSchema', 0).mockReturnValueOnce(schema);
				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};
				const outputObject = {
					output: {
						name: 'Charlie',
						age: null,
					},
				};

				await expect(
					response.parse(
						`Here's the output with null value:
            \`\`\`json
            ${JSON.stringify(outputObject)}
            \`\`\`
          `,
						undefined,
						(e) => e,
					),
				).rejects.toThrow('Expected number, received null');
			});
		});

		describe('Version 1.2 and above', () => {
			beforeEach(() => {
				thisArg.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.2 }));
			});

			it('should parse output using schema generated from complex JSON example', async () => {
				const jsonExample = `{
          "user": {
            "name": "Alice",
            "details": {
              "age": 30,
              "address": {
                "street": "123 Main St",
                "city": "Anytown",
                "zipCode": "12345"
              }
            }
          },
          "orders": [
            {
              "id": "ORD-001",
              "items": ["item1", "item2"],
              "total": 50.99
            },
            {
              "id": "ORD-002",
              "items": ["item3"],
              "total": 25.50
            }
          ],
          "isActive": true
        }`;
				thisArg.getNodeParameter.calledWith('schemaType', 0).mockReturnValueOnce('fromJson');
				thisArg.getNodeParameter
					.calledWith('jsonSchemaExample', 0)
					.mockReturnValueOnce(jsonExample);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};

				const outputObject = {
					output: jsonParse(jsonExample),
				};

				const parsersOutput = await response.parse(`Here's the complex output:
          \`\`\`json
          ${JSON.stringify(outputObject)}
          \`\`\`
        `);

				expect(parsersOutput).toEqual(outputObject);
			});

			it('should validate enum values', async () => {
				const inputSchema = `{
          "type": "object",
          "properties": {
            "color": {
              "type": "string",
              "enum": ["red", "green", "blue"]
            }
          },
          "required": ["color"]
        }`;
				thisArg.getNodeParameter.calledWith('schemaType', 0).mockReturnValueOnce('manual');
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(inputSchema);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};

				const validOutput = {
					output: {
						color: 'green',
					},
				};

				const invalidOutput = {
					output: {
						color: 'yellow',
					},
				};

				await expect(
					response.parse(`Valid output:
          \`\`\`json
          ${JSON.stringify(validOutput)}
          \`\`\`
        `),
				).resolves.toEqual(validOutput);

				await expect(
					response.parse(
						`Invalid output:
          \`\`\`json
          ${JSON.stringify(invalidOutput)}
          \`\`\`
        `,
						undefined,
						(e) => e,
					),
				).rejects.toThrow();
			});

			it('should handle recursive structures', async () => {
				const inputSchema = `{
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "children": {
              "type": "array",
              "items": { "$ref": "#" }
            }
          },
          "required": ["name"]
        }`;
				thisArg.getNodeParameter.calledWith('schemaType', 0).mockReturnValueOnce('manual');
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(inputSchema);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};

				const outputObject = {
					output: {
						name: 'Root',
						children: [
							{
								name: 'Child1',
								children: [{ name: 'Grandchild1' }, { name: 'Grandchild2' }],
							},
							{
								name: 'Child2',
							},
						],
					},
				};

				const parsersOutput = await response.parse(`Here's the recursive structure output:
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
				thisArg.getNodeParameter.calledWith('schemaType', 0).mockReturnValueOnce('manual');
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(schema);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};
				const outputObject = { output: { name: 'Mac' } };

				await expect(
					response.parse(
						`Here's the output!
						\`\`\`json
						${JSON.stringify(outputObject)}
						\`\`\`
					`,
						undefined,
						(e) => e,
					),
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
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(schema);
				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};
				const outputObject = { output: { name: 'Mac', age: '27' } };

				await expect(
					response.parse(
						`Here's the output!
						\`\`\`json
						${JSON.stringify(outputObject)}
						\`\`\`
					`,
						undefined,
						(e) => e,
					),
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
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(schema);
				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
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
});
