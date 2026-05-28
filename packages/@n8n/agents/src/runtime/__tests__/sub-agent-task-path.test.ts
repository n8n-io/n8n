import {
	ROOT_SUB_AGENT_TASK_PATH,
	assertSubAgentPolicyAllowsChild,
	assertSubAgentPolicyAllowsChildCount,
	assertSubAgentTaskPath,
	createChildSubAgentTaskPath,
	getSubAgentTaskPathDepth,
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

	it('recognizes valid rooted task paths', () => {
		expect(isSubAgentTaskPath(ROOT_SUB_AGENT_TASK_PATH)).toBe(true);
		expect(isSubAgentTaskPath('/root/research')).toBe(true);
		expect(isSubAgentTaskPath('/root/research/check_tests')).toBe(true);
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
		]) {
			expect(isSubAgentTaskPath(path)).toBe(false);
			expect(() => assertSubAgentTaskPath(path)).toThrow('Invalid sub-agent task path');
		}
	});

	it('calculates depth below root', () => {
		expect(getSubAgentTaskPathDepth('/root')).toBe(0);
		expect(getSubAgentTaskPathDepth('/root/research')).toBe(1);
		expect(getSubAgentTaskPathDepth('/root/research/check_tests')).toBe(2);
	});

	it('creates child paths from root or a parent path', () => {
		expect(createChildSubAgentTaskPath(undefined, 'Research API')).toBe('/root/research_api');
		expect(createChildSubAgentTaskPath('/root/research_api', 'Check tests')).toBe(
			'/root/research_api/check_tests',
		);
	});

	it('enforces spawn and depth policy before creating a child', () => {
		expect(() => assertSubAgentPolicyAllowsChild('/root', { canSpawnSubAgents: false })).toThrow(
			'does not allow',
		);

		expect(() => assertSubAgentPolicyAllowsChild('/root', { maxDepth: 1 })).not.toThrow();
		expect(() => assertSubAgentPolicyAllowsChild('/root/research', { maxDepth: 1 })).toThrow(
			'exceeds maxDepth',
		);
	});

	it('enforces max child count policy', () => {
		expect(() => assertSubAgentPolicyAllowsChildCount(1, { maxChildren: 2 })).not.toThrow();
		expect(() => assertSubAgentPolicyAllowsChildCount(2, { maxChildren: 2 })).toThrow(
			'exceeds maxChildren',
		);
	});
});
