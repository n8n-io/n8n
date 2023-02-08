import path from 'path';
import { realpath } from 'fs/promises';

import type { LoadNodesAndCredentialsClass } from '@/LoadNodesAndCredentials';
import type { NodeTypesClass } from '@/NodeTypes';
import type { Push } from '@/Push';

export const reloadNodesAndCredentials = async (
	loadNodesAndCredentials: LoadNodesAndCredentialsClass,
	nodeTypes: NodeTypesClass,
	push: Push,
) => {
	// eslint-disable-next-line import/no-extraneous-dependencies
	const { default: debounce } = await import('lodash.debounce');
	// eslint-disable-next-line import/no-extraneous-dependencies
	const { watch } = await import('chokidar');

	Object.entries(loadNodesAndCredentials.loaders).forEach(async ([dir, loader]) => {
		const realModulePath = path.join(await realpath(dir), path.sep);
		const reloader = debounce(async () => {
			const modulesToUnload = Object.keys(require.cache).filter((filePath) =>
				filePath.startsWith(realModulePath),
			);
			modulesToUnload.forEach((filePath) => {
				delete require.cache[filePath];
			});

			loader.reset();
			await loader.loadAll();
			await loadNodesAndCredentials.postProcessLoaders();
			await loadNodesAndCredentials.generateTypesForFrontend();
			nodeTypes.applySpecialNodeParameters();
			push.send('nodeDescriptionUpdated', undefined);
		}, 100);

		const toWatch = loader.isLazyLoaded
			? ['**/nodes.json', '**/credentials.json']
			: ['**/*.js', '**/*.json'];
		watch(toWatch, { cwd: realModulePath }).on('change', reloader);
	});
};
