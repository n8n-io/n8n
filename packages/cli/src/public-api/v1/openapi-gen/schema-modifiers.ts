import { addObjectTypeToObjectUnions } from './object-union-type';
import { stripUntypedNullable } from './untyped-nullable';

const SCHEMA_MODIFIERS = [stripUntypedNullable, addObjectTypeToObjectUnions];

export function applySchemaModifiers(node: unknown): void {
	for (const modify of SCHEMA_MODIFIERS) {
		modify(node);
	}
}
