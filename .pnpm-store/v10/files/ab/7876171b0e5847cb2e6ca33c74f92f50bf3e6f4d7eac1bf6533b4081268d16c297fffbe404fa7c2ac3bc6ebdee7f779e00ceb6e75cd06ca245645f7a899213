"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Creates a deep copy of a process coverage.
 *
 * @param processCov Process coverage to clone.
 * @return Cloned process coverage.
 */
function cloneProcessCov(processCov) {
    const result = [];
    for (const scriptCov of processCov.result) {
        result.push(cloneScriptCov(scriptCov));
    }
    return {
        result,
    };
}
exports.cloneProcessCov = cloneProcessCov;
/**
 * Creates a deep copy of a script coverage.
 *
 * @param scriptCov Script coverage to clone.
 * @return Cloned script coverage.
 */
function cloneScriptCov(scriptCov) {
    const functions = [];
    for (const functionCov of scriptCov.functions) {
        functions.push(cloneFunctionCov(functionCov));
    }
    return {
        scriptId: scriptCov.scriptId,
        url: scriptCov.url,
        functions,
    };
}
exports.cloneScriptCov = cloneScriptCov;
/**
 * Creates a deep copy of a function coverage.
 *
 * @param functionCov Function coverage to clone.
 * @return Cloned function coverage.
 */
function cloneFunctionCov(functionCov) {
    const ranges = [];
    for (const rangeCov of functionCov.ranges) {
        ranges.push(cloneRangeCov(rangeCov));
    }
    return {
        functionName: functionCov.functionName,
        ranges,
        isBlockCoverage: functionCov.isBlockCoverage,
    };
}
exports.cloneFunctionCov = cloneFunctionCov;
/**
 * Creates a deep copy of a function coverage.
 *
 * @param rangeCov Range coverage to clone.
 * @return Cloned range coverage.
 */
