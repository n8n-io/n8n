const BASE_URL = 'https://kafka.js.org'
const stripLeading = char => str => (str.charAt(0) === char ? str.substring(1) : str)
const stripLeadingSlash = stripLeading('/')
const stripLeadingHash = stripLeading('#')

module.exports = (path, hash) =>
  `${BASE_URL}/${stripLeadingSlash(path)}${hash ? '#' + stripLeadingHash(hash) : ''}`
