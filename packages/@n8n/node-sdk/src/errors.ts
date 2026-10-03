// The error kinds that node code throws: a `UserError` when the user can fix the cause, an
// `OperationalError` when a later retry can pass. The host classifies every other error itself.
// A module of its own: a bundle that throws neither keeps no `require("n8n-workflow")`.
export { OperationalError, UserError } from 'n8n-workflow';
