/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { ICredentialType } from 'n8n-workflow';
import type * as typeAvailabilityPolicies from '@n8n/frontend-module-type-availability-policies';
import {
	mockRestrictedCredentialTypes,
	mockRestrictedNodeTypes,
} from '@n8n/frontend-module-type-availability-policies/__tests__/mocks';
import { useTypeAvailabilityPoliciesStore } from '@n8n/frontend-module-type-availability-policies';

import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '../credentials.store';
import CredentialsSelectModal from './CredentialsSelectModal.vue';

const selectBlur = vi.hoisted(() => vi.fn());
const selectFocus = vi.hoisted(() => vi.fn());

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key} ${Object.values(options.interpolate).join('|')}` : key,
	}),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track: vi.fn() }) }));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => ({ value: { workflowId: '' } }),
}));

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiCredentialHelp', () => ({
	useInstanceAiCredentialHelp: () => () => undefined,
}));

vi.mock('@/app/components/Modal.vue', () => ({
	default: {
		props: { loading: { type: Boolean, default: false } },
		template:
			'<div><slot name="header" /><slot v-if="!loading" name="content" /><slot name="footer" /></div>',
	},
}));

vi.mock('@n8n/design-system', async () => {
	const { defineComponent } = await import('vue');

	return {
		N8nSelect: defineComponent({
			name: 'N8nSelect',
			props: { modelValue: { type: String, default: '' } },
			emits: ['update:modelValue', 'visible-change'],
			setup(_, { expose }) {
				expose({ blur: selectBlur, focus: selectFocus });
			},
			template: '<div><slot /></div>',
		}),
		N8nOption: defineComponent({
			props: {
				value: { type: String, required: true },
				label: { type: String, required: true },
				disabled: { type: Boolean, default: false },
			},
			template: `
				<div
					class="el-select-dropdown__item"
					:data-name="value"
					:data-disabled="disabled"
				><slot /></div>
			`,
		}),
		N8nButton: defineComponent({
			name: 'N8nButton',
			props: { label: { type: String, default: '' }, disabled: { type: Boolean, default: false } },
			emits: ['click'],
			template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
		}),
		N8nIcon: defineComponent({ template: '<i />' }),
		N8nText: defineComponent({ template: '<span><slot /></span>' }),
	};
});

// The popover and the dialog have their own tests; here they only record what they receive.
vi.mock('@n8n/frontend-module-type-availability-policies', async (importOriginal) => ({
	...(await importOriginal<typeof typeAvailabilityPolicies>()),
	RestrictedNodePopover: {
		name: 'RestrictedNodePopover',
		props: ['nodeTypeName', 'restriction', 'kind', 'scopeLabel', 'description', 'anchor'],
		emits: ['contactAdmin'],
		template:
			'<button data-test-id="restricted-marker" @click="$emit(\'contactAdmin\', restriction?.scope ?? \'instance\')" />',
	},
	ContactAdminModal: {
		name: 'ContactAdminModal',
		props: ['open', 'nodeTypeName', 'kind', 'audience'],
		emits: ['update:open'],
		template: '<div v-if="open" data-test-id="contact-admin-modal">{{ nodeTypeName }}</div>',
	},
}));

const types = [
	{ name: 'airtableApi', displayName: 'Airtable', properties: [] },
	{
		name: 'mailjetEmailApi',
		displayName: 'Mailjet Email',
		properties: [],
		supportedNodes: ['n8n-nodes-base.mailjet'],
	},
	{ name: 'slackApi', displayName: 'Slack', properties: [] },
	{ name: 'zoomApi', displayName: 'Zoom', properties: [] },
] satisfies ICredentialType[];

function mountModal() {
	useCredentialsStore().setCredentialTypes(types);
	return mount(CredentialsSelectModal);
}

async function mountLoaded() {
	const wrapper = mountModal();
	await flushPromises();
	return wrapper;
}

function names(wrapper: ReturnType<typeof mountModal>) {
	return wrapper
		.findAll('[data-test-id="new-credential-type-select-option"]')
		.map((o) => o.attributes('data-name'));
}

function option(wrapper: ReturnType<typeof mountModal>, name: string) {
	return wrapper.find(`[data-test-id="new-credential-type-select-option"][data-name="${name}"]`);
}

async function openList(wrapper: ReturnType<typeof mountModal>) {
	wrapper.findComponent({ name: 'N8nSelect' }).vm.$emit('visible-change', true);
	await nextTick();
}

async function select(wrapper: ReturnType<typeof mountModal>, name: string) {
	wrapper.findComponent({ name: 'N8nSelect' }).vm.$emit('update:modelValue', name);
	await nextTick();
}

function continueButton(wrapper: ReturnType<typeof mountModal>) {
	return wrapper.findComponent({ name: 'N8nButton' });
}

describe('CredentialsSelectModal — restricted credential types', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
		selectBlur.mockClear();
		selectFocus.mockClear();
		const credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.fetchCredentialTypes = vi.fn().mockResolvedValue(undefined);
		mockRestrictedCredentialTypes({});
		mockRestrictedNodeTypes({});
	});

	it('keeps the list hidden while the project policy loads', async () => {
		const policies = mockedStore(useTypeAvailabilityPoliciesStore);
		policies.isLoading = true;

		const wrapper = await mountLoaded();
		expect(names(wrapper)).toEqual([]);

		policies.isLoading = false;
		await flushPromises();
		expect(names(wrapper)).toContain('slackApi');
	});

	it('focuses the search once the project policy loads', async () => {
		vi.useFakeTimers();
		const policies = mockedStore(useTypeAvailabilityPoliciesStore);
		policies.isLoading = true;

		await mountLoaded();
		vi.runAllTimers();
		expect(selectFocus).not.toHaveBeenCalled();

		policies.isLoading = false;
		await flushPromises();
		vi.runAllTimers();
		expect(selectFocus).toHaveBeenCalled();
		vi.useRealTimers();
	});

	it('does not change the project the policy store holds', async () => {
		const policies = mockedStore(useTypeAvailabilityPoliciesStore);

		const wrapper = await mountLoaded();
		wrapper.unmount();

		expect(policies.fetchForProject).not.toHaveBeenCalled();
	});

	it('lists usable types first, then blocked types, then types whose nodes are blocked', async () => {
		mockRestrictedCredentialTypes({ airtableApi: 'instance' });
		mockRestrictedNodeTypes({ 'n8n-nodes-base.mailjet': 'instance' });
		const wrapper = await mountLoaded();

		expect(names(wrapper)).toEqual(['slackApi', 'zoomApi', 'airtableApi', 'mailjetEmailApi']);
		expect(option(wrapper, 'airtableApi').attributes('data-disabled')).toBe('true');
		expect(option(wrapper, 'mailjetEmailApi').attributes('data-disabled')).toBe('false');
		expect(option(wrapper, 'slackApi').attributes('data-disabled')).toBe('false');
	});

	it('keeps the focus in the search input on a press on a blocked type only', async () => {
		mockRestrictedCredentialTypes({ airtableApi: 'instance' });
		mockRestrictedNodeTypes({ 'n8n-nodes-base.mailjet': 'instance' });
		const wrapper = await mountLoaded();

		const blocked = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
		option(wrapper, 'airtableApi').element.dispatchEvent(blocked);
		const nodesBlocked = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
		option(wrapper, 'mailjetEmailApi').element.dispatchEvent(nodesBlocked);

		expect(blocked.defaultPrevented).toBe(true);
		expect(nodesBlocked.defaultPrevented).toBe(false);
	});

	it('ignores a blocked type that the select still reports, and lets a type with blocked nodes through', async () => {
		mockRestrictedCredentialTypes({ airtableApi: 'instance' });
		mockRestrictedNodeTypes({ 'n8n-nodes-base.mailjet': 'instance' });
		const wrapper = await mountLoaded();

		await select(wrapper, 'airtableApi');
		expect(continueButton(wrapper).props('disabled')).toBe(true);

		await select(wrapper, 'mailjetEmailApi');
		expect(continueButton(wrapper).props('disabled')).toBe(false);

		continueButton(wrapper).vm.$emit('click');
		expect(useUIStore().openNewCredential).toHaveBeenCalledWith(
			'mailjetEmailApi',
			false,
			false,
			undefined,
			undefined,
			undefined,
			undefined,
			expect.any(Object),
		);
	});

	it('explains a blocked type with its scope and a credential popover', async () => {
		mockRestrictedCredentialTypes({ airtableApi: 'project' });
		const wrapper = await mountLoaded();
		await openList(wrapper);

		expect(option(wrapper, 'airtableApi').text()).toContain(
			'typeAvailabilityPolicies.restrictedNode.scope.project',
		);
		const popover = option(wrapper, 'airtableApi').findComponent({ name: 'RestrictedNodePopover' });
		expect(popover.props()).toMatchObject({
			nodeTypeName: 'Airtable',
			kind: 'credential',
			restriction: { name: 'airtableApi', scope: 'project' },
			scopeLabel: undefined,
			description: undefined,
		});
	});

	it('explains a type whose nodes are blocked, naming the nodes, and asks their admin', async () => {
		mockRestrictedNodeTypes({ 'n8n-nodes-base.mailjet': 'instance' });
		const wrapper = await mountLoaded();
		await openList(wrapper);

		expect(option(wrapper, 'mailjetEmailApi').text()).toContain(
			'typeAvailabilityPolicies.restrictedCredentialType.nodesRestricted.scope',
		);
		const popover = option(wrapper, 'mailjetEmailApi').findComponent({
			name: 'RestrictedNodePopover',
		});
		expect(popover.props()).toMatchObject({
			nodeTypeName: 'Mailjet Email',
			kind: 'node',
			restriction: { name: 'n8n-nodes-base.mailjet', scope: 'instance' },
			scopeLabel: 'typeAvailabilityPolicies.restrictedCredentialType.nodesRestricted.scope',
			description:
				'typeAvailabilityPolicies.restrictedCredentialType.nodesRestricted.description n8n-nodes-base.mailjet',
		});

		await popover.find('button').trigger('click');
		await flushPromises();

		expect(selectBlur).toHaveBeenCalled();
		const dialog = wrapper.findComponent({ name: 'ContactAdminModal' });
		expect(dialog.props()).toMatchObject({
			open: true,
			kind: 'node',
			nodeTypeName: 'n8n-nodes-base.mailjet',
			audience: 'instance',
		});
	});
});
