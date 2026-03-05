import { AgentRun } from './run';
import type { BuiltAgent, BuiltNetwork, Run, RunOptions } from './types';

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
 * const run = network.run('Research and write about RAG');
 * const result = await run.result;
 * ```
 */
export class Network {
	private networkName: string;

	private coordinatorAgent?: BuiltAgent;

	private agents: BuiltAgent[] = [];

	private _built?: BuiltNetwork;

	constructor(name: string) {
		this.networkName = name;
	}

	/** Set the coordinator agent that routes tasks to specialists. Accepts a built agent or an Agent builder. */
	coordinator(a: BuiltAgent | { build(): BuiltAgent }): this {
		this.coordinatorAgent = 'approveToolCall' in a ? a : a.build();
		return this;
	}

	/** Add a specialist agent to the network. Accepts a built agent or an Agent builder. */
	agent(a: BuiltAgent | { build(): BuiltAgent }): this {
		this.agents.push('approveToolCall' in a ? a : a.build());
		return this;
	}

	/** @internal Lazy-build the network on first use. */
	private ensureBuilt(): BuiltNetwork {
		this._built ??= this.build();
		return this._built;
	}

	/** The network name. */
	get name(): string {
		return this.networkName;
	}

	/** Run the network with a prompt. Lazy-builds on first call. */
	run(prompt: string, options?: RunOptions): Run {
		return this.ensureBuilt().run(prompt, options);
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

			run(prompt: string, options?: RunOptions) {
				const resultPromise = (async () => {
					const coordinatorRun = coordinator.run(
						[{ role: 'user', content: [{ type: 'text', text: prompt }] }],
						options,
					);
					return await coordinatorRun.result;
				})();

				return new AgentRun(resultPromise);
			},
		};
	}
}
