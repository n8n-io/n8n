import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { Component } from 'vue';
import { N8nDropdownMenu } from '@n8n/design-system';
import type { AgentToolGuardrailConfig } from '@n8n/api-types';

import AgentGuardrailModal from '../components/AgentGuardrailModal.vue';
import type { AgentJsonToolRef } from '../types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'agents.builder.guardrails.name.placeholder': 'Finance data check',
				'agents.builder.guardrails.type.label': 'Guardrail type',
				'agents.builder.guardrails.keywords.label': 'Keywords',
				'agents.builder.guardrails.keywords.placeholder': 'Type a keyword and press Enter',
				'agents.builder.guardrails.pii.all': 'All entities',
				'agents.builder.guardrails.pii.entities': 'Entities to detect',
				'agents.builder.guardrails.trigger.before': 'Block execution',
				'agents.builder.guardrails.trigger.after': 'Block output',
				'agents.builder.guardrails.tools.all': 'All tools',
				'agents.builder.guardrails.tools.selected': 'Select tools',
				'agents.builder.guardrails.tools.none': 'Add tools to the agent first.',
				'agents.builder.guardrails.remove': 'Remove guardrail',
				'agents.builder.guardrails.create': 'Create',
				'generic.save': 'Save',
			})[key] ?? key,
	}),
}));

// The dialog shell is covered elsewhere; the stub keeps the body and footer slots visible.
vi.mock('../components/modals/AgentModal.vue', () => ({
	default: {
		name: 'AgentModal',
		props: {
			open: { type: Boolean, default: false },
			title: { type: String, default: '' },
			titlePlaceholder: { type: String, default: '' },
			editableTitle: { type: Boolean, default: false },
			disabled: { type: Boolean, default: false },
		},
		emits: ['update:open', 'update:title'],
		template:
			'<div v-if="open" v-bind="$attrs"><input v-if="editableTitle" data-testid="agent-guardrail-name-input" :value="title" @input="$emit(\'update:title\', $event.target.value)" /><slot /><slot name="footerLeft" /><slot name="footerActions" /></div>',
	},
}));

vi.mock('@n8n/design-system', async (importOriginal) => {
	const { defineComponent } = await import('vue');
	const actual = await importOriginal<typeof import('@n8n/design-system')>();
	return {
		...actual,
		N8nSelect: defineComponent({
			name: 'N8nSelect',
			props: {
				modelValue: { type: [String, Number, Array], default: undefined },
				disabled: { type: Boolean, default: false },
				multiple: { type: Boolean, default: false },
			},
			emits: ['update:modelValue'],
			template:
				'<select v-bind="$attrs" :multiple="multiple" :disabled="disabled" @change="onChange"><slot /></select>',
			watch: {
				modelValue: {
					handler(value: unknown) {
						this.applySelection(value);
					},
					flush: 'post',
				},
			},
			mounted() {
				this.applySelection(this.modelValue);
			},
			methods: {
				applySelection(value: unknown) {
					const select = this.$el as HTMLSelectElement;
					for (const option of Array.from(select.options)) {
						option.selected = this.multiple
							? Array.isArray(value) && value.includes(option.value)
							: option.value === String(value);
					}
				},
				onChange(event: Event) {
					const select = event.target as HTMLSelectElement;
					if (this.multiple) {
						this.$emit(
							'update:modelValue',
							Array.from(select.selectedOptions).map((option) => option.value),
						);
					} else {
						this.$emit('update:modelValue', select.value);
					}
				},
			},
		}),
		N8nOption: {
			name: 'N8nOption',
			props: ['value', 'label'],
			template: '<option :value="value">{{ label }}</option>',
		},
		N8nInputNumber: defineComponent({
			name: 'N8nInputNumber',
			props: [
				'modelValue',
				'disabled',
				'min',
				'max',
				'step',
				'precision',
				'controls',
				'placeholder',
			],
			emits: ['update:modelValue'],
			template:
				'<input v-bind="$attrs" :value="modelValue" :disabled="disabled" :placeholder="placeholder" @input="onInput($event)" />',
			methods: {
				onInput(event: Event) {
					const raw = (event.target as HTMLInputElement).value;
					this.$emit('update:modelValue', raw === '' ? null : Number(raw));
				},
			},
		}),
		N8nInput: {
			name: 'N8nInput',
			props: ['modelValue', 'type', 'rows', 'placeholder', 'disabled'],
			emits: ['update:modelValue'],
			template:
				'<textarea v-bind="$attrs" :value="modelValue" :rows="rows || 2" :placeholder="placeholder" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
		},
		N8nSwitch2: {
			name: 'N8nSwitch2',
			props: ['modelValue', 'disabled', 'size'],
			emits: ['update:modelValue'],
			template:
				'<button type="button" :disabled="disabled" :data-checked="modelValue" @click="$emit(\'update:modelValue\', !modelValue)" />',
		},
	};
});

