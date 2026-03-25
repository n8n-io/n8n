/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var State = require('../state');

var _require = require('../special-symbols'),
    EPSILON = _require.EPSILON;

/**
 * NFA state.
 *
 * Allows nondeterministic transitions to several states on the
 * same symbol, and also epsilon-transitions.
 */


var NFAState = function (_State) {
  _inherits(NFAState, _State);

  function NFAState() {
    _classCallCheck(this, NFAState);

    return _possibleConstructorReturn(this, (NFAState.__proto__ || Object.getPrototypeOf(NFAState)).apply(this, arguments));
  }

  _createClass(NFAState, [{
    key: 'matches',


    /**
     * Whether this state matches a string.
     *
     * We maintain set of visited epsilon-states to avoid infinite loops
     * when an epsilon-transition goes eventually to itself.
     *
     * NOTE: this function is rather "educational", since we use DFA for strings
     * matching. DFA is built on top of NFA, and uses fast transition table.
     */
    value: function matches(string) {
      var visited = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : new Set();

      // An epsilon-state has been visited, stop to avoid infinite loop.
      if (visited.has(this)) {
        return false;
      }

      visited.add(this);

      // No symbols left..
      if (string.length === 0) {
        // .. and we're in the accepting state.
        if (this.accepting) {
          return true;
        }

        // Check if we can reach any accepting state from
        // on the epsilon transitions.
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = this.getTransitionsOnSymbol(EPSILON)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var nextState = _step.value;

            if (nextState.matches('', visited)) {
              return true;
            }
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

        return false;
      }

      // Else, we get some symbols.
      var symbol = string[0];
      var rest = string.slice(1);

      var symbolTransitions = this.getTransitionsOnSymbol(symbol);
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = symbolTransitions[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var _nextState = _step2.value;

          if (_nextState.matches(rest)) {
            return true;
          }
        }

        // If we couldn't match on symbol, check still epsilon-transitions
        // without consuming the symbol (i.e. continue from `string`, not `rest`).
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

      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = this.getTransitionsOnSymbol(EPSILON)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var _nextState2 = _step3.value;

          if (_nextState2.matches(string, visited)) {
            return true;
          }
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

      return false;
    }

    /**
     * Returns an ε-closure for this state:
     * self + all states following ε-transitions.
     */

  }, {
    key: 'getEpsilonClosure',
    value: function getEpsilonClosure() {
      var _this2 = this;

      if (!this._epsilonClosure) {
        (function () {
          var epsilonTransitions = _this2.getTransitionsOnSymbol(EPSILON);
          var closure = _this2._epsilonClosure = new Set();
          closure.add(_this2);
          var _iteratorNormalCompletion4 = true;
          var _didIteratorError4 = false;
          var _iteratorError4 = undefined;

          try {
            for (var _iterator4 = epsilonTransitions[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
              var nextState = _step4.value;

              if (!closure.has(nextState)) {
                closure.add(nextState);
                var nextClosure = nextState.getEpsilonClosure();
                nextClosure.forEach(function (state) {
                  return closure.add(state);
                });
              }
            }
          } catch (err) {
            _didIteratorError4 = true;
            _iteratorError4 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion4 && _iterator4.return) {
                _iterator4.return();
              }
            } finally {
              if (_didIteratorError4) {
                throw _iteratorError4;
              }
            }
          }
        })();
      }

      return this._epsilonClosure;
    }
  }]);

  return NFAState;
}(State);

module.exports = NFAState;