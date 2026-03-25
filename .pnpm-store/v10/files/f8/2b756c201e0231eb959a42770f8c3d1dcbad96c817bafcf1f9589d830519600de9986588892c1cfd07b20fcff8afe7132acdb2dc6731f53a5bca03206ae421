const commander = require('commander');

exports = module.exports = {};

// Return a different global program than commander,
// and don't also return it as default export.
exports.program = new commander.Command();

/**
 * Expose classes. The FooT versions are just types, so return Commander original implementations!
 */

exports.Argument = commander.Argument;
exports.Command = commander.Command;
exports.CommanderError = commander.CommanderError;
exports.Help = commander.Help;
exports.InvalidArgumentError = commander.InvalidArgumentError;
exports.InvalidOptionArgumentError = commander.InvalidArgumentError; // Deprecated
exports.Option = commander.Option;

// In Commander, the create routines end up being aliases for the matching
// methods on the global program due to the (deprecated) legacy default export.
// Here we roll our own, the way Commander might in future.
exports.createCommand = (name) => new commander.Command(name);
exports.createOption = (flags, description) =>
  new commander.Option(flags, description);
exports.createArgument = (name, description) =>
  new commander.Argument(name, description);
