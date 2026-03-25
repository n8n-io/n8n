const CovLine = require('./line')
const { sliceRange } = require('./range')
const { originalPositionFor, generatedPositionFor, GREATEST_LOWER_BOUND, LEAST_UPPER_BOUND } = require('@jridgewell/trace-mapping')

module.exports = class CovSource {
  constructor (sourceRaw, wrapperLength) {
    sourceRaw = sourceRaw ? sourceRaw.trimEnd() : ''
    this.lines = []
    this.eof = sourceRaw.length
    this.shebangLength = getShebangLength(sourceRaw)
    this.wrapperLength = wrapperLength - this.shebangLength
    this._buildLines(sourceRaw)
  }

  _buildLines (source) {
    let position = 0
    let ignoreCount = 0
    let ignoreAll = false
    for (const [i, lineStr] of source.split(/(?<=\r?\n)/u).entries()) {
      const line = new CovLine(i + 1, position, lineStr)
      if (ignoreCount > 0) {
        line.ignore = true
        ignoreCount--
      } else if (ignoreAll) {
        line.ignore = true
      }
      this.lines.push(line)
      position += lineStr.length

      const ignoreToken = this._parseIgnore(lineStr)
      if (!ignoreToken) continue

      line.ignore = true
      if (ignoreToken.count !== undefined) {
        ignoreCount = ignoreToken.count
      }
      if (ignoreToken.start || ignoreToken.stop) {
        ignoreAll = ignoreToken.start
        ignoreCount = 0
      }
    }
  }

  /**
   * Parses for comments:
   *    c8 ignore next
   *    c8 ignore next 3
   *    c8 ignore start
   *    c8 ignore stop
   * And equivalent ones for v8, e.g. v8 ignore next.
   * @param {string} lineStr
   * @return {{count?: number, start?: boolean, stop?: boolean}|undefined}
   */
  _parseIgnore (lineStr) {
    const testIgnoreNextLines = lineStr.match(/^\W*\/\* (?:[cv]8|node:coverage) ignore next (?<count>[0-9]+)/)
    if (testIgnoreNextLines) {
      return { count: Number(testIgnoreNextLines.groups.count) }
    }

    // Check if comment is on its own line.
    if (lineStr.match(/^\W*\/\* (?:[cv]8|node:coverage) ignore next/)) {
      return { count: 1 }
    }

    if (lineStr.match(/\/\* ([cv]8|node:coverage) ignore next/)) {
      // Won't ignore successive lines, but the current line will be ignored.
      return { count: 0 }
    }

    const testIgnoreStartStop = lineStr.match(/\/\* [c|v]8 ignore (?<mode>start|stop)/)
    if (testIgnoreStartStop) {
      if (testIgnoreStartStop.groups.mode === 'start') return { start: true }
      if (testIgnoreStartStop.groups.mode === 'stop') return { stop: true }
    }

    const testNodeIgnoreStartStop = lineStr.match(/\/\* node:coverage (?<mode>enable|disable)/)
    if (testNodeIgnoreStartStop) {
      if (testNodeIgnoreStartStop.groups.mode === 'disable') return { start: true }
      if (testNodeIgnoreStartStop.groups.mode === 'enable') return { stop: true }
    }
  }

  // given a start column and end column in absolute offsets within
  // a source file (0 - EOF), returns the relative line column positions.
  offsetToOriginalRelative (sourceMap, startCol, endCol) {
    const lines = sliceRange(this.lines, startCol, endCol, true)
    if (!lines.length) return {}

    const start = originalPositionTryBoth(
      sourceMap,
      lines[0].line,
      Math.max(0, startCol - lines[0].startCol)
    )
    if (!(start && start.source)) {
      return {}
    }

    let end = originalEndPositionFor(
      sourceMap,
      lines[lines.length - 1].line,
      endCol - lines[lines.length - 1].startCol
    )
    if (!(end && end.source)) {
      return {}
    }

    if (start.source !== end.source) {
      return {}
    }

    if (start.line === end.line && start.column === end.column) {
      end = originalPositionFor(sourceMap, {
        line: lines[lines.length - 1].line,
        column: endCol - lines[lines.length - 1].startCol,
        bias: LEAST_UPPER_BOUND
      })
      end.column -= 1
    }

    return {
      source: start.source,
      startLine: start.line,
      relStartCol: start.column,
      endLine: end.line,
      relEndCol: end.column
    }
  }

  relativeToOffset (line, relCol) {
    line = Math.max(line, 1)
    if (this.lines[line - 1] === undefined) return this.eof
    return Math.min(this.lines[line - 1].startCol + relCol, this.lines[line - 1].endCol)
  }
}

