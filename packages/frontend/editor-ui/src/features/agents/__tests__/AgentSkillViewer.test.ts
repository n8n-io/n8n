import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, onMounted, reactive } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_MAX_COUNT,
} from '@n8n/api-types';
import AgentSkillViewer from '@/features/agents/components/AgentSkillViewer.vue';
import {
	MAX_DIAGRAM_LENGTH,
	renderSkillMermaid,
	type SkillMermaidResult,
} from '@/features/agents/components/skillMermaidRenderer';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { saveAs } from 'file-saver';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));
const track = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));

vi.mock('@/features/agents/components/skillMermaidRenderer', { spy: true });
const uiStore = reactive({ appliedTheme: 'light' });
vi.mock('@/app/stores/ui.store', () => ({ useUIStore: () => uiStore }));
const workflowMentionsFlag = vi.hoisted(() => ({ enabled: false }));
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		isVariantEnabled: (name: string, variant: string) =>
			name === '152_workflows_in_skills' &&
			variant === (workflowMentionsFlag.enabled ? 'variant' : 'control'),
	}),
}));
vi.mock('vue-router', () => ({
	useRouter: () => ({
		resolve: ({ params }: { params: { workflowId: string } }) => ({
			href: `/base/workflow/${params.workflowId}`,
		}),
	}),
}));

enableAutoUnmount(afterEach);
beforeEach(() => {
	uiStore.appliedTheme = 'light';
	workflowMentionsFlag.enabled = false;
});

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) => {
			if (
				key === 'agents.builder.skills.instructions.characterCount' ||
				key === 'agents.builder.skills.references.characterCount'
			) {
				return `${options?.interpolate?.count} / ${options?.interpolate?.max} characters`;
			}
			if (key === 'agents.builder.skills.references.maxCount') {
				return `Skills can have up to ${options?.interpolate?.max} reference files.`;
			}
			return key;
		},
	}),
}));

const N8nFormInputStub = defineComponent({
	name: 'N8nFormInput',
	props: ['modelValue', 'label', 'disabled'],
	emits: ['update:model-value', 'validate'],
	setup(props, { emit, attrs }) {
		onMounted(() => emit('validate', true));
		return () =>
			h('label', [
				props.label,
				h('input', {
					...attrs,
					value: props.modelValue,
					disabled: props.disabled,
					onInput: (event: Event) =>
						emit('update:model-value', (event.target as HTMLInputElement).value),
				}),
			]);
	},
});

