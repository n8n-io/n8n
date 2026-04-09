module.exports = abbrev

function abbrev (...args) {
  let list = args.length === 1 || Array.isArray(args[0]) ? args[0] : args

  for (let i = 0, l = list.length; i < l; i++) {
    list[i] = typeof list[i] === 'string' ? list[i] : String(list[i])
  }

  // sort them lexicographically, so that they're next to their nearest kin
  list = list.sort(lexSort)

  // walk through each, seeing how much it has in common with the next and previous
  const abbrevs = {}
  let prev = ''
  for (let ii = 0, ll = list.length; ii < ll; ii++) {
    const current = list[ii]
    const next = list[ii + 1] || ''
    let nextMatches = true
    let prevMatches = true
    if (current === next) {
      continue
    }
    let j = 0
    const cl = current.length
    for (; j < cl; j++) {
      const curChar = current.charAt(j)
      nextMatches = nextMatches && curChar === next.charAt(j)
      prevMatches = prevMatches && curChar === prev.charAt(j)
      if (!nextMatches && !prevMatches) {
        j++
        break
      }
    }
    prev = current
    if (j === cl) {
      abbrevs[current] = current
      continue
    }
    for (let a = current.slice(0, j); j <= cl; j++) {
      abbrevs[a] = current
      a += current.charAt(j)
    }
  }
  return abbrevs
}

function lexSort (a, b) {
  return a === b ? 0 : a > b ? 1 : -1
}
