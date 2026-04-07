import { createGetMyCodeTool, createSetCodeTool, createTypecheckTool } from '../agent-code-tools';

const ctx = {
	resumeData: undefined,
	suspend: jest.fn().mockResolvedValue(undefined as never),
	parentTelemetry: undefined,
};

describe('createGetMyCodeTool', () => {
	it('returns the code from the callback wrapped in { code }', async () => {
		const getCode = jest.fn().mockResolvedValue('const x = 1;');
		const tool = createGetMyCodeTool(getCode).build();

		const result = await tool.handler!({}, ctx);

		expect(getCode).toHaveBeenCalledTimes(1);
		expect(result).toEqual({ code: 'const x = 1;' });
	});
});

describe('createTypecheckTool', () => {
	it('returns { ok: true, error: null } when validation passes', async () => {
		const validate = jest.fn().mockResolvedValue({ ok: true, error: null });
		const tool = createTypecheckTool(validate).build();

		const result = await tool.handler!({ code: 'const x = 1;' }, ctx);

		expect(validate).toHaveBeenCalledWith('const x = 1;');
		expect(result).toEqual({ ok: true, error: null });
	});

	it('returns { ok: false, error } when validation fails', async () => {
		const validate = jest.fn().mockResolvedValue({ ok: false, error: 'Unexpected token' });
		const tool = createTypecheckTool(validate).build();

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
