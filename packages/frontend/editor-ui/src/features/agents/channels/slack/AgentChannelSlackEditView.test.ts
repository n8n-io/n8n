import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';

import AgentChannelSlackEditView from './AgentChannelSlackEditView.vue';
import type { SlackChannelRuntime } from './useSlackChannelRuntime';

describe('AgentChannelSlackEditView', () => {
	it('exposes managed settings save activity as loading', async () => {
		const settingsLoading = ref(false);
		const runtime = {
			loading: ref(false),
			settingsLoading,
			settings: ref(null),
			settingsError: ref(false),
			settingsSaveError: ref(null),
			isManagedCredential: () => true,
		} as unknown as SlackChannelRuntime;
		const wrapper = mount(AgentChannelSlackEditView, {
			props: {
				modelValue: 'slack-credential',
				mode: 'edit',
				integration: {
					type: 'slack',
					label: 'Slack',
					icon: 'slack',
					credentialTypes: ['slackApi'],
				},
				credentials: [],
				credentialPermissions: { create: true },
				credentialsLoading: false,
				loading: false,
				connected: true,
				connectedDescription: '',
				errorMessage: '',
				errorIsConflict: false,
				isPublished: true,
				agentName: 'Agent',
				projectId: 'project-1',
				agentId: 'agent-1',
				forceNewCredential: false,
				simpleSetup: false,
				runtime,
			},
			global: {
				stubs: {
					AgentIntegrationCredentialConnection: true,
					AgentChannelSlackManagedSettings: true,
				},
			},
		});

		expect(wrapper.vm.loading).toBe(false);

		settingsLoading.value = true;
		await nextTick();

		expect(wrapper.vm.loading).toBe(true);
	});
});
