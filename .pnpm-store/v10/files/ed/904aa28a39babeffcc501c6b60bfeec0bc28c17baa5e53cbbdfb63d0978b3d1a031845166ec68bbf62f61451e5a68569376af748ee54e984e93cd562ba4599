const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_create = require('./create.cjs');
const require_view = require('./view.cjs');
const require_delete = require('./delete.cjs');

//#region src/tools/google_calendar/index.ts
var google_calendar_exports = {};
require_rolldown_runtime.__export(google_calendar_exports, {
	GoogleCalendarCreateTool: () => require_create.GoogleCalendarCreateTool,
	GoogleCalendarDeleteTool: () => require_delete.GoogleCalendarDeleteTool,
	GoogleCalendarViewTool: () => require_view.GoogleCalendarViewTool
});

//#endregion
exports.GoogleCalendarCreateTool = require_create.GoogleCalendarCreateTool;
exports.GoogleCalendarDeleteTool = require_delete.GoogleCalendarDeleteTool;
exports.GoogleCalendarViewTool = require_view.GoogleCalendarViewTool;
Object.defineProperty(exports, 'google_calendar_exports', {
  enumerable: true,
  get: function () {
    return google_calendar_exports;
  }
});
//# sourceMappingURL=index.cjs.map