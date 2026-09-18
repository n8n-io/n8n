import type { CustomNodeDefinition, CustomOperationDefinition } from '@n8n/api-types';
import { JsonColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity } from '@n8n/typeorm';

export type CustomNodeDefinitionType = 'operation' | 'node';

/**
 * One stored Custom Operation (`type = 'operation'`) or Custom Node
 * (`type = 'node'`). The JSON `definition` column holds the full document
 * including the version history.
 */
@Entity('custom_node_definition')
export class CustomNodeDefinitionEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 255 })
	name: string;

	@Column({ type: 'varchar', length: 16 })
	type: CustomNodeDefinitionType;

	@JsonColumn()
	definition: CustomOperationDefinition | CustomNodeDefinition;
}
