import {
	ICredentialDataDecryptedObject,
} from 'n8n-workflow';

import {
	CredentialTypes,
	ICredentialsOverwrite,
	GenericHelpers,
} from './';


class CredentialsOverwritesClass {

	private credentialTypes = CredentialTypes();
	private overwriteData: ICredentialsOverwrite = {};
	private resolvedTypes: string[] = [];


	async init(overwriteData?: ICredentialsOverwrite) {
		if (overwriteData !== undefined) {
			// If data is already given it can directly be set instead of
			// loaded from environment
			this.__setData(JSON.parse(JSON.stringify(overwriteData)));
			return;
		}

		const data = await GenericHelpers.getConfigValue('credentials.overwrite.data') as string;

		try {
			const overwriteData = JSON.parse(data);
			this.__setData(overwriteData);
		} catch (error) {
			throw new Error(`The credentials-overwrite is not valid JSON.`);
		}
	}


	__setData(overwriteData: ICredentialsOverwrite) {
		this.overwriteData = overwriteData;

		for (const credentialTypeData of this.credentialTypes.getAll()) {
			const type = credentialTypeData.name;

			const overwrites = this.__getExtended(type);

			if (overwrites && Object.keys(overwrites).length) {
				this.overwriteData[type] = overwrites;
			}
		}
	}


	applyOverwrite(type: string, data: ICredentialDataDecryptedObject) {

		const overwrites = this.get(type);

		if (overwrites === undefined) {
			return data;
		}

		const returnData = JSON.parse(JSON.stringify(data));
		// Overwrite only if there is currently no data set
		for (const key of Object.keys(overwrites)) {
			if ([null, undefined, ''].includes(returnData[key])) {
				returnData[key] = overwrites[key];
			}
		}

		return returnData;
	}


	__getExtended(type: string): ICredentialDataDecryptedObject | undefined {

		if (this.resolvedTypes.includes(type)) {
			// Type got already resolved and can so returned directly
			return this.overwriteData[type];
		}

		const credentialTypeData = this.credentialTypes.getByName(type);

		if (credentialTypeData === undefined) {
			throw new Error(`The credentials of type "${type}" are not known.`);
		}

		if (credentialTypeData.extends === undefined) {
			this.resolvedTypes.push(type);
			return this.overwriteData[type];
		}

		const overwrites: ICredentialDataDecryptedObject = {};
		for (const credentialsTypeName of credentialTypeData.extends) {
			Object.assign(overwrites, this.__getExtended(credentialsTypeName));
		}

		if (this.overwriteData[type] !== undefined) {
			Object.assign(overwrites, this.overwriteData[type]);
		}

		this.resolvedTypes.push(type);

		return overwrites;
	}


	get(type: string): ICredentialDataDecryptedObject | undefined {
		return this.overwriteData[type];
	}


	getAll(): ICredentialsOverwrite {
		return this.overwriteData;
	}
}


let credentialsOverwritesInstance: CredentialsOverwritesClass | undefined;

export function CredentialsOverwrites(): CredentialsOverwritesClass {
	if (credentialsOverwritesInstance === undefined) {
		credentialsOverwritesInstance = new CredentialsOverwritesClass();
	}

	return credentialsOverwritesInstance;
}
