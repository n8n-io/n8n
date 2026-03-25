/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

var NFA = require('./nfa/nfa');
var DFA = require('./dfa/dfa');

var nfaFromRegExp = require('./nfa/nfa-from-regexp');
var builders = require('./nfa/builders');

module.exports = {

  /**
   * Export NFA and DFA classes.
   */
  NFA: NFA,
  DFA: DFA,

  /**
   * Expose builders.
   */
  builders: builders,

  /**
   * Builds an NFA for the passed regexp.
   *
   * @param string | AST | RegExp:
   *
   *   a regular expression in different representations: a string,
   *   a RegExp object, or an AST.
   */
  toNFA: function toNFA(regexp) {
    return nfaFromRegExp.build(regexp);
  },


  /**
   * Builds DFA for the passed regexp.
   *
   * @param string | AST | RegExp:
   *
   *   a regular expression in different representations: a string,
   *   a RegExp object, or an AST.
   */
  toDFA: function toDFA(regexp) {
    return new DFA(this.toNFA(regexp));
  },


  /**
   * Returns true if regexp accepts the string.
   */
  test: function test(regexp, string) {
    return this.toDFA(regexp).matches(string);
  }
};