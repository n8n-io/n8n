import {
	Db,
	IExternalHookFunctions,
	IExternalHooks,
} from './';

import * as config from '../config';

// export EXTERNAL_HOOK_FILES=/data/packages/cli/dist/src/externalHooksTemp/test-hooks.js

class ExternalHooksClass implements IExternalHooks {

	externalHooks: {
		[key: string]: Array<() => {}>
	} = {};


	async init(): Promise<void> {
		console.log('ExternalHooks.init');

		const externalHookFiles = config.get('externalHookFiles').split(':');

		console.log('externalHookFiles');
		console.log(externalHookFiles);

		// Load all the provided hook-files
		for (let hookFilePath of externalHookFiles) {
			hookFilePath = hookFilePath.trim();
			if (hookFilePath !== '') {
				console.log(' --- load: ' + hookFilePath);
				try {
					const hookFile = require(hookFilePath);

					for (const resource of Object.keys(hookFile)) {
						for (const operation of Object.keys(hookFile[resource])) {
							// Save all the hook functions directly under their string
							// format in an array
							const hookString = `${resource}.${operation}`;
							if (this.externalHooks[hookString] === undefined) {
								this.externalHooks[hookString] = [];
							}

							this.externalHooks[hookString].push.apply(this.externalHooks[hookString], hookFile[resource][operation]);
						}
					}
				} catch (error) {
					throw new Error(`Problem loading external hook file "${hookFilePath}": ${error.message}`);
				}
			}
		}
	}

	async run(hookName: string, hookParameters?: any[]): Promise<void> { // tslint:disable-line:no-any
		console.log('RUN NOW: ' + hookName);

		const externalHookFunctions: IExternalHookFunctions = {
			DbCollections: Db.collections,
		};

		if (this.externalHooks[hookName] === undefined) {
			return;
		}

		for(const externalHookFunction of this.externalHooks[hookName]) {
			await externalHookFunction.apply(externalHookFunctions, hookParameters);
		}
	}

}



let externalHooksInstance: ExternalHooksClass | undefined;

export function ExternalHooks(): ExternalHooksClass {
	if (externalHooksInstance === undefined) {
		externalHooksInstance = new ExternalHooksClass();
	}

	return externalHooksInstance;
}
