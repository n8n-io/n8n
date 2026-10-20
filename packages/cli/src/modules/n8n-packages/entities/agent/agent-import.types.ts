import type { SerializedAgent, SerializedAgentMetadata } from '../../spec/serialized/agent.schema';

export interface PreparedAgent extends Omit<SerializedAgent, 'id'> {
	sourceAgentId: string;
	metadata: SerializedAgentMetadata;
}
