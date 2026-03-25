import { __export } from "../_virtual/rolldown_runtime.js";
import { internalMutationGeneric, internalQueryGeneric } from "convex/server";
import { v } from "convex/values";

//#region src/utils/convex.ts
var convex_exports = {};
__export(convex_exports, {
	deleteMany: () => deleteMany,
	get: () => get,
	insert: () => insert,
	lookup: () => lookup,
	upsert: () => upsert
});
const get = /* @__PURE__ */ internalQueryGeneric({
	args: { id: /* @__PURE__ */ v.string() },
	handler: async (ctx, args) => {
		const result = await ctx.db.get(args.id);
		return result;
	}
});
const insert = /* @__PURE__ */ internalMutationGeneric({
	args: {
		table: /* @__PURE__ */ v.string(),
		document: /* @__PURE__ */ v.any()
	},
	handler: async (ctx, args) => {
		await ctx.db.insert(args.table, args.document);
	}
});
const lookup = /* @__PURE__ */ internalQueryGeneric({
	args: {
		table: /* @__PURE__ */ v.string(),
		index: /* @__PURE__ */ v.string(),
		keyField: /* @__PURE__ */ v.string(),
		key: /* @__PURE__ */ v.string()
	},
	handler: async (ctx, args) => {
		const result = await ctx.db.query(args.table).withIndex(args.index, (q) => q.eq(args.keyField, args.key)).collect();
		return result;
	}
});
const upsert = /* @__PURE__ */ internalMutationGeneric({
	args: {
		table: /* @__PURE__ */ v.string(),
		index: /* @__PURE__ */ v.string(),
		keyField: /* @__PURE__ */ v.string(),
		key: /* @__PURE__ */ v.string(),
		document: /* @__PURE__ */ v.any()
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db.query(args.table).withIndex(args.index, (q) => q.eq(args.keyField, args.key)).unique();
		if (existing !== null) await ctx.db.replace(existing._id, args.document);
		else await ctx.db.insert(args.table, args.document);
	}
});
const deleteMany = /* @__PURE__ */ internalMutationGeneric({
	args: {
		table: /* @__PURE__ */ v.string(),
		index: /* @__PURE__ */ v.string(),
		keyField: /* @__PURE__ */ v.string(),
		key: /* @__PURE__ */ v.string()
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db.query(args.table).withIndex(args.index, (q) => q.eq(args.keyField, args.key)).collect();
		await Promise.all(existing.map((doc) => ctx.db.delete(doc._id)));
	}
});

//#endregion
export { convex_exports, deleteMany, get, insert, lookup, upsert };
//# sourceMappingURL=convex.js.map