const require_base = require('../base.cjs');

//#region src/chains/router/multi_route.ts
/**
* A class that represents a router chain. It
* extends the BaseChain class and provides functionality for routing
* inputs to different chains.
*/
var RouterChain = class extends require_base.BaseChain {
	get outputKeys() {
		return ["destination", "next_inputs"];
	}
	async route(inputs, callbacks) {
		const result = await this.call(inputs, callbacks);
		return {
			destination: result.destination,
			nextInputs: result.next_inputs
		};
	}
};
/**
* A class that represents a multi-route chain.
* It extends the BaseChain class and provides functionality for routing
* inputs to different chains based on a router chain.
*/
var MultiRouteChain = class extends require_base.BaseChain {
	static lc_name() {
		return "MultiRouteChain";
	}
	routerChain;
	destinationChains;
	defaultChain;
	silentErrors = false;
	constructor(fields) {
		super(fields);
		this.routerChain = fields.routerChain;
		this.destinationChains = fields.destinationChains;
		this.defaultChain = fields.defaultChain;
		this.silentErrors = fields.silentErrors ?? this.silentErrors;
	}
	get inputKeys() {
		return this.routerChain.inputKeys;
	}
	get outputKeys() {
		return [];
	}
	async _call(values, runManager) {
		const { destination, nextInputs } = await this.routerChain.route(values, runManager?.getChild());
		await runManager?.handleText(`${destination}: ${JSON.stringify(nextInputs)}`);
		if (!destination) return this.defaultChain.call(nextInputs, runManager?.getChild()).catch((err) => {
			throw new Error(`Error in default chain: ${err}`);
		});
		if (destination in this.destinationChains) return this.destinationChains[destination].call(nextInputs, runManager?.getChild()).catch((err) => {
			throw new Error(`Error in ${destination} chain: ${err}`);
		});
		if (this.silentErrors) return this.defaultChain.call(nextInputs, runManager?.getChild()).catch((err) => {
			throw new Error(`Error in default chain: ${err}`);
		});
		throw new Error(`Destination ${destination} not found in destination chains with keys ${Object.keys(this.destinationChains)}`);
	}
	_chainType() {
		return "multi_route_chain";
	}
};

//#endregion
exports.MultiRouteChain = MultiRouteChain;
exports.RouterChain = RouterChain;
//# sourceMappingURL=multi_route.cjs.map