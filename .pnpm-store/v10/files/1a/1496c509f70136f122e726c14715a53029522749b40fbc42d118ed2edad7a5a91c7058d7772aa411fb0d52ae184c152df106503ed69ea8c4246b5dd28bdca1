import { Bench } from 'tinybench'
import { stringArrayToHexStripped } from '../lib/utils.js'

const benchStringArrayToHexStripped = new Bench({ name: 'stringArrayToHexStripped' })

const case1 = ['0', '0', '0', '0']
const case2 = ['0', '0', '0', '1']
const case3 = ['0', '0', '1', '0']
const case4 = ['0', '1', '0', '0']
const case5 = ['1', '0', '0', '0']
const case6 = ['1', '0', '0', '1']

benchStringArrayToHexStripped.add('stringArrayToHexStripped', function () {
  stringArrayToHexStripped(case1)
  stringArrayToHexStripped(case2)
  stringArrayToHexStripped(case3)
  stringArrayToHexStripped(case4)
  stringArrayToHexStripped(case5)
  stringArrayToHexStripped(case6)
})

await benchStringArrayToHexStripped.run()
console.log(benchStringArrayToHexStripped.name)
console.table(benchStringArrayToHexStripped.table())
