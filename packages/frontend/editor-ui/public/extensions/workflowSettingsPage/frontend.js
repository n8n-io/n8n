const setup = async (context) => {
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
		<div id="workflow-details">
		</div>
		<script>
			var workflowsSelect = document.getElementById('workflows');
			workflowsSelect.addEventListener('change', (event) => {
				const selectedWorkflowId = event.target.value;
					window.parent.postMessage({
						type: 'showSelectedWorkflow',
						workflowId: selectedWorkflowId,
					}, '*');
			});
		</script>
	`,
	);

	window.addEventListener('message', async (event) => {
		if (event.data && event.data.type === 'showSelectedWorkflow') {
			const workflow = workflows.find((w) => w.id === event.data.workflowId);
			context.setElementContent(
				panel,
				'workflow-details',
				`
					<h3 class="mt-3xl mb-l">Details for: <strong>${workflow?.name}</strong></h3>
					<div style="display: flex; flex-direction: column; gap: 1rem;" class="p-s">
						<span>• <strong>ID:</strong> ${workflow?.id}</span>
						<span>• <strong>Is Active:</strong> ${workflow?.active ? 'Yes' : 'No'}</span>
						<span>• <strong>Created At:</strong> ${new Date(workflow?.createdAt).toLocaleString()}</span>
						<span>• <strong>Updated At:</strong> ${new Date(workflow?.updatedAt).toLocaleString()}</span>
						<span>• <strong>Home Project:</strong> ${workflow?.homeProject?.name}</span>
						<span>• <strong>Folder:</strong> ${workflow?.parentFolder ? workflow.parentFolder.name : '--'}</span>
					</div>
				`,
			);
		}
	});
};

export { setup };