describe('AgentSkillViewer', () => {
	it('shows script files as plain text and offers binary assets for download', async () => {
		const wrapper = mountViewer({
			readOnly: true,
			skill: {
				name: 'Research',
				description: 'Use for research',
				instructions: 'Main body',
				references: [
					{ path: 'scripts/example.js', content: 'const label = "<b>Example</b>";' },
					{ path: 'assets/logo.png', content: 'AP8K', isBinary: true },
				],
			},
			selectedPath: 'scripts/example.js',
		});

		expect(wrapper.get('pre').text()).toBe('const label = "<b>Example</b>";');
		await wrapper.setProps({ selectedPath: 'assets/logo.png' });
		expect(wrapper.text()).not.toContain('AP8K');
		await wrapper.get('button').trigger('click');
		expect(saveAs).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'logo.png', size: 3 }),
			'logo.png',
		);
	});

	it('renames the selected reference without changing its directory', async () => {
		const wrapper = mountViewer({
			skill: {
				name: 'Research',
				description: 'Use for research',
				instructions: 'Main body',
				references: [
					{
						path: 'references/guide.md',
						content: '# Guide',
					},
				],
			},
			selectedPath: 'references/guide.md',
		});

		const input = wrapper.find<HTMLInputElement>(
			'[data-testid="agent-skill-reference-name-input"] input',
		);
		expect(input.element.value).toBe('guide');

		await input.setValue('overview');

		expect(wrapper.emitted('update:skill')?.at(-1)).toEqual([
			{
				references: [
					{
						path: 'references/overview.md',
						content: '# Guide',
					},
				],
			},
		]);
		expect(wrapper.emitted('select:path')?.at(-1)).toEqual(['references/overview.md']);
	});

	it('does not rename references to invalid or duplicate file names', async () => {
		const wrapper = mountViewer({
			skill: {
				name: 'Research',
				description: 'Use for research',
				instructions: 'Main body',
				references: [
					{
						path: 'references/guide.md',
						content: '# Guide',
					},
					{
						path: 'references/overview.md',
						content: '# Overview',
					},
				],
			},
			selectedPath: 'references/guide.md',
		});

		const input = wrapper.find<HTMLInputElement>(
			'[data-testid="agent-skill-reference-name-input"] input',
		);
		const initialUpdateCount = wrapper.emitted('update:skill')?.length ?? 0;

		await input.setValue('../bad');
		await input.setValue('overview');

		expect(wrapper.emitted('update:skill')?.length ?? 0).toBe(initialUpdateCount);
		expect(wrapper.emitted('select:path')).toBeUndefined();
	});

	it('shows a read-only skill as text, without form fields', () => {
		const wrapper = mountViewer({
			readOnly: true,
			skill: {
				name: 'Triage',
				description: 'Use for triage',
				instructions: 'Check the SLA first.',
				references: [{ path: 'references/labels.md', content: 'Use needs-repro.' }],
			},
		});

		expect(wrapper.find('[data-testid="agent-skill-description-text"]').text()).toBe(
			'Use for triage',
		);
		expect(wrapper.find('[data-testid="agent-skill-instructions-text"]').text()).toContain(
			'Check the SLA first.',
		);
		expect(wrapper.find('[data-testid="agent-skill-description-input"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-skill-instructions-editor"]').exists()).toBe(false);
		expect(wrapper.text()).not.toContain('characters');
	});

	it('shows the task lists of a read-only skill as disabled checkboxes', () => {
		const wrapper = mountViewer({
			readOnly: true,
			skill: {
				name: 'Triage',
				description: 'Use for triage',
				instructions: '- [ ] Check the SLA',
			},
		});

		const checkbox = wrapper.find('[data-testid="agent-skill-instructions-text"] input');
		expect(checkbox.attributes('type')).toBe('checkbox');
		expect(checkbox.attributes('disabled')).toBeDefined();
	});

	it('links a workflow mention in a read-only skill to the workflow', () => {
		workflowMentionsFlag.enabled = true;
		const wrapper = mountViewer({
			readOnly: true,
			skill: {
				name: 'Report',
				description: 'Send the report',
				instructions: 'Run [Weekly report](n8n://workflow/wf1).',
			},
		});

		const text = wrapper.find('[data-testid="agent-skill-instructions-text"]');
		expect(text.find('a').attributes('href')).toBe('/base/workflow/wf1');
		expect(text.find('a').text()).toBe('Weekly report');
		expect(text.classes().join(' ')).toContain('workflowChips');
	});

	it('keeps the mention link unchanged in a read-only skill when the flag is off', () => {
		const wrapper = mountViewer({
			readOnly: true,
			skill: {
				name: 'Report',
				description: 'Send the report',
				instructions: 'Run [Weekly report](n8n://workflow/wf1).',
			},
		});

		const text = wrapper.find('[data-testid="agent-skill-instructions-text"]');
		expect(text.find('a').attributes('href')).not.toContain('/workflow/');
		expect(text.classes().join(' ')).not.toContain('workflowChips');
	});

	it('shows a read-only reference as text', () => {
		const wrapper = mountViewer({
			readOnly: true,
			selectedPath: 'references/labels.md',
			skill: {
				name: 'Triage',
				description: 'Use for triage',
				instructions: 'Check the SLA first.',
				references: [{ path: 'references/labels.md', content: 'Use needs-repro.' }],
			},
		});

		expect(wrapper.find('[data-testid="agent-skill-reference-text"]').text()).toContain(
			'Use needs-repro.',
		);
		expect(wrapper.find('[data-testid="agent-skill-reference-name-input"]').exists()).toBe(false);
	});

	it('shows Mermaid diagrams in the skill file and references', async () => {
		vi.mocked(renderSkillMermaid)
			.mockResolvedValueOnce({
				outcome: 'rendered',
				svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><title>Skill steps</title></svg>',
			})
			.mockResolvedValueOnce(renderedDiagram());
		const wrapper = mountViewer({
			readOnly: true,
			skill: {
				name: 'Triage',
				description: 'Use for triage',
				instructions: '# Steps\n\n```mermaid\nflowchart LR\n  A --> B\n```',
				references: [
					{ path: 'references/steps.md', content: '```mermaid\nflowchart TD\n  C --> D\n```' },
				],
			},
		});
		await flushPromises();

		const instructions = wrapper.get('[data-testid="agent-skill-instructions-text"]');
		expect(instructions.get('h1').text()).toBe('Steps');
		expect(instructions.get('img').attributes('alt')).toBe('Skill steps');
		expect(instructions.get('details').attributes('open')).toBeUndefined();

		await wrapper.setProps({ selectedPath: 'references/steps.md' });
		await flushPromises();

		const reference = wrapper.get('[data-testid="agent-skill-reference-text"]');
		expect(reference.get('img').attributes('src')).toMatch(/^data:image\/svg\+xml,/);
		expect(reference.get('img').attributes('alt')).toBe('agents.builder.skills.mermaid.diagram');
		expect(reference.get('summary').text()).toBe('agents.builder.skills.mermaid.source');
		expect(reference.get('details pre code').element.textContent).toBe('flowchart TD\n  C --> D\n');
		expect(renderSkillMermaid).toHaveBeenLastCalledWith(
			'flowchart TD\n  C --> D\n',
			'default',
			expect.any(Number),
			expect.any(AbortSignal),
		);
	});

	it('keeps invalid Mermaid and ordinary code blocks visible as code', async () => {
		vi.mocked(renderSkillMermaid).mockClear().mockResolvedValueOnce({ outcome: 'invalid' });
		const wrapper = mountViewer({
			readOnly: true,
			skill: {
				name: 'Triage',
				description: 'Use for triage',
				instructions: '```mermaid\nflowchart LR\n  A -->\n```\n\n```text\n  Check the labels\n```',
			},
		});
		await flushPromises();

		const instructions = wrapper.get('[data-testid="agent-skill-instructions-text"]');
		expect(instructions.findAll('pre code').map(({ element }) => element.textContent)).toEqual([
			'flowchart LR\n  A -->\n',
			'  Check the labels\n',
		]);
		expect(instructions.find('img').exists()).toBe(false);
		expect(instructions.find('details').exists()).toBe(false);
		expect(renderSkillMermaid).toHaveBeenCalledTimes(1);
	});

	it('renders a Mermaid block of the maximum length', async () => {
		vi.mocked(renderSkillMermaid).mockClear().mockResolvedValueOnce(renderedDiagram());
		const code = mermaidSourceOfLength(MAX_DIAGRAM_LENGTH);
		const wrapper = mountViewer({
			readOnly: true,
			skill: {
				name: 'Triage',
				description: 'Use for triage',
				instructions: `\`\`\`mermaid\n${code}\`\`\``,
			},
		});
		await flushPromises();

		expect(renderSkillMermaid).toHaveBeenCalledTimes(1);
		expect(vi.mocked(renderSkillMermaid).mock.calls[0][0]).toHaveLength(MAX_DIAGRAM_LENGTH);
		expect(wrapper.get('[data-testid="agent-skill-instructions-text"]').find('img').exists()).toBe(
			true,
		);
	});

	it('shows a Mermaid block over the maximum length as code, without a render', async () => {
		vi.mocked(renderSkillMermaid).mockClear();
		const code = mermaidSourceOfLength(MAX_DIAGRAM_LENGTH + 1);
		const wrapper = mountViewer({
			readOnly: true,
			skill: {
				name: 'Triage',
				description: 'Use for triage',
				instructions: `\`\`\`mermaid\n${code}\`\`\``,
			},
		});
		await flushPromises();

		const instructions = wrapper.get('[data-testid="agent-skill-instructions-text"]');
		expect(renderSkillMermaid).not.toHaveBeenCalled();
		expect(instructions.get('pre code').element.textContent).toBe(code);
		expect(instructions.find('img').exists()).toBe(false);
		expect(instructions.find('details').exists()).toBe(false);
	});

	it('cancels the render of a file when the user selects another file', async () => {
		const first = deferredRender();
		const second = deferredRender();
		vi.mocked(renderSkillMermaid)
			.mockClear()
			.mockReturnValueOnce(first.promise)
			.mockReturnValueOnce(second.promise);
		const wrapper = mountViewer({
			readOnly: true,
			skill: {
				name: 'Triage',
				description: 'Use for triage',
				instructions: '```mermaid\nflowchart LR\n  A --> B\n```',
				references: [
					{ path: 'references/steps.md', content: '```mermaid\nflowchart TD\n  C --> D\n```' },
				],
			},
		});
		await flushPromises();
		const signalOf = (call: number) => vi.mocked(renderSkillMermaid).mock.calls[call][3];
		expect(signalOf(0).aborted).toBe(false);

		await wrapper.setProps({ selectedPath: 'references/steps.md' });
		await flushPromises();

		expect(renderSkillMermaid).toHaveBeenCalledTimes(2);
		expect(signalOf(0).aborted).toBe(true);
		expect(signalOf(1).aborted).toBe(false);

		second.resolve(renderedDiagram('Reference steps'));
		await flushPromises();
		first.resolve(renderedDiagram('Skill steps'));
		await flushPromises();

		const images = wrapper.findAll('img');
		expect(images).toHaveLength(1);
		expect(images[0].attributes('alt')).toBe('Reference steps');
	});

	it('does not show the late result of a cancelled render', async () => {
		const first = deferredRender();
		const second = deferredRender();
		vi.mocked(renderSkillMermaid)
			.mockClear()
			.mockReturnValueOnce(first.promise)
			.mockReturnValueOnce(second.promise);
		const wrapper = mountViewer({
			readOnly: true,
			skill: {
				name: 'Triage',
				description: 'Use for triage',
				instructions: '```mermaid\nflowchart LR\n  A --> B\n```',
				references: [
					{ path: 'references/steps.md', content: '```mermaid\nflowchart TD\n  C --> D\n```' },
				],
			},
		});
		await flushPromises();
		await wrapper.setProps({ selectedPath: 'references/steps.md' });
		await flushPromises();

		// The first render ends while the second render is still open.
		first.resolve(renderedDiagram('Skill steps'));
		await flushPromises();

		expect(wrapper.find('img').exists()).toBe(false);
		expect(wrapper.get('pre code').element.textContent).toBe('flowchart TD\n  C --> D\n');
		second.resolve({ outcome: 'aborted' });
	});

	it('cancels the render when the view closes', async () => {
		const render = deferredRender();
		vi.mocked(renderSkillMermaid).mockClear().mockReturnValueOnce(render.promise);
		const wrapper = mountViewer({
			readOnly: true,
			skill: {
				name: 'Triage',
				description: 'Use for triage',
				instructions: '```mermaid\nflowchart LR\n  A --> B\n```',
			},
		});
		await flushPromises();
		const [, , , signal] = vi.mocked(renderSkillMermaid).mock.calls[0];
		expect(signal.aborted).toBe(false);

		wrapper.unmount();

		expect(signal.aborted).toBe(true);
		render.resolve({ outcome: 'aborted' });
	});

	it('keeps the source visible when the diagram image cannot load', async () => {
		vi.mocked(renderSkillMermaid).mockResolvedValueOnce(renderedDiagram());
		const code = 'flowchart LR\n  A --> B\n';
		const wrapper = mountViewer({
			readOnly: true,
			skill: {
				name: 'Triage',
				description: 'Use for triage',
				instructions: `\`\`\`mermaid\n${code}\`\`\``,
			},
		});
		await flushPromises();

		const instructions = wrapper.get('[data-testid="agent-skill-instructions-text"]');
		await instructions.get('img').trigger('error');

		expect(instructions.get('pre code').element.textContent).toBe(code);
		expect(instructions.find('img').exists()).toBe(false);
		expect(instructions.find('details').exists()).toBe(false);
	});

	it('reports the diagram results of a file one time, when the last render ends', async () => {
		track.mockClear();
		vi.mocked(renderSkillMermaid)
			.mockResolvedValueOnce(renderedDiagram())
			.mockResolvedValueOnce({ outcome: 'invalid' })
			.mockResolvedValueOnce({ outcome: 'timeout' })
			.mockResolvedValueOnce({ outcome: 'failed' })
			// The view cannot show an SVG without a size.
			.mockResolvedValueOnce({
				outcome: 'rendered',
				svg: '<svg xmlns="http://www.w3.org/2000/svg"/>',
			});
		const wrapper = mountViewer({
			readOnly: true,
			selectedPath: 'references/steps.md',
			skill: {
				name: 'Triage',
				description: 'Use for triage',
				instructions: 'Check the SLA first.',
				references: [
					{
						path: 'references/steps.md',
						content: Array.from(
							{ length: 5 },
							() => '```mermaid\nflowchart LR\n  A --> B\n```',
						).join('\n\n'),
					},
				],
			},
		});
		await flushPromises();

		// The first diagram is still open, until its image loads.
		expect(track).not.toHaveBeenCalled();
		await wrapper.get('img').trigger('load');

		expect(track).toHaveBeenCalledTimes(1);
		expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_VIEWED_SKILL_DIAGRAMS, {
			file: 'reference',
			rendered: 1,
			invalid: 1,
			failed: 2,
			timed_out: 1,
		});
	});

	it('reports a diagram as failed when its image cannot load', async () => {
		track.mockClear();
		vi.mocked(renderSkillMermaid).mockResolvedValueOnce(renderedDiagram());
		const wrapper = mountViewer({
			readOnly: true,
			skill: {
				name: 'Triage',
				description: 'Use for triage',
				instructions: '```mermaid\nflowchart LR\n  A --> B\n```',
			},
		});
		await flushPromises();
		await wrapper.get('img').trigger('error');

		expect(track).toHaveBeenCalledTimes(1);
		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.USER_VIEWED_SKILL_DIAGRAMS,
			expect.objectContaining({ file: 'skill', rendered: 0, failed: 1 }),
		);
	});

	it.each(['load', 'error'])(
		'ignores a late image %s event after the theme changes',
		async (event) => {
			track.mockClear();
			vi.mocked(renderSkillMermaid)
				.mockResolvedValueOnce(renderedDiagram('Light diagram'))
				.mockResolvedValueOnce(renderedDiagram('Dark diagram'));
			const wrapper = mountViewer({
				readOnly: true,
				skill: {
					name: 'Triage',
					description: 'Use for triage',
					instructions: '```mermaid\nflowchart LR\n  A --> B\n```',
				},
			});
			await flushPromises();
			const oldImage = wrapper.get('img');

			uiStore.appliedTheme = 'dark';
			await flushPromises();
			await oldImage.trigger(event);

			expect(wrapper.get('img').attributes('alt')).toBe('Dark diagram');
			expect(track).not.toHaveBeenCalled();
			await wrapper.get('img').trigger('load');
			expect(track).toHaveBeenCalledExactlyOnceWith(
				TELEMETRY_EVENT.CONTEXT.USER_VIEWED_SKILL_DIAGRAMS,
				{ file: 'skill', rendered: 1, invalid: 0, failed: 0, timed_out: 0 },
			);
		},
	);

	it('reports the diagrams of the file that the user left, not of the file that opens', async () => {
		track.mockClear();
		const open = deferredRender();
		vi.mocked(renderSkillMermaid)
			.mockResolvedValueOnce({ outcome: 'invalid' })
			.mockReturnValueOnce(open.promise);
		const wrapper = mountViewer({
			readOnly: true,
			skill: {
				name: 'Triage',
				description: 'Use for triage',
				instructions:
					'```mermaid\nflowchart LR\n  A -->\n```\n\n```mermaid\nflowchart LR\n  A --> B\n```',
				references: [{ path: 'references/labels.md', content: 'Use needs-repro.' }],
			},
		});
		await flushPromises();
		expect(track).not.toHaveBeenCalled();

		await wrapper.setProps({ selectedPath: 'references/labels.md' });
		await flushPromises();

		expect(track).toHaveBeenCalledTimes(1);
		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.USER_VIEWED_SKILL_DIAGRAMS,
			expect.objectContaining({ file: 'skill', rendered: 0, invalid: 1 }),
		);
		open.resolve({ outcome: 'aborted' });
	});

	it('reports nothing for a file with no Mermaid block', async () => {
		track.mockClear();
		mountViewer({
			readOnly: true,
			skill: {
				name: 'Triage',
				description: 'Use for triage',
				instructions: '```text\nCheck the labels\n```',
			},
		});
		await flushPromises();

		expect(track).not.toHaveBeenCalled();
	});

	it('keeps Mermaid fences in the editor for both files', async () => {
		const instructions = '```mermaid\nflowchart LR\n  A --> B\n```';
		const reference = '```mermaid\nflowchart TD\n  C --> D\n```';
		const wrapper = mountViewer({
			skill: {
				name: 'Triage',
				description: 'Use for triage',
				instructions,
				references: [{ path: 'references/steps.md', content: reference }],
			},
		});

		expect(
			wrapper.get<HTMLTextAreaElement>('[data-testid="agent-skill-instructions-editor"]').element
				.value,
		).toBe(instructions);
		await wrapper.setProps({ selectedPath: 'references/steps.md' });
		expect(
			wrapper.get<HTMLTextAreaElement>('[data-testid="agent-skill-reference-editor"]').element
				.value,
		).toBe(reference);
	});

	it('shows the instructions character count, not their byte size', () => {
		const wrapper = mountViewer({
			skill: {
				name: 'Research',
				description: 'Use for research',
				// Each of these is 3 UTF-8 bytes, so a byte counter would read 9.
				instructions: '日本語',
			},
		});

		expect(wrapper.text()).toContain(
			`3 / ${AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH.toLocaleString()} characters`,
		);
	});

	it('shows the selected reference character count, not its byte size', () => {
		const wrapper = mountViewer({
			skill: {
				name: 'Research',
				description: 'Use for research',
				instructions: 'Main body',
				references: [
					{
						path: 'references/guide.md',
						content: '€€€',
					},
				],
			},
			selectedPath: 'references/guide.md',
		});

		// '€' is 3 UTF-8 bytes but one character — the counter shows characters.
		expect(wrapper.text()).toContain(
			`3 / ${AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH.toLocaleString()} characters`,
		);
	});

	it('marks skills with too many references invalid', () => {
		const wrapper = mountViewer({
			skill: {
				name: 'Research',
				description: 'Use for research',
				instructions: 'Main body',
				references: makeReferences(AGENT_SKILL_REFERENCE_MAX_COUNT + 1),
			},
		});

		expect(wrapper.text()).toContain(
			`Skills can have up to ${AGENT_SKILL_REFERENCE_MAX_COUNT.toLocaleString()} reference files.`,
		);
		expect(wrapper.emitted('update:valid')?.at(-1)).toEqual([false]);
	});
});

