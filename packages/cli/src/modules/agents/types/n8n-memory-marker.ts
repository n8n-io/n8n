import type { BuiltMemory, MemoryDescriptor } from '@n8n/agents';

/**
 * Sandbox marker for the n8n built-in memory backend.
 *
 * Exposed as part of the virtual `@n8n/agents-utils` package inside the agent
 * sandbox. When user code writes:
 * ```typescript
 * import { N8nMemory } from '@n8n/agents-utils';
 * agent.memory(new N8nMemory());
 * ```
 * the SDK serializes `describe()` into the agent schema. On the host side,
 * `fromSchema()` looks up `'n8n'` in the `memoryRegistry` and returns the
 * real TypeORM-backed `N8nMemory` service.
 */
export class N8nMemoryMarker {
	build(): BuiltMemory {
		return {
			getThread: async () => null,
			saveThread: async (thread) => ({ ...thread, createdAt: new Date(), updatedAt: new Date() }),
			deleteThread: async () => {},
			getMessages: async () => [],
			saveMessages: async () => {},
			deleteMessages: async () => {},
			describe: (): MemoryDescriptor => ({
				name: 'n8n',
				connectionParams: {},
				constructorName: 'N8nMemory',
			}),
		};
	}

	describe(): MemoryDescriptor {
		return { name: 'n8n', connectionParams: {}, constructorName: 'N8nMemory' };
	}
}
