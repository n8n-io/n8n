import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import { buildPreview, type PreviewSide } from '../promotion-preview';

const project = { id: 'p1', name: 'Team', target: 'projects/team-p1' };
const skill = {
	id: 'skill_with-hyphens',
	name: 'Guide',
	target: `${project.target}/skills/guide-skill_with-hyphens`,
};
const global = { id: 'skill_global', name: 'Shared', target: 'skills/shared-skill_global' };
const side = (skills: PackageManifest['skills'], blob: string): PreviewSide => ({
	manifest: {
		packageFormatVersion: '2',
		sourceId: 'source',
		sourceN8nVersion: '2.0.0',
		projects: [project],
		skills,
	},
	blobByPath: new Map(skills?.map(({ target }) => [`n8n/${target}/skill.json`, blob])),
});

describe('Skills in the promotion preview', () => {
	it('uses manifest identities for project and instance Skills', () => {
		const result = buildPreview({
			operation: { direction: 'promote', planned: null },
			projectIds: ['p1'],
			base: side([], 'before'),
			desired: side([skill, global], 'after'),
		});
		expect(result.resources).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: `skill:${skill.id}`,
					id: skill.id,
					parentKey: 'project:p1',
					change: 'added',
					selectable: true,
				}),
				expect.objectContaining({
					key: `skill:${global.id}`,
					parentKey: null,
					change: 'added',
					selectable: true,
				}),
			]),
		);
	});

	it('does not treat an unavailable collection as a removal', () => {
		const result = buildPreview({
			operation: { direction: 'promote', planned: null },
			projectIds: ['p1'],
			base: side([skill], 'before'),
			desired: side(undefined, 'after'),
		});
		expect(result.resources).toEqual([]);
	});

	it('reports a reviewed deletion and a rename without changing identity', () => {
		const result = buildPreview({
			operation: { direction: 'promote', planned: null },
			projectIds: ['p1'],
			base: side([skill, global], 'before'),
			desired: side(
				[{ ...skill, name: 'New guide', target: `${project.target}/skills/new-${skill.id}` }],
				'after',
			),
		});
		expect(result.resources).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: `skill:${skill.id}`,
					previousName: 'Guide',
					change: 'modified',
				}),
				expect.objectContaining({ key: `skill:${global.id}`, change: 'deleted' }),
			]),
		);
	});

	it('uses the Apply plan for identical content and consumer impact', () => {
		const result = buildPreview({
			operation: {
				direction: 'apply',
				planned: new Map([
					[`skill:${skill.id}`, { change: 'modified', followingAgentCount: 2 }],
					[`skill:${global.id}`, { change: 'unchanged' }],
				]),
			},
			projectIds: ['p1'],
			base: side([skill, global], 'before'),
			desired: side([skill, global], 'after'),
		});
		expect(result.resources.filter(({ type }) => type === 'skill')).toEqual([
			expect.objectContaining({ key: `skill:${skill.id}`, followingAgentCount: 2 }),
		]);
	});
});