describe('AgentSkillViewer relative links', () => {
	const skill = {
		name: 'Research',
		description: 'Use for research',
		instructions: [
			'[Bare](reference/guide.md)',
			'[Dot](./reference/degraded/fallback.md)',
			'[Outside](../other/SKILL.md)',
			'[Missing](reference/none.md)',
			'[Web](https://example.com/docs)',
		].join('\n\n'),
		references: [
			{
				path: 'reference/degraded/fallback.md',
				content: '[Up](../guide.md) [Main](../../SKILL.md)',
			},
			{ path: 'reference/guide.md', content: '# Guide' },
		],
	};

	async function clickLink(
		wrapper: ReturnType<typeof mountViewer>,
		text: string,
		init?: MouseEventInit,
	) {
		const link = wrapper.findAll('a').find((anchor) => anchor.text() === text);
		const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
		link?.element.dispatchEvent(event);
		await wrapper.vm.$nextTick();
		return { link, event };
	}

	it.each([
		['a bare link', 'SKILL.md', 'Bare', 'reference/guide.md'],
		['a ./ link', 'SKILL.md', 'Dot', 'reference/degraded/fallback.md'],
		['a ../ link from a nested file', 'reference/degraded/fallback.md', 'Up', 'reference/guide.md'],
		['a link back to SKILL.md', 'reference/degraded/fallback.md', 'Main', 'SKILL.md'],
	])('selects the linked file for %s and stays on the page', async (_case, from, text, path) => {
		const wrapper = mountViewer({ readOnly: true, skill, selectedPath: from });
		const { link, event } = await clickLink(wrapper, text);

		expect(link?.exists()).toBe(true);
		expect(wrapper.emitted('select:path')).toEqual([[path]]);
		expect(event.defaultPrevented).toBe(true);
	});

	it.each([
		['a file outside the skill', 'Outside'],
		['a file that the skill does not have', 'Missing'],
	])('selects nothing and stays on the page for a link to %s', async (_case, text) => {
		const wrapper = mountViewer({ readOnly: true, skill });
		const { link, event } = await clickLink(wrapper, text);

		expect(link?.exists()).toBe(true);
		expect(wrapper.emitted('select:path')).toBeUndefined();
		expect(event.defaultPrevented).toBe(true);
	});

	it('leaves a web link to the browser', async () => {
		const wrapper = mountViewer({ readOnly: true, skill });
		const { link, event } = await clickLink(wrapper, 'Web');

		expect(link?.attributes('href')).toBe('https://example.com/docs');
		expect(wrapper.emitted('select:path')).toBeUndefined();
		expect(event.defaultPrevented).toBe(false);
	});

	it.each(['metaKey', 'ctrlKey', 'shiftKey', 'altKey'])(
		'leaves a file link to the browser when clicked with %s',
		async (modifier) => {
			const wrapper = mountViewer({ readOnly: true, skill });
			const { link, event } = await clickLink(wrapper, 'Bare', { [modifier]: true });

			expect(link?.exists()).toBe(true);
			expect(wrapper.emitted('select:path')).toBeUndefined();
			expect(event.defaultPrevented).toBe(false);
		},
	);

	it('resolves relative links again when two selected files have the same Markdown', async () => {
		const content = '[Guide](guide.md)';
		const wrapper = mountViewer({
			readOnly: true,
			selectedPath: 'a/index.md',
			skill: {
				...skill,
				references: [
					{ path: 'a/index.md', content },
					{ path: 'b/index.md', content },
					{ path: 'a/guide.md', content: 'First guide' },
					{ path: 'b/guide.md', content: 'Second guide' },
				],
			},
		});

		await clickLink(wrapper, 'Guide');
		await wrapper.setProps({ selectedPath: 'b/index.md' });
		await clickLink(wrapper, 'Guide');

		expect(wrapper.emitted('select:path')).toEqual([['a/guide.md'], ['b/guide.md']]);
	});
});

