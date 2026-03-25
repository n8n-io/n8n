"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Compares two script coverages.
 *
 * The result corresponds to the comparison of their `url` value (alphabetical sort).
 */
function compareScriptCovs(a, b) {
    if (a.url === b.url) {
        return 0;
    }
    else if (a.url < b.url) {
        return -1;
    }
    else {
        return 1;
    }
}
exports.compareScriptCovs = compareScriptCovs;
/**
 * Compares two function coverages.
 *
 * The result corresponds to the comparison of the root ranges.
 */
function compareFunctionCovs(a, b) {
    return compareRangeCovs(a.ranges[0], b.ranges[0]);
}
exports.compareFunctionCovs = compareFunctionCovs;
/**
 * Compares two range coverages.
 *
 * The ranges are first ordered by ascending `startOffset` and then by
 * descending `endOffset`.
 * This corresponds to a pre-order tree traversal.
 */
function compareRangeCovs(a, b) {
    if (a.startOffset !== b.startOffset) {
        return a.startOffset - b.startOffset;
    }
    else {
        return b.endOffset - a.endOffset;
    }
}
exports.compareRangeCovs = compareRangeCovs;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9zcmMvY29tcGFyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBOzs7O0dBSUc7QUFDSCxTQUFnQixpQkFBaUIsQ0FBQyxDQUFzQixFQUFFLENBQXNCO0lBQzlFLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxFQUFFO1FBQ25CLE9BQU8sQ0FBQyxDQUFDO0tBQ1Y7U0FBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRTtRQUN4QixPQUFPLENBQUMsQ0FBQyxDQUFDO0tBQ1g7U0FBTTtRQUNMLE9BQU8sQ0FBQyxDQUFDO0tBQ1Y7QUFDSCxDQUFDO0FBUkQsOENBUUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBZ0IsbUJBQW1CLENBQUMsQ0FBd0IsRUFBRSxDQUF3QjtJQUNwRixPQUFPLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BELENBQUM7QUFGRCxrREFFQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQWdCLGdCQUFnQixDQUFDLENBQXFCLEVBQUUsQ0FBcUI7SUFDM0UsSUFBSSxDQUFDLENBQUMsV0FBVyxLQUFLLENBQUMsQ0FBQyxXQUFXLEVBQUU7UUFDbkMsT0FBTyxDQUFDLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUM7S0FDdEM7U0FBTTtRQUNMLE9BQU8sQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDO0tBQ2xDO0FBQ0gsQ0FBQztBQU5ELDRDQU1DIiwiZmlsZSI6ImNvbXBhcmUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBGdW5jdGlvbkNvdiwgUmFuZ2VDb3YsIFNjcmlwdENvdiB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbi8qKlxuICogQ29tcGFyZXMgdHdvIHNjcmlwdCBjb3ZlcmFnZXMuXG4gKlxuICogVGhlIHJlc3VsdCBjb3JyZXNwb25kcyB0byB0aGUgY29tcGFyaXNvbiBvZiB0aGVpciBgdXJsYCB2YWx1ZSAoYWxwaGFiZXRpY2FsIHNvcnQpLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZVNjcmlwdENvdnMoYTogUmVhZG9ubHk8U2NyaXB0Q292PiwgYjogUmVhZG9ubHk8U2NyaXB0Q292Pik6IG51bWJlciB7XG4gIGlmIChhLnVybCA9PT0gYi51cmwpIHtcbiAgICByZXR1cm4gMDtcbiAgfSBlbHNlIGlmIChhLnVybCA8IGIudXJsKSB7XG4gICAgcmV0dXJuIC0xO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAxO1xuICB9XG59XG5cbi8qKlxuICogQ29tcGFyZXMgdHdvIGZ1bmN0aW9uIGNvdmVyYWdlcy5cbiAqXG4gKiBUaGUgcmVzdWx0IGNvcnJlc3BvbmRzIHRvIHRoZSBjb21wYXJpc29uIG9mIHRoZSByb290IHJhbmdlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVGdW5jdGlvbkNvdnMoYTogUmVhZG9ubHk8RnVuY3Rpb25Db3Y+LCBiOiBSZWFkb25seTxGdW5jdGlvbkNvdj4pOiBudW1iZXIge1xuICByZXR1cm4gY29tcGFyZVJhbmdlQ292cyhhLnJhbmdlc1swXSwgYi5yYW5nZXNbMF0pO1xufVxuXG4vKipcbiAqIENvbXBhcmVzIHR3byByYW5nZSBjb3ZlcmFnZXMuXG4gKlxuICogVGhlIHJhbmdlcyBhcmUgZmlyc3Qgb3JkZXJlZCBieSBhc2NlbmRpbmcgYHN0YXJ0T2Zmc2V0YCBhbmQgdGhlbiBieVxuICogZGVzY2VuZGluZyBgZW5kT2Zmc2V0YC5cbiAqIFRoaXMgY29ycmVzcG9uZHMgdG8gYSBwcmUtb3JkZXIgdHJlZSB0cmF2ZXJzYWwuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wYXJlUmFuZ2VDb3ZzKGE6IFJlYWRvbmx5PFJhbmdlQ292PiwgYjogUmVhZG9ubHk8UmFuZ2VDb3Y+KTogbnVtYmVyIHtcbiAgaWYgKGEuc3RhcnRPZmZzZXQgIT09IGIuc3RhcnRPZmZzZXQpIHtcbiAgICByZXR1cm4gYS5zdGFydE9mZnNldCAtIGIuc3RhcnRPZmZzZXQ7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGIuZW5kT2Zmc2V0IC0gYS5lbmRPZmZzZXQ7XG4gIH1cbn1cbiJdLCJzb3VyY2VSb290IjoiIn0=
