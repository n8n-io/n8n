import { CONFIG_KEY_READ } from "../constants.js";
import { RunnableCallable } from "../utils.js";
import { ChannelWrite } from "./write.js";
import { RunnableBinding, RunnablePassthrough, RunnableSequence, _coerceToRunnable } from "@langchain/core/runnables";

//#region src/pregel/read.ts
var ChannelRead = class ChannelRead extends RunnableCallable {
	lc_graph_name = "ChannelRead";
	channel;
	fresh = false;
	mapper;
	constructor(channel, mapper, fresh = false) {
		super({ func: (_, config) => ChannelRead.doRead(config, this.channel, this.fresh, this.mapper) });
		this.fresh = fresh;
		this.mapper = mapper;
		this.channel = channel;
		this.name = Array.isArray(channel) ? `ChannelRead<${channel.join(",")}>` : `ChannelRead<${channel}>`;
	}
	static doRead(config, channel, fresh, mapper) {
		const read = config.configurable?.[CONFIG_KEY_READ];
		if (!read) throw new Error("Runnable is not configured with a read function. Make sure to call in the context of a Pregel process");
		if (mapper) return mapper(read(channel, fresh));
		else return read(channel, fresh);
	}
};
const defaultRunnableBound = /* @__PURE__ */ new RunnablePassthrough();
var PregelNode = class PregelNode extends RunnableBinding {
	lc_graph_name = "PregelNode";
	channels;
	triggers = [];
	mapper;
	writers = [];
	bound = defaultRunnableBound;
	kwargs = {};
	metadata = {};
	tags = [];
	retryPolicy;
	cachePolicy;
	subgraphs;
	ends;
	constructor(fields) {
		const { channels, triggers, mapper, writers, bound, kwargs, metadata, retryPolicy, cachePolicy, tags, subgraphs, ends } = fields;
		const mergedTags = [...fields.config?.tags ? fields.config.tags : [], ...tags ?? []];
		super({
			...fields,
			bound: fields.bound ?? defaultRunnableBound,
			config: {
				...fields.config ? fields.config : {},
				tags: mergedTags
			}
		});
		this.channels = channels;
		this.triggers = triggers;
		this.mapper = mapper;
		this.writers = writers ?? this.writers;
		this.bound = bound ?? this.bound;
		this.kwargs = kwargs ?? this.kwargs;
		this.metadata = metadata ?? this.metadata;
		this.tags = mergedTags;
		this.retryPolicy = retryPolicy;
		this.cachePolicy = cachePolicy;
		this.subgraphs = subgraphs;
		this.ends = ends;
	}
	getWriters() {
		const newWriters = [...this.writers];
		while (newWriters.length > 1 && newWriters[newWriters.length - 1] instanceof ChannelWrite && newWriters[newWriters.length - 2] instanceof ChannelWrite) {
			const endWriters = newWriters.slice(-2);
			const combinedWrites = endWriters[0].writes.concat(endWriters[1].writes);
			newWriters[newWriters.length - 2] = new ChannelWrite(combinedWrites, endWriters[0].config?.tags);
			newWriters.pop();
		}
		return newWriters;
	}
	getNode() {
		const writers = this.getWriters();
		if (this.bound === defaultRunnableBound && writers.length === 0) return void 0;
		else if (this.bound === defaultRunnableBound && writers.length === 1) return writers[0];
		else if (this.bound === defaultRunnableBound) return new RunnableSequence({
			first: writers[0],
			middle: writers.slice(1, writers.length - 1),
			last: writers[writers.length - 1],
			omitSequenceTags: true
		});
		else if (writers.length > 0) return new RunnableSequence({
			first: this.bound,
			middle: writers.slice(0, writers.length - 1),
			last: writers[writers.length - 1],
			omitSequenceTags: true
		});
		else return this.bound;
	}
	join(channels) {
		if (!Array.isArray(channels)) throw new Error("channels must be a list");
		if (typeof this.channels !== "object") throw new Error("all channels must be named when using .join()");
		return new PregelNode({
			channels: {
				...this.channels,
				...Object.fromEntries(channels.map((chan) => [chan, chan]))
			},
			triggers: this.triggers,
			mapper: this.mapper,
			writers: this.writers,
			bound: this.bound,
			kwargs: this.kwargs,
			config: this.config,
			retryPolicy: this.retryPolicy,
			cachePolicy: this.cachePolicy
		});
	}
	pipe(coerceable) {
		if (ChannelWrite.isWriter(coerceable)) return new PregelNode({
			channels: this.channels,
			triggers: this.triggers,
			mapper: this.mapper,
			writers: [...this.writers, coerceable],
			bound: this.bound,
			config: this.config,
			kwargs: this.kwargs,
			retryPolicy: this.retryPolicy,
			cachePolicy: this.cachePolicy
		});
		else if (this.bound === defaultRunnableBound) return new PregelNode({
			channels: this.channels,
			triggers: this.triggers,
			mapper: this.mapper,
			writers: this.writers,
			bound: _coerceToRunnable(coerceable),
			config: this.config,
			kwargs: this.kwargs,
			retryPolicy: this.retryPolicy,
			cachePolicy: this.cachePolicy
		});
		else return new PregelNode({
			channels: this.channels,
			triggers: this.triggers,
			mapper: this.mapper,
			writers: this.writers,
			bound: this.bound.pipe(coerceable),
			config: this.config,
			kwargs: this.kwargs,
			retryPolicy: this.retryPolicy,
			cachePolicy: this.cachePolicy
		});
	}
};

//#endregion
export { ChannelRead, PregelNode };
//# sourceMappingURL=read.js.map