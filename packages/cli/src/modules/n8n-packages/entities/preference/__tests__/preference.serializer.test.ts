import type { AiPreferenceDto } from '@n8n/api-types';

import { PreferenceSerializer } from '../preference.serializer';

describe('PreferenceSerializer', () => {
	const serializer = new PreferenceSerializer();
	const preference: AiPreferenceDto = {
		id: '09c33210-d8be-43a8-859f-1fec0501c035',
		content: 'Use clear node names.',
		source: 'api',
		userId: null,
		user: null,
		projectId: 'project-1',
		project: { id: 'project-1', name: 'Team', type: 'team', icon: null },
		createdBy: { id: 'author-1', email: 'author@example.com', firstName: null, lastName: null },
		scopes: ['aiPreference:update'],
		createdAt: '2026-11-24T10:00:00.000Z',
		updatedAt: '2026-11-24T11:00:00.000Z',
	};

	it('exports the stable identity, scope, and content without local metadata', () => {
		expect(serializer.serialize(preference)).toEqual({
			id: preference.id,
			scope: 'project',
			content: preference.content,
		});
	});

	it('exports instance Preferences', () => {
		expect(serializer.serialize({ ...preference, projectId: null, project: null })).toEqual({
			id: preference.id,
			scope: 'instance',
			content: preference.content,
		});
	});

	it('refuses personal Preferences', () => {
		expect(() =>
			serializer.serialize({ ...preference, userId: 'user-1', projectId: null, project: null }),
		).toThrow('Personal Preferences cannot be exported.');
	});

	it('refuses Preferences in personal projects', () => {
		expect(() =>
			serializer.serialize({
				...preference,
				project: { id: 'project-1', name: 'Personal', type: 'personal', icon: null },
			}),
		).toThrow('Personal Preferences cannot be exported.');
	});
});