// this implementation is pulled over from istanbul-lib-sourcemap:
// https://github.com/istanbuljs/istanbuljs/blob/master/packages/istanbul-lib-source-maps/lib/get-mapping.js
//
/**
 * AST ranges are inclusive for start positions and exclusive for end positions.
 * Source maps are also logically ranges over text, though interacting with
 * them is generally achieved by working with explicit positions.
 *
 * When finding the _end_ location of an AST item, the range behavior is
 * important because what we're asking for is the _end_ of whatever range
 * corresponds to the end location we seek.
 *
 * This boils down to the following steps, conceptually, though the source-map
 * library doesn't expose primitives to do this nicely:
 *
 * 1. Find the range on the generated file that ends at, or exclusively
 *    contains the end position of the AST node.
 * 2. Find the range on the original file that corresponds to
 *    that generated range.
 * 3. Find the _end_ location of that original range.
 */
function originalEndPositionFor (sourceMap, line, column) {
  // Given the generated location, find the original location of the mapping
  // that corresponds to a range on the generated file that overlaps the
  // generated file end location. Note however that this position on its
  // own is not useful because it is the position of the _start_ of the range
  // on the original file, and we want the _end_ of the range.
  const beforeEndMapping = originalPositionTryBoth(
    sourceMap,
    line,
    Math.max(column - 1, 1)
  )

  if (beforeEndMapping.source === null) {
    return null
  }

  // Convert that original position back to a generated one, with a bump
  // to the right, and a rightward bias. Since 'generatedPositionFor' searches
  // for mappings in the original-order sorted list, this will find the
  // mapping that corresponds to the one immediately after the
  // beforeEndMapping mapping.
  const afterEndMapping = generatedPositionFor(sourceMap, {
    source: beforeEndMapping.source,
    line: beforeEndMapping.line,
    column: beforeEndMapping.column + 1,
    bias: LEAST_UPPER_BOUND
  })
  if (
  // If this is null, it means that we've hit the end of the file,
  // so we can use Infinity as the end column.
    afterEndMapping.line === null ||
      // If these don't match, it means that the call to
      // 'generatedPositionFor' didn't find any other original mappings on
      // the line we gave, so consider the binding to extend to infinity.
      originalPositionFor(sourceMap, afterEndMapping).line !==
          beforeEndMapping.line
  ) {
    return {
      source: beforeEndMapping.source,
      line: beforeEndMapping.line,
      column: Infinity
    }
  }

  // Convert the end mapping into the real original position.
  return originalPositionFor(sourceMap, afterEndMapping)
}

function originalPositionTryBoth (sourceMap, line, column) {
  let original = originalPositionFor(sourceMap, {
    line,
    column,
    bias: GREATEST_LOWER_BOUND
  })
  if (original.line === null) {
    original = originalPositionFor(sourceMap, {
      line,
      column,
      bias: LEAST_UPPER_BOUND
    })
  }
  // The source maps generated by https://github.com/istanbuljs/istanbuljs
  // (using @babel/core 7.7.5) have behavior, such that a mapping
  // mid-way through a line maps to an earlier line than a mapping
  // at position 0. Using the line at positon 0 seems to provide better reports:
  //
  //     if (true) {
  //        cov_y5divc6zu().b[1][0]++;
  //        cov_y5divc6zu().s[3]++;
  //        console.info('reachable');
  //     }  else { ... }
  //  ^  ^
  // l5  l3
  const min = originalPositionFor(sourceMap, {
    line,
    column: 0,
    bias: GREATEST_LOWER_BOUND
  })
  if (min.line > original.line) {
    original = min
  }
  return original
}

// Not required since Node 12, see: https://github.com/nodejs/node/pull/27375
const isPreNode12 = /^v1[0-1]\./u.test(process.version)
function getShebangLength (source) {
  /* c8 ignore start - platform-specific */
  if (isPreNode12 && source.indexOf('#!') === 0) {
    const match = source.match(/(?<shebang>#!.*)/)
    if (match) {
      return match.groups.shebang.length
    }
  } else {
  /* c8 ignore stop - platform-specific */
    return 0
  }
}
