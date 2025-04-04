const setup = async (context) => {
	const panel = await context.createViewPanel({
		name: 'Workflow Settings',
		id: 'workflow-settings',
		enableScripts: true,
	});

	context.setPanelContent(
		panel,
		`
		<p>Click the button below to proceed.</p>
		<div>
			<button id="proceed-button" class="button-ext primary">Proceed</button>
		</div>
		<script>
				const button = document.getElementById('proceed-button');
				button.addEventListener('click', () => {
					window.parent.postMessage({
						type: 'showPrompt'
					}, '*');
				});
		</script>
	`,
	);

	window.addEventListener('message', async (event) => {
		if (event.data && event.data.type === 'showPrompt') {
			await showPrompt();
		}
	});

	const showPrompt = async () => {
		const promptResponsePromise = context.confirm(
			'Are you sure you want to proceed?',
			'Confirmation',
			{
				confirmButtonText: 'Yeah sure',
				cancelButtonText: 'No way',
			},
		);
		const promptResponse = await promptResponsePromise;

		if (promptResponse === 'confirm') {
			context.showToast({
				type: 'success',
				message: 'Workflow settings extension loaded successfully!',
			});
		} else {
			context.showToast({
				type: 'error',
				message: 'Thanks, see you next time!',
			});
		}
	};
};

export { setup };
