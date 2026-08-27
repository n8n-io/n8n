import { TypeORMError } from './TypeORMError';

export class MetadataWithSuchNameAlreadyExistsError extends TypeORMError {
	constructor(metadataType: string, name: string) {
		super(
			metadataType +
				' metadata with such name ' +
				name +
				' already exists. ' +
				'Do you apply decorator twice? Or maybe try to change a name?',
		);
	}
}
