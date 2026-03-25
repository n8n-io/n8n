const fs = require('fs')
const promisify = require('@gar/promisify')

// this module returns the core fs module wrapped in a proxy that promisifies
// method calls within the getter. we keep it in a separate module so that the
// overridden methods have a consistent way to get to promisified fs methods
// without creating a circular dependency
module.exports = promisify(fs)
