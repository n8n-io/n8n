import type { Variables } from '@n8n/db';
import { Service } from '@n8n/di';

import {
	serializedVariableSchema,
	type SerializedVariable,
} from '../../spec/serialized/variable.schema';

@Service()
export class VariableSerializer {
	serialize(
		variable: Variables,
		{ includeValue = true }: { includeValue?: boolean } = {},
	): SerializedVariable {
		return serializedVariableSchema.parse({
			name: variable.key,
			type: variable.type,
			...(includeValue ? { value: variable.value } : {}),
		});
	}
}
