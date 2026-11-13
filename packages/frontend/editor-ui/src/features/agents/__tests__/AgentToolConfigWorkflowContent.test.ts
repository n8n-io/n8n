import { enableAutoUnmount, mount } from '@vue/test-utils';
import AgentToolConfigWorkflowContent from '../components/AgentToolConfigWorkflowContent.vue';
import AgentToolConfigApprovalSetting from '../components/AgentToolConfigApprovalSetting.vue';

enableAutoUnmount(afterEach);
function render(combined = false) {
	return mount(AgentToolConfigWorkflowContent, {
		props: {
			initialRef: { type: 'workflow', workflow: 'Write records' },
			showApprovalSetting: true,
			approvalRequired: false,
		},
		global: {
			stubs: {
				WorkflowToolConfigContent: { template: '<div><slot name="commonSettings" /></div>' },
			},
		},
		slots: combined ? { approvalSettings: '<div data-testid="combined-approval-section" />' } : {},
	});
}
it('uses the combined review section without a second approval toggle', () => {
	const wrapper = render(true);
	expect(wrapper.find('[data-testid="combined-approval-section"]').exists()).toBe(true);
	expect(wrapper.findComponent(AgentToolConfigApprovalSetting).exists()).toBe(false);
});
it('keeps the standard approval toggle when no review section is provided', () => {
	expect(render().findComponent(AgentToolConfigApprovalSetting).exists()).toBe(true);
});
