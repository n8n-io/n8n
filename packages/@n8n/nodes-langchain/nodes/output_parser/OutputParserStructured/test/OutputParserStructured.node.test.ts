import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { OutputParserException } from '@langchain/core/output_parsers';
import { mock, type MockProxy } from 'jest-mock-extended';
import { normalizeItems } from 'n8n-core';
import {
	jsonParse,
	NodeConnectionTypes,
	NodeOperationError,
	type INode,
	type ISupplyDataFunctions,
	type IWorkflowDataProxyData,
} from 'n8n-workflow';

import {
	N8nStructuredOutputParser,
	type N8nOutputFixingParser,
} from '@utils/output_parsers/N8nOutputParser';

import { OutputParserStructured } from '../OutputParserStructured.node';
import { NAIVE_FIX_PROMPT } from '../prompt';

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

		describe('Version 1.3', () => {
			beforeEach(() => {
				thisArg.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.3 }));
			});

			describe('schema from JSON example', () => {
				it('should make all fields required when generating schema from JSON example', async () => {
					const jsonExample = `{
            "user": {
              "name": "Alice",
              "email": "alice@example.com",
              "profile": {
                "age": 30,
                "city": "New York"
              }
            },
            "tags": ["work", "important"]
          }`;
					thisArg.getNodeParameter.calledWith('schemaType', 0).mockReturnValueOnce('fromJson');
					thisArg.getNodeParameter
						.calledWith('jsonSchemaExample', 0)
						.mockReturnValueOnce(jsonExample);

					const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
						response: N8nStructuredOutputParser;
					};

					const outputObject = {
						output: {
							user: {
								name: 'Bob',
								email: 'bob@example.com',
								profile: {
									age: 25,
									city: 'San Francisco',
								},
							},
							tags: ['personal'],
						},
					};

					const parsersOutput = await response.parse(`Here's the user data:
            \`\`\`json
            ${JSON.stringify(outputObject)}
            \`\`\`
          `);

					expect(parsersOutput).toEqual(outputObject);
				});

				it('should reject output missing required fields from JSON example', async () => {
					const jsonExample = `{
            "name": "Alice",
            "age": 30,
            "email": "alice@example.com"
          }`;
					thisArg.getNodeParameter.calledWith('schemaType', 0).mockReturnValueOnce('fromJson');
					thisArg.getNodeParameter
						.calledWith('jsonSchemaExample', 0)
						.mockReturnValueOnce(jsonExample);

					const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
						response: N8nStructuredOutputParser;
					};

					const incompleteOutput = {
						output: {
							name: 'Bob',
							age: 25,
							// Missing email field
						},
					};

					await expect(
						response.parse(
							`Here's the incomplete output:
              \`\`\`json
              ${JSON.stringify(incompleteOutput)}
              \`\`\`
            `,
							undefined,
							(e) => e,
						),
					).rejects.toThrow('Required');
				});

				it('should require all fields in array items from JSON example', async () => {
					const jsonExample = `{
            "users": [
              {
                "id": 1,
                "name": "Alice",
                "metadata": {
                  "department": "Engineering",
                  "role": "Developer"
                }
              }
            ]
          }`;
					thisArg.getNodeParameter.calledWith('schemaType', 0).mockReturnValueOnce('fromJson');
					thisArg.getNodeParameter
						.calledWith('jsonSchemaExample', 0)
						.mockReturnValueOnce(jsonExample);

					const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
						response: N8nStructuredOutputParser;
					};

					const incompleteArrayOutput = {
						output: {
							users: [
								{
									id: 2,
									name: 'Bob',
									metadata: {
										department: 'Marketing',
										// Missing role field
									},
								},
							],
						},
					};

					await expect(
						response.parse(
							`Here's the incomplete array output:
              \`\`\`json
              ${JSON.stringify(incompleteArrayOutput)}
              \`\`\`
            `,
							undefined,
							(e) => e,
						),
					).rejects.toThrow('Required');
				});

				it('should raise schema fit error when passing in empty object', async () => {
					const jsonExample = `{
            "user": {
              "name": "Alice",
              "email": "alice@example.com",
              "profile": {
                "age": 30,
                "city": "New York"
              }
            },
            "tags": ["work", "important"]
          }`;
					thisArg.getNodeParameter.calledWith('schemaType', 0).mockReturnValueOnce('fromJson');
					thisArg.getNodeParameter
						.calledWith('jsonSchemaExample', 0)
						.mockReturnValueOnce(jsonExample);

					const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
						response: N8nStructuredOutputParser;
					};

					// @ts-expect-error 2345
					await expect(response.parse({})).rejects.toThrow(
						"Model output doesn't fit required format",
					);
				});
			});

			describe('manual schema mode', () => {
				it('should work with manually defined schema in version 1.3', async () => {
					const inputSchema = `{
            "type": "object",
            "properties": {
              "result": {
                "type": "object",
                "properties": {
                  "status": { "type": "string" },
                  "data": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "id": { "type": "number" },
                        "value": { "type": "string" }
                      },
                      "required": ["id", "value"]
                    }
                  }
                },
                "required": ["status", "data"]
              }
            },
            "required": ["result"]
          }`;
					thisArg.getNodeParameter.calledWith('schemaType', 0).mockReturnValueOnce('manual');
					thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(inputSchema);

					const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
						response: N8nStructuredOutputParser;
					};

					const outputObject = {
						output: {
							result: {
								status: 'success',
								data: [
									{ id: 1, value: 'first' },
									{ id: 2, value: 'second' },
								],
							},
						},
					};

					const parsersOutput = await response.parse(`Here's the result:
            \`\`\`json
            ${JSON.stringify(outputObject)}
            \`\`\`
          `);

					expect(parsersOutput).toEqual(outputObject);
				});
			});

			describe('complex nested structures', () => {
				it('should handle deeply nested objects with required fields', async () => {
					const jsonExample = `{
            "company": {
              "name": "TechCorp",
              "departments": [
                {
                  "name": "Engineering",
                  "teams": [
                    {
                      "name": "Backend",
                      "members": [
                        {
                          "id": 1,
                          "name": "Alice",
                          "skills": ["Python", "Docker"]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          }`;
					thisArg.getNodeParameter.calledWith('schemaType', 0).mockReturnValueOnce('fromJson');
					thisArg.getNodeParameter
						.calledWith('jsonSchemaExample', 0)
						.mockReturnValueOnce(jsonExample);

					const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
						response: N8nStructuredOutputParser;
					};

					const complexOutput = {
						output: {
							company: {
								name: 'StartupCorp',
								departments: [
									{
										name: 'Product',
										teams: [
											{
												name: 'Frontend',
												members: [
													{
														id: 2,
														name: 'Bob',
														skills: ['React', 'TypeScript'],
													},
													{
														id: 3,
														name: 'Carol',
														skills: ['Vue', 'CSS'],
													},
												],
											},
										],
									},
								],
							},
						},
					};

					const parsersOutput = await response.parse(`Here's the complex company data:
            \`\`\`json
            ${JSON.stringify(complexOutput)}
            \`\`\`
          `);

					expect(parsersOutput).toEqual(complexOutput);
				});
			});
		});
		describe('Markdown Code Fence Handling', () => {
			beforeEach(() => {
				thisArg.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.2 }));
				thisArg.getNodeParameter.calledWith('schemaType', 0).mockReturnValueOnce('manual');
			});

			it('should parse JSON with single backtick block inside (not in fence)', async () => {
				const schema = `{
					"type": "object",
					"properties": {
						"message": { "type": "string" },
						"status": { "type": "string" }
					},
					"required": ["message", "status"]
				}`;
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(schema);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};

				const outputObject = {
					output: {
						message: '## Example\n```bash\n--set globals.enable=false\n```\n',
						status: 'completed',
					},
				};

				const parsersOutput = await response.parse(JSON.stringify(outputObject));

				expect(parsersOutput).toEqual(outputObject);
			});

			it('should parse JSON with multiple backtick blocks inside (not in fence)', async () => {
				const schema = `{
					"type": "object",
					"properties": {
						"message": { "type": "string" },
						"tokens_used": { "type": "number" }
					},
					"required": ["message", "tokens_used"]
				}`;
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(schema);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};

				const outputObject = {
					output: {
						message:
							'## Example 1\n```bash\ncommand1\n```\n## Example 2\n```bash\ncommand2\n```\n',
						tokens_used: 2850,
					},
				};

				const parsersOutput = await response.parse(JSON.stringify(outputObject));

				expect(parsersOutput).toEqual(outputObject);
			});

			it('should parse JSON wrapped in code fence', async () => {
				const schema = `{
					"type": "object",
					"properties": {
						"name": { "type": "string" },
						"age": { "type": "number" }
					},
					"required": ["name", "age"]
				}`;
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(schema);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};

				const outputObject = {
					output: {
						name: 'Alice',
						age: 30,
					},
				};

				const parsersOutput = await response.parse(`\`\`\`json
${JSON.stringify(outputObject)}
\`\`\``);

				expect(parsersOutput).toEqual(outputObject);
			});

			it('should parse JSON wrapped in code fence (no json marker)', async () => {
				const schema = `{
					"type": "object",
					"properties": {
						"result": { "type": "string" }
					},
					"required": ["result"]
				}`;
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(schema);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};

				const outputObject = {
					output: {
						result: 'success',
					},
				};

				const parsersOutput = await response.parse(`\`\`\`
${JSON.stringify(outputObject)}
\`\`\``);

				expect(parsersOutput).toEqual(outputObject);
			});

			it('should parse JSON in code fence WITH backticks inside', async () => {
				const schema = `{
					"type": "object",
					"properties": {
						"message": { "type": "string" },
						"status": { "type": "string" },
						"tokens_used": { "type": "number" }
					},
					"required": ["message", "status", "tokens_used"]
				}`;
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(schema);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};

				const outputObject = {
					output: {
						message: '## Example\n```bash\n--set globals.enable=false\n```\n',
						status: 'completed',
						tokens_used: 2850,
					},
				};

				const parsersOutput = await response.parse(`\`\`\`json
${JSON.stringify(outputObject)}
\`\`\``);

				expect(parsersOutput).toEqual(outputObject);
			});

			it('should parse JSON in code fence WITH MULTIPLE backticks inside', async () => {
				const schema = `{
					"type": "object",
					"properties": {
						"documentation": { "type": "string" },
						"examples_count": { "type": "number" }
					},
					"required": ["documentation", "examples_count"]
				}`;
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(schema);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};

				const outputObject = {
					output: {
						documentation:
							'# Usage\n```python\nprint("hello")\n```\n\n```javascript\nconsole.log("world")\n```\n',
						examples_count: 2,
					},
				};

				const parsersOutput = await response.parse(`\`\`\`json
${JSON.stringify(outputObject)}
\`\`\``);

				expect(parsersOutput).toEqual(outputObject);
			});

			it('should parse plain JSON without code fence', async () => {
				const schema = `{
					"type": "object",
					"properties": {
						"id": { "type": "number" },
						"value": { "type": "string" }
					},
					"required": ["id", "value"]
				}`;
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(schema);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};

				const outputObject = {
					output: {
						id: 42,
						value: 'test',
					},
				};

				const parsersOutput = await response.parse(JSON.stringify(outputObject));

				expect(parsersOutput).toEqual(outputObject);
			});

			it('should parse JSON with escaped quotes and backticks', async () => {
				const schema = `{
					"type": "object",
					"properties": {
						"command": { "type": "string" },
						"description": { "type": "string" }
					},
					"required": ["command", "description"]
				}`;
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(schema);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};

				const outputObject = {
					output: {
						command: 'echo "Hello \`World\`"',
						description: 'Prints: Hello `World`',
					},
				};

				const parsersOutput = await response.parse(JSON.stringify(outputObject));

				expect(parsersOutput).toEqual(outputObject);
			});

			it('should NOT extract from backticks that appear mid-text', async () => {
				const schema = `{
					"type": "object",
					"properties": {
						"note": { "type": "string" }
					},
					"required": ["note"]
				}`;
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(schema);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};

				const outputObject = {
					output: {
						note: 'Some text before ```json\n{"fake": "fence"}\n``` more text after',
					},
				};

				// This is NOT wrapped in a fence, so should parse as-is
				const parsersOutput = await response.parse(JSON.stringify(outputObject));

				expect(parsersOutput).toEqual(outputObject);
			});

			it('should handle whitespace variations in code fence', async () => {
				const schema = `{
					"type": "object",
					"properties": {
						"data": { "type": "string" }
					},
					"required": ["data"]
				}`;
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(schema);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};

				const outputObject = {
					output: {
						data: 'test',
					},
				};

				// Test with extra whitespace
				const parsersOutput = await response.parse(`\`\`\`json

${JSON.stringify(outputObject)}

\`\`\`  `);

				expect(parsersOutput).toEqual(outputObject);
			});

			it('should fail when code fence is unclosed (no closing backticks)', async () => {
				const schema = `{
					"type": "object",
					"properties": {
						"key": { "type": "string" }
					},
					"required": ["key"]
				}`;
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(schema);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};

				const outputObject = {
					output: {
						key: 'value',
					},
				};

				// Missing closing ``` - fence pattern won't match, tries to parse whole string including ```json prefix
				await expect(
					response.parse(`\`\`\`json\n${JSON.stringify(outputObject)}`, undefined, (e) => e),
				).rejects.toThrow();
			});

			it('should fail gracefully with invalid JSON in code fence', async () => {
				const schema = `{
					"type": "object",
					"properties": {
						"test": { "type": "string" }
					},
					"required": ["test"]
				}`;
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(schema);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};

				await expect(
					response.parse(
						`\`\`\`json
{invalid json}
\`\`\``,
						undefined,
						(e) => e,
					),
				).rejects.toThrow();
			});

			it('should fail gracefully when fence contains only opening bracket', async () => {
				const schema = `{
					"type": "object",
					"properties": {
						"items": { "type": "array" }
					},
					"required": ["items"]
				}`;
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(schema);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};

				// This should extract '[' which passes startsWith check but fails JSON.parse
				await expect(
					response.parse(
						`\`\`\`json
[
\`\`\``,
						undefined,
						(e) => e,
					),
				).rejects.toThrow();
			});

			it('should NOT match code fence with non-json/non-empty language marker', async () => {
				const schema = `{
					"type": "object",
					"properties": {
						"result": { "type": "string" }
					},
					"required": ["result"]
				}`;
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(schema);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};

				const outputObject = {
					output: {
						result: 'success',
					},
				};

				// Regex only matches ```json or ```, not ```python - fence won't match, parse fails
				await expect(
					response.parse(
						`\`\`\`python
${JSON.stringify(outputObject)}
\`\`\``,
						undefined,
						(e) => e,
					),
				).rejects.toThrow();
			});

			it('should parse array wrapped in code fence', async () => {
				const schema = `{
					"type": "object",
					"properties": {
						"items": {
							"type": "array",
							"items": {
								"type": "object",
								"properties": {
									"id": { "type": "number" }
								}
							}
						}
					},
					"required": ["items"]
				}`;
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(schema);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};

				const outputObject = {
					output: {
						items: [{ id: 1 }, { id: 2 }],
					},
				};

				// Top-level array inside output object in a fence
				const parsersOutput = await response.parse(`\`\`\`json
${JSON.stringify(outputObject)}
\`\`\``);

				expect(parsersOutput).toEqual(outputObject);
			});

			it('should match fence with closing backticks on same line as content (inline fence)', async () => {
				const schema = `{
					"type": "object",
					"properties": {
						"val": { "type": "string" }
					},
					"required": ["val"]
				}`;
				thisArg.getNodeParameter.calledWith('inputSchema', 0).mockReturnValueOnce(schema);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nStructuredOutputParser;
				};

				const outputObject = {
					output: {
						val: 'test',
					},
				};

				// With optional newlines, inline fences should now parse successfully
				const parsersOutput = await response.parse(`\`\`\`json\n${JSON.stringify(outputObject)}\`\`\``);

				expect(parsersOutput).toEqual(outputObject);
			});
		});
	});

	describe('Auto-Fix', () => {
		const model: BaseLanguageModel = jest.fn() as unknown as BaseLanguageModel;

		beforeEach(() => {
			thisArg.getNodeParameter.calledWith('schemaType', 0).mockReturnValueOnce('fromJson');
			thisArg.getNodeParameter.calledWith('jsonSchemaExample', 0).mockReturnValueOnce(`{
          "user": {
            "name": "Alice"
					}
				}`);
			thisArg.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.2 }));
			thisArg.getInputConnectionData
				.calledWith(NodeConnectionTypes.AiLanguageModel, 0)
				.mockResolvedValueOnce(model);
		});

		afterEach(() => {
			jest.clearAllMocks();
		});

		describe('Configuration', () => {
			it('should use default prompt when none specified', async () => {
				thisArg.getNodeParameter.calledWith('autoFix', 0, false).mockReturnValueOnce(true);
				thisArg.getNodeParameter
					.calledWith('prompt', 0, NAIVE_FIX_PROMPT)
					.mockReturnValueOnce(NAIVE_FIX_PROMPT);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nOutputFixingParser;
				};

				expect(response).toBeDefined();
			});

			it('should use custom prompt if one is provided', async () => {
				thisArg.getNodeParameter.calledWith('autoFix', 0, false).mockReturnValueOnce(true);
				thisArg.getNodeParameter
					.calledWith('prompt', 0, NAIVE_FIX_PROMPT)
					.mockReturnValueOnce(
						'Some prompt with "{error}", "{instructions}", and "{completion}" placeholders',
					);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nOutputFixingParser;
				};

				expect(response).toBeDefined();
			});

			it('should throw error when prompt template does not contain {error} placeholder', async () => {
				thisArg.getNodeParameter.calledWith('autoFix', 0, false).mockReturnValueOnce(true);
				thisArg.getNodeParameter
					.calledWith('prompt', 0, NAIVE_FIX_PROMPT)
					.mockReturnValueOnce('Invalid prompt without error placeholder');

				await expect(outputParser.supplyData.call(thisArg, 0)).rejects.toThrow(
					new NodeOperationError(
						thisArg.getNode(),
						'Auto-fixing parser prompt has to contain {error} placeholder',
					),
				);
			});

			it('should throw error when prompt template is empty', async () => {
				thisArg.getNodeParameter.calledWith('autoFix', 0, false).mockReturnValueOnce(true);
				thisArg.getNodeParameter.calledWith('prompt', 0, NAIVE_FIX_PROMPT).mockReturnValueOnce('');

				await expect(outputParser.supplyData.call(thisArg, 0)).rejects.toThrow(
					new NodeOperationError(
						thisArg.getNode(),
						'Auto-fixing parser prompt has to contain {error} placeholder',
					),
				);
			});
		});

		describe('Parsing', () => {
			let mockStructuredOutputParser: MockProxy<N8nStructuredOutputParser>;

			beforeEach(() => {
				mockStructuredOutputParser = mock<N8nStructuredOutputParser>();

				jest
					.spyOn(N8nStructuredOutputParser, 'fromZodJsonSchema')
					.mockResolvedValue(mockStructuredOutputParser);

				thisArg.getNodeParameter.calledWith('autoFix', 0, false).mockReturnValueOnce(true);
				thisArg.getNodeParameter
					.calledWith('prompt', 0, NAIVE_FIX_PROMPT)
					.mockReturnValueOnce(NAIVE_FIX_PROMPT);
			});

			afterEach(() => {
				jest.clearAllMocks();
			});

			function getMockedRetryChain(output: string) {
				return jest.fn().mockReturnValue({
					invoke: jest.fn().mockResolvedValue({
						content: output,
					}),
				});
			}

			it('should successfully parse valid output without needing to fix it', async () => {
				const validOutput = { name: 'Alice', age: 25 };

				mockStructuredOutputParser.parse.mockResolvedValueOnce(validOutput);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nOutputFixingParser;
				};

				const result = await response.parse('{"name": "Alice", "age": 25}');

				expect(result).toEqual(validOutput);
				expect(mockStructuredOutputParser.parse.mock.calls).toHaveLength(1);
			});

			it('should not retry on non-OutputParserException errors', async () => {
				const error = new Error('Some other error');
				mockStructuredOutputParser.parse.mockRejectedValueOnce(error);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nOutputFixingParser;
				};

				await expect(response.parse('Invalid JSON string')).rejects.toThrow(error);
				expect(mockStructuredOutputParser.parse.mock.calls).toHaveLength(1);
			});

			it('should retry on OutputParserException and succeed', async () => {
				const validOutput = { name: 'Bob', age: 28 };

				mockStructuredOutputParser.parse
					.mockRejectedValueOnce(new OutputParserException('Invalid JSON'))
					.mockResolvedValueOnce(validOutput);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nOutputFixingParser;
				};

				response.getRetryChain = getMockedRetryChain(JSON.stringify(validOutput));

				const result = await response.parse('Invalid JSON string');

				expect(result).toEqual(validOutput);
				expect(mockStructuredOutputParser.parse.mock.calls).toHaveLength(2);
			});

			it('should handle failed retry attempt', async () => {
				mockStructuredOutputParser.parse
					.mockRejectedValueOnce(new OutputParserException('Invalid JSON'))
					.mockRejectedValueOnce(new Error('Still invalid JSON'));

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nOutputFixingParser;
				};

				response.getRetryChain = getMockedRetryChain('Still not valid JSON');

				await expect(response.parse('Invalid JSON string')).rejects.toThrow('Still invalid JSON');
				expect(mockStructuredOutputParser.parse.mock.calls).toHaveLength(2);
			});

			it('should throw non-OutputParserException errors immediately without retry', async () => {
				const customError = new Error('Database connection error');
				const retryChainSpy = jest.fn();

				mockStructuredOutputParser.parse.mockRejectedValueOnce(customError);

				const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
					response: N8nOutputFixingParser;
				};

				response.getRetryChain = retryChainSpy;

				await expect(response.parse('Some input')).rejects.toThrow('Database connection error');
				expect(mockStructuredOutputParser.parse.mock.calls).toHaveLength(1);
				expect(retryChainSpy).not.toHaveBeenCalled();
			});
		});
	});
});