function agentTools(): AgentJsonToolRef[] {
	return [
		{ type: 'node', name: 'HTTP Request' },
		{ type: 'workflow', workflow: 'Sync customers', workflowId: 'wf-1' },
		{ type: 'workflow', workflow: 'Legacy workflow' },
	] as AgentJsonToolRef[];
}

const KEYWORDS_ENTRY = {
	kind: 'keywords',
	id: 'block_secrets',
	name: 'Block secrets',
	stage: 'after',
	keywords: ['secret'],
} satisfies AgentToolGuardrailConfig;

function mountModal(
	overrides: Partial<{
		open: boolean;
		guardrail: AgentToolGuardrailConfig | null;
		kind: AgentToolGuardrailConfig['kind'];
		tools: AgentJsonToolRef[];
		existingIds: string[];
		disabled: boolean;
	}> = {},
) {
	return mount(AgentGuardrailModal, {
		props: {
			open: true,
			guardrail: null,
			kind: 'keywords',
			tools: agentTools(),
			...overrides,
		},
	});
}

function saveButton(wrapper: ReturnType<typeof mountModal>) {
	return wrapper.find('[data-testid="agent-guardrail-save"]');
}

function selectSingle(wrapper: ReturnType<typeof mountModal>, testId: string, value: string) {
	return wrapper.find(`[data-testid="${testId}"]`).setValue(value);
}

/** Picks a guardrail kind from the type dropdown menu, as a menu select does. */
async function pickKind(wrapper: ReturnType<typeof mountModal>, kind: string) {
	// N8nDropdownMenu is generic, so `findComponent` cannot infer its type on its own.
	const menu = wrapper.findComponent(N8nDropdownMenu as Component);
	expect(menu.exists()).toBe(true);
	menu.vm.$emit('select', kind);
	await wrapper.vm.$nextTick();
}

function selectMultiple(wrapper: ReturnType<typeof mountModal>, testId: string, values: string[]) {
	const select = wrapper.find(`[data-testid="${testId}"]`);
	const element = select.element as HTMLSelectElement;
	for (const option of Array.from(element.options)) {
		option.selected = values.includes(option.value);
	}
	return select.trigger('change');
}

