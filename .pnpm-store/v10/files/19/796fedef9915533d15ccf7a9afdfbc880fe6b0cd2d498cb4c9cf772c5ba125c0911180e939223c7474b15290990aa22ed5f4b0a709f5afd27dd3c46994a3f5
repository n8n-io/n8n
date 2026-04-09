function preserveShebang (envSrc) {
  const [firstLine, ...remainingLines] = envSrc.split('\n')
  let firstLinePreserved = ''

  if (firstLine.startsWith('#!')) {
    firstLinePreserved = firstLine + '\n'
    envSrc = remainingLines.join('\n')
  }

  return {
    firstLinePreserved,
    envSrc
  }
}

module.exports = preserveShebang
