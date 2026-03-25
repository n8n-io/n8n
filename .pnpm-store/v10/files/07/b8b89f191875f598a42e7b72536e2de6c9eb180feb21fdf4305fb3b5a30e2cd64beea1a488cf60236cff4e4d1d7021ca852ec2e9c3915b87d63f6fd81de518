const { SequenceMatcher } = require('@ewoudenberg/difflib')
const { extendedTypeOf, roundObj } = require('./util')
const { colorize, colorizeToCallback } = require('./colorize')

class JsonDiff {
  constructor (options) {
    options.outputKeys = options.outputKeys || []
    options.excludeKeys = options.excludeKeys || []
    this.options = options
  }

  isScalar (obj) {
    return typeof obj !== 'object' || obj === null
  }

  objectDiff (obj1, obj2) {
    let result = {}
    let score = 0
    let equal = true

    for (const [key, value] of Object.entries(obj1)) {
      if (!this.options.outputNewOnly) {
        const postfix = '__deleted'

        if (!(key in obj2) && !(this.options.excludeKeys.includes(key))) {
          result[`${key}${postfix}`] = value
          score -= 30
          equal = false
        }
      }
    }

    for (const [key, value] of Object.entries(obj2)) {
      const postfix = !this.options.outputNewOnly ? '__added' : ''

      if (!(key in obj1) && !(this.options.excludeKeys.includes(key))) {
        result[`${key}${postfix}`] = value
        score -= 30
        equal = false
      }
    }

    for (const [key, value1] of Object.entries(obj1)) {
      if (key in obj2) {
        if (this.options.excludeKeys.includes(key)) {
          continue
        }
        score += 20
        const value2 = obj2[key]
        const change = this.diff(value1, value2)
        if (!change.equal) {
          result[key] = change.result
          equal = false
        } else if (this.options.full || this.options.outputKeys.includes(key)) {
          result[key] = value1
        }
        // console.log(`key ${key} change.score=${change.score} ${change.result}`)
        score += Math.min(20, Math.max(-10, change.score / 5)) // BATMAN!
      }
    }

    if (equal) {
      score = 100 * Math.max(Object.keys(obj1).length, 0.5)
      if (!this.options.full) {
        result = undefined
      }
    } else {
      score = Math.max(0, score)
    }

    // console.log(`objectDiff(${JSON.stringify(obj1, null, 2)} <=> ${JSON.stringify(obj2, null, 2)}) == ${JSON.stringify({score, result, equal})}`)
    return { score, result, equal }
  }

  findMatchingObject (item, index, fuzzyOriginals) {
    // console.log('findMatchingObject: ' + JSON.stringify({item, fuzzyOriginals}, null, 2))
    let bestMatch = null

    for (const [key, { item: candidate, index: matchIndex }] of Object.entries(fuzzyOriginals)) {
      if (key !== '__next') {
        const indexDistance = Math.abs(matchIndex - index)
        if (extendedTypeOf(item) === extendedTypeOf(candidate)) {
          const { score } = this.diff(item, candidate)
          if (
            !bestMatch ||
            score > bestMatch.score ||
            (score === bestMatch.score &&
              indexDistance < bestMatch.indexDistance)
          ) {
            bestMatch = { score, key, indexDistance }
          }
        }
      }
    }

    // console.log('findMatchingObject result = ' + JSON.stringify(bestMatch, null, 2));
    return bestMatch
  }

  scalarize (array, originals, fuzzyOriginals) {
    // console.log('scalarize', array, originals, fuzzyOriginals);
    const fuzzyMatches = []
    if (fuzzyOriginals) {
      // Find best fuzzy match for each object in the array
      const keyScores = {}
      for (let index = 0; index < array.length; index++) {
        const item = array[index]
        if (this.isScalar(item)) {
          continue
        }
        const bestMatch = this.findMatchingObject(item, index, fuzzyOriginals)
        if (bestMatch && (!keyScores[bestMatch.key] || bestMatch.score > keyScores[bestMatch.key].score)) {
          keyScores[bestMatch.key] = { score: bestMatch.score, index }
        }
      }
      for (const [key, match] of Object.entries(keyScores)) {
        fuzzyMatches[match.index] = key
      }
    }

    const result = []
    for (let index = 0; index < array.length; index++) {
      const item = array[index]
      if (this.isScalar(item)) {
        result.push(item)
      } else {
        const key = fuzzyMatches[index] || '__$!SCALAR' + originals.__next++
        originals[key] = { item, index }
        result.push(key)
      }
    }
    // console.log('Scalarize result', result);
    return result
  }

  isScalarized (item, originals) {
    return typeof item === 'string' && item in originals
  }

  descalarize (item, originals) {
    if (this.isScalarized(item, originals)) {
      return originals[item].item
    } else {
      return item
    }
  }

