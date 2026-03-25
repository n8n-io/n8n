import * as lib from '@react-email/components'
import { Heading } from '@react-email/components'
import Hook from '../../index.js'
import { strictEqual } from 'assert'

Hook((exports, name) => {
  if (name.match(/@react-email\/components/)) {
    exports.Heading = function wrappedHeading () {
      return 'heading-wrapped'
    }
  }
})

strictEqual(typeof lib.Button, 'function')
strictEqual(lib.Heading(), 'heading-wrapped')
strictEqual(Heading(), 'heading-wrapped')
