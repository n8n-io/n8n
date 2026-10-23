import { unzipSync, strFromU8 } from 'fflate';

import { useAgentSkillImport } from '../../composables/useAgentSkillImport';
import type { AgentSkill } from '../../types';
import { agentSkillToMarkdown, exportAgentSkill } from '../agentSkillExport';

const base: AgentSkill = {
	name: 'research-search',
	description: 'Find research: cite the evidence.',
	instructions: 'Cite every source.\n\n## Steps\n\n1. Search.',
};

/** jsdom's Blob has no `arrayBuffer()`. */
async function blobBytes(blob: Blob): Promise<Uint8Array> {
	return await new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
		reader.onerror = () => reject(reader.error);
		reader.readAsArrayBuffer(blob);
	});
}

describe('agentSkillExport', () => {
	it('writes frontmatter and the instructions', () => {
		expect(agentSkillToMarkdown({ ...base, allowedTools: ['search'] })).toBe(
			[
				'---',
				'name: research-search',
				'description: "Find research: cite the evidence."',
				'allowed_tools:',
				'  - search',
				'---',
				'',
				base.instructions,
				'',
			].join('\n'),
		);
	});

	it('exports a skill without references as SKILL.md that the upload reads back', async () => {
		const result = await exportAgentSkill(base);

		expect(result.format).toBe('markdown');
		expect(result.fileName).toBe('SKILL.md');
		const file = new File([result.blob], 'SKILL.md');
		await expect(useAgentSkillImport().importSkillFiles([file])).resolves.toEqual(base);
	});

	it('exports a skill with references as a zip that the upload reads back', async () => {
		const skill: AgentSkill = {
			...base,
			name: 'a/b: c',
			references: [{ path: 'references/style.md', content: '# Style' }],
		};

		const result = await exportAgentSkill(skill);

		expect(result.format).toBe('zip');
		expect(result.fileName).toBe('a-b- c.zip');
		const entries = unzipSync(await blobBytes(result.blob));
		expect(Object.keys(entries).sort()).toEqual(['a-b- c/SKILL.md', 'a-b- c/references/style.md']);
		const files = Object.entries(entries).map(([path, bytes]) => {
			const file = new File([strFromU8(bytes)], path.split('/').at(-1)!);
			Object.defineProperty(file, 'webkitRelativePath', { value: path });
			return file;
		});
		await expect(useAgentSkillImport().importSkillFiles(files)).resolves.toEqual(skill);
	});

	it.each(['.', '..', '  '])('names the folder `skill` for the name %j', async (name) => {
		const result = await exportAgentSkill({
			...base,
			name,
			references: [{ path: 'references/style.md', content: '# Style' }],
		});

		expect(result.fileName).toBe('skill.zip');
		const entries = unzipSync(await blobBytes(result.blob));
		expect(Object.keys(entries).sort()).toEqual(['skill/SKILL.md', 'skill/references/style.md']);
	});
});