  arrayDiff (obj1, obj2) {
    const originals1 = { __next: 1 }
    const seq1 = this.scalarize(obj1, originals1)
    const originals2 = { __next: originals1.__next }
    const seq2 = this.scalarize(obj2, originals2, originals1)

    if (this.options.sort) {
      seq1.sort()
      seq2.sort()
    }
    const opcodes = new SequenceMatcher(null, seq1, seq2).getOpcodes()

    // console.log(`arrayDiff:\nobj1 = ${JSON.stringify(obj1, null, 2)}\nobj2 = ${JSON.stringify(obj2, null, 2)}\nseq1 = ${JSON.stringify(seq1, null, 2)}\nseq2 = ${JSON.stringify(seq2, null, 2)}\nopcodes = ${JSON.stringify(opcodes, null, 2)}`)

    let result = []
    let score = 0
    let equal = true

    for (const [op, i1, i2, j1, j2] of opcodes) {
      let i, j
      let asc, end
      let asc1, end1
      let asc2, end2
      if (!(op === 'equal' || (this.options.keysOnly && op === 'replace'))) {
        equal = false
      }

      switch (op) {
        case 'equal':
          for (
            i = i1, end = i2, asc = i1 <= end;
            asc ? i < end : i > end;
            asc ? i++ : i--
          ) {
            const item = seq1[i]
            if (this.isScalarized(item, originals1)) {
              if (!this.isScalarized(item, originals2)) {
                throw new Error(
                  `internal bug: isScalarized(item, originals1) != isScalarized(item, originals2) for item ${JSON.stringify(
                    item
                  )}`
                )
              }
              const item1 = this.descalarize(item, originals1)
              const item2 = this.descalarize(item, originals2)
              const change = this.diff(item1, item2)
              if (!change.equal) {
                result.push(['~', change.result])
                equal = false
              } else {
                if (this.options.full || this.options.keepUnchangedValues) {
                  result.push([' ', item1])
                } else {
                  result.push([' '])
                }
              }
            } else {
              if (this.options.full || this.options.keepUnchangedValues) {
                result.push([' ', item])
              } else {
                result.push([' '])
              }
            }
            score += 10
          }
          break
        case 'delete':
          for (
            i = i1, end1 = i2, asc1 = i1 <= end1;
            asc1 ? i < end1 : i > end1;
            asc1 ? i++ : i--
          ) {
            result.push(['-', this.descalarize(seq1[i], originals1)])
            score -= 5
          }
          break
        case 'insert':
          for (
            j = j1, end2 = j2, asc2 = j1 <= end2;
            asc2 ? j < end2 : j > end2;
            asc2 ? j++ : j--
          ) {
            result.push(['+', this.descalarize(seq2[j], originals2)])
            score -= 5
          }
          break
        case 'replace':
          if (!this.options.keysOnly) {
            let asc3, end3
            let asc4, end4
            for (
              i = i1, end3 = i2, asc3 = i1 <= end3;
              asc3 ? i < end3 : i > end3;
              asc3 ? i++ : i--
            ) {
              result.push(['-', this.descalarize(seq1[i], originals1)])
              score -= 5
            }
            for (
              j = j1, end4 = j2, asc4 = j1 <= end4;
              asc4 ? j < end4 : j > end4;
              asc4 ? j++ : j--
            ) {
              result.push(['+', this.descalarize(seq2[j], originals2)])
              score -= 5
            }
          } else {
            let asc5, end5
            for (
              i = i1, end5 = i2, asc5 = i1 <= end5;
              asc5 ? i < end5 : i > end5;
              asc5 ? i++ : i--
            ) {
              const change = this.diff(
                this.descalarize(seq1[i], originals1),
                this.descalarize(seq2[i - i1 + j1], originals2)
              )
              if (!change.equal) {
                result.push(['~', change.result])
                equal = false
              } else {
                result.push([' '])
              }
            }
          }
          break
      }
    }

    if (equal || opcodes.length === 0) {
      if (!this.options.full) {
        result = undefined
      } else {
        result = obj1
      }
      score = 100
    } else {
      score = Math.max(0, score)
    }

    return { score, result, equal }
  }

  diff (obj1, obj2) {
    const type1 = extendedTypeOf(obj1)
    const type2 = extendedTypeOf(obj2)

    if (type1 === type2) {
      switch (type1) {
        case 'object':
          return this.objectDiff(obj1, obj2)

        case 'array':
          return this.arrayDiff(obj1, obj2)
      }
    }

    // Compare primitives or complex objects of different types
    let score = 100
    let result = obj1
    let equal
    if (!this.options.keysOnly) {
      if (type1 === 'date' && type2 === 'date') {
        equal = obj1.getTime() === obj2.getTime()
      } else {
        equal = obj1 === obj2
      }
      if (!equal) {
        score = 0

        if (this.options.outputNewOnly) {
          result = obj2
        } else {
          result = { __old: obj1, __new: obj2 }
        }
      } else if (!this.options.full) {
        result = undefined
      }
    } else {
      equal = true
      result = undefined
    }

    // console.log(`diff: equal ${equal} obj1 ${obj1} obj2 ${obj2} score ${score} ${result || ''}`)

    return { score, result, equal }
  }
}

function diff (obj1, obj2, options = {}) {
  if (options.precision !== undefined) {
    obj1 = roundObj(obj1, options.precision)
    obj2 = roundObj(obj2, options.precision)
  }
  return new JsonDiff(options).diff(obj1, obj2).result
}

function diffString (obj1, obj2, options = {}) {
  return colorize(diff(obj1, obj2, options), options)
}

module.exports = { diff, diffString, colorize, colorizeToCallback }
