import { readFile } from 'node:fs/promises';
import path from 'node:path';

const templatesDir = path.join(__dirname, 'templates');

const declarativeRouteFiles = [
	'declarative/custom/template/nodes/Example/resources/user/index.ts',
	'declarative/github-issues/template/nodes/GithubIssues/resources/issue/index.ts',
	'declarative/github-issues/template/nodes/GithubIssues/resources/issueComment/index.ts',
	'shared/default/.agents/nodes-declarative.md',
];

describe('declarative template routes', () => {
	test.each(declarativeRouteFiles)('%s wraps path values in toPathSegment', async (file) => {
		const content = await readFile(path.join(templatesDir, file), 'utf8');
		const routes = content.match(/url: '=\/[^']*'/g) ?? [];

		expect(routes.length).toBeGreaterThan(0);
		for (const route of routes) {
			for (const [, expression] of route.matchAll(/\{\{(.*?)\}\}/g)) {
				expect(expression.trim()).toMatch(/^toPathSegment\(.+\)$/);
			}
		}
	});
});
