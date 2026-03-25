/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

/**
 * A generic FA State class (base for NFA and DFA).
 *
 * Maintains the transition map, and the flag whether
 * the state is accepting.
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var State = function () {
  function State() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        _ref$accepting = _ref.accepting,
        accepting = _ref$accepting === undefined ? false : _ref$accepting;

    _classCallCheck(this, State);

    /**
     * Outgoing transitions to other states.
     */
    this._transitions = new Map();

    /**
     * Whether the state is accepting.
     */
    this.accepting = accepting;
  }

  /**
   * Returns transitions for this state.
   */


  _createClass(State, [{
    key: 'getTransitions',
    value: function getTransitions() {
      return this._transitions;
    }

    /**
     * Creates a transition on symbol.
     */

  }, {
    key: 'addTransition',
    value: function addTransition(symbol, toState) {
      this.getTransitionsOnSymbol(symbol).add(toState);
      return this;
    }

    /**
     * Returns transitions set on symbol.
     */

  }, {
    key: 'getTransitionsOnSymbol',
    value: function getTransitionsOnSymbol(symbol) {
      var transitions = this._transitions.get(symbol);

      if (!transitions) {
        transitions = new Set();
        this._transitions.set(symbol, transitions);
      }

      return transitions;
    }
  }]);

  return State;
}();

module.exports = State;