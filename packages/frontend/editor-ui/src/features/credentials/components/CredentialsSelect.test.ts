/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { CredentialTypeAvailabilityScope } from '@n8n/api-types';
import type { ICredentialType, INodeProperties } from 'n8n-workflow';
import type * as typeAvailabilityPolicies from '@n8n/frontend-module-type-availability-policies';
import { mockRestrictedCredentialTypes } from '@n8n/frontend-module-type-availability-policies/__tests__/mocks';
import { useTypeAvailabilityPoliciesStore } from '@n8n/frontend-module-type-availability-policies';
import type { INodeUi } from '@/Interface';

import CredentialsSelect from './CredentialsSelect.vue';
import { useCredentialsStore } from '../credentials.store';

const selectBlur = vi.hoisted(() => vi.fn());

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@n8n/design-system', async () => {
	const { defineComponent } = await import('vue');

	return {
		N8nSelect: defineComponent({
			name: 'N8nSelect',
			props: {
				modelValue: { type: String, default: '' },
				filterable: { type: Boolean, default: false },
				size: { type: String, default: '' },
				placeholder: { type: String, default: '' },
				disabled: { type: Boolean, default: false },
				title: { type: String, default: '' },
			},
			emits: ['update:modelValue', 'visible-change'],
			setup(_, { expose }) {
				expose({ blur: selectBlur, focus: vi.fn() });
			},
			template: `<div><slot /></div>`,
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
					data-test-id="credential-select-option"
					:data-credential-name="value"
					:data-label="label"
					:data-disabled="disabled"
				><slot /></div>
			`,
		}),
		N8nText: defineComponent({
			template: `<span><slot /></span>`,
		}),
	};
});

// The popover and the dialog have their own tests; here they only record what they receive.
vi.mock('@n8n/frontend-module-type-availability-policies', async (importOriginal) => ({
	...(await importOriginal<typeof typeAvailabilityPolicies>()),
	RestrictedNodePopover: {
		name: 'RestrictedNodePopover',
		props: ['nodeTypeName', 'restriction', 'kind', 'anchor', 'side', 'markerSize'],
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

// Stub child components that have complex store/API dependencies
vi.mock('./ScopesNotice.vue', () => ({ default: { template: '<div />' } }));
vi.mock('./NodeCredentials.vue', () => ({ default: { template: '<div />' } }));

const baseParameter = {
	name: 'nodeCredentialType',
	type: 'credentialsSelect',
	credentialTypes: ['has:authenticate'],
} as unknown as INodeProperties;

const restrictedCred = {
	name: 'restrictedApi',
	displayName: 'Restricted API',
	authenticate: { type: 'generic' },
	restrictToSupportedNodes: true,
	supportedNodes: ['n8n-nodes-base.restrictedConsumer'],
} as unknown as ICredentialType;

const slackApi = {
	name: 'slackApi',
	displayName: 'Slack',
	authenticate: { type: 'generic' },
} as unknown as ICredentialType;

function mountSelect(
	nodeType: string,
	credTypes: ICredentialType[],
	{
		parameter = baseParameter,
		parameters = {},
		displayValue = '',
	}: {
		parameter?: INodeProperties;
		parameters?: Record<string, string>;
		displayValue?: string;
	} = {},
) {
	const store = useCredentialsStore();
	store.setCredentialTypes(credTypes);

	return mount(CredentialsSelect, {
		props: {
			activeCredentialType: '',
			parameter,
			// parameters is required by the template: node?.parameters[parameter.name]
			node: { type: nodeType, parameters } as unknown as INodeUi,
			displayValue,
			isReadOnly: false,
			displayTitle: '',
		},
	});
}

function renderedCredentialNames(wrapper: ReturnType<typeof mountSelect>) {
	return wrapper
		.findAll('[data-test-id="credential-select-option"]')
		.map((o) => o.attributes('data-credential-name'));
}

function option(wrapper: ReturnType<typeof mountSelect>, name: string) {
	return wrapper.find(`[data-test-id="credential-select-option"][data-credential-name="${name}"]`);
}

function fieldMarker(wrapper: ReturnType<typeof mountSelect>) {
	return wrapper.find('[data-test-id="credential-select-restricted"]');
}

async function setListVisible(wrapper: ReturnType<typeof mountSelect>, visible: boolean) {
	wrapper.findComponent({ name: 'N8nSelect' }).vm.$emit('visible-change', visible);
	await nextTick();
}

describe('CredentialsSelect — restrictToSupportedNodes filter', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
	});

	it('hides a restricted credential when the current node is not in supportedNodes', () => {
		const wrapper = mountSelect('n8n-nodes-base.httpRequest', [restrictedCred, slackApi]);
		const names = renderedCredentialNames(wrapper);

		expect(names).toContain('slackApi');
		expect(names).not.toContain('restrictedApi');
	});

	it('shows a restricted credential when the current node IS in supportedNodes', () => {
		const wrapper = mountSelect('n8n-nodes-base.restrictedConsumer', [restrictedCred, slackApi]);
		const names = renderedCredentialNames(wrapper);

		expect(names).toContain('restrictedApi');
	});

	it('does not affect credentials without restrictToSupportedNodes', () => {
		const wrapper = mountSelect('n8n-nodes-base.httpRequest', [slackApi]);
		const names = renderedCredentialNames(wrapper);

		expect(names).toContain('slackApi');
	});
});

const credentialType = (name: string, displayName: string) =>
	({ name, displayName, authenticate: { type: 'generic' } }) as unknown as ICredentialType;

const airtableApi = credentialType('airtableApi', 'Airtable');
const asanaApi = credentialType('asanaApi', 'Asana');
const zoomApi = credentialType('zoomApi', 'Zoom');
const policyTypes = [zoomApi, slackApi, asanaApi, airtableApi];

describe('CredentialsSelect — restricted credential types', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
		selectBlur.mockClear();
	});

	it('keeps the alphabetical order and enables every type when nothing is restricted', async () => {
		mockRestrictedCredentialTypes({});
		const wrapper = mountSelect('n8n-nodes-base.httpRequest', policyTypes);
		await setListVisible(wrapper, true);

		expect(renderedCredentialNames(wrapper)).toEqual([
			'airtableApi',
			'asanaApi',
			'slackApi',
			'zoomApi',
		]);
		for (const name of ['airtableApi', 'asanaApi', 'slackApi', 'zoomApi']) {
			expect(option(wrapper, name).attributes('data-disabled')).toBe('false');
		}
		expect(wrapper.find('[data-test-id="restricted-marker"]').exists()).toBe(false);
		expect(fieldMarker(wrapper).exists()).toBe(false);
	});

	it('puts restricted types last and keeps the alphabetical order in each group', () => {
		mockRestrictedCredentialTypes({ airtableApi: 'project', slackApi: 'instance' });
		const wrapper = mountSelect('n8n-nodes-base.httpRequest', policyTypes);

		expect(renderedCredentialNames(wrapper)).toEqual([
			'asanaApi',
			'zoomApi',
			'airtableApi',
			'slackApi',
		]);
	});

	it('disables restricted options and keeps usable options enabled', () => {
		mockRestrictedCredentialTypes({ slackApi: 'instance' });
		const wrapper = mountSelect('n8n-nodes-base.httpRequest', policyTypes);

		expect(option(wrapper, 'slackApi').attributes('data-disabled')).toBe('true');
		expect(option(wrapper, 'asanaApi').attributes('data-disabled')).toBe('false');
		expect(option(wrapper, 'zoomApi').attributes('data-disabled')).toBe('false');
	});

	it('keeps the focus in the search input when the user presses a restricted option', async () => {
		mockRestrictedCredentialTypes({ slackApi: 'instance' });
		const wrapper = mountSelect('n8n-nodes-base.httpRequest', policyTypes);

		const restrictedPress = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
		option(wrapper, 'slackApi').element.dispatchEvent(restrictedPress);
		const usablePress = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
		option(wrapper, 'asanaApi').element.dispatchEvent(usablePress);

		expect(restrictedPress.defaultPrevented).toBe(true);
		expect(usablePress.defaultPrevented).toBe(false);
	});

	it('passes on a usable type and drops a restricted one that the select still reports', async () => {
		mockRestrictedCredentialTypes({ slackApi: 'instance' });
		const wrapper = mountSelect('n8n-nodes-base.httpRequest', policyTypes);
		const select = wrapper.findComponent({ name: 'N8nSelect' });

		select.vm.$emit('update:modelValue', 'slackApi');
		select.vm.$emit('update:modelValue', 'asanaApi');
		await nextTick();

		expect(wrapper.emitted('update:modelValue')).toEqual([['asanaApi']]);
	});

	it('keeps the display name as the option label so search still finds a restricted type', () => {
		mockRestrictedCredentialTypes({ slackApi: 'instance' });
		const wrapper = mountSelect('n8n-nodes-base.httpRequest', policyTypes);

		expect(option(wrapper, 'slackApi').attributes('data-label')).toBe('Slack');
	});

	it('shows the name, the scope label and a credential lock marker on a restricted option', async () => {
		mockRestrictedCredentialTypes({ slackApi: 'instance', airtableApi: 'project' });
		const wrapper = mountSelect('n8n-nodes-base.httpRequest', policyTypes);
		await setListVisible(wrapper, true);

		expect(option(wrapper, 'slackApi').text()).toContain('Slack');
		expect(option(wrapper, 'slackApi').text()).toContain(
			'typeAvailabilityPolicies.restrictedNode.scope.instance',
		);
		expect(option(wrapper, 'airtableApi').text()).toContain('Airtable');
		expect(option(wrapper, 'airtableApi').text()).toContain(
			'typeAvailabilityPolicies.restrictedNode.scope.project',
		);
		expect(option(wrapper, 'asanaApi').find('[data-test-id="restricted-marker"]').exists()).toBe(
			false,
		);

		const marker = option(wrapper, 'slackApi').findComponent({ name: 'RestrictedNodePopover' });
		expect(marker.props()).toMatchObject({
			nodeTypeName: 'Slack',
			restriction: { name: 'slackApi', available: false, scope: 'instance' },
			kind: 'credential',
			side: 'right',
			markerSize: 'xsmall',
		});
		// The popover opens on hover of the whole option row, not only of the lock.
		expect(marker.props('anchor')).toBe(option(wrapper, 'slackApi').element);
	});

	it('mounts the lock markers in the list on the first open and keeps them after it closes', async () => {
		mockRestrictedCredentialTypes({ slackApi: 'instance' });
		const wrapper = mountSelect('n8n-nodes-base.httpRequest', policyTypes);
		const listMarker = () => option(wrapper, 'slackApi').find('[data-test-id="restricted-marker"]');

		expect(listMarker().exists()).toBe(false);
		expect(option(wrapper, 'slackApi').text()).toContain(
			'typeAvailabilityPolicies.restrictedNode.scope.instance',
		);

		await setListVisible(wrapper, true);
		expect(listMarker().exists()).toBe(true);

		// The select closes on the press in a popover, so the popover must outlive the list.
		await setListVisible(wrapper, false);
		expect(listMarker().exists()).toBe(true);
	});

	it('shows a generic label when the restriction has no scope', () => {
		vi.spyOn(
			useTypeAvailabilityPoliciesStore(),
			'getCredentialTypeAvailability',
		).mockImplementation((name) =>
			name === 'slackApi' ? { name, available: false } : { name, available: true },
		);
		const wrapper = mountSelect('n8n-nodes-base.httpRequest', policyTypes);

		expect(option(wrapper, 'slackApi').text()).toContain(
			'typeAvailabilityPolicies.restrictedNodes.scope.generic',
		);
	});

	it('shows the marker on the field and keeps a selected restricted value', async () => {
		mockRestrictedCredentialTypes({ slackApi: 'instance' });
		const wrapper = mountSelect('n8n-nodes-base.httpRequest', policyTypes, {
			parameters: { nodeCredentialType: 'slackApi' },
			displayValue: 'Slack',
		});
		// The anchor is the marker's own wrapper, which exists only after the first render.
		await nextTick();

		const marker = fieldMarker(wrapper).findComponent({ name: 'RestrictedNodePopover' });
		expect(marker.props()).toMatchObject({
			nodeTypeName: 'Slack',
			restriction: { name: 'slackApi', available: false, scope: 'instance' },
			kind: 'credential',
			side: 'right',
		});
		expect(marker.props('anchor')).toBe(fieldMarker(wrapper).element);
		expect(wrapper.findComponent({ name: 'N8nSelect' }).props('modelValue')).toBe('Slack');
		expect(wrapper.emitted('update:modelValue')).toBeUndefined();
	});

	it('does not show the field marker when the selected type is usable', () => {
		mockRestrictedCredentialTypes({ slackApi: 'instance' });
		const wrapper = mountSelect('n8n-nodes-base.httpRequest', policyTypes, {
			parameters: { nodeCredentialType: 'asanaApi' },
			displayValue: 'Asana',
		});

		expect(fieldMarker(wrapper).exists()).toBe(false);
	});

	it('removes the field marker when the user switches to a usable type', async () => {
		mockRestrictedCredentialTypes({ slackApi: 'instance' });
		const wrapper = mountSelect('n8n-nodes-base.httpRequest', policyTypes, {
			parameters: { nodeCredentialType: 'slackApi' },
			displayValue: 'Slack',
		});
		expect(fieldMarker(wrapper).exists()).toBe(true);

		await wrapper.setProps({
			node: {
				type: 'n8n-nodes-base.httpRequest',
				parameters: { nodeCredentialType: 'asanaApi' },
			} as unknown as INodeUi,
			displayValue: 'Asana',
		});

		expect(fieldMarker(wrapper).exists()).toBe(false);
	});

	it('sorts and disables a type again when the policy arrives after the first render', async () => {
		const restricted = ref<Record<string, CredentialTypeAvailabilityScope>>({});
		vi.spyOn(
			useTypeAvailabilityPoliciesStore(),
			'getCredentialTypeAvailability',
		).mockImplementation((name) => {
			const scope = restricted.value[name];
			return scope ? { name, available: false, scope } : { name, available: true };
		});
		const wrapper = mountSelect('n8n-nodes-base.httpRequest', policyTypes);
		expect(renderedCredentialNames(wrapper)).toEqual([
			'airtableApi',
			'asanaApi',
			'slackApi',
			'zoomApi',
		]);

		restricted.value = { slackApi: 'instance' };
		await nextTick();

		expect(renderedCredentialNames(wrapper)).toEqual([
			'airtableApi',
			'asanaApi',
			'zoomApi',
			'slackApi',
		]);
		expect(option(wrapper, 'slackApi').attributes('data-disabled')).toBe('true');
	});

	it('closes the list and opens the contact-admin dialog from a restricted option', async () => {
		mockRestrictedCredentialTypes({ slackApi: 'project' });
		const wrapper = mountSelect('n8n-nodes-base.httpRequest', policyTypes);
		await setListVisible(wrapper, true);

		expect(wrapper.find('[data-test-id="contact-admin-modal"]').exists()).toBe(false);
		await option(wrapper, 'slackApi').find('[data-test-id="restricted-marker"]').trigger('click');

		expect(selectBlur).toHaveBeenCalled();
		const modal = wrapper.findComponent({ name: 'ContactAdminModal' });
		expect(modal.props()).toMatchObject({
			open: true,
			nodeTypeName: 'Slack',
			kind: 'credential',
			audience: 'project',
		});

		modal.vm.$emit('update:open', false);
		await nextTick();
		expect(wrapper.find('[data-test-id="contact-admin-modal"]').exists()).toBe(false);
	});

	it('keeps the dialog copy while the dialog closes', async () => {
		mockRestrictedCredentialTypes({ slackApi: 'project' });
		const wrapper = mountSelect('n8n-nodes-base.httpRequest', policyTypes, {
			parameters: { nodeCredentialType: 'slackApi' },
			displayValue: 'Slack',
		});
		await fieldMarker(wrapper).find('[data-test-id="restricted-marker"]').trigger('click');
		const modal = wrapper.findComponent({ name: 'ContactAdminModal' });

		modal.vm.$emit('update:open', false);
		await nextTick();

		// The dialog fades out after the close, so it must not fall back to an empty subject.
		expect(modal.props()).toMatchObject({
			open: false,
			nodeTypeName: 'Slack',
			audience: 'project',
		});
	});

	it('opens the contact-admin dialog from the field marker', async () => {
		mockRestrictedCredentialTypes({ slackApi: 'project' });
		const wrapper = mountSelect('n8n-nodes-base.httpRequest', policyTypes, {
			parameters: { nodeCredentialType: 'slackApi' },
			displayValue: 'Slack',
		});

		await fieldMarker(wrapper).find('[data-test-id="restricted-marker"]').trigger('click');

		expect(selectBlur).toHaveBeenCalled();
		expect(wrapper.findComponent({ name: 'ContactAdminModal' }).props()).toMatchObject({
			open: true,
			nodeTypeName: 'Slack',
			kind: 'credential',
			audience: 'project',
		});
		expect(wrapper.find('[data-test-id="contact-admin-modal"]').text()).toBe('Slack');
	});

	describe('generic auth type list', () => {
		const genericAuthParameter = {
			name: 'genericAuthType',
			type: 'credentialsSelect',
			credentialTypes: ['has:genericAuth'],
		} as unknown as INodeProperties;
		const genericType = (name: string, displayName: string) =>
			({ name, displayName, genericAuth: true }) as unknown as ICredentialType;
		const genericTypes = [
			genericType('httpBasicAuth', 'Basic Auth'),
			genericType('httpBearerAuth', 'Bearer Auth'),
			genericType('httpHeaderAuth', 'Header Auth'),
		];

		it('puts a restricted generic type last and disables it', () => {
			mockRestrictedCredentialTypes({ httpBasicAuth: 'instance' });
			const wrapper = mountSelect('n8n-nodes-base.httpRequest', genericTypes, {
				parameter: genericAuthParameter,
			});

			expect(renderedCredentialNames(wrapper)).toEqual([
				'httpBearerAuth',
				'httpHeaderAuth',
				'httpBasicAuth',
			]);
			expect(option(wrapper, 'httpBasicAuth').attributes('data-disabled')).toBe('true');
		});

		it('shows the field marker for a selected restricted generic type', () => {
			mockRestrictedCredentialTypes({ httpBasicAuth: 'instance' });
			const wrapper = mountSelect('n8n-nodes-base.httpRequest', genericTypes, {
				parameter: genericAuthParameter,
				parameters: { genericAuthType: 'httpBasicAuth' },
				displayValue: 'httpBasicAuth',
			});

			expect(
				fieldMarker(wrapper).findComponent({ name: 'RestrictedNodePopover' }).props('nodeTypeName'),
			).toBe('Basic Auth');
		});
	});
});
