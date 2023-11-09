/* eslint-disable @typescript-eslint/no-var-requires */

import { Service } from 'typedi';
import * as Db from '@/Db';
import type {
	IExternalHooksClass,
	IExternalHooksFileData,
	IExternalHooksFunctions,
} from '@/Interfaces';

import config from '@/config';

@Service()
export class ExternalHooks implements IExternalHooksClass {
	externalHooks: {
		[key: string]: Array<() => {}>;
	} = {};

	initDidRun = false;

	async init(): Promise<void> {
		if (this.initDidRun) {
			return;
		}

		await this.loadHooksFiles();

		this.initDidRun = true;
	}

	async reload(externalHooks?: IExternalHooksFileData) {
		this.externalHooks = {};

		if (externalHooks === undefined) {
			await this.loadHooksFiles(true);
		} else {
			this.loadHooks(externalHooks);
		}
	}

	async loadHooksFiles(reload = false) {
		const externalHookFiles = config.getEnv('externalHookFiles').split(':');

		// Load all the provided hook-files
		for (let hookFilePath of externalHookFiles) {
			hookFilePath = hookFilePath.trim();
			if (hookFilePath !== '') {
				try {
					if (reload) {
						delete require.cache[require.resolve(hookFilePath)];
					}

					const hookFile = require(hookFilePath) as IExternalHooksFileData;
					this.loadHooks(hookFile);
				} catch (error) {
					throw new Error(
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						`Problem loading external hook file "${hookFilePath}": ${error.message}`,
						{ cause: error as Error },
					);
				}
			}
		}
	}

	loadHooks(hookFileData: IExternalHooksFileData) {
		for (const resource of Object.keys(hookFileData)) {
			for (const operation of Object.keys(hookFileData[resource])) {
				// Save all the hook functions directly under their string
				// format in an array
				const hookString = `${resource}.${operation}`;
				if (this.externalHooks[hookString] === undefined) {
					this.externalHooks[hookString] = [];
				}

				// eslint-disable-next-line prefer-spread
				this.externalHooks[hookString].push.apply(
					this.externalHooks[hookString],
					hookFileData[resource][operation],
				);
			}
		}
	}

	async run(hookName: string, hookParameters?: any[]): Promise<void> {
		const externalHookFunctions: IExternalHooksFunctions = {
			dbCollections: Db.collections,
		};

		if (this.externalHooks[hookName] === undefined) {
			return;
		}

		for (const externalHookFunction of this.externalHooks[hookName]) {
			await externalHookFunction.apply(externalHookFunctions, hookParameters);
		}
	}

	exists(hookName: string): boolean {
		return !!this.externalHooks[hookName];
	}
}
