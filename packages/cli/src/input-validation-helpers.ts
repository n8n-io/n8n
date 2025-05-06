import { Container } from '@n8n/di';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { ApplicationError, type IInputValidator } from 'n8n-workflow';

import { SchemaRepository } from './databases/repositories/schema.repository';

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

export class InputValidationHelper implements IInputValidator {
	async isValid(schemaId: string, body: unknown): Promise<void> {
		const schemaRepository = Container.get(SchemaRepository);
		const schema = await schemaRepository.findOneByOrFail({ id: schemaId });

		let validate = ajv.getSchema(schemaId);

		if (validate === undefined) {
			ajv.addSchema(schema.definition, schemaId);
			validate = ajv.getSchema(schemaId);
		}

		if (validate) {
			const valid = validate(body);

			if (!valid) {
				throw new ApplicationError(ajv.errorsText(validate.errors));
			}
		}
	}
}
