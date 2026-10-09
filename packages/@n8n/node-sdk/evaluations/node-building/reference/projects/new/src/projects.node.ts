import { defineNode, defineResource, Schema, t, type JsonSchema } from '@n8n/node-sdk';
import { credential, defineCredential, field } from '@n8n/node-sdk/credentials';

export const node = defineNode({
	id: 'projects',
	displayName: 'Projects',
	credential: credential({
		types: [
			defineCredential({
				id: 'projects.apiKey',
				version: '1.0.0',
				legacyName: 'projectsApi',
				displayName: 'Projects API',
				fields: { apiKey: field.secret('API Key') },
				auth: (a) => a.bearer('apiKey'),
			}),
		],
	}),
	baseUrl: 'http://127.0.0.1:18090/projects/v1',
});

export const projects = node.resource('project');

const NULLABLE_STRING: JsonSchema = { anyOf: [{ type: 'string' }, { type: 'null' }] };

export const PROJECT_URL = 'https://app\\.projects\\.test/p/([^/?#]+)';

export const project = defineResource({
	id: 'projects.project',
	label: 'Project',
	shape: { minLength: 1 },
	extract: PROJECT_URL,
	list: {
		request: { path: '/projects', query: { q: { input: 'search' } } },
		response: t.obj({
			data: t.arr(t.obj({ id: t.str(), name: t.str() })),
			nextCursor: new Schema<string | null>(NULLABLE_STRING, false),
		}),
		items: 'data',
		item: {
			id: (p) => p.id,
			label: (p) => p.name,
			url: (p) => `https://app.projects.test/p/${p.id}`,
		},
		pages: { style: 'cursor', next: 'nextCursor', send: { query: 'cursor' } },
		search: 'service',
	},
});
