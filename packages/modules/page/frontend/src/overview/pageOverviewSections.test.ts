import { createOverviewWorkflow } from '../__tests__/fixtures';
import {
	PROJECT_SECTION_CARD_LIMIT,
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

describe('toSections', () => {
	it('should group by category in the fixed order and leave out the empty categories', () => {
		expect(
			toSections(workflows, 'project-1').map(({ key, workflows: grouped }) => [
				key,
				grouped.map(({ id }) => id),
			]),
		).toEqual([
			['category:schedule', ['wf-s']],
			['category:webhook', ['wf-w']],
			['category:manual', ['wf-m']],
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
		const sections = toSections([sales, inOps('wf-ops')], undefined);

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
			undefined,
		);

		expect(PROJECT_SECTION_CARD_LIMIT).toBe(4);
		expect(section.workflows.map(({ id }) => id)).toEqual(['e', 'a', 'b', 'c']);
		expect(section.total).toBe(6);
	});

	it('should not limit the sections of a board of one project', () => {
		const many = ['a', 'b', 'c', 'd', 'e'].map((id) => inOps(id));

		expect(toSections(many, 'ops')[0]).toMatchObject({ total: 5, workflows: many });
	});
});

describe('toWorkflowPageContent', () => {
	it('should link to the workflow and escape the brackets of its name', () => {
		expect(toWorkflowPageContent({ id: 'wf-1', name: 'Sync [v2]' })).toBe(
			'Workflow: [Sync \\[v2\\]](/workflow/wf-1)\n\n',
		);
	});
});
