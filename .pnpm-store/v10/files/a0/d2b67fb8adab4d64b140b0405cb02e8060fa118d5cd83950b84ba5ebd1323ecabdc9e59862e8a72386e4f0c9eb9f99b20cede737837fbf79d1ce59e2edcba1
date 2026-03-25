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
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const library = {
  name: _library.name
};
exports.library = library;
function connect(config, connectListener) {
  const connection = new _connection.default(config);
  connection.connect(connectListener);
  return connection;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfYnVsa0xvYWQiLCJfaW50ZXJvcFJlcXVpcmVEZWZhdWx0IiwicmVxdWlyZSIsIl9jb25uZWN0aW9uIiwiX3JlcXVlc3QiLCJfbGlicmFyeSIsIl9lcnJvcnMiLCJfZGF0YVR5cGUiLCJfdHJhbnNhY3Rpb24iLCJfdGRzVmVyc2lvbnMiLCJvYmoiLCJfX2VzTW9kdWxlIiwiZGVmYXVsdCIsImxpYnJhcnkiLCJuYW1lIiwiZXhwb3J0cyIsImNvbm5lY3QiLCJjb25maWciLCJjb25uZWN0TGlzdGVuZXIiLCJjb25uZWN0aW9uIiwiQ29ubmVjdGlvbiJdLCJzb3VyY2VzIjpbIi4uL3NyYy90ZWRpb3VzLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBCdWxrTG9hZCBmcm9tICcuL2J1bGstbG9hZCc7XG5pbXBvcnQgQ29ubmVjdGlvbiwgeyB0eXBlIENvbm5lY3Rpb25Db25maWd1cmF0aW9uIH0gZnJvbSAnLi9jb25uZWN0aW9uJztcbmltcG9ydCBSZXF1ZXN0IGZyb20gJy4vcmVxdWVzdCc7XG5pbXBvcnQgeyBuYW1lIH0gZnJvbSAnLi9saWJyYXJ5JztcblxuaW1wb3J0IHsgQ29ubmVjdGlvbkVycm9yLCBSZXF1ZXN0RXJyb3IgfSBmcm9tICcuL2Vycm9ycyc7XG5cbmltcG9ydCB7IFRZUEVTIH0gZnJvbSAnLi9kYXRhLXR5cGUnO1xuaW1wb3J0IHsgSVNPTEFUSU9OX0xFVkVMIH0gZnJvbSAnLi90cmFuc2FjdGlvbic7XG5pbXBvcnQgeyB2ZXJzaW9ucyBhcyBURFNfVkVSU0lPTiB9IGZyb20gJy4vdGRzLXZlcnNpb25zJztcblxuY29uc3QgbGlicmFyeSA9IHsgbmFtZTogbmFtZSB9O1xuXG5leHBvcnQgZnVuY3Rpb24gY29ubmVjdChjb25maWc6IENvbm5lY3Rpb25Db25maWd1cmF0aW9uLCBjb25uZWN0TGlzdGVuZXI/OiAoZXJyPzogRXJyb3IpID0+IHZvaWQpIHtcbiAgY29uc3QgY29ubmVjdGlvbiA9IG5ldyBDb25uZWN0aW9uKGNvbmZpZyk7XG4gIGNvbm5lY3Rpb24uY29ubmVjdChjb25uZWN0TGlzdGVuZXIpO1xuICByZXR1cm4gY29ubmVjdGlvbjtcbn1cblxuZXhwb3J0IHtcbiAgQnVsa0xvYWQsXG4gIENvbm5lY3Rpb24sXG4gIFJlcXVlc3QsXG4gIGxpYnJhcnksXG4gIENvbm5lY3Rpb25FcnJvcixcbiAgUmVxdWVzdEVycm9yLFxuICBUWVBFUyxcbiAgSVNPTEFUSU9OX0xFVkVMLFxuICBURFNfVkVSU0lPTlxufTtcbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUFBLFNBQUEsR0FBQUMsc0JBQUEsQ0FBQUMsT0FBQTtBQUNBLElBQUFDLFdBQUEsR0FBQUYsc0JBQUEsQ0FBQUMsT0FBQTtBQUNBLElBQUFFLFFBQUEsR0FBQUgsc0JBQUEsQ0FBQUMsT0FBQTtBQUNBLElBQUFHLFFBQUEsR0FBQUgsT0FBQTtBQUVBLElBQUFJLE9BQUEsR0FBQUosT0FBQTtBQUVBLElBQUFLLFNBQUEsR0FBQUwsT0FBQTtBQUNBLElBQUFNLFlBQUEsR0FBQU4sT0FBQTtBQUNBLElBQUFPLFlBQUEsR0FBQVAsT0FBQTtBQUF5RCxTQUFBRCx1QkFBQVMsR0FBQSxXQUFBQSxHQUFBLElBQUFBLEdBQUEsQ0FBQUMsVUFBQSxHQUFBRCxHQUFBLEtBQUFFLE9BQUEsRUFBQUYsR0FBQTtBQUV6RCxNQUFNRyxPQUFPLEdBQUc7RUFBRUMsSUFBSSxFQUFFQTtBQUFLLENBQUM7QUFBQ0MsT0FBQSxDQUFBRixPQUFBLEdBQUFBLE9BQUE7QUFFeEIsU0FBU0csT0FBT0EsQ0FBQ0MsTUFBK0IsRUFBRUMsZUFBdUMsRUFBRTtFQUNoRyxNQUFNQyxVQUFVLEdBQUcsSUFBSUMsbUJBQVUsQ0FBQ0gsTUFBTSxDQUFDO0VBQ3pDRSxVQUFVLENBQUNILE9BQU8sQ0FBQ0UsZUFBZSxDQUFDO0VBQ25DLE9BQU9DLFVBQVU7QUFDbkIifQ==