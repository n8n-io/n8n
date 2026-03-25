'use strict';

var error = require('pug-error');

module.exports = stripComments;

function unexpectedToken(type, occasion, filename, line) {
  var msg = '`' + type + '` encountered when ' + occasion;
  throw error('UNEXPECTED_TOKEN', msg, {filename: filename, line: line});
}

function stripComments(input, options) {
  options = options || {};

  // Default: strip unbuffered comments and leave buffered ones alone
  var stripUnbuffered = options.stripUnbuffered !== false;
  var stripBuffered = options.stripBuffered === true;
  var filename = options.filename;

  var out = [];
  // If we have encountered a comment token and are not sure if we have gotten
  // out of the comment or not
  var inComment = false;
  // If we are sure that we are in a block comment and all tokens except
  // `end-pipeless-text` should be ignored
  var inPipelessText = false;

  return input.filter(function(tok) {
    switch (tok.type) {
      case 'comment':
        if (inComment) {
          unexpectedToken(
            'comment',
            'already in a comment',
            filename,
            tok.line
          );
        } else {
          inComment = tok.buffer ? stripBuffered : stripUnbuffered;
          return !inComment;
        }
      case 'start-pipeless-text':
        if (!inComment) return true;
        if (inPipelessText) {
          unexpectedToken(
            'start-pipeless-text',
            'already in pipeless text mode',
            filename,
            tok.line
          );
        }
        inPipelessText = true;
        return false;
      case 'end-pipeless-text':
        if (!inComment) return true;
        if (!inPipelessText) {
          unexpectedToken(
            'end-pipeless-text',
            'not in pipeless text mode',
            filename,
            tok.line
          );
        }
        inPipelessText = false;
        inComment = false;
        return false;
      // There might be a `text` right after `comment` but before
      // `start-pipeless-text`. Treat it accordingly.
      case 'text':
        return !inComment;
      default:
        if (inPipelessText) return false;
        inComment = false;
        return true;
    }
  });
}
