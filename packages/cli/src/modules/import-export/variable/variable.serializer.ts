import { Service } from '@n8n/di';
import type { Variables } from '@n8n/db';

import type { Serializer } from '../serializer';
import type { SerializedVariable } from './variable.types';

@Service()
export class VariableSerializer implements Serializer<Variables, SerializedVariable> {
	serialize(variable: Variables): SerializedVariable {
		return {
			id: variable.id,
			key: variable.key,
			type: variable.type,
			value: variable.value,
		};
	}
}
