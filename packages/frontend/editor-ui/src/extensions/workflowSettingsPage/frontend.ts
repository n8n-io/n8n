import type { N8nExtensionContext } from '@/extensions-sdk/n8n-context';

const setup = async (context: N8nExtensionContext) => {
	const panel = context.createViewPanel({
		name: 'Workflow Settings',
		id: 'workflow-settings',
	});

	const panelDocument = panel.contentDocument;
	panelDocument?.open();
	panelDocument?.write('Hello from the workflow settings extension!');
	panelDocument?.close();

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

export { setup };
