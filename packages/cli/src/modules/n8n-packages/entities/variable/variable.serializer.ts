import type { Variables } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import {
	serializedVariableSchema,
	type SerializedVariable,
} from '../../spec/serialized/variable.schema';

@Service()
export class VariableSerializer {
	serialize(variable: Variables): SerializedVariable {
		// The exporter skips non-string types entirely (no file, no catalog entry),
		// so reaching this with one is a bug — fail loudly rather than risk leaking
		// a future secret-like value into a package.
		if (variable.type !== 'string') {
			throw new UnexpectedError(
				`Refusing to serialize variable of unsupported type "${variable.type}"`,
			);
		}

		return serializedVariableSchema.parse({
			name: variable.key,
			type: variable.type,
			value: variable.value,
			...(variable.project ? { projectId: variable.project.id } : {}),
		});
	}
}
