import type { BuiltTool } from '@n8n/agents';
import { buildToolRegistry } from '../tool-registry';

function mkTool(name: string, metadata?: Record<string, unknown>): BuiltTool {
	return { name, metadata } as BuiltTool;
}

describe('buildToolRegistry', () => {
	it('returns kind:tool for tools with no metadata', () => {
		const r = buildToolRegistry([mkTool('http')]);
		expect(r.get('http')).toEqual({ kind: 'tool' });
	});

	it('extracts workflow metadata when present', () => {
		const r = buildToolRegistry([
			mkTool('run-wf', {
				kind: 'workflow',
				workflowId: 'wf-1',
				workflowName: 'Run WF',
				triggerType: 'manual',
			}),
		]);
		expect(r.get('run-wf')).toEqual({
			kind: 'workflow',
			workflowId: 'wf-1',
			workflowName: 'Run WF',
			triggerType: 'manual',
		});
	});

	it('falls back to kind:tool when metadata lacks workflow fields', () => {
		const r = buildToolRegistry([mkTool('weird', { unrelated: 'stuff' })]);
		expect(r.get('weird')).toEqual({ kind: 'tool' });
	});

	it('falls back to kind:tool when workflowId/workflowName are missing', () => {
		const r = buildToolRegistry([mkTool('partial', { kind: 'workflow' })]);
		expect(r.get('partial')).toEqual({ kind: 'tool' });
	});

	it('omits triggerType when not a string', () => {
		const r = buildToolRegistry([
			mkTool('wf', { kind: 'workflow', workflowId: 'wf-1', workflowName: 'X', triggerType: 42 }),
		]);
		expect(r.get('wf')).toEqual({ kind: 'workflow', workflowId: 'wf-1', workflowName: 'X' });
	});

	it('keys the registry by tool name', () => {
		const r = buildToolRegistry([mkTool('a'), mkTool('b')]);
		expect(r.size).toBe(2);
		expect(r.has('a')).toBe(true);
		expect(r.has('b')).toBe(true);
	});
});
