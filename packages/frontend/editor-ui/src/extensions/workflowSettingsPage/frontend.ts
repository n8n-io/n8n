import type { N8nExtensionContext } from '@/extensions-sdk/n8n-context';

const setup = async (context: N8nExtensionContext) => {
	const panel = await context.createViewPanel({
		name: 'Workflow Settings',
		id: 'workflow-settings',
		enableScripts: true,
	});

	const workflows = await context.getWorkflows();

	const workflowsDropHTML = `
		<select id="workflows">
			${workflows
				.map((workflow) => `<option value="${workflow.id}">${workflow.name}</option>`)
				.join('')}
		</select>
	`;

	context.setPanelContent(
		panel,
		`
		<p>Start by selecting your workflow</p>
		<div id="workflows-dropdown">
			${workflowsDropHTML}
		</div>
		<script>
			const workflowsDropdown = document.getElementById('workflows-dropdown');
			const workflowsSelect = document.getElementById('workflows');
			workflowsSelect.addEventListener('change', (event) => {
				const selectedWorkflowId = event.target.value;
				console.log('Selected workflow ID:', selectedWorkflowId);
			});
		</script>
	`,
	);
};

export { setup };
