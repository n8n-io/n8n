import {
	Db,
	IDatabaseCollections,
	IExternalHooks,
} from "./";

import * as config from '../config';
// import {
// 	access as fsAccess,
// 	readdir as fsReaddir,
// 	readFile as fsReadFile,
// 	stat as fsStat,
// } from 'fs';

// TODO: Give different name
interface IHookData {
	DbCollections: IDatabaseCollections;
}

// export EXTERNAL_HOOK_FILES=/data/packages/cli/dist/src/externalHooksTemp/test-hooks.js

class ExternalHooksClass implements IExternalHooks {

	externalHooks: {
		[key: string]: Array<() => {}>
	} = {};


	async init(): Promise<void> {
		console.log('ExternalHooks.init');

		const externalHookFiles = config.get('externalHookFiles').split(',');

		console.log('externalHookFiles');
		console.log(externalHookFiles);

		for (let hookFilePath of externalHookFiles) {
			hookFilePath = hookFilePath.trim();
			if (hookFilePath !== '') {
				console.log(' --- load: ' + hookFilePath);
				const hookFile = require(hookFilePath);

				for (const resource of Object.keys(hookFile)) {
					// if (this.externalHooks[resource] === undefined) {
					// 	this.externalHooks[resource] = {};
					// }

					for (const operation of Object.keys(hookFile[resource])) {
						const hookString = `${resource}.${operation}`;
						if (this.externalHooks[hookString] === undefined) {
							this.externalHooks[hookString] = [];
						}

						this.externalHooks[hookString].push.apply(this.externalHooks[hookString], hookFile[resource][operation]);
					}
				}
			}
		}
	}

	async run(hookName: string): Promise<void> {
		console.log('RUN NOW: ' + hookName);

		const hookData: IHookData = {
			DbCollections: Db.collections,
		};

		if (this.externalHooks[hookName] === undefined) {
			return;
		}

		for(const externalHookFunction of this.externalHooks[hookName]) {
			externalHookFunction.call(hookData);
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
