import { TASKS } from "./serde/types.js";
import { BaseCheckpointSaver, WRITES_IDX_MAP, copyCheckpoint, getCheckpointId, maxChannelVersion } from "./base.js";

//#region src/memory.ts
function _generateKey(threadId, checkpointNamespace, checkpointId) {
	return JSON.stringify([
		threadId,
		checkpointNamespace,
		checkpointId
	]);
}
function _parseKey(key) {
	const [threadId, checkpointNamespace, checkpointId] = JSON.parse(key);
	return {
		threadId,
		checkpointNamespace,
		checkpointId
	};
}
var MemorySaver = class extends BaseCheckpointSaver {
	storage = {};
	writes = {};
	constructor(serde) {
		super(serde);
	}
	/** @internal */
	async _migratePendingSends(mutableCheckpoint, threadId, checkpointNs, parentCheckpointId) {
		const deseriablizableCheckpoint = mutableCheckpoint;
		const parentKey = _generateKey(threadId, checkpointNs, parentCheckpointId);
		const pendingSends = await Promise.all(Object.values(this.writes[parentKey] ?? {}).filter(([_taskId, channel]) => channel === TASKS).map(async ([_taskId, _channel, writes]) => await this.serde.loadsTyped("json", writes)));
		deseriablizableCheckpoint.channel_values ??= {};
		deseriablizableCheckpoint.channel_values[TASKS] = pendingSends;
		deseriablizableCheckpoint.channel_versions ??= {};
		deseriablizableCheckpoint.channel_versions[TASKS] = Object.keys(deseriablizableCheckpoint.channel_versions).length > 0 ? maxChannelVersion(...Object.values(deseriablizableCheckpoint.channel_versions)) : this.getNextVersion(void 0);
	}
	async getTuple(config) {
		const thread_id = config.configurable?.thread_id;
		const checkpoint_ns = config.configurable?.checkpoint_ns ?? "";
		let checkpoint_id = getCheckpointId(config);
		if (checkpoint_id) {
			const saved = this.storage[thread_id]?.[checkpoint_ns]?.[checkpoint_id];
			if (saved !== void 0) {
				const [checkpoint, metadata, parentCheckpointId] = saved;
				const key = _generateKey(thread_id, checkpoint_ns, checkpoint_id);
				const deserializedCheckpoint = await this.serde.loadsTyped("json", checkpoint);
				if (deserializedCheckpoint.v < 4 && parentCheckpointId !== void 0) await this._migratePendingSends(deserializedCheckpoint, thread_id, checkpoint_ns, parentCheckpointId);
				const pendingWrites = await Promise.all(Object.values(this.writes[key] || {}).map(async ([taskId, channel, value]) => {
					return [
						taskId,
						channel,
						await this.serde.loadsTyped("json", value)
					];
				}));
				const checkpointTuple = {
					config,
					checkpoint: deserializedCheckpoint,
					metadata: await this.serde.loadsTyped("json", metadata),
					pendingWrites
				};
				if (parentCheckpointId !== void 0) checkpointTuple.parentConfig = { configurable: {
					thread_id,
					checkpoint_ns,
					checkpoint_id: parentCheckpointId
				} };
				return checkpointTuple;
			}
		} else {
			const checkpoints = this.storage[thread_id]?.[checkpoint_ns];
			if (checkpoints !== void 0) {
				checkpoint_id = Object.keys(checkpoints).sort((a, b) => b.localeCompare(a))[0];
				const saved = checkpoints[checkpoint_id];
				const [checkpoint, metadata, parentCheckpointId] = saved;
				const key = _generateKey(thread_id, checkpoint_ns, checkpoint_id);
				const deserializedCheckpoint = await this.serde.loadsTyped("json", checkpoint);
				if (deserializedCheckpoint.v < 4 && parentCheckpointId !== void 0) await this._migratePendingSends(deserializedCheckpoint, thread_id, checkpoint_ns, parentCheckpointId);
				const pendingWrites = await Promise.all(Object.values(this.writes[key] || {}).map(async ([taskId, channel, value]) => {
					return [
						taskId,
						channel,
						await this.serde.loadsTyped("json", value)
					];
				}));
				const checkpointTuple = {
					config: { configurable: {
						thread_id,
						checkpoint_id,
						checkpoint_ns
					} },
					checkpoint: deserializedCheckpoint,
					metadata: await this.serde.loadsTyped("json", metadata),
					pendingWrites
				};
				if (parentCheckpointId !== void 0) checkpointTuple.parentConfig = { configurable: {
					thread_id,
					checkpoint_ns,
					checkpoint_id: parentCheckpointId
				} };
				return checkpointTuple;
			}
		}
		return void 0;
	}
	async *list(config, options) {
		let { before, limit, filter } = options ?? {};
		const threadIds = config.configurable?.thread_id ? [config.configurable?.thread_id] : Object.keys(this.storage);
		const configCheckpointNamespace = config.configurable?.checkpoint_ns;
		const configCheckpointId = config.configurable?.checkpoint_id;
		for (const threadId of threadIds) for (const checkpointNamespace of Object.keys(this.storage[threadId] ?? {})) {
			if (configCheckpointNamespace !== void 0 && checkpointNamespace !== configCheckpointNamespace) continue;
			const checkpoints = this.storage[threadId]?.[checkpointNamespace] ?? {};
			const sortedCheckpoints = Object.entries(checkpoints).sort((a, b) => b[0].localeCompare(a[0]));
			for (const [checkpointId, [checkpoint, metadataStr, parentCheckpointId]] of sortedCheckpoints) {
				if (configCheckpointId && checkpointId !== configCheckpointId) continue;
				if (before && before.configurable?.checkpoint_id && checkpointId >= before.configurable.checkpoint_id) continue;
				const metadata = await this.serde.loadsTyped("json", metadataStr);
				if (filter && !Object.entries(filter).every(([key$1, value]) => metadata[key$1] === value)) continue;
				if (limit !== void 0) {
					if (limit <= 0) break;
					limit -= 1;
				}
				const key = _generateKey(threadId, checkpointNamespace, checkpointId);
				const writes = Object.values(this.writes[key] || {});
				const pendingWrites = await Promise.all(writes.map(async ([taskId, channel, value]) => {
					return [
						taskId,
						channel,
						await this.serde.loadsTyped("json", value)
					];
				}));
				const deserializedCheckpoint = await this.serde.loadsTyped("json", checkpoint);
				if (deserializedCheckpoint.v < 4 && parentCheckpointId !== void 0) await this._migratePendingSends(deserializedCheckpoint, threadId, checkpointNamespace, parentCheckpointId);
				const checkpointTuple = {
					config: { configurable: {
						thread_id: threadId,
						checkpoint_ns: checkpointNamespace,
						checkpoint_id: checkpointId
					} },
					checkpoint: deserializedCheckpoint,
					metadata,
					pendingWrites
				};
				if (parentCheckpointId !== void 0) checkpointTuple.parentConfig = { configurable: {
					thread_id: threadId,
					checkpoint_ns: checkpointNamespace,
					checkpoint_id: parentCheckpointId
				} };
				yield checkpointTuple;
			}
		}
	}
	async put(config, checkpoint, metadata) {
		const preparedCheckpoint = copyCheckpoint(checkpoint);
		const threadId = config.configurable?.thread_id;
		const checkpointNamespace = config.configurable?.checkpoint_ns ?? "";
		if (threadId === void 0) throw new Error(`Failed to put checkpoint. The passed RunnableConfig is missing a required "thread_id" field in its "configurable" property.`);
		if (!this.storage[threadId]) this.storage[threadId] = {};
		if (!this.storage[threadId][checkpointNamespace]) this.storage[threadId][checkpointNamespace] = {};
		const [[, serializedCheckpoint], [, serializedMetadata]] = await Promise.all([this.serde.dumpsTyped(preparedCheckpoint), this.serde.dumpsTyped(metadata)]);
		this.storage[threadId][checkpointNamespace][checkpoint.id] = [
			serializedCheckpoint,
			serializedMetadata,
			config.configurable?.checkpoint_id
		];
		return { configurable: {
			thread_id: threadId,
			checkpoint_ns: checkpointNamespace,
			checkpoint_id: checkpoint.id
		} };
	}
	async putWrites(config, writes, taskId) {
		const threadId = config.configurable?.thread_id;
		const checkpointNamespace = config.configurable?.checkpoint_ns;
		const checkpointId = config.configurable?.checkpoint_id;
		if (threadId === void 0) throw new Error(`Failed to put writes. The passed RunnableConfig is missing a required "thread_id" field in its "configurable" property`);
		if (checkpointId === void 0) throw new Error(`Failed to put writes. The passed RunnableConfig is missing a required "checkpoint_id" field in its "configurable" property.`);
		const outerKey = _generateKey(threadId, checkpointNamespace, checkpointId);
		const outerWrites_ = this.writes[outerKey];
		if (this.writes[outerKey] === void 0) this.writes[outerKey] = {};
		await Promise.all(writes.map(async ([channel, value], idx) => {
			const [, serializedValue] = await this.serde.dumpsTyped(value);
			const innerKey = [taskId, WRITES_IDX_MAP[channel] || idx];
			const innerKeyStr = `${innerKey[0]},${innerKey[1]}`;
			if (innerKey[1] >= 0 && outerWrites_ && innerKeyStr in outerWrites_) return;
			this.writes[outerKey][innerKeyStr] = [
				taskId,
				channel,
				serializedValue
			];
		}));
	}
	async deleteThread(threadId) {
		delete this.storage[threadId];
		for (const key of Object.keys(this.writes)) if (_parseKey(key).threadId === threadId) delete this.writes[key];
	}
};

//#endregion
export { MemorySaver };
//# sourceMappingURL=memory.js.map