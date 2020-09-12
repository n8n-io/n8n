import {
	ICredentialDataDecryptedObject,
} from 'n8n-workflow';

import {
	CredentialTypes,
	ICredentialsOverwrite,
	GenericHelpers,
} from './';


class CredentialsOverwritesClass {

	private overwriteData: ICredentialsOverwrite = {};

	async init(overwriteData?: ICredentialsOverwrite) {
		if (overwriteData !== undefined) {
			// If data is already given it can directly be set instead of
			// loaded from environment
			this.overwriteData = overwriteData;
			return;
		}

		const data = await GenericHelpers.getConfigValue('credentials.overwrite.data') as string;

		try {
			this.overwriteData = JSON.parse(data);
		} catch (error) {
			throw new Error(`The credentials-overwrite is not valid JSON.`);
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

	get(type: string): ICredentialDataDecryptedObject | undefined {
		const credentialTypes = CredentialTypes();
		const credentialTypeData = credentialTypes.getByName(type);

		if (credentialTypeData === undefined) {
			throw new Error(`The credentials of type "${type}" are not known.`);
		}

		if (credentialTypeData.extends === undefined) {
			return this.overwriteData[type];
		}

		const overwrites: ICredentialDataDecryptedObject = {};
		for (const credentialsTypeName of credentialTypeData.extends) {
			Object.assign(overwrites, this.get(credentialsTypeName));
		}

		if (this.overwriteData[type] !== undefined) {
			Object.assign(overwrites, this.overwriteData[type]);
		}

		return overwrites;
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
