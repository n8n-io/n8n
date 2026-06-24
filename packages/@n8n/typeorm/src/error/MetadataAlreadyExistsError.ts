import { TypeORMError } from './TypeORMError';

export class MetadataAlreadyExistsError extends TypeORMError {
	constructor(metadataType: string, constructor: Function, propertyName?: string) {
		super(
			metadataType +
				' metadata already exists for the class constructor ' +
				JSON.stringify(constructor) +
				(propertyName
					? ' on property ' + propertyName
					: '. If you previously renamed or moved entity class, make sure' +
						" that compiled version of old entity class source wasn't left in the compiler output directory."),
		);
	}
}