/** The code of a Mermaid block with this many characters, with the line break before the closing fence. */
function mermaidSourceOfLength(length: number) {
	const start = 'flowchart LR\n  A --> B\n%% ';
	return `${start}${'x'.repeat(length - start.length - 1)}\n`;
}

function renderedDiagram(title?: string) {
	return {
		outcome: 'rendered' as const,
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">${title ? `<title>${title}</title>` : ''}</svg>`,
	};
}

/** A render that the test ends by hand. */
function deferredRender() {
	let resolve: (result: SkillMermaidResult) => void = () => {};
	const promise = new Promise<SkillMermaidResult>((resolvePromise) => {
		resolve = resolvePromise;
	});
	return { promise, resolve };
}

function mountViewer(props: Partial<InstanceType<typeof AgentSkillViewer>['$props']> = {}) {
	return mount(AgentSkillViewer, {
		props: {
			skill: {
				name: 'Summarize',
				description: 'Use when summarizing notes',
				instructions: '',
			},
			...props,
		},
		global: {
			stubs: {
				N8nButton: {
					template:
						'<button type="button" v-bind="$attrs" @click="$emit(\'click\')"><slot name="prefix" /><slot name="icon" /><slot /></button>',
					emits: ['click'],
				},
				N8nDialog: { props: ['open'], template: '<div v-if="open"><slot /></div>' },
				N8nDialogHeader: { template: '<div><slot /></div>' },
				N8nDialogTitle: { template: '<h3><slot /></h3>' },
				N8nFormInput: N8nFormInputStub,
				N8nIcon: { template: '<i />' },
				N8nText: { template: '<span><slot /></span>' },
				N8nTooltip: { template: '<span><slot /></span>' },
				MarkdownEditor: { props: ['modelValue'], template: '<textarea :value="modelValue" />' },
			},
		},
	});
}

function makeReferences(count: number) {
	return Array.from({ length: count }, (_, index) => ({
		path: index === 0 ? 'references/reference.md' : `references/reference-${index + 1}.md`,
		content: 'Reference',
	}));
}
