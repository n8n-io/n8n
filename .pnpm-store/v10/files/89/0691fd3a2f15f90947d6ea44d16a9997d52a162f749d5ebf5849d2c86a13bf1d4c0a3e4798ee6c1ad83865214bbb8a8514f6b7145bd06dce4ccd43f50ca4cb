"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TryEntry = exports.SwitchEntry = exports.LoopEntry = exports.LeapManager = exports.LabeledEntry = exports.FunctionEntry = exports.FinallyEntry = exports.Entry = exports.CatchEntry = void 0;
var _assert = require("assert");
class Entry {}
exports.Entry = Entry;
class FunctionEntry extends Entry {
  constructor(returnLoc) {
    super();
    this.returnLoc = void 0;
    this.returnLoc = returnLoc;
  }
}
exports.FunctionEntry = FunctionEntry;
class LoopEntry extends Entry {
  constructor(breakLoc, continueLoc, label = null) {
    super();
    this.breakLoc = void 0;
    this.continueLoc = void 0;
    this.label = void 0;
    this.breakLoc = breakLoc;
    this.continueLoc = continueLoc;
    this.label = label;
  }
}
exports.LoopEntry = LoopEntry;
class SwitchEntry extends Entry {
  constructor(breakLoc) {
    super();
    this.breakLoc = void 0;
    this.breakLoc = breakLoc;
  }
}
exports.SwitchEntry = SwitchEntry;
class TryEntry extends Entry {
  constructor(firstLoc, catchEntry = null, finallyEntry = null) {
    super();
    this.firstLoc = void 0;
    this.catchEntry = void 0;
    this.finallyEntry = void 0;
    _assert.ok(catchEntry || finallyEntry);
    this.firstLoc = firstLoc;
    this.catchEntry = catchEntry;
    this.finallyEntry = finallyEntry;
  }
}
exports.TryEntry = TryEntry;
class CatchEntry extends Entry {
  constructor(firstLoc, paramId) {
    super();
    this.firstLoc = void 0;
    this.paramId = void 0;
    this.firstLoc = firstLoc;
    this.paramId = paramId;
  }
}
exports.CatchEntry = CatchEntry;
class FinallyEntry extends Entry {
  constructor(firstLoc, afterLoc) {
    super();
    this.firstLoc = void 0;
    this.afterLoc = void 0;
    this.firstLoc = firstLoc;
    this.afterLoc = afterLoc;
  }
}
exports.FinallyEntry = FinallyEntry;
class LabeledEntry extends Entry {
  constructor(breakLoc, label) {
    super();
    this.breakLoc = void 0;
    this.label = void 0;
    this.breakLoc = breakLoc;
    this.label = label;
  }
}
exports.LabeledEntry = LabeledEntry;
class LeapManager {
  constructor(emitter) {
    this.emitter = void 0;
    this.entryStack = void 0;
    this.emitter = emitter;
    this.entryStack = [new FunctionEntry(emitter.finalLoc)];
  }
  withEntry(entry, callback) {
    this.entryStack.push(entry);
    try {
      callback.call(this.emitter);
    } finally {
      const popped = this.entryStack.pop();
      _assert.strictEqual(popped, entry);
    }
  }
  _findLeapLocation(property, label) {
    for (let i = this.entryStack.length - 1; i >= 0; --i) {
      const entry = this.entryStack[i];
      const loc = entry[property];
      if (loc) {
        if (label) {
          if (entry.label && entry.label.name === label.name) {
            return loc;
          }
        } else if (entry instanceof LabeledEntry) {} else {
          return loc;
        }
      }
    }
    return null;
  }
  getBreakLoc(label) {
    return this._findLeapLocation("breakLoc", label);
  }
  getContinueLoc(label) {
    return this._findLeapLocation("continueLoc", label);
  }
}
exports.LeapManager = LeapManager;

//# sourceMappingURL=leap.js.map
