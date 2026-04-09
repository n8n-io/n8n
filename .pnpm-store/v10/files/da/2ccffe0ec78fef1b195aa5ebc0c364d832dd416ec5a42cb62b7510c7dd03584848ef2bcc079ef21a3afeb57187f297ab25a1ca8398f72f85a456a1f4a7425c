"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "BulkLoad", {
  enumerable: true,
  get: function () {
    return _bulkLoad.default;
  }
});
Object.defineProperty(exports, "Connection", {
  enumerable: true,
  get: function () {
    return _connection.default;
  }
});
Object.defineProperty(exports, "ConnectionError", {
  enumerable: true,
  get: function () {
    return _errors.ConnectionError;
  }
});
Object.defineProperty(exports, "ISOLATION_LEVEL", {
  enumerable: true,
  get: function () {
    return _transaction.ISOLATION_LEVEL;
  }
});
Object.defineProperty(exports, "Request", {
  enumerable: true,
  get: function () {
    return _request.default;
  }
});
Object.defineProperty(exports, "RequestError", {
  enumerable: true,
  get: function () {
    return _errors.RequestError;
  }
});
Object.defineProperty(exports, "TDS_VERSION", {
  enumerable: true,
  get: function () {
    return _tdsVersions.versions;
  }
});
Object.defineProperty(exports, "TYPES", {
  enumerable: true,
  get: function () {
    return _dataType.TYPES;
  }
});
exports.connect = connect;
exports.library = void 0;
var _bulkLoad = _interopRequireDefault(require("./bulk-load"));
var _connection = _interopRequireDefault(require("./connection"));
var _request = _interopRequireDefault(require("./request"));
var _library = require("./library");
var _errors = require("./errors");
var _dataType = require("./data-type");
var _transaction = require("./transaction");
var _tdsVersions = require("./tds-versions");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const library = exports.library = {
  name: _library.name
};
function connect(config, connectListener) {
  const connection = new _connection.default(config);
  connection.connect(connectListener);
  return connection;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfYnVsa0xvYWQiLCJfaW50ZXJvcFJlcXVpcmVEZWZhdWx0IiwicmVxdWlyZSIsIl9jb25uZWN0aW9uIiwiX3JlcXVlc3QiLCJfbGlicmFyeSIsIl9lcnJvcnMiLCJfZGF0YVR5cGUiLCJfdHJhbnNhY3Rpb24iLCJfdGRzVmVyc2lvbnMiLCJlIiwiX19lc01vZHVsZSIsImRlZmF1bHQiLCJsaWJyYXJ5IiwiZXhwb3J0cyIsIm5hbWUiLCJjb25uZWN0IiwiY29uZmlnIiwiY29ubmVjdExpc3RlbmVyIiwiY29ubmVjdGlvbiIsIkNvbm5lY3Rpb24iXSwic291cmNlcyI6WyIuLi9zcmMvdGVkaW91cy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQnVsa0xvYWQgZnJvbSAnLi9idWxrLWxvYWQnO1xuaW1wb3J0IENvbm5lY3Rpb24sIHsgdHlwZSBDb25uZWN0aW9uQXV0aGVudGljYXRpb24sIHR5cGUgQ29ubmVjdGlvbkNvbmZpZ3VyYXRpb24sIHR5cGUgQ29ubmVjdGlvbk9wdGlvbnMgfSBmcm9tICcuL2Nvbm5lY3Rpb24nO1xuaW1wb3J0IFJlcXVlc3QgZnJvbSAnLi9yZXF1ZXN0JztcbmltcG9ydCB7IG5hbWUgfSBmcm9tICcuL2xpYnJhcnknO1xuXG5pbXBvcnQgeyBDb25uZWN0aW9uRXJyb3IsIFJlcXVlc3RFcnJvciB9IGZyb20gJy4vZXJyb3JzJztcblxuaW1wb3J0IHsgVFlQRVMgfSBmcm9tICcuL2RhdGEtdHlwZSc7XG5pbXBvcnQgeyBJU09MQVRJT05fTEVWRUwgfSBmcm9tICcuL3RyYW5zYWN0aW9uJztcbmltcG9ydCB7IHZlcnNpb25zIGFzIFREU19WRVJTSU9OIH0gZnJvbSAnLi90ZHMtdmVyc2lvbnMnO1xuXG5jb25zdCBsaWJyYXJ5ID0geyBuYW1lOiBuYW1lIH07XG5cbmV4cG9ydCBmdW5jdGlvbiBjb25uZWN0KGNvbmZpZzogQ29ubmVjdGlvbkNvbmZpZ3VyYXRpb24sIGNvbm5lY3RMaXN0ZW5lcj86IChlcnI/OiBFcnJvcikgPT4gdm9pZCkge1xuICBjb25zdCBjb25uZWN0aW9uID0gbmV3IENvbm5lY3Rpb24oY29uZmlnKTtcbiAgY29ubmVjdGlvbi5jb25uZWN0KGNvbm5lY3RMaXN0ZW5lcik7XG4gIHJldHVybiBjb25uZWN0aW9uO1xufVxuXG5leHBvcnQge1xuICBCdWxrTG9hZCxcbiAgQ29ubmVjdGlvbixcbiAgUmVxdWVzdCxcbiAgbGlicmFyeSxcbiAgQ29ubmVjdGlvbkVycm9yLFxuICBSZXF1ZXN0RXJyb3IsXG4gIFRZUEVTLFxuICBJU09MQVRJT05fTEVWRUwsXG4gIFREU19WRVJTSU9OXG59O1xuXG5leHBvcnQgdHlwZSB7XG4gIENvbm5lY3Rpb25BdXRoZW50aWNhdGlvbixcbiAgQ29ubmVjdGlvbkNvbmZpZ3VyYXRpb24sXG4gIENvbm5lY3Rpb25PcHRpb25zXG59O1xuIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBQUEsU0FBQSxHQUFBQyxzQkFBQSxDQUFBQyxPQUFBO0FBQ0EsSUFBQUMsV0FBQSxHQUFBRixzQkFBQSxDQUFBQyxPQUFBO0FBQ0EsSUFBQUUsUUFBQSxHQUFBSCxzQkFBQSxDQUFBQyxPQUFBO0FBQ0EsSUFBQUcsUUFBQSxHQUFBSCxPQUFBO0FBRUEsSUFBQUksT0FBQSxHQUFBSixPQUFBO0FBRUEsSUFBQUssU0FBQSxHQUFBTCxPQUFBO0FBQ0EsSUFBQU0sWUFBQSxHQUFBTixPQUFBO0FBQ0EsSUFBQU8sWUFBQSxHQUFBUCxPQUFBO0FBQXlELFNBQUFELHVCQUFBUyxDQUFBLFdBQUFBLENBQUEsSUFBQUEsQ0FBQSxDQUFBQyxVQUFBLEdBQUFELENBQUEsS0FBQUUsT0FBQSxFQUFBRixDQUFBO0FBRXpELE1BQU1HLE9BQU8sR0FBQUMsT0FBQSxDQUFBRCxPQUFBLEdBQUc7RUFBRUUsSUFBSSxFQUFFQTtBQUFLLENBQUM7QUFFdkIsU0FBU0MsT0FBT0EsQ0FBQ0MsTUFBK0IsRUFBRUMsZUFBdUMsRUFBRTtFQUNoRyxNQUFNQyxVQUFVLEdBQUcsSUFBSUMsbUJBQVUsQ0FBQ0gsTUFBTSxDQUFDO0VBQ3pDRSxVQUFVLENBQUNILE9BQU8sQ0FBQ0UsZUFBZSxDQUFDO0VBQ25DLE9BQU9DLFVBQVU7QUFDbkIiLCJpZ25vcmVMaXN0IjpbXX0=