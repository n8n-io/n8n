/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

// DFA minization.

/**
 * Map from state to current set it goes.
 */

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var currentTransitionMap = null;

/**
 * Takes a DFA, and returns a minimized version of it
 * compressing some states to groups (using standard, 0-, 1-,
 * 2-, ... N-equivalence algorithm).
 */
function minimize(dfa) {
  var table = dfa.getTransitionTable();
  var allStates = Object.keys(table);
  var alphabet = dfa.getAlphabet();
  var accepting = dfa.getAcceptingStateNumbers();

  currentTransitionMap = {};

  var nonAccepting = new Set();

  allStates.forEach(function (state) {
    state = Number(state);
    var isAccepting = accepting.has(state);

    if (isAccepting) {
      currentTransitionMap[state] = accepting;
    } else {
      nonAccepting.add(state);
      currentTransitionMap[state] = nonAccepting;
    }
  });

  // ---------------------------------------------------------------------------
  // Step 1: build equivalent sets.

  // All [1..N] equivalent sets.
  var all = [
  // 0-equivalent sets.
  [nonAccepting, accepting].filter(function (set) {
    return set.size > 0;
  })];

  var current = void 0;
  var previous = void 0;

  // Top of the stack is the current list of sets to analyze.
  current = all[all.length - 1];

  // Previous set (to check whether we need to stop).
  previous = all[all.length - 2];

  // Until we'll not have the same N and N-1 equivalent rows.

  var _loop = function _loop() {
    var newTransitionMap = {};

    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (var _iterator3 = current[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var _set = _step3.value;

        // Handled states for this set.
        var handledStates = {};

        var _set2 = _toArray(_set),
            first = _set2[0],
            rest = _set2.slice(1);

        handledStates[first] = new Set([first]);

        // Have to compare each from the rest states with
        // the already handled states, and see if they are equivalent.
        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
          restSets: for (var _iterator4 = rest[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var state = _step4.value;
            var _iteratorNormalCompletion5 = true;
            var _didIteratorError5 = false;
            var _iteratorError5 = undefined;

            try {
              for (var _iterator5 = Object.keys(handledStates)[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                var handledState = _step5.value;

                // This and some previously handled state are equivalent --
                // just append this state to the same set.
                if (areEquivalent(state, handledState, table, alphabet)) {
                  handledStates[handledState].add(state);
                  handledStates[state] = handledStates[handledState];
                  continue restSets;
                }
              }
              // Else, this state is not equivalent to any of the
              // handled states -- allocate a new set for it.
            } catch (err) {
              _didIteratorError5 = true;
              _iteratorError5 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion5 && _iterator5.return) {
                  _iterator5.return();
                }
              } finally {
                if (_didIteratorError5) {
                  throw _iteratorError5;
                }
              }
            }

            handledStates[state] = new Set([state]);
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

        // Add these handled states to all states map.


        Object.assign(newTransitionMap, handledStates);
      }

      // Update current transition map for the handled row.
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

    currentTransitionMap = newTransitionMap;

    var newSets = new Set(Object.keys(newTransitionMap).map(function (state) {
      return newTransitionMap[state];
    }));

    all.push([].concat(_toConsumableArray(newSets)));

    // Top of the stack is the current.
    current = all[all.length - 1];

    // Previous set.
    previous = all[all.length - 2];
  };

  while (!sameRow(current, previous)) {
    _loop();
  }

  // ---------------------------------------------------------------------------
  // Step 2: build minimized table from the equivalent sets.

  // Remap state numbers from sets to index-based.
  var remaped = new Map();
  var idx = 1;
  current.forEach(function (set) {
    return remaped.set(set, idx++);
  });

  // Build the minimized table from the calculated equivalent sets.
  var minimizedTable = {};

  var minimizedAcceptingStates = new Set();

  var updateAcceptingStates = function updateAcceptingStates(set, idx) {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = set[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var state = _step.value;

        if (accepting.has(state)) {
          minimizedAcceptingStates.add(idx);
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
  };

  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = remaped.entries()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var _ref = _step2.value;

      var _ref2 = _slicedToArray(_ref, 2);

      var set = _ref2[0];
      var _idx = _ref2[1];

      minimizedTable[_idx] = {};
      var _iteratorNormalCompletion6 = true;
      var _didIteratorError6 = false;
      var _iteratorError6 = undefined;

      try {
        for (var _iterator6 = alphabet[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
          var symbol = _step6.value;

          updateAcceptingStates(set, _idx);

          // Determine original transition for this symbol from the set.
          var originalTransition = void 0;
          var _iteratorNormalCompletion7 = true;
          var _didIteratorError7 = false;
          var _iteratorError7 = undefined;

          try {
            for (var _iterator7 = set[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
              var originalState = _step7.value;

              originalTransition = table[originalState][symbol];
              if (originalTransition) {
                break;
              }
            }
          } catch (err) {
            _didIteratorError7 = true;
            _iteratorError7 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion7 && _iterator7.return) {
                _iterator7.return();
              }
            } finally {
              if (_didIteratorError7) {
                throw _iteratorError7;
              }
            }
          }

          if (originalTransition) {
            minimizedTable[_idx][symbol] = remaped.get(currentTransitionMap[originalTransition]);
          }
        }
      } catch (err) {
        _didIteratorError6 = true;
        _iteratorError6 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion6 && _iterator6.return) {
            _iterator6.return();
          }
        } finally {
          if (_didIteratorError6) {
            throw _iteratorError6;
          }
        }
      }
    }

    // Update the table, and accepting states on the original DFA.
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

  dfa.setTransitionTable(minimizedTable);
  dfa.setAcceptingStateNumbers(minimizedAcceptingStates);

  return dfa;
}

function sameRow(r1, r2) {
  if (!r2) {
    return false;
  }

  if (r1.length !== r2.length) {
    return false;
  }

  for (var i = 0; i < r1.length; i++) {
    var s1 = r1[i];
    var s2 = r2[i];

    if (s1.size !== s2.size) {
      return false;
    }

    if ([].concat(_toConsumableArray(s1)).sort().join(',') !== [].concat(_toConsumableArray(s2)).sort().join(',')) {
      return false;
    }
  }

  return true;
}

/**
 * Checks whether two states are N-equivalent, i.e. whether they go
 * to the same set on a symbol.
 */
function areEquivalent(s1, s2, table, alphabet) {
  var _iteratorNormalCompletion8 = true;
  var _didIteratorError8 = false;
  var _iteratorError8 = undefined;

  try {
    for (var _iterator8 = alphabet[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
      var symbol = _step8.value;

      if (!goToSameSet(s1, s2, table, symbol)) {
        return false;
      }
    }
  } catch (err) {
    _didIteratorError8 = true;
    _iteratorError8 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion8 && _iterator8.return) {
        _iterator8.return();
      }
    } finally {
      if (_didIteratorError8) {
        throw _iteratorError8;
      }
    }
  }

  return true;
}

/**
 * Checks whether states go to the same set.
 */
function goToSameSet(s1, s2, table, symbol) {
  if (!currentTransitionMap[s1] || !currentTransitionMap[s2]) {
    return false;
  }

  var originalTransitionS1 = table[s1][symbol];
  var originalTransitionS2 = table[s2][symbol];

  // If no actual transition on this symbol, treat it as positive.
  if (!originalTransitionS1 && !originalTransitionS2) {
    return true;
  }

  // Otherwise, check if they are in the same sets.
  return currentTransitionMap[s1].has(originalTransitionS1) && currentTransitionMap[s2].has(originalTransitionS2);
}

module.exports = {
  minimize: minimize
};