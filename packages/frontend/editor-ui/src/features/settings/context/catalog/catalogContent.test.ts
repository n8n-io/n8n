import { agentSkillSchema } from '@n8n/api-types';

import { SKILL_CATALOG } from './skillCatalog';
import { parseSkillMarkdown } from '@/features/agents/composables/useAgentSkillImport';

// These files are test inputs. The application fetches their source from GitHub.
const files = import.meta.glob<string>('./content/**/*.md', {
	query: '?raw',
	import: 'default',
	eager: true,
});

describe('guide-based catalog skills', () => {
	it.each(['n8n-memory-optimization', 'n8n-workflow-tidy-up'])(
		'keeps %s within the server limits and points to its source folder',
		(id) => {
			const prefix = `./content/${id}/`;
			const skill = {
				...parseSkillMarkdown(files[`${prefix}SKILL.md`]),
				references: Object.entries(files)
					.filter(([path]) => path.startsWith(`${prefix}references/`))
					.map(([path, content]) => ({ path: path.slice(prefix.length), content })),
			};
			expect(agentSkillSchema.safeParse(skill).error).toBeUndefined();
			const paths = new Set(skill.references.map((reference) => reference.path));
			for (const path of skill.instructions.matchAll(/(?:\(|`)(references\/[^)`\s]+\.md)/g)) {
				expect(paths.has(path[1]), path[1]).toBe(true);
			}
			const entry = SKILL_CATALOG.find((item) => item.id === id);
			expect(entry?.location).toBe(
				`packages/frontend/editor-ui/src/features/settings/context/catalog/content/${id}`,
			);
			expect(entry?.url).toBe(`https://github.com/n8n-io/n8n/tree/master/${entry?.location}`);
		},
	);

	it('retains the workflow guide author and MIT permission notice', () => {
		const text = files['./content/n8n-workflow-tidy-up/SKILL.md'];
		expect(text).toContain('Copyright (c) 2026 Michael Frostbutter');
		expect(text).toContain('Permission is hereby granted, free of charge');
	});
});
