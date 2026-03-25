# Unique number allocator for JavaScript.

Version 1.0.14 [![number-allocator CI](https://github.com/redboltz/number-allocator/workflows/number-allocator%20CI/badge.svg)](https://github.com/redboltz/number-allocator/actions) [![codecov](https://codecov.io/gh/redboltz/number-allocator/branch/main/graph/badge.svg)](https://codecov.io/gh/redboltz/number-allocator)

## How to use

```js
const NumberAllocator = require('number-allocator').NumberAllocator

// Construct a NumerAllocator that has [0-10] numbers.
// All numbers are vacant.
const a = new NumberAllocator(0, 10)

// Allocate the least vacant number.
const num0 = a.alloc()
console.log(num0) // 0

// Allocate the least vacant number.
const num1 = a.alloc()
console.log(num1) // 1

// Use any vacant number.
const ret1 = a.use(5) // 5 is marked as used(occupied) in the NumberAllocator.
console.log(ret1) // true

// If use the used number, then return false.
const ret2 = a.use(1) // 1 has already been used, then return false
console.log(ret2) // false

// Free the used number.
a.free(1)
// Now 1 becomes vacant again.

const ret3 = a.use(1)
console.log(ret3) // true

// Get the lowest vacant number without marking used.
const num2 = a.firstVacant()
console.log(num2) // 2

// Clear all used mark. Now [0-10] are allocatable again.
a.clear()
```

## Reference

### NumberAllocator(min, max)
Constructor

- min: Number
   - The maximum number of allocatable. The number must be integer.
- max: Number
   - The minimum number of allocatable. The number must be integer.

The all numbers are set to vacant status.

Time Complexity O(1)

### firstVacant()
Get the first vacant number. The status of the number is not updated.

Time Complexity O(1)

- return: Number
   - The first vacant number. If all numbers are occupied, return null.
     When alloc() is called then the same value will be allocated.

### alloc()
Allocate the first vacant number. The number become occupied status.

Time Complexity O(1)

- return: Number
   - The first vacant number. If all numbers are occupied, return null.

### use(num)
Use the number. The number become occupied status.

If the number has already been occupied, then return false.

Time Complexity O(logN) : N is the number of intervals (not numbers)

- num: Number
   - The number to request use.
- return: Boolean
   - If `num` was not occupied, then return true, otherwise return false.

### free(num)
Deallocate the number. The number become vacant status.

Time Complexity O(logN) : N is the number of intervals (not numbers)

- num: Number
   - The number to deallocate. The number must be occupied status.
     In other words, the number must be allocated by alloc() or occupied be use().

### clear()
Clear all occupied numbers.
The all numbers are set to vacant status.
Time Complexity O(1)

### intervalCount()
Get the number of intervals. Interval is internal structure of this library.

This function is for debugging.

Time Complexity O(1)

- return: Number
   - The number of intervals.

### dump()
Dump the internal structor of the library.

This function is for debugging.

Time Complexity O(N) : N is the number of intervals (not numbers)

## Internal structure
NumberAllocator has a sorted-set of Interval.

Interval has `low` and `high` property.

I use `[low-high]` notation to describe Interval.

When NumberAllocator is constructed, it has only one Interval(min, max).

Let's say `new NumberAllocator(1, 9)` then the internal structure become as follows:

```
[1-------9]
```

When `alloc()` is called, the first Interval.low is returned.

And then the interval is shrinked.

```
alloc()
return 1
 [2------9]
```

When `use(5)` is called, the interval is separated to the two intervals.

```
use(5)
 [2-4] [6--9]
```

When `alloc()` is called again, the first Interval.low is returned.

And then the interval is shrinked.

```
alloc()
return 2
  [3-4] [6--9]
```

When `free(1)` is called. the interval is inseted.

```
free(1)
[1]  [3-4] [6--9]
```

When `free(2)` is called. the interval is inseted.

And check the left and right intervals. If they are continuours, then concatinate to them.

```
free(1)
[1][2][3-4] [6--9]
[1-------4] [6--9]
```

When `clear()` is called, then reset the interval as follows:

```
[1-------9]
```

When `intervalCount()` is called, then the number of intervals is retuned.

In the following case, return 3.

```
intervalCount()
return 3
[1]  [3-4] [6--9]
```

Interval management (insertion/concatination/shrinking) is using efficient way.
Insert/Delete operation to sorted-set is minimized.
Some of operations requires O(logN) time complexity. N is number of intervals.
If the maximum count of allocatable values is M, N is at most floor((M + 1) / 2),

In this example, M is 9 so N is at most 5 as follows:

```
[1] [3] [5] [7] [9]
```
