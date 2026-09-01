import {
	ROOT_SUB_AGENT_TASK_PATH,
	assertSubAgentTaskPath,
	createChildSubAgentTaskPath,
	isSubAgentTaskPath,
	sanitizeSubAgentTaskName,
} from '../tools/sub-agent-task-path';

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

	it('recognizes root and first-level child task paths', () => {
		expect(isSubAgentTaskPath(ROOT_SUB_AGENT_TASK_PATH)).toBe(true);
		expect(isSubAgentTaskPath('/root/research')).toBe(true);
		expect(isSubAgentTaskPath('/root/research_api_0')).toBe(true);
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

	it('creates child paths with the parent child index appended', () => {
		expect(createChildSubAgentTaskPath('Research API', 0)).toBe('/root/research_api_0');
		expect(createChildSubAgentTaskPath('Check tests', 1)).toBe('/root/check_tests_1');
	});

	it('disambiguates same-named siblings by child index', () => {
		const first = createChildSubAgentTaskPath('research', 0);
		const second = createChildSubAgentTaskPath('research', 1);
		expect(first).toBe('/root/research_0');
		expect(second).toBe('/root/research_1');
		expect(first).not.toBe(second);
	});
});
