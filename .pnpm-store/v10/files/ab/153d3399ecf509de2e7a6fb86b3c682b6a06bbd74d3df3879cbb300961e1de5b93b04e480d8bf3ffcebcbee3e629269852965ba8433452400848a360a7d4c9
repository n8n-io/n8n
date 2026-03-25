// Remove Arguments section from help text. example:
// Arguments:
// command     dynamic command
// args        dynamic command arguments

function removeDynamicHelpSection (lines) {
  let argumentsHelpIndex
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === 'Arguments:') {
      argumentsHelpIndex = i
      break
    }
  }
  if (argumentsHelpIndex) {
    lines.splice(argumentsHelpIndex, 4) // remove Arguments and the following 3 lines
  }

  return lines
}

module.exports = removeDynamicHelpSection
