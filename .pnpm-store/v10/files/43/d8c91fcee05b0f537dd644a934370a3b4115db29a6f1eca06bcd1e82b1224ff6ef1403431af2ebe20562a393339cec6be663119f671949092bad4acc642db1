'use strict';

module.exports = TokenStream;
function TokenStream(tokens) {
  if (!Array.isArray(tokens)) {
    throw new TypeError('tokens must be passed to TokenStream as an array.');
  }
  this._tokens = tokens;
}
TokenStream.prototype.lookahead = function (index) {
  if (this._tokens.length <= index) {
    throw new Error('Cannot read past the end of a stream');
  }
  return this._tokens[index];
};
TokenStream.prototype.peek = function () {
  if (this._tokens.length === 0) {
    throw new Error('Cannot read past the end of a stream');
  }
  return this._tokens[0];
};
TokenStream.prototype.advance = function () {
  if (this._tokens.length === 0) {
    throw new Error('Cannot read past the end of a stream');
  }
  return this._tokens.shift();
};
TokenStream.prototype.defer = function (token) {
  this._tokens.unshift(token);
};
