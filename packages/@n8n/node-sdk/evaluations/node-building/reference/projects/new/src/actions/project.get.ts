import { matches, path, ref, t, UserError } from '@n8n/node-sdk';

import { project, PROJECT_URL, projects } from '../projects.node';

const projectOutput = t.obj({ id: t.str(), name: t.str(), createdAt: t.str() });

export const getProject = projects.action('get', {
	action: 'Get a project',
	summary: 'Get a project by its ID or URL.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	input: { project: ref(project).title('Project') },
	output: projectOutput,
	async run({ input, http }) {
		const id = new RegExp(`^${PROJECT_URL}`).exec(input.project)?.[1] ?? input.project;
		const found = await http.request({ path: path`/projects/${id}` });
		if (!matches(projectOutput, found))
			throw new UserError('Projects returned an unexpected project');
		return found;
	},
});
