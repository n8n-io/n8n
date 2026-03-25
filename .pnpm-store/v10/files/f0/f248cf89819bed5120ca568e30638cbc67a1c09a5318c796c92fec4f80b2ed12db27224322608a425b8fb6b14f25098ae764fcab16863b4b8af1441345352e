/**
 * ...something resembling a binary search, to find the lowest line within the range.
 * And then you could break as soon as the line is longer than the range...
 */
module.exports.sliceRange = (lines, startCol, endCol, inclusive = false) => {
  let start = 0
  let end = lines.length

  if (inclusive) {
    // I consider this a temporary solution until I find an alternaive way to fix the "off by one issue"
    --startCol
  }

  while (start < end) {
    let mid = (start + end) >> 1
    if (startCol >= lines[mid].endCol) {
      start = mid + 1
    } else if (endCol < lines[mid].startCol) {
      end = mid - 1
    } else {
      end = mid
      while (mid >= 0 && startCol < lines[mid].endCol && endCol >= lines[mid].startCol) {
        --mid
      }
      start = mid + 1
      break
    }
  }

  while (end < lines.length && startCol < lines[end].endCol && endCol >= lines[end].startCol) {
    ++end
  }

  return lines.slice(start, end)
}
