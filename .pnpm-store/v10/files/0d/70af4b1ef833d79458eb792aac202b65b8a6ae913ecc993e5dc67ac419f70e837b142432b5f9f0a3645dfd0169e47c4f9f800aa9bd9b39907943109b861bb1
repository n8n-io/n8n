import { NumberAllocator } from '../..'

const a: NumberAllocator = new NumberAllocator(1, 5)

const num1: Number | null = a.firstVacant()
console.log(num1)

const num2: Number | null = a.alloc()
console.log(num2)

const ret: Boolean = a.use(3)
console.log(ret)

a.free(2)

const ic1: Number = a.intervalCount()
console.log(ic1)

a.dump()

a.clear()

const ic2: Number = a.intervalCount()
console.log(ic2)
