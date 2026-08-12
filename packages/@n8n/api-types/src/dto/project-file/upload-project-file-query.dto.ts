import { booleanFromString } from '../../schemas/boolean-from-string';
import { Z } from '../../zod-class';

export class UploadProjectFileQueryDto extends Z.class({
	/**
	 * Replace an existing file of the same name instead of returning 409. Carried
	 * as a query param rather than a form field so it is parsed independently of
	 * the multipart body.
	 */
	overwrite: booleanFromString.optional().default('false'),
}) {}
