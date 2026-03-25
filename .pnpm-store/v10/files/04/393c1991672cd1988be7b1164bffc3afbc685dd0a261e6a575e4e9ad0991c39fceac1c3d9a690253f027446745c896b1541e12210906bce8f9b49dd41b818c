const require_id = require('./id.cjs');
const require_types = require('./serde/types.cjs');
const require_jsonplus = require('./serde/jsonplus.cjs');

//#region src/base.ts
function deepCopy(obj) {
	if (typeof obj !== "object" || obj === null) return obj;
	const newObj = Array.isArray(obj) ? [] : {};
	for (const key in obj) if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = deepCopy(obj[key]);
	return newObj;
}
/** @hidden */
function emptyCheckpoint() {
	return {
		v: 4,
		id: require_id.uuid6(-2),
		ts: (/* @__PURE__ */ new Date()).toISOString(),
		channel_values: {},
		channel_versions: {},
		versions_seen: {}
	};
}
/** @hidden */
function copyCheckpoint(checkpoint) {
	return {
		v: checkpoint.v,
		id: checkpoint.id,
		ts: checkpoint.ts,
		channel_values: { ...checkpoint.channel_values },
		channel_versions: { ...checkpoint.channel_versions },
		versions_seen: deepCopy(checkpoint.versions_seen)
	};
}
var BaseCheckpointSaver = class {
	serde = new require_jsonplus.JsonPlusSerializer();
	constructor(serde) {
		this.serde = serde || this.serde;
	}
	async get(config) {
		const value = await this.getTuple(config);
		return value ? value.checkpoint : void 0;
	}
	/**
	* Generate the next version ID for a channel.
	*
	* Default is to use integer versions, incrementing by 1. If you override, you can use str/int/float versions,
	* as long as they are monotonically increasing.
	*/
	getNextVersion(current) {
		if (typeof current === "string") throw new Error("Please override this method to use string versions.");
		return current !== void 0 && typeof current === "number" ? current + 1 : 1;
	}
};
function compareChannelVersions(a, b) {
	if (typeof a === "number" && typeof b === "number") return Math.sign(a - b);
	return String(a).localeCompare(String(b));
}
function maxChannelVersion(...versions) {
	return versions.reduce((max, version, idx) => {
		if (idx === 0) return version;
		return compareChannelVersions(max, version) >= 0 ? max : version;
	});
}
/**
* Mapping from error type to error index.
* Regular writes just map to their index in the list of writes being saved.
* Special writes (e.g. errors) map to negative indices, to avoid those writes from
* conflicting with regular writes.
* Each Checkpointer implementation should use this mapping in put_writes.
*/
const WRITES_IDX_MAP = {
	[require_types.ERROR]: -1,
	[require_types.SCHEDULED]: -2,
	[require_types.INTERRUPT]: -3,
	[require_types.RESUME]: -4
};
function getCheckpointId(config) {
	return config.configurable?.checkpoint_id || config.configurable?.thread_ts || "";
}

//#endregion
exports.BaseCheckpointSaver = BaseCheckpointSaver;
exports.WRITES_IDX_MAP = WRITES_IDX_MAP;
exports.compareChannelVersions = compareChannelVersions;
exports.copyCheckpoint = copyCheckpoint;
exports.deepCopy = deepCopy;
exports.emptyCheckpoint = emptyCheckpoint;
exports.getCheckpointId = getCheckpointId;
exports.maxChannelVersion = maxChannelVersion;
//# sourceMappingURL=base.cjs.map