function savedConfig(wrapper: ReturnType<typeof mountModal>): AgentToolGuardrailConfig {
	return wrapper.emitted('save')?.[0]?.[0] as AgentToolGuardrailConfig;
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('AgentGuardrailModal', () => {
	it('disables create until the kind requires no more input', async () => {
		const wrapper = mountModal();

		expect(saveButton(wrapper).attributes('disabled')).toBeDefined();

		const keywordInput = wrapper.find('[data-testid="agent-guardrail-keywords"]');
		await keywordInput.setValue('internal');
		await keywordInput.trigger('keydown.enter');

		// The keyword chip shows its text, not just its remove button.
		expect(wrapper.get('[data-testid="agent-guardrail-keywords-tag"]').text()).toContain(
			'internal',
		);
		expect(saveButton(wrapper).attributes('disabled')).toBeUndefined();
	});

	it('creates a keywords guardrail with all tools and no tools field', async () => {
		const wrapper = mountModal();

		await wrapper.find('[data-testid="agent-guardrail-name-input"]').setValue('Block secrets');
		const keywordInput = wrapper.find('[data-testid="agent-guardrail-keywords"]');
		await keywordInput.setValue('secret');
		await keywordInput.trigger('keydown.enter');
		await selectSingle(wrapper, 'agent-guardrail-trigger', 'after');
		await saveButton(wrapper).trigger('click');

		const saved = savedConfig(wrapper);
		expect(saved).toEqual({
			kind: 'keywords',
			id: 'block_secrets',
			name: 'Block secrets',
			stage: 'after',
			keywords: ['secret'],
		});
		// "All tools" persists no tools field.
		expect('tools' in saved).toBe(false);
		expect(wrapper.emitted('update:open')?.[0]).toEqual([false]);
	});

	it('creates a keywords guardrail with an unnamed kind-based id', async () => {
		const wrapper = mountModal();

		const keywordInput = wrapper.find('[data-testid="agent-guardrail-keywords"]');
		await keywordInput.setValue('secret');
		await keywordInput.trigger('keydown.enter');
		await saveButton(wrapper).trigger('click');

		const saved = savedConfig(wrapper);
		expect(saved.id).toMatch(/^keywords_[a-z0-9]+$/);
		expect('name' in saved).toBe(false);
	});

	it('suffices a slug that another guardrail already uses', async () => {
		const wrapper = mountModal({ existingIds: ['block_secrets'] });

		await wrapper.find('[data-testid="agent-guardrail-name-input"]').setValue('Block secrets');
		const keywordInput = wrapper.find('[data-testid="agent-guardrail-keywords"]');
		await keywordInput.setValue('secret');
		await keywordInput.trigger('keydown.enter');
		await saveButton(wrapper).trigger('click');

		// A create cannot duplicate an existing id: the slug picks up a counter.
		expect(savedConfig(wrapper).id).toBe('block_secrets-2');
	});

	it('writes typed tool refs for selected tools and stays disabled until one is picked', async () => {
		const wrapper = mountModal();

		const keywordInput = wrapper.find('[data-testid="agent-guardrail-keywords"]');
		await keywordInput.setValue('secret');
		await keywordInput.trigger('keydown.enter');

		// The "All tools" switch starts on; toggling it off narrows the scope.
		await wrapper.get('[data-testid="agent-guardrail-tools-all"]').trigger('click');
		expect(saveButton(wrapper).attributes('disabled')).toBeDefined();

		// The picker lists node and workflow tools with a stable id; the legacy
		// workflow without one is skipped.
		const picker = wrapper.find('[data-testid="agent-guardrail-tools-picker"]');
		const optionValues = Array.from((picker.element as HTMLSelectElement).options).map(
			(option) => option.value,
		);
		expect(optionValues).toEqual(['node:HTTP Request', 'workflow:wf-1']);

		await selectMultiple(wrapper, 'agent-guardrail-tools-picker', [
			'node:HTTP Request',
			'workflow:wf-1',
		]);
		expect(saveButton(wrapper).attributes('disabled')).toBeUndefined();

		await saveButton(wrapper).trigger('click');

		const saved = savedConfig(wrapper);
		expect(saved.tools).toEqual([
			{ type: 'node', name: 'HTTP Request' },
			{ type: 'workflow', workflowId: 'wf-1' },
		]);
	});

	it('requires entities once the PII "all" switch is turned off, and writes them on save', async () => {
		const wrapper = mountModal({ kind: 'pii' });

		// The switch starts on: every entity is covered. Toggling it off narrows the scope.
		await wrapper.get('[data-testid="agent-guardrail-pii-all"]').trigger('click');
		expect(saveButton(wrapper).attributes('disabled')).toBeDefined();

		await selectMultiple(wrapper, 'agent-guardrail-pii-entities', ['EMAIL_ADDRESS', 'US_SSN']);
		expect(saveButton(wrapper).attributes('disabled')).toBeUndefined();

		await saveButton(wrapper).trigger('click');

		const saved = savedConfig(wrapper);
		expect(saved).toMatchObject({
			kind: 'pii',
			type: 'selected',
			entities: ['EMAIL_ADDRESS', 'US_SSN'],
		});
	});

	it('writes type all for PII without an entities field', async () => {
		const wrapper = mountModal({ kind: 'pii' });

		await saveButton(wrapper).trigger('click');

		const saved = savedConfig(wrapper);
		expect(saved).toMatchObject({ kind: 'pii', type: 'all' });
		expect('entities' in saved).toBe(false);
	});

	it('writes prompt and threshold for model kinds after a kind switch', async () => {
		const wrapper = mountModal();

		await pickKind(wrapper, 'jailbreak');
		await wrapper
			.find('[data-testid="agent-guardrail-prompt"]')
			.setValue('Detect prompt injection');
		await wrapper.find('[data-testid="agent-guardrail-threshold"]').setValue('0.8');
		await saveButton(wrapper).trigger('click');

		const saved = savedConfig(wrapper);
		expect(saved).toEqual({
			kind: 'jailbreak',
			id: expect.stringMatching(/^jailbreak_[a-z0-9]+$/),
			stage: 'before',
			prompt: 'Detect prompt injection',
			threshold: 0.8,
		});
	});

	it('persists the urls defaults and the runtime toggles', async () => {
		const wrapper = mountModal({ kind: 'urls' });

		await saveButton(wrapper).trigger('click');

		const saved = savedConfig(wrapper) as Extract<AgentToolGuardrailConfig, { kind: 'urls' }>;
		expect(saved).toMatchObject({ kind: 'urls', blockUserinfo: true, allowSubdomains: false });
		expect('allowedUrls' in saved).toBe(false);
		expect(saved.allowedSchemes).toEqual(['https']);
	});

	it('keeps the shared fields and resets kind options on a kind switch', async () => {
		const wrapper = mountModal({ kind: 'urls' });

		await wrapper.find('[data-testid="agent-guardrail-block-userinfo"]').trigger('click');
		await selectSingle(wrapper, 'agent-guardrail-trigger', 'after');
		await pickKind(wrapper, 'secretKeys');
		// The permissiveness picker is a segment control; its options carry
		// radio-button-<value> ids.
		await wrapper.get('[data-test-id="radio-button-strict"]').trigger('click');
		await saveButton(wrapper).trigger('click');

		const saved = savedConfig(wrapper);
		expect(saved).toMatchObject({
			kind: 'secretKeys',
			permissiveness: 'strict',
			stage: 'after',
		});
		expect('blockUserinfo' in saved).toBe(false);
	});

	it('preserves the id, name, and options when saving an unchanged edit', async () => {
		const wrapper = mountModal({ guardrail: KEYWORDS_ENTRY });

		await saveButton(wrapper).trigger('click');

		expect(savedConfig(wrapper)).toEqual(KEYWORDS_ENTRY);
	});

	it('preserves both stages when the saved stage is omitted', async () => {
		const guardrail = { ...KEYWORDS_ENTRY, stage: undefined };
		const wrapper = mountModal({ guardrail });
		await saveButton(wrapper).trigger('click');
		expect(savedConfig(wrapper)).not.toHaveProperty('stage');
	});

	it('removes a keyword when its remove button is clicked', async () => {
		const wrapper = mountModal({ guardrail: { ...KEYWORDS_ENTRY, keywords: ['secret', 'keep'] } });
		await wrapper
			.findAll('[data-testid="agent-guardrail-keywords-tag-remove"]')[0]
			.trigger('click');
		await saveButton(wrapper).trigger('click');
		expect(savedConfig(wrapper)).toMatchObject({ keywords: ['keep'] });
	});

	it('keeps the id while a rename changes only the name', async () => {
		const wrapper = mountModal({ guardrail: KEYWORDS_ENTRY });

		await wrapper.find('[data-testid="agent-guardrail-name-input"]').setValue('Renamed');
		await saveButton(wrapper).trigger('click');

		const saved = savedConfig(wrapper);
		expect(saved.id).toBe('block_secrets');
		expect(saved.name).toBe('Renamed');
	});

	it('preserves the workflow when editing a workflow guardrail', async () => {
		const guardrail = {
			id: 'workflow-check',
			kind: 'workflow',
			stage: 'before',
			workflowId: 'wf-guardrail',
		} as const;
		const wrapper = mountModal({ guardrail });

		expect(wrapper.find('[data-testid="agent-guardrail-prompt"]').exists()).toBe(false);
		await saveButton(wrapper).trigger('click');
		expect(savedConfig(wrapper)).toEqual(guardrail);
	});

	it('emits remove only from the edit footer', async () => {
		const createWrapper = mountModal();
		expect(createWrapper.find('[data-testid="agent-guardrail-remove"]').exists()).toBe(false);

		const editWrapper = mountModal({ guardrail: KEYWORDS_ENTRY });
		await editWrapper.find('[data-testid="agent-guardrail-remove"]').trigger('click');

		expect(editWrapper.emitted('remove')).toHaveLength(1);
		expect(editWrapper.emitted('update:open')?.[0]).toEqual([false]);
		expect(editWrapper.emitted('save')).toBeUndefined();
	});

	it('loads the saved entry into the form on open', async () => {
		const wrapper = mountModal({ open: false, guardrail: KEYWORDS_ENTRY });

		const select = wrapper.find('[data-testid="agent-guardrail-type"]');
		// The modal is closed, so the stub renders nothing yet.
		expect(select.exists()).toBe(false);

		await wrapper.setProps({ open: true });

		expect(wrapper.find('[data-testid="agent-guardrail-type"]').exists()).toBe(true);
		const triggerSelect = wrapper.find('[data-testid="agent-guardrail-trigger"]');
		expect(
			Array.from((triggerSelect.element as HTMLSelectElement).options).find(
				(option) => option.selected,
			)?.value,
		).toBe('after');
	});

	it('disables every control and both footer actions for a read-only builder', async () => {
		const wrapper = mountModal({ guardrail: KEYWORDS_ENTRY, disabled: true });

		expect(
			wrapper.find('[data-testid="agent-guardrail-type"]').attributes('disabled'),
		).toBeDefined();
		expect(saveButton(wrapper).attributes('disabled')).toBeDefined();
		expect(
			wrapper.find('[data-testid="agent-guardrail-remove"]').attributes('disabled'),
		).toBeDefined();
		// The read-only modal renders the name as static text, not as an input.
		expect(wrapper.find('[data-testid="agent-guardrail-name-input"]').exists()).toBe(false);

		await saveButton(wrapper).trigger('click');
		expect(wrapper.emitted('save')).toBeUndefined();
	});

	it('always shows the native-tools callout below the tool selection', () => {
		const wrapper = mountModal();

		const callout = wrapper.find('[data-testid="agent-guardrail-tools-callout"]');
		expect(callout.exists()).toBe(true);
		expect(callout.text()).toContain('agents.builder.guardrails.tools.callout');
		// Below the tool selection, inside the trigger group.
		const toolsSwitch = wrapper.get('[data-testid="agent-guardrail-tools-all"]');
		expect(
			toolsSwitch.element.compareDocumentPosition(callout.element) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it('keeps a reopened entrys kind fields loaded across a kind change', async () => {
		// The mounted modal reopens with a different kind: the queued kind
		// watcher must not wipe the fields the open watcher just loaded.
		const nsfwEntry: AgentToolGuardrailConfig = {
			kind: 'nsfw',
			id: 'nsfw-guard',
			name: 'Content check',
			stage: 'before',
			prompt: 'Refuse unsafe content',
			threshold: 0.9,
		};
		const wrapper = mountModal({ guardrail: KEYWORDS_ENTRY });
		await wrapper.setProps({ open: false });
		await wrapper.setProps({ guardrail: nsfwEntry, open: true });

		expect(wrapper.find('[data-testid="agent-guardrail-prompt"]').element).toBeTruthy();
		await expect
			.poll(
				() =>
					(wrapper.find('[data-testid="agent-guardrail-prompt"]').element as HTMLTextAreaElement)
						.value,
			)
			.toBe('Refuse unsafe content');
	});
});
