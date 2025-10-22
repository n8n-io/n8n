import { AiBuilderChatRequestDto } from '../ai-build-request.dto';

describe('AiBuilderChatRequestDto', () => {
	const validBasePayload = {
		payload: {
			role: 'user' as const,
			type: 'message' as const,
			text: 'Build me a workflow',
			workflowContext: {
				currentWorkflow: {
					nodes: [],
					connections: {},
				},
			},
			useDeprecatedCredentials: false,
		},
	};

	describe('expressionValues validation', () => {
		it('should validate when expressionValues is an empty object', () => {
			const validRequest = {
				...validBasePayload,
				payload: {
					...validBasePayload.payload,
					workflowContext: {
						...validBasePayload.payload.workflowContext,
						expressionValues: {},
					},
				},
			};

			const result = AiBuilderChatRequestDto.safeParse(validRequest);

			expect(result.success).toBe(true);
		});

		it('should validate when expressionValues contains valid expression data', () => {
			const validRequest = {
				...validBasePayload,
				payload: {
					...validBasePayload.payload,
					workflowContext: {
						...validBasePayload.payload.workflowContext,
						expressionValues: {
							node1: [
								{
									expression: '{{ $json.field }}',
									resolvedValue: 'test value',
									nodeType: 'n8n-nodes-base.set',
								},
							],
							node2: [
								{
									expression: '{{ $now }}',
									resolvedValue: '2024-01-01',
								},
							],
						},
					},
				},
			};

			const result = AiBuilderChatRequestDto.safeParse(validRequest);

			expect(result.success).toBe(true);
		});

		it('should fail when expressionValues has items but all expressions are empty', () => {
			const invalidRequest = {
				...validBasePayload,
				payload: {
					...validBasePayload.payload,
					workflowContext: {
						...validBasePayload.payload.workflowContext,
						expressionValues: {
							node1: [
								{
									expression: '',
									resolvedValue: 'test value',
								},
							],
						},
					},
				},
			};

			const result = AiBuilderChatRequestDto.safeParse(invalidRequest);

			expect(result.success).toBe(false);
		});

		it('should validate when expressionValues is not provided (optional field)', () => {
			const validRequest = {
				...validBasePayload,
			};

			const result = AiBuilderChatRequestDto.safeParse(validRequest);

			expect(result.success).toBe(true);
		});
	});

	describe('currentWorkflow validation', () => {
		it('should validate when currentWorkflow has both nodes and connections', () => {
			const validRequest = {
				...validBasePayload,
			};

			const result = AiBuilderChatRequestDto.safeParse(validRequest);

			expect(result.success).toBe(true);
		});

		it('should validate when currentWorkflow has only nodes', () => {
			const validRequest = {
				...validBasePayload,
				payload: {
					...validBasePayload.payload,
					workflowContext: {
						currentWorkflow: {
							nodes: [],
						},
					},
				},
			};

			const result = AiBuilderChatRequestDto.safeParse(validRequest);

			expect(result.success).toBe(true);
		});

		it('should validate when currentWorkflow has only connections', () => {
			const validRequest = {
				...validBasePayload,
				payload: {
					...validBasePayload.payload,
					workflowContext: {
						currentWorkflow: {
							connections: {},
						},
					},
				},
			};

			const result = AiBuilderChatRequestDto.safeParse(validRequest);

			expect(result.success).toBe(true);
		});

		it('should fail when currentWorkflow has neither nodes nor connections', () => {
			const invalidRequest = {
				...validBasePayload,
				payload: {
					...validBasePayload.payload,
					workflowContext: {
						currentWorkflow: {},
					},
				},
			};

			const result = AiBuilderChatRequestDto.safeParse(invalidRequest);

			expect(result.success).toBe(false);
		});
	});

	describe('executionData validation', () => {
		it('should validate when executionData has runData', () => {
			const validRequest = {
				...validBasePayload,
				payload: {
					...validBasePayload.payload,
					workflowContext: {
						...validBasePayload.payload.workflowContext,
						executionData: {
							runData: {},
						},
					},
				},
			};

			const result = AiBuilderChatRequestDto.safeParse(validRequest);

			expect(result.success).toBe(true);
		});

		it('should validate when executionData has error', () => {
			const validRequest = {
				...validBasePayload,
				payload: {
					...validBasePayload.payload,
					workflowContext: {
						...validBasePayload.payload.workflowContext,
						executionData: {
							error: new Error('test error'),
						},
					},
				},
			};

			const result = AiBuilderChatRequestDto.safeParse(validRequest);

			expect(result.success).toBe(true);
		});

		it('should fail when executionData has neither runData nor error', () => {
			const invalidRequest = {
				...validBasePayload,
				payload: {
					...validBasePayload.payload,
					workflowContext: {
						...validBasePayload.payload.workflowContext,
						executionData: {},
					},
				},
			};

			const result = AiBuilderChatRequestDto.safeParse(invalidRequest);

			expect(result.success).toBe(false);
		});
	});

	describe('executionSchema validation', () => {
		it('should validate when executionSchema has valid items', () => {
			const validRequest = {
				...validBasePayload,
				payload: {
					...validBasePayload.payload,
					workflowContext: {
						...validBasePayload.payload.workflowContext,
						executionSchema: [
							{
								nodeName: 'node1',
								schema: {},
							},
						],
					},
				},
			};

			const result = AiBuilderChatRequestDto.safeParse(validRequest);

			expect(result.success).toBe(true);
		});

		it('should fail when executionSchema has items without nodeName or schema', () => {
			const invalidRequest = {
				...validBasePayload,
				payload: {
					...validBasePayload.payload,
					workflowContext: {
						...validBasePayload.payload.workflowContext,
						executionSchema: [
							{
								nodeName: '',
								schema: {},
							},
						],
					},
				},
			};

			const result = AiBuilderChatRequestDto.safeParse(invalidRequest);

			expect(result.success).toBe(false);
		});
	});

	describe('basic payload validation', () => {
		it('should validate a complete valid request', () => {
			const result = AiBuilderChatRequestDto.safeParse(validBasePayload);

			expect(result.success).toBe(true);
		});

		it('should fail when role is not "user"', () => {
			const invalidRequest = {
				...validBasePayload,
				payload: {
					...validBasePayload.payload,
					role: 'assistant',
				},
			};

			const result = AiBuilderChatRequestDto.safeParse(invalidRequest);

			expect(result.success).toBe(false);
		});

		it('should fail when type is not "message"', () => {
			const invalidRequest = {
				...validBasePayload,
				payload: {
					...validBasePayload.payload,
					type: 'system',
				},
			};

			const result = AiBuilderChatRequestDto.safeParse(invalidRequest);

			expect(result.success).toBe(false);
		});

		it('should fail when text is missing', () => {
			const invalidRequest = {
				...validBasePayload,
				payload: {
					role: 'user' as const,
					type: 'message' as const,
					workflowContext: validBasePayload.payload.workflowContext,
				},
			};

			const result = AiBuilderChatRequestDto.safeParse(invalidRequest);

			expect(result.success).toBe(false);
		});

		it('should validate when useDeprecatedCredentials is explicitly set', () => {
			const requestWithFlag = {
				payload: {
					...validBasePayload.payload,
					useDeprecatedCredentials: true,
				},
			};

			const result = AiBuilderChatRequestDto.safeParse(requestWithFlag);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.payload.useDeprecatedCredentials).toBe(true);
			}
		});
	});
});
