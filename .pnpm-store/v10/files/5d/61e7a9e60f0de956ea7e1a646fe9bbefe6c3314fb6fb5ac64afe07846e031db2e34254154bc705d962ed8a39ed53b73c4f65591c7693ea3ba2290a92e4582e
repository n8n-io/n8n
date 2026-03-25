const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const convex_server = require_rolldown_runtime.__toESM(require("convex/server"));
const convex_values = require_rolldown_runtime.__toESM(require("convex/values"));

//#region src/utils/convex.ts
var convex_exports = {};
require_rolldown_runtime.__export(convex_exports, {
	deleteMany: () => deleteMany,
	get: () => get,
	insert: () => insert,
	lookup: () => lookup,
	upsert: () => upsert
});
const get = /* @__PURE__ */ (0, convex_server.internalQueryGeneric)({
	args: { id: /* @__PURE__ */ convex_values.v.string() },
	handler: async (ctx, args) => {
		const result = await ctx.db.get(args.id);
		return result;
	}
});
const insert = /* @__PURE__ */ (0, convex_server.internalMutationGeneric)({
	args: {
		table: /* @__PURE__ */ convex_values.v.string(),
		document: /* @__PURE__ */ convex_values.v.any()
	},
	handler: async (ctx, args) => {
		await ctx.db.insert(args.table, args.document);
	}
});
const lookup = /* @__PURE__ */ (0, convex_server.internalQueryGeneric)({
	args: {
		table: /* @__PURE__ */ convex_values.v.string(),
		index: /* @__PURE__ */ convex_values.v.string(),
		keyField: /* @__PURE__ */ convex_values.v.string(),
		key: /* @__PURE__ */ convex_values.v.string()
	},
	handler: async (ctx, args) => {
		const result = await ctx.db.query(args.table).withIndex(args.index, (q) => q.eq(args.keyField, args.key)).collect();
		return result;
	}
});
const upsert = /* @__PURE__ */ (0, convex_server.internalMutationGeneric)({
	args: {
		table: /* @__PURE__ */ convex_values.v.string(),
		index: /* @__PURE__ */ convex_values.v.string(),
		keyField: /* @__PURE__ */ convex_values.v.string(),
		key: /* @__PURE__ */ convex_values.v.string(),
		document: /* @__PURE__ */ convex_values.v.any()
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db.query(args.table).withIndex(args.index, (q) => q.eq(args.keyField, args.key)).unique();
		if (existing !== null) await ctx.db.replace(existing._id, args.document);
		else await ctx.db.insert(args.table, args.document);
	}
});
const deleteMany = /* @__PURE__ */ (0, convex_server.internalMutationGeneric)({
	args: {
		table: /* @__PURE__ */ convex_values.v.string(),
		index: /* @__PURE__ */ convex_values.v.string(),
		keyField: /* @__PURE__ */ convex_values.v.string(),
		key: /* @__PURE__ */ convex_values.v.string()
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db.query(args.table).withIndex(args.index, (q) => q.eq(args.keyField, args.key)).collect();
		await Promise.all(existing.map((doc) => ctx.db.delete(doc._id)));
	}
});

//#endregion
Object.defineProperty(exports, 'convex_exports', {
  enumerable: true,
  get: function () {
    return convex_exports;
  }
});
exports.deleteMany = deleteMany;
exports.get = get;
exports.insert = insert;
exports.lookup = lookup;
exports.upsert = upsert;
//# sourceMappingURL=convex.cjs.map