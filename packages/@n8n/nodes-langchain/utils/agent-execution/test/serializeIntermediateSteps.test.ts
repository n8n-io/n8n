import { serializeIntermediateSteps } from '../serializeIntermediateSteps';

describe('serializeIntermediateSteps', () => {
	it('should convert class instances with toJSON to plain objects', () => {
		const fakeAIMessage = {
			content: 'I need to call a tool',
			tool_calls: [{ name: 'TestTool', args: { input: 'test' }, id: 'call_123' }],
			additional_kwargs: {},
			response_metadata: { model: 'gpt-4' },
			id: 'msg_abc',
			name: undefined,
			toJSON() {
				return {
					lc: 1,
					type: 'constructor',
					id: ['langchain_core', 'messages', 'AIMessage'],
					kwargs: {
						content: this.content,
						tool_calls: this.tool_calls,
						additional_kwargs: this.additional_kwargs,
					},
				};
			},
		};

		const steps = [
			{
				action: {
					tool: 'TestTool',
					toolInput: { input: 'test' },
					log: 'Calling TestTool',
					messageLog: [fakeAIMessage],
					toolCallId: 'call_123',
					type: 'function',
				},
				observation: 'Tool result',
			},
		];

		serializeIntermediateSteps(steps);

		const serializedMsg = steps[0].action.messageLog[0] as Record<string, unknown>;

		// Should be a plain object, not the original class instance
		expect(serializedMsg).not.toBe(fakeAIMessage);
		expect(typeof serializedMsg.toJSON).toBe('undefined');

		// Direct property access should work
		expect(serializedMsg.content).toBe('I need to call a tool');
		expect(serializedMsg.tool_calls).toEqual([
			{ name: 'TestTool', args: { input: 'test' }, id: 'call_123' },
		]);
		expect(serializedMsg.additional_kwargs).toEqual({});
		expect(serializedMsg.response_metadata).toEqual({ model: 'gpt-4' });
		expect(serializedMsg.id).toBe('msg_abc');
	});

	it('should leave plain objects unchanged', () => {
		const plainMsg = {
			content: 'Hello',
			tool_calls: [],
		};

		const steps = [
			{
				action: {
					tool: 'TestTool',
					toolInput: {},
					log: '',
					messageLog: [plainMsg],
					toolCallId: 'call_1',
					type: 'function',
				},
			},
		];

		serializeIntermediateSteps(steps);

		// Should be the same reference since it has no toJSON
		expect(steps[0].action.messageLog[0]).toBe(plainMsg);
	});

	it('should handle steps without messageLog', () => {
		const steps = [
			{
				action: {
					tool: 'TestTool',
					toolInput: {},
					log: '',
					toolCallId: 'call_1',
					type: 'function',
				},
			},
		];

		// Should not throw
		expect(() =>
			serializeIntermediateSteps(steps as Array<{ action: { messageLog?: unknown[] } }>),
		).not.toThrow();
	});

	it('should handle empty steps array', () => {
		const steps: Array<{ action: { messageLog?: unknown[] } }> = [];
		expect(() => serializeIntermediateSteps(steps)).not.toThrow();
	});

	it('should include type from _getType when not an own property', () => {
		const proto = {
			_getType() {
				return 'ai';
			},
		};
		const fakeMsg = Object.create(proto) as Record<string, unknown>;
		fakeMsg.content = 'test';
		fakeMsg.toJSON = () => ({ lc: 1, type: 'constructor', kwargs: {} });

		const steps = [
			{
				action: {
					messageLog: [fakeMsg],
				},
			},
		];

		serializeIntermediateSteps(steps as Array<{ action: { messageLog?: unknown[] } }>);

		const serialized = steps[0].action.messageLog[0] as Record<string, unknown>;
		expect(serialized.type).toBe('ai');
		expect(serialized.content).toBe('test');
	});

	it('should handle mixed messageLog entries', () => {
		const classInstance = {
			content: 'from class',
			toJSON() {
				return { kwargs: { content: this.content } };
			},
		};
		const plainObject = { content: 'from plain' };
		const primitiveValue = 'just a string';

		const steps = [
			{
				action: {
					messageLog: [classInstance, plainObject, primitiveValue],
				},
			},
		];

		serializeIntermediateSteps(steps as Array<{ action: { messageLog?: unknown[] } }>);

		const [serializedClass, unchangedPlain, unchangedPrimitive] = steps[0].action.messageLog;

		// Class instance should be serialized
		expect(serializedClass).not.toBe(classInstance);
		expect((serializedClass as Record<string, unknown>).content).toBe('from class');
		expect(typeof (serializedClass as Record<string, unknown>).toJSON).toBe('undefined');

		// Plain object should be unchanged
		expect(unchangedPlain).toBe(plainObject);

		// Primitive should be unchanged
		expect(unchangedPrimitive).toBe(primitiveValue);
	});
});
