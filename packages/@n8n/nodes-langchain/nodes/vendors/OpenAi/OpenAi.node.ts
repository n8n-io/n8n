import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { listSearch, loadOptions } from './methods';

export class OpenAi extends AiRootNode {
	description = versionDescription;

	methods = {
		listSearch,
		loadOptions,
	};

	async execute(context: AiRootNodeExecuteFunctions) {
		return await router.call(context);
	}
}
