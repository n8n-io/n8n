import { ApplicationError } from 'n8n-workflow';

import { CONFIG_MODES } from '../BinaryData/utils';

export class InvalidModeError extends ApplicationError {
	constructor() {
		super(`Invalid binary data mode. Valid modes: ${CONFIG_MODES.join(', ')}`);
	}
}
