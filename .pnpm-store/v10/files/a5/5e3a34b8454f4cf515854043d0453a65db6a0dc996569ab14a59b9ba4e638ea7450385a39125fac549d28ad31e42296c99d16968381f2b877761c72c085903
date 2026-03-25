// (This file is generated from ist.js. Don't edit it directly.)

var opNames = [
  "==", function(a, b) { return a == b },
  "!=", function(a, b) { return a != b },
  "===", function(a, b) { return a === b },
  "!==", function(a, b) { return a !== b },
  "<", function(a, b) { return a < b },
  ">=", function(a, b) { return a >= b },
  ">", function(a, b) { return a > b },
  "<=", function(a, b) { return a <= b }
]
var ops = {}
for (var i = 0; i < opNames.length; i += 2) ops[opNames[i]] = opNames[i + 1]

function message(a, b, compare) {
  if (!compare || typeof compare == "string") {
    var index = opNames.indexOf(compare || "==")
    return a + " " + opNames[index + (index % 4 ? -2 : 2)] + " " + b
  }
  return "!" + compare.name + "(" + a + ", " + b + ")"
}

function ist(a, b, compare) {
  if (arguments.length == 1) {
    if (!a) throw new ist.Failure("!" + a, "ist")
  } else {
    var cmpFn = compare
    if (typeof compare == "string") {
      if (!(cmpFn = ops[compare])) throw new RangeError("Unknow operator " + compare)
    } else if (!compare) {
      cmpFn = ops["=="]
    }
    if (!cmpFn(a, b)) {
      var cmpName = (typeof compare == "string" ? compare : compare && compare.name) || "=="
      throw new ist.Failure(message(a, b, compare), "ist")
    }
  }
}

ist.Failure = function(message, src) {
  this.message = message
  if (Error.captureStackTrace)
    Error.captureStackTrace(this)
  else
    this.stack = new Error(message).stack
  if (this.stack) {
    var lines = this.stack.split("\n"), re = new RegExp("\\b" + src + "\\b")
    for (var i = 0; i < lines.length - 1; i++) {
      if (re.test(lines[i]) && !/\bFailure\b/.test(lines[i])) {
        this.message += " " + lines[i + 1].trim()
        break
      }
    }
  }
}
ist.Failure.prototype = Object.create(Error.prototype)

ist.throws = function throws(f, expected) {
  let threw = true
  try {
    f()
    threw = false
  } catch(e) {
    var matches = !expected ? true
        : expected.test ? expected.test(e.message)
        : typeof expected == "string" ? e.message == expected
        : expected(e)
    if (!matches) throw e
  }
  if (!threw) throw new ist.Failure("Did not throw", "throws")
}

ist.default = ist

 module.exports = ist
