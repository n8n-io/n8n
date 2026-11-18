import { createMemoryHistory, createRouter } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { projectsRoutes } from '@/features/collaboration/projects/projects.routes';
import { DOC_OVERVIEW_VIEW } from './constants';

describe('/home routes', () => {
	const router = createRouter({ history: createMemoryHistory(), routes: projectsRoutes });

	it('resolves /home to the doc overview', () => {
		expect(router.resolve('/home').name).toBe(DOC_OVERVIEW_VIEW);
	});

	it('keeps the old /home child routes', () => {
		expect(router.resolve('/home/workflows').name).toBe(VIEWS.WORKFLOWS);
		expect(router.resolve('/home/credentials').name).toBe(VIEWS.CREDENTIALS);
	});
});
