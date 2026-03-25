const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_create_draft = require('./create_draft.cjs');
const require_get_message = require('./get_message.cjs');
const require_get_thread = require('./get_thread.cjs');
const require_search = require('./search.cjs');
const require_send_message = require('./send_message.cjs');

//#region src/tools/gmail/index.ts
var gmail_exports = {};
require_rolldown_runtime.__export(gmail_exports, {
	GmailCreateDraft: () => require_create_draft.GmailCreateDraft,
	GmailGetMessage: () => require_get_message.GmailGetMessage,
	GmailGetThread: () => require_get_thread.GmailGetThread,
	GmailSearch: () => require_search.GmailSearch,
	GmailSendMessage: () => require_send_message.GmailSendMessage
});

//#endregion
exports.GmailCreateDraft = require_create_draft.GmailCreateDraft;
exports.GmailGetMessage = require_get_message.GmailGetMessage;
exports.GmailGetThread = require_get_thread.GmailGetThread;
exports.GmailSearch = require_search.GmailSearch;
exports.GmailSendMessage = require_send_message.GmailSendMessage;
Object.defineProperty(exports, 'gmail_exports', {
  enumerable: true,
  get: function () {
    return gmail_exports;
  }
});
//# sourceMappingURL=index.cjs.map