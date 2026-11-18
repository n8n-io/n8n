import { createOverviewWorkflow } from '../__tests__/fixtures';
import {
	PROJECT_SECTION_CARD_LIMIT,
	filterWorkflows,
	searchWorkflows,
	toOfferedGroupings,
	toCategoryCounts,
	toCoverage,
	toSections,
	toWorkflowPageContent,
} from './pageOverviewSections';

const page = { id: 'page-1', title: 'Runbook', excerpt: 'Text', hasTour: false, outdated: false };

const scheduled = createOverviewWorkflow({ id: 'wf-s', category: 'schedule', page });
const webhook = createOverviewWorkflow({
	id: 'wf-w',
	category: 'webhook',
	credentialTypes: ['slackApi', 'githubApi'],
});
const manual = createOverviewWorkflow({
	id: 'wf-m',
	category: 'manual',
	credentialTypes: ['slackApi'],
});
const workflows = [manual, webhook, scheduled];

describe('toCoverage', () => {
	it('should count the documented workflows', () => {
		expect(toCoverage(workflows)).toEqual({ documented: 1, total: 3, percent: 33 });
	});

	it('should give 0 percent for no workflow', () => {
		expect(toCoverage([])).toEqual({ documented: 0, total: 0, percent: 0 });
	});
});

describe('toCategoryCounts', () => {
	it('should count the categories that have a workflow, in the fixed order', () => {
		expect(toCategoryCounts([...workflows, webhook])).toEqual([
			{ category: 'schedule', count: 1 },
			{ category: 'webhook', count: 2 },
			{ category: 'manual', count: 1 },
		]);
	});
});

describe('filterWorkflows', () => {
	it('should keep the workflows that the filter names', () => {
		expect(filterWorkflows(workflows, 'all')).toEqual(workflows);
		expect(filterWorkflows(workflows, 'undocumented')).toEqual([manual, webhook]);
		expect(filterWorkflows(workflows, 'schedule')).toEqual([scheduled]);
	});
});

describe('toSections', () => {
	it('should group by category in the fixed order and leave out the empty categories', () => {
		expect(
			toSections(workflows, 'trigger').map(({ key, workflows: grouped }) => [
				key,
				grouped.map(({ id }) => id),
			]),
		).toEqual([
			['category:schedule', ['wf-s']],
			['category:webhook', ['wf-w']],
			['category:manual', ['wf-m']],
		]);
	});

	it('should show a workflow in each of its connections, and the others in a last section', () => {
		expect(
			toSections(workflows, 'connection').map(({ key, workflows: grouped }) => [
				key,
				grouped.map(({ id }) => id),
			]),
		).toEqual([
			['connection:githubApi', ['wf-w']],
			['connection:slackApi', ['wf-m', 'wf-w']],
			['noConnection', ['wf-s']],
		]);
	});
});

describe('toSections by project', () => {
	const inOps = (id: string, overrides = {}) =>
		createOverviewWorkflow({ id, projectId: 'ops', projectName: 'Ops', ...overrides });
	const sales = createOverviewWorkflow({
		id: 'wf-sales',
		projectId: 'sales',
		projectName: 'Sales',
	});

	it('should give one section for each project, by project name', () => {
		const sections = toSections([sales, inOps('wf-ops')], 'project');

		expect(sections).toEqual([
			expect.objectContaining({
				key: 'project:ops',
				kind: 'project',
				projectName: 'Ops',
				total: 1,
			}),
			expect.objectContaining({ key: 'project:sales', projectId: 'sales', total: 1 }),
		]);
	});

	it('should keep the limit of cards, the documented first, and count every workflow', () => {
		const [section] = toSections(
			[inOps('a'), inOps('b'), inOps('c'), inOps('d'), inOps('e', { page }), inOps('f')],
			'project',
		);

		expect(PROJECT_SECTION_CARD_LIMIT).toBe(4);
		expect(section.workflows.map(({ id }) => id)).toEqual(['e', 'a', 'b', 'c']);
		expect(section.total).toBe(6);
	});

	it('should not limit the sections of the other groupings', () => {
		const many = ['a', 'b', 'c', 'd', 'e'].map((id) => inOps(id));

		expect(toSections(many, 'trigger')[0]).toMatchObject({ total: 5, workflows: many });
	});
});

describe('toOfferedGroupings', () => {
	it('should offer the project grouping first only for a board of every project', () => {
		expect(toOfferedGroupings(undefined)).toEqual(['project', 'trigger', 'connection']);
		expect(toOfferedGroupings('project-1')).toEqual(['trigger', 'connection']);
	});
});

describe('searchWorkflows', () => {
	const documented = createOverviewWorkflow({
		id: 'wf-doc',
		name: 'Daily report',
		projectName: 'Finance',
		page: { ...page, title: 'Runbook', excerpt: 'How the numbers are built.' },
	});
	const other = createOverviewWorkflow({ id: 'wf-other', name: 'Fix data' });

	it.each([
		['the workflow name', 'daily REPORT'],
		['the page title', 'runbook'],
		['the page excerpt', 'numbers'],
		['the project name', ' finance '],
	])('should match %s without the case', (_case, query) => {
		expect(searchWorkflows([documented, other], query)).toEqual([documented]);
	});

	it('should keep every workflow for an empty query and none for no match', () => {
		expect(searchWorkflows([documented, other], '  ')).toEqual([documented, other]);
		expect(searchWorkflows([documented, other], 'zzz')).toEqual([]);
	});
});

describe('toWorkflowPageContent', () => {
	it('should link to the workflow and escape the brackets of its name', () => {
		expect(toWorkflowPageContent({ id: 'wf-1', name: 'Sync [v2]' })).toBe(
			'Workflow: [Sync \\[v2\\]](/workflow/wf-1)\n\n',
		);
	});
});
