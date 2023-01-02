import { DateTime } from 'luxon';
import { EventMessageTypeNames, JsonObject, JsonValue } from 'n8n-workflow';

export interface EventMessageConfirmSource extends JsonObject {
	id: string;
	name: string;
}

export class EventMessageConfirm {
	readonly __type = EventMessageTypeNames.confirm;

	readonly confirm: string;

	readonly source?: EventMessageConfirmSource;

	readonly ts: DateTime;

	constructor(confirm: string, source?: EventMessageConfirmSource) {
		this.confirm = confirm;
		this.ts = DateTime.now();
		if (source) this.source = source;
	}

	serialize(): JsonValue {
		// TODO: filter payload for sensitive info here?
		return {
			__type: this.__type,
			confirm: this.confirm,
			ts: this.ts.toISO(),
			source: this.source ?? { name: '', id: '' },
		};
	}
}

export const isEventMessageConfirm = (candidate: unknown): candidate is EventMessageConfirm => {
	const o = candidate as EventMessageConfirm;
	if (!o) return false;
	return o.confirm !== undefined && o.ts !== undefined;
};
