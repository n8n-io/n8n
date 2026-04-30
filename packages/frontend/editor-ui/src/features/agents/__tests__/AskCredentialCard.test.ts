/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-explicit-any -- test-only */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const credentialsById: Record<string, { id: string; name: string }> = {};
const getCredentialById = vi.fn((id: string) => credentialsById[id]);

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		getCredentialById,
	}),
}));

vi.mock('@n8n/i18n', () => {
	const baseText = (k: string, opts?: { interpolate?: Record<string, string> }) => {
		if (opts?.interpolate) return `${k}:${Object.values(opts.interpolate).join(',')}`;
		return k;
	};
	return {
		useI18n: () => ({ baseText }),
		i18n: { baseText },
	};
});

/**
 * Stub NodeCredentials so the test can drive the credentialSelected event
 * without booting the full component graph (which pulls in stores, the
 * AI gateway, ndv event bus, etc.). The stub exposes the key inputs as
 * data attributes so we can assert prop wiring, plus a "pick" button to
 * simulate the user choosing a credential and a "clear" button to simulate
 * deselection.
 */
const NodeCredentialsStub = {
	props: {
		node: { type: Object, required: true },
		overrideCredType: { type: String, default: '' },
		projectId: { type: String, default: '' },
		standalone: { type: Boolean, default: false },
		hideIssues: { type: Boolean, default: false },
		skipAutoSelect: { type: Boolean, default: false },
		readonly: { type: Boolean, default: false },
	},
	emits: ['credentialSelected'],
	template: `
		<div
			data-testid="node-credentials-stub"
			:data-override-cred-type="overrideCredType"
			:data-project-id="projectId"
			:data-standalone="String(standalone)"
			:data-hide-issues="String(hideIssues)"
			:data-skip-auto-select="String(skipAutoSelect)"
			:data-readonly="String(readonly)"
			:data-node-type="node?.type"
		>
			<button
				data-testid="stub-pick-credential"
				@click="$emit('credentialSelected', {
					name: node.name,
					properties: { credentials: { [overrideCredType]: { id: 'cred-1', name: 'Acme Slack' } } },
				})"
			>pick</button>
			<button
				data-testid="stub-clear-credential"
				@click="$emit('credentialSelected', {
					name: node.name,
					properties: { credentials: {} },
				})"
			>clear</button>
		</div>
	`,
};

import AskCredentialCard from '../components/interactive/AskCredentialCard.vue';

const baseProps = {
	purpose: 'Slack credential',
	credentialType: 'slackApi',
	projectId: 'p1',
	agentId: 'a1',
};

function mountCard(props: Record<string, unknown> = {}) {
	return mount(AskCredentialCard, {
		props: { ...baseProps, ...props },
		global: {
			stubs: {
				NodeCredentials: NodeCredentialsStub,
				N8nButton: {
					props: ['disabled', 'type', 'size', 'variant'],
					template:
						'<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot/></button>',
				},
				N8nIcon: { template: '<i v-bind="$attrs"></i>', props: ['icon', 'size', 'color'] },
				N8nText: { template: '<span><slot/></span>', props: ['size', 'bold', 'color', 'tag'] },
			},
		},
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	for (const id of Object.keys(credentialsById)) delete credentialsById[id];
	credentialsById['cred-1'] = { id: 'cred-1', name: 'Acme Slack' };
	credentialsById['cred-9'] = { id: 'cred-9', name: 'Picked Slack' };
});

describe('AskCredentialCard', () => {
	it('renders the NodeCredentials picker with the correct override type, project and standalone flags', async () => {
		const wrapper = mountCard();
		await flushPromises();

		const stub = wrapper.find('[data-testid="node-credentials-stub"]');
		expect(stub.exists()).toBe(true);
		expect(stub.attributes('data-override-cred-type')).toBe('slackApi');
		expect(stub.attributes('data-project-id')).toBe('p1');
		expect(stub.attributes('data-standalone')).toBe('true');
		expect(stub.attributes('data-hide-issues')).toBe('true');
		expect(stub.attributes('data-skip-auto-select')).toBe('true');
		expect(stub.attributes('data-readonly')).toBe('false');
	});

	it('emits skipped: true when Skip is pressed', async () => {
		const wrapper = mountCard();
		await flushPromises();

		await wrapper.find('[data-testid="ask-credential-skip"]').trigger('click');

		const emitted = wrapper.emitted('submit') as unknown[][];
		expect(emitted).toBeTruthy();
		expect(emitted[0][0]).toEqual({ skipped: true });
	});

	it('emits the chosen credential as soon as a credential is picked', async () => {
		const wrapper = mountCard();
		await flushPromises();

		expect(wrapper.find('[data-testid="ask-credential-confirm"]').exists()).toBe(false);

		await wrapper.find('[data-testid="stub-pick-credential"]').trigger('click');

		const emitted = wrapper.emitted('submit') as unknown[][];
		expect(emitted[0][0]).toEqual({ credentialId: 'cred-1', credentialName: 'Acme Slack' });
	});

	it('does not emit when NodeCredentials emits an empty credentials map', async () => {
		const wrapper = mountCard();
		await flushPromises();

		await wrapper.find('[data-testid="stub-clear-credential"]').trigger('click');

		expect(wrapper.emitted('submit')).toBeFalsy();
	});

	it('does not render the skip button when disabled', async () => {
		const wrapper = mountCard({ disabled: true });
		await flushPromises();

		expect(wrapper.find('[data-testid="ask-credential-skip"]').exists()).toBe(false);
	});

	it('forwards the disabled flag to NodeCredentials as readonly', async () => {
		const wrapper = mountCard({ disabled: true });
		await flushPromises();

		const stub = wrapper.find('[data-testid="node-credentials-stub"]');
		expect(stub.attributes('data-readonly')).toBe('true');
	});

	it('renders the resolved credential name when given a resolvedValue with credentialName', async () => {
		const wrapper = mountCard({
			disabled: true,
			resolvedValue: { credentialId: 'cred-9', credentialName: 'Picked Slack' },
		});
		await flushPromises();
		expect(wrapper.text()).toContain('Picked Slack');
	});

	it('renders the "Skipped" label when the resolvedValue is { skipped: true }', async () => {
		const wrapper = mountCard({
			disabled: true,
			resolvedValue: { skipped: true },
		});
		await flushPromises();
		expect(wrapper.text()).toContain('Skipped');
	});
});
