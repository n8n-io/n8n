import { ValidationError } from './validation-error';

export class ReservedKeyFoundError extends ValidationError {
	constructor(reservedKey: string, itemIndex: number) {
		super({
			message: 'Invalid output format',
			description: `An output item contains the reserved key <code>${reservedKey}</code>. To get around this, please wrap each item in an object, under a key called <code>json</code>. <a href="https://docs.n8n.io/data/data-structure/#data-structure" target="_blank">Example</a>`,
			itemIndex,
		});
	}
}
