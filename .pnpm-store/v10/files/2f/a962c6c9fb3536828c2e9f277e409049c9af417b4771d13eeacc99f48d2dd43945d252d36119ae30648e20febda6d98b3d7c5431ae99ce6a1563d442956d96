/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

const fs = require('fs')
const path = require('path')

try {
  fs.symlinkSync(
    path.resolve(__dirname, '../test/lib'),
    path.resolve(__dirname, '../test-workspace/tasks/lib'),
    'junction'
  )
} catch (err) {
  if (err.code !== 'EEXIST') {
    throw err
  }
}
