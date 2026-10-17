import { UserError } from '@n8n/errors';
import type { HooksApiErrorV1 } from '@n8n/hooks-api';

export class HooksApiError<Code extends string> extends UserError implements HooksApiErrorV1<Code> {
	constructor(
		readonly code: Code,
		message: string,
	) {
		super(message);
	}
}
