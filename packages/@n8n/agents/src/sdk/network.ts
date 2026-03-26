import type { Agent } from './agent';
import type { GenerateResult, RunOptions } from '../types';
import type { Message } from '../types/sdk/message';

interface BuiltNetwork {
	readonly name: string;
	run(prompt: string, options?: RunOptions): Promise<GenerateResult>;
}

/**
 * Builder for creating multi-agent networks with a coordinator.
 *
 * Usage:
 * ```typescript
 * const network = new Network('content-team')
 *   .coordinator(coordinatorAgent)
 *   .agent(researcher)
 *   .agent(writer);
 *
 * const result = await network.run('Research and write about RAG');
 * ```
 */
export class Network {
	private networkName: string;

	private coordinatorAgent?: Agent;

	private agents: Agent[] = [];

	private built?: BuiltNetwork;

	constructor(name: string) {
		this.networkName = name;
	}

	/** Set the coordinator agent that routes tasks to specialists. */
	coordinator(a: Agent): this {
		this.coordinatorAgent = a;
		return this;
	}

	/** Add a specialist agent to the network. */
	agent(a: Agent): this {
		this.agents.push(a);
		return this;
	}

	/** @internal Lazy-build the network on first use. */
	private ensureBuilt(): BuiltNetwork {
		this.built ??= this.build();
		return this.built;
	}

	/** The network name. */
	get name(): string {
		return this.networkName;
	}

	/** Run the network with a prompt. Lazy-builds on first call. */
	async run(prompt: string, options?: RunOptions): Promise<GenerateResult> {
		return await this.ensureBuilt().run(prompt, options);
	}

	/** @internal */
	protected build(): BuiltNetwork {
		if (!this.coordinatorAgent) {
			throw new Error(`Network "${this.networkName}" requires a coordinator`);
		}
		if (this.agents.length === 0) {
			throw new Error(`Network "${this.networkName}" requires at least one agent`);
		}

		// TODO: Specialist agents are stored for validation but not yet wired
		// to the coordinator automatically. For now, specialists must be added
		// as tools on the coordinator agent manually (via agent.asTool()).
		// Multi-agent routing will be implemented in a future iteration.

		const coordinator = this.coordinatorAgent;
		const name = this.networkName;

		return {
			name,

			async run(prompt: string, options?: RunOptions): Promise<GenerateResult> {
				const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: prompt }] }];
				return await coordinator.generate(messages, options);
			},
		};
	}
}
