import {
	ROOT_SUB_AGENT_TASK_PATH,
	assertSubAgentPolicyAllowsChild,
	assertSubAgentPolicyAllowsChildCount,
	assertSubAgentTaskPath,
	createChildSubAgentTaskPath,
	isSubAgentTaskPath,
	sanitizeSubAgentTaskName,
} from '../sub-agent-task-path';

describe('sub-agent task paths', () => {
	it('sanitizes display task names into path segments', () => {
		expect(sanitizeSubAgentTaskName('Research API')).toBe('research_api');
		expect(sanitizeSubAgentTaskName('Check tests!!!')).toBe('check_tests');
		expect(sanitizeSubAgentTaskName('__Already---Messy__')).toBe('already_messy');
	});

	it('rejects task names without alphanumeric content', () => {
		expect(() => sanitizeSubAgentTaskName('  ')).toThrow('task name');
		expect(() => sanitizeSubAgentTaskName('!!!')).toThrow('task name');
	});

	it('recognizes valid flat task paths', () => {
		expect(isSubAgentTaskPath(ROOT_SUB_AGENT_TASK_PATH)).toBe(true);
		expect(isSubAgentTaskPath('/root/research')).toBe(true);
	});

	it('rejects nested task paths', () => {
		expect(isSubAgentTaskPath('/root/research/check_tests')).toBe(false);
	});

	it('rejects malformed task paths', () => {
		for (const path of [
			'',
			'root',
			'/',
			'/root/',
			'/root//child',
			'/root/../child',
			'/Root/child',
			'/root/child with spaces',
			'/root/research/check_tests',
		]) {
			expect(isSubAgentTaskPath(path)).toBe(false);
			expect(() => assertSubAgentTaskPath(path)).toThrow('Invalid sub-agent task path');
		}
	});

	it('creates first-level child paths under root', () => {
		expect(createChildSubAgentTaskPath('Research API', 0)).toBe('/root/research_api_0');
	});

	it('disambiguates same-named siblings by child index', () => {
		const first = createChildSubAgentTaskPath('research', 0);
		const second = createChildSubAgentTaskPath('research', 1);
		expect(first).toBe('/root/research_0');
		expect(second).toBe('/root/research_1');
		expect(first).not.toBe(second);
	});

	it('enforces spawn policy before creating a child', () => {
		expect(() => assertSubAgentPolicyAllowsChild({ canSpawnSubAgents: false })).toThrow(
			'does not allow',
		);
		expect(() => assertSubAgentPolicyAllowsChild(undefined)).not.toThrow();
	});

	it('enforces max child count policy', () => {
		expect(() => assertSubAgentPolicyAllowsChildCount(1, { maxChildren: 2 })).not.toThrow();
		expect(() => assertSubAgentPolicyAllowsChildCount(2, { maxChildren: 2 })).toThrow(
			'exceeds maxChildren',
		);
	});
});
