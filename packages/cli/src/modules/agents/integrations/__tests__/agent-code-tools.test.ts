import { createGetMyCodeTool, createSetCodeTool, createTypecheckTool } from '../agent-code-tools';

const ctx = {
	resumeData: undefined,
	suspend: jest.fn().mockResolvedValue(undefined as never),
	parentTelemetry: undefined,
};

describe('createGetMyCodeTool', () => {
	it('returns the code from the repository wrapped in { code }', async () => {
		const agentRepository = {
			findByIdAndProjectId: jest.fn().mockResolvedValue({ code: 'const x = 1;' }),
		};
		const tool = createGetMyCodeTool(agentRepository, 'agent-1', 'project-1').build();

		const result = await tool.handler!({}, ctx);

		expect(agentRepository.findByIdAndProjectId).toHaveBeenCalledWith('agent-1', 'project-1');
		expect(result).toEqual({ code: 'const x = 1;' });
	});

	it('returns an empty string when the agent entity is not found', async () => {
		const agentRepository = {
			findByIdAndProjectId: jest.fn().mockResolvedValue(null),
		};
		const tool = createGetMyCodeTool(agentRepository, 'agent-1', 'project-1').build();

		const result = await tool.handler!({}, ctx);

		expect(result).toEqual({ code: '' });
	});
});

describe('createTypecheckTool', () => {
	it('returns { ok: true, error: null } when validation passes', async () => {
		const secureRuntime = { describeSecurely: jest.fn().mockResolvedValue(undefined) };
		const tool = createTypecheckTool(secureRuntime).build();

		const result = await tool.handler!({ code: 'const x = 1;' }, ctx);

		expect(secureRuntime.describeSecurely).toHaveBeenCalledWith('const x = 1;');
		expect(result).toEqual({ ok: true, error: null });
	});

	it('returns { ok: false, error } when validation fails', async () => {
		const secureRuntime = {
			describeSecurely: jest.fn().mockRejectedValue(new Error('Unexpected token')),
		};
		const tool = createTypecheckTool(secureRuntime).build();

		const result = await tool.handler!({ code: 'bad code!!!' }, ctx);

		expect(result).toEqual({ ok: false, error: 'Unexpected token' });
	});
});

describe('createSetCodeTool', () => {
	it('calls setCode with the provided code and returns { ok: true }', async () => {
		const setCode = jest.fn().mockResolvedValue(undefined);
		const tool = createSetCodeTool(setCode).build();

		const result = await tool.handler!({ code: 'export default new Agent()' }, ctx);

		expect(setCode).toHaveBeenCalledWith('export default new Agent()');
		expect(result).toEqual({ ok: true });
	});
});
