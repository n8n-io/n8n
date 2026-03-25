/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('../special-symbols'),
    EPSILON = _require.EPSILON,
    EPSILON_CLOSURE = _require.EPSILON_CLOSURE;

/**
 * NFA fragment.
 *
 * NFA sub-fragments can be combined to a larger NFAs building
 * the resulting machine. Combining the fragments is done by patching
 * edges of the in- and out-states.
 *
 * 2-states implementation, `in`, and `out`. Eventually all transitions
 * go to the same `out`, which can further be connected via ε-transition
 * with other fragment.
 */


var NFA = function () {
  function NFA(inState, outState) {
    _classCallCheck(this, NFA);

    this.in = inState;
    this.out = outState;
  }

  /**
   * Tries to recognize a string based on this NFA fragment.
   */


  _createClass(NFA, [{
    key: 'matches',
    value: function matches(string) {
      return this.in.matches(string);
    }

    /**
     * Returns an alphabet for this NFA.
     */

  }, {
    key: 'getAlphabet',
    value: function getAlphabet() {
      if (!this._alphabet) {
        this._alphabet = new Set();
        var table = this.getTransitionTable();
        for (var state in table) {
          var transitions = table[state];
          for (var symbol in transitions) {
            if (symbol !== EPSILON_CLOSURE) {
              this._alphabet.add(symbol);
            }
          }
        }
      }
      return this._alphabet;
    }

    /**
     * Returns set of accepting states.
     */

  }, {
    key: 'getAcceptingStates',
    value: function getAcceptingStates() {
      if (!this._acceptingStates) {
        // States are determined during table construction.
        this.getTransitionTable();
      }
      return this._acceptingStates;
    }

    /**
     * Returns accepting state numbers.
     */

  }, {
    key: 'getAcceptingStateNumbers',
    value: function getAcceptingStateNumbers() {
      if (!this._acceptingStateNumbers) {
        this._acceptingStateNumbers = new Set();
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = this.getAcceptingStates()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var acceptingState = _step.value;

            this._acceptingStateNumbers.add(acceptingState.number);
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      }
      return this._acceptingStateNumbers;
    }

    /**
     * Builds and returns transition table.
     */

  }, {
    key: 'getTransitionTable',
    value: function getTransitionTable() {
      var _this = this;

      if (!this._transitionTable) {
        this._transitionTable = {};
        this._acceptingStates = new Set();

        var visited = new Set();
        var symbols = new Set();

        var visitState = function visitState(state) {
          if (visited.has(state)) {
            return;
          }

          visited.add(state);
          state.number = visited.size;
          _this._transitionTable[state.number] = {};

          if (state.accepting) {
            _this._acceptingStates.add(state);
          }

          var transitions = state.getTransitions();

          var _iteratorNormalCompletion2 = true;
          var _didIteratorError2 = false;
          var _iteratorError2 = undefined;

          try {
            for (var _iterator2 = transitions[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
              var _ref = _step2.value;

              var _ref2 = _slicedToArray(_ref, 2);

              var symbol = _ref2[0];
              var symbolTransitions = _ref2[1];

              var combinedState = [];
              symbols.add(symbol);
              var _iteratorNormalCompletion3 = true;
              var _didIteratorError3 = false;
              var _iteratorError3 = undefined;

              try {
                for (var _iterator3 = symbolTransitions[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                  var nextState = _step3.value;

                  visitState(nextState);
                  combinedState.push(nextState.number);
                }
              } catch (err) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
              } finally {
                try {
                  if (!_iteratorNormalCompletion3 && _iterator3.return) {
                    _iterator3.return();
                  }
                } finally {
                  if (_didIteratorError3) {
                    throw _iteratorError3;
                  }
                }
              }

              _this._transitionTable[state.number][symbol] = combinedState;
            }
          } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion2 && _iterator2.return) {
                _iterator2.return();
              }
            } finally {
              if (_didIteratorError2) {
                throw _iteratorError2;
              }
            }
          }
        };

        // Traverse the graph starting from the `in`.
        visitState(this.in);

        // Append epsilon-closure column.
        visited.forEach(function (state) {
          delete _this._transitionTable[state.number][EPSILON];
          _this._transitionTable[state.number][EPSILON_CLOSURE] = [].concat(_toConsumableArray(state.getEpsilonClosure())).map(function (s) {
            return s.number;
          });
        });
      }

      return this._transitionTable;
    }
  }]);

  return NFA;
}();

module.exports = NFA;