function cloneRangeCov(rangeCov) {
    return {
        startOffset: rangeCov.startOffset,
        endOffset: rangeCov.endOffset,
        count: rangeCov.count,
    };
}
exports.cloneRangeCov = cloneRangeCov;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9zcmMvY2xvbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQTs7Ozs7R0FLRztBQUNILFNBQWdCLGVBQWUsQ0FBQyxVQUFnQztJQUM5RCxNQUFNLE1BQU0sR0FBZ0IsRUFBRSxDQUFDO0lBQy9CLEtBQUssTUFBTSxTQUFTLElBQUksVUFBVSxDQUFDLE1BQU0sRUFBRTtRQUN6QyxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0tBQ3hDO0lBRUQsT0FBTztRQUNMLE1BQU07S0FDUCxDQUFDO0FBQ0osQ0FBQztBQVRELDBDQVNDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxTQUFnQixjQUFjLENBQUMsU0FBOEI7SUFDM0QsTUFBTSxTQUFTLEdBQWtCLEVBQUUsQ0FBQztJQUNwQyxLQUFLLE1BQU0sV0FBVyxJQUFJLFNBQVMsQ0FBQyxTQUFTLEVBQUU7UUFDN0MsU0FBUyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0tBQy9DO0lBRUQsT0FBTztRQUNMLFFBQVEsRUFBRSxTQUFTLENBQUMsUUFBUTtRQUM1QixHQUFHLEVBQUUsU0FBUyxDQUFDLEdBQUc7UUFDbEIsU0FBUztLQUNWLENBQUM7QUFDSixDQUFDO0FBWEQsd0NBV0M7QUFFRDs7Ozs7R0FLRztBQUNILFNBQWdCLGdCQUFnQixDQUFDLFdBQWtDO0lBQ2pFLE1BQU0sTUFBTSxHQUFlLEVBQUUsQ0FBQztJQUM5QixLQUFLLE1BQU0sUUFBUSxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUU7UUFDekMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztLQUN0QztJQUVELE9BQU87UUFDTCxZQUFZLEVBQUUsV0FBVyxDQUFDLFlBQVk7UUFDdEMsTUFBTTtRQUNOLGVBQWUsRUFBRSxXQUFXLENBQUMsZUFBZTtLQUM3QyxDQUFDO0FBQ0osQ0FBQztBQVhELDRDQVdDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxTQUFnQixhQUFhLENBQUMsUUFBNEI7SUFDeEQsT0FBTztRQUNMLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVztRQUNqQyxTQUFTLEVBQUUsUUFBUSxDQUFDLFNBQVM7UUFDN0IsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLO0tBQ3RCLENBQUM7QUFDSixDQUFDO0FBTkQsc0NBTUMiLCJmaWxlIjoiY2xvbmUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBGdW5jdGlvbkNvdiwgUHJvY2Vzc0NvdiwgUmFuZ2VDb3YsIFNjcmlwdENvdiB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbi8qKlxuICogQ3JlYXRlcyBhIGRlZXAgY29weSBvZiBhIHByb2Nlc3MgY292ZXJhZ2UuXG4gKlxuICogQHBhcmFtIHByb2Nlc3NDb3YgUHJvY2VzcyBjb3ZlcmFnZSB0byBjbG9uZS5cbiAqIEByZXR1cm4gQ2xvbmVkIHByb2Nlc3MgY292ZXJhZ2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbG9uZVByb2Nlc3NDb3YocHJvY2Vzc0NvdjogUmVhZG9ubHk8UHJvY2Vzc0Nvdj4pOiBQcm9jZXNzQ292IHtcbiAgY29uc3QgcmVzdWx0OiBTY3JpcHRDb3ZbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHNjcmlwdENvdiBvZiBwcm9jZXNzQ292LnJlc3VsdCkge1xuICAgIHJlc3VsdC5wdXNoKGNsb25lU2NyaXB0Q292KHNjcmlwdENvdikpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICByZXN1bHQsXG4gIH07XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGRlZXAgY29weSBvZiBhIHNjcmlwdCBjb3ZlcmFnZS5cbiAqXG4gKiBAcGFyYW0gc2NyaXB0Q292IFNjcmlwdCBjb3ZlcmFnZSB0byBjbG9uZS5cbiAqIEByZXR1cm4gQ2xvbmVkIHNjcmlwdCBjb3ZlcmFnZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsb25lU2NyaXB0Q292KHNjcmlwdENvdjogUmVhZG9ubHk8U2NyaXB0Q292Pik6IFNjcmlwdENvdiB7XG4gIGNvbnN0IGZ1bmN0aW9uczogRnVuY3Rpb25Db3ZbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGZ1bmN0aW9uQ292IG9mIHNjcmlwdENvdi5mdW5jdGlvbnMpIHtcbiAgICBmdW5jdGlvbnMucHVzaChjbG9uZUZ1bmN0aW9uQ292KGZ1bmN0aW9uQ292KSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHNjcmlwdElkOiBzY3JpcHRDb3Yuc2NyaXB0SWQsXG4gICAgdXJsOiBzY3JpcHRDb3YudXJsLFxuICAgIGZ1bmN0aW9ucyxcbiAgfTtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgZGVlcCBjb3B5IG9mIGEgZnVuY3Rpb24gY292ZXJhZ2UuXG4gKlxuICogQHBhcmFtIGZ1bmN0aW9uQ292IEZ1bmN0aW9uIGNvdmVyYWdlIHRvIGNsb25lLlxuICogQHJldHVybiBDbG9uZWQgZnVuY3Rpb24gY292ZXJhZ2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbG9uZUZ1bmN0aW9uQ292KGZ1bmN0aW9uQ292OiBSZWFkb25seTxGdW5jdGlvbkNvdj4pOiBGdW5jdGlvbkNvdiB7XG4gIGNvbnN0IHJhbmdlczogUmFuZ2VDb3ZbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHJhbmdlQ292IG9mIGZ1bmN0aW9uQ292LnJhbmdlcykge1xuICAgIHJhbmdlcy5wdXNoKGNsb25lUmFuZ2VDb3YocmFuZ2VDb3YpKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZnVuY3Rpb25OYW1lOiBmdW5jdGlvbkNvdi5mdW5jdGlvbk5hbWUsXG4gICAgcmFuZ2VzLFxuICAgIGlzQmxvY2tDb3ZlcmFnZTogZnVuY3Rpb25Db3YuaXNCbG9ja0NvdmVyYWdlLFxuICB9O1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBkZWVwIGNvcHkgb2YgYSBmdW5jdGlvbiBjb3ZlcmFnZS5cbiAqXG4gKiBAcGFyYW0gcmFuZ2VDb3YgUmFuZ2UgY292ZXJhZ2UgdG8gY2xvbmUuXG4gKiBAcmV0dXJuIENsb25lZCByYW5nZSBjb3ZlcmFnZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsb25lUmFuZ2VDb3YocmFuZ2VDb3Y6IFJlYWRvbmx5PFJhbmdlQ292Pik6IFJhbmdlQ292IHtcbiAgcmV0dXJuIHtcbiAgICBzdGFydE9mZnNldDogcmFuZ2VDb3Yuc3RhcnRPZmZzZXQsXG4gICAgZW5kT2Zmc2V0OiByYW5nZUNvdi5lbmRPZmZzZXQsXG4gICAgY291bnQ6IHJhbmdlQ292LmNvdW50LFxuICB9O1xufVxuIl0sInNvdXJjZVJvb3QiOiIifQ==
