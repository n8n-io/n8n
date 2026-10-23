import { flushPromises, mount } from '@vue/test-utils';
import { fireEvent } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { nextTick } from 'vue';

import AgentSkillUpload from '../components/AgentSkillUpload.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const skillMarkdown = '---\nname: Research\ndescription: Use for research\n---\nMain instructions';

function mountUpload() {
	return mount(AgentSkillUpload, {
		global: {
			stubs: {
				N8nIcon: true,
			},
		},
	});
}

describe('AgentSkillUpload', () => {
	it('imports SKILL.md frontmatter and instructions', async () => {
		const wrapper = mountUpload();
		const file = makeFile(
			'---\nname: Summarize notes\ndescription: Use for notes\nallowed_tools:\n  - load_workflow\nrecommended_tools:\n  - search_docs\n---\n# Playbook\nFollow these steps.',
			'SKILL.md',
		);

		await fireEvent.change(wrapper.get('[data-testid="agent-skill-skill-md-file-input"]').element, {
			target: { files: [file] },
		});
		await flushPromises();

		expect(wrapper.emitted('uploaded')?.at(-1)).toEqual([
			{
				name: 'Summarize notes',
				description: 'Use for notes',
				instructions: '# Playbook\nFollow these steps.',
				allowedTools: ['load_workflow'],
				references: undefined,
			},
		]);
		expect(wrapper.emitted('import:skill')?.at(-1)).toEqual([
			{ source: 'skill_file', status: 'success', referenceCount: 0 },
		]);
	});

	it('imports markdown references from a folder', async () => {
		const wrapper = mountUpload();
		const files = [
			makeFile(skillMarkdown, 'skill-folder/SKILL.md'),
			makeFile('# Guide', 'skill-folder/references/guide.md'),
		];

		await fireEvent.change(wrapper.get('[data-testid="agent-skill-folder-file-input"]').element, {
			target: { files },
		});
		await flushPromises();

		expect(wrapper.emitted('uploaded')?.at(-1)).toEqual([
			expect.objectContaining({
				name: 'Research',
				references: [{ path: 'references/guide.md', content: '# Guide' }],
			}),
		]);
	});

	it('rejects scripts and allows another import', async () => {
		const wrapper = mountUpload();
		const input = wrapper.get('[data-testid="agent-skill-folder-file-input"]');
		const skillFile = makeFile(skillMarkdown, 'skill-folder/SKILL.md');

		await fireEvent.change(input.element, {
			target: { files: [skillFile, makeFile('print("no")', 'skill-folder/scripts/run.py')] },
		});
		await flushPromises();

		expect(wrapper.get('[role="alert"]').text()).toBe(
			'agents.builder.skills.import.scriptsUnsupported',
		);
		expect(wrapper.emitted('uploaded')).toBeUndefined();
		expect(wrapper.emitted('import:skill')?.at(-1)).toEqual([
			{
				source: 'folder',
				status: 'error',
				error: 'agents.builder.skills.import.scriptsUnsupported',
			},
		]);

		await fireEvent.change(input.element, { target: { files: [skillFile] } });
		await flushPromises();

		expect(wrapper.find('[role="alert"]').exists()).toBe(false);
		expect(wrapper.emitted('uploaded')?.at(-1)).toEqual([
			expect.objectContaining({ name: 'Research', instructions: 'Main instructions' }),
		]);
	});

	it('imports a dropped file when directory entries are unavailable', async () => {
		const wrapper = mountUpload();
		await nextTick();

		await wrapper.get('[data-testid="agent-skill-drop-zone"]').trigger('drop', {
			dataTransfer: { files: [makeFile(skillMarkdown, 'SKILL.md')], items: [] },
		});
		await flushPromises();

		expect(wrapper.emitted('uploaded')?.at(-1)).toEqual([
			expect.objectContaining({ name: 'Research', instructions: 'Main instructions' }),
		]);
	});

	it('reads all dropped folder batches and keeps reference paths', async () => {
		const wrapper = mountUpload();
		await nextTick();
		const folder = directoryEntry('/skill-folder', [
			[fileEntry('/skill-folder/SKILL.md', skillMarkdown)],
			[
				directoryEntry('/skill-folder/references', [
					[fileEntry('/skill-folder/references/guide.md', '# Guide')],
				]),
			],
		]);

		await wrapper.get('[data-testid="agent-skill-drop-zone"]').trigger('drop', {
			dataTransfer: { files: [], items: [{ webkitGetAsEntry: () => folder }] },
		});
		await flushPromises();

		expect(wrapper.emitted('uploaded')?.at(-1)).toEqual([
			expect.objectContaining({
				name: 'Research',
				references: [{ path: 'references/guide.md', content: '# Guide' }],
			}),
		]);
		expect(wrapper.emitted('import:skill')?.at(-1)).toEqual([
			{ source: 'folder', status: 'success', referenceCount: 1 },
		]);
	});
});

function makeFile(content: string, path: string): File {
	const file = new File([content], path.split('/').at(-1) ?? 'file.md');
	Object.defineProperties(file, {
		webkitRelativePath: { value: path },
		text: { value: async () => content },
	});
	return file;
}

function fileEntry(fullPath: string, content: string): FileSystemFileEntry {
	return mock<FileSystemFileEntry>({
		isFile: true,
		isDirectory: false,
		fullPath,
		file: (resolve) => resolve(makeFile(content, fullPath)),
	});
}

function directoryEntry(fullPath: string, batches: FileSystemEntry[][]): FileSystemDirectoryEntry {
	return mock<FileSystemDirectoryEntry>({
		isDirectory: true,
		isFile: false,
		fullPath,
		createReader: () => {
			let index = 0;
			return mock<FileSystemDirectoryReader>({
				readEntries: (resolve) => resolve(batches[index++] ?? []),
			});
		},
	});
}
