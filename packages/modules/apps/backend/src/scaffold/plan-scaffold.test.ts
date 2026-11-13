import { appPlanSchema } from '@n8n/api-types';

import { checkBuildSource } from './app-scaffold';
import { createPlanScaffold } from './plan-scaffold';

const plan = appPlanSchema.parse({
	nav: { id: 'nav', kind: 'nav', label: 'Desk' },
	screens: [
		{
			id: 'home',
			name: 'Home',
			components: [
				{ id: 'drafts', kind: 'table', label: 'Drafts', items: ['Title'] },
				{ id: 'approve', kind: 'button', label: 'Approve', region: 'aside' },
			],
		},
	],
	buildOrder: ['shell', 'nav', 'drafts', 'approve'],
});

describe('createPlanScaffold', () => {
	const files = createPlanScaffold(plan);
	const text = (name: string) => files.get(name)?.toString('utf8') ?? '';

	it('keeps a buildable scaffold', () => {
		expect(() => checkBuildSource(files)).not.toThrow();
	});

	it('renders one v-pre placeholder per planned component in App.vue', () => {
		const app = text('src/App.vue');
		expect(app.match(/ v-pre>/g)).toHaveLength(3);
		for (const id of ['shell', 'nav', 'drafts', 'approve']) {
			expect(app).toContain(`data-plan-id="${id}"`);
		}
	});

	it('ships the plan for the preview overlay', () => {
		expect(JSON.parse(text('public/plan.json'))).toEqual(plan);
		expect(text('src/plan/wireframe.css')).toContain('.wf-block');
	});

	it('mounts detailed parts from a module instead of inlining them in App.vue', () => {
		const detailed = appPlanSchema.parse({
			screens: [
				{
					id: 'home',
					name: 'Home',
					components: [
						{ id: 'drafts', kind: 'table', label: 'Drafts', detail: { html: '<p>Sample row</p>' } },
					],
				},
			],
		});
		const files = createPlanScaffold(detailed);
		const app = files.get('src/App.vue')?.toString('utf8') ?? '';
		expect(app).toContain('onMounted(mountPlanDetails)');
		expect(app).not.toContain('Sample row');
		expect(files.get('src/plan/details.js')?.toString('utf8')).toContain('Sample row');
	});
});
