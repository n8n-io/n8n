import type { Variables } from '@n8n/db';
import { Service } from '@n8n/di';

import {
	serializedVariableSchema,
	type SerializedVariable,
} from '../../spec/serialized/variable.schema';
import {
	definePackageSerializationPayload,
	type PackageEntityKeyHandling,
} from '../package-serialization.types';

const variablePackageKeyHandling = {
	id: 'exclude',
	key: 'transform',
	type: 'copy',
	value: 'copy',
	project: 'transform',
} as const satisfies PackageEntityKeyHandling<Variables>;

const serializePayload = definePackageSerializationPayload<
	Variables,
	SerializedVariable,
	typeof variablePackageKeyHandling
>();

@Service()
export class VariableSerializer {
	serialize(
		variable: Variables,
		{ includeValue = true }: { includeValue?: boolean } = {},
	): SerializedVariable {
		const type = serializedVariableSchema.shape.type.parse(variable.type);

		return serializedVariableSchema.parse(
			serializePayload({
				name: variable.key,
				type,
				...(includeValue ? { value: variable.value } : {}),
			}),
		);
	}
}
