import { t as __commonJSMin } from "./rolldown-runtime-EITvVbkG.js";
import { Tr as require__baseOrderBy, jo as require_isArray } from "./vendor-Hx42-oQF.js";
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/orderBy.js
var require_orderBy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var baseOrderBy = require__baseOrderBy();
	var isArray = require_isArray();
	/**
	* This method is like `_.sortBy` except that it allows specifying the sort
	* orders of the iteratees to sort by. If `orders` is unspecified, all values
	* are sorted in ascending order. Otherwise, specify an order of "desc" for
	* descending or "asc" for ascending sort order of corresponding values.
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Collection
	* @param {Array|Object} collection The collection to iterate over.
	* @param {Array[]|Function[]|Object[]|string[]} [iteratees=[_.identity]]
	*  The iteratees to sort by.
	* @param {string[]} [orders] The sort orders of `iteratees`.
	* @param- {Object} [guard] Enables use as an iteratee for methods like `_.reduce`.
	* @returns {Array} Returns the new sorted array.
	* @example
	*
	* var users = [
	*   { 'user': 'fred',   'age': 48 },
	*   { 'user': 'barney', 'age': 34 },
	*   { 'user': 'fred',   'age': 40 },
	*   { 'user': 'barney', 'age': 36 }
	* ];
	*
	* // Sort by `user` in ascending order and by `age` in descending order.
	* _.orderBy(users, ['user', 'age'], ['asc', 'desc']);
	* // => objects for [['barney', 36], ['barney', 34], ['fred', 48], ['fred', 40]]
	*/
	function orderBy(collection, iteratees, orders, guard) {
		if (collection == null) return [];
		if (!isArray(iteratees)) iteratees = iteratees == null ? [] : [iteratees];
		orders = guard ? void 0 : orders;
		if (!isArray(orders)) orders = orders == null ? [] : [orders];
		return baseOrderBy(collection, iteratees, orders);
	}
	module.exports = orderBy;
}));
//#endregion
export { require_orderBy as t };
