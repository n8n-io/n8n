import { uuid6 } from "./id.js";
import { ERROR, INTERRUPT, RESUME, SCHEDULED } from "./serde/types.js";
import { JsonPlusSerializer } from "./serde/jsonplus.js";

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
		id: uuid6(-2),
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
	serde = new JsonPlusSerializer();
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
	[ERROR]: -1,
	[SCHEDULED]: -2,
	[INTERRUPT]: -3,
	[RESUME]: -4
};
function getCheckpointId(config) {
	return config.configurable?.checkpoint_id || config.configurable?.thread_ts || "";
}

//#endregion
export { BaseCheckpointSaver, WRITES_IDX_MAP, compareChannelVersions, copyCheckpoint, deepCopy, emptyCheckpoint, getCheckpointId, maxChannelVersion };
//# sourceMappingURL=base.js.map