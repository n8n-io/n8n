"use strict"

const startsWithKeywordRegexp = /^(all|not|only|print|screen)/i

module.exports = function (parentMedia, childMedia) {
  if (!parentMedia.length && childMedia.length) return childMedia
  if (parentMedia.length && !childMedia.length) return parentMedia
  if (!parentMedia.length && !childMedia.length) return []

  const media = []

  parentMedia.forEach(parentItem => {
    const parentItemStartsWithKeyword = startsWithKeywordRegexp.test(parentItem)

    childMedia.forEach(childItem => {
      const childItemStartsWithKeyword = startsWithKeywordRegexp.test(childItem)
      if (parentItem !== childItem) {
        if (childItemStartsWithKeyword && !parentItemStartsWithKeyword) {
          media.push(`${childItem} and ${parentItem}`)
        } else {
          media.push(`${parentItem} and ${childItem}`)
        }
      }
    })
  })

  return media
}
