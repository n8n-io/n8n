import { defineFrontEndModule } from '@n8n/module-common';

export const frontEndModule = defineFrontEndModule({
	name: 'example',
	setup: (context) => {
		console.log('registered example', context);
		// defineRoutes([]);
	},
});
