/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { ICredentialType, INodeProperties } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';

import CredentialsSelect from './CredentialsSelect.vue';
import { useCredentialsStore } from '../credentials.store';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@n8n/design-system', async () => {
	const { defineComponent } = await import('vue');

	return {
		N8nSelect: defineComponent({
			props: {
				modelValue: { type: String, default: '' },
				filterable: { type: Boolean, default: false },
				size: { type: String, default: '' },
				placeholder: { type: String, default: '' },
				disabled: { type: Boolean, default: false },
				title: { type: String, default: '' },
			},
			emits: ['update:modelValue'],
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
					data-test-id="credential-select-option"
					:data-credential-name="value"
					:data-label="label"
				><slot /></div>
			`,
		}),
	};
});

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

function mountSelect(nodeType: string, credTypes: ICredentialType[]) {
	const store = useCredentialsStore();
	store.setCredentialTypes(credTypes);

	return mount(CredentialsSelect, {
		props: {
			activeCredentialType: '',
			parameter: baseParameter,
			// parameters is required by the template: node?.parameters[parameter.name]
			node: { type: nodeType, parameters: {} } as unknown as INodeUi,
			displayValue: '',
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
