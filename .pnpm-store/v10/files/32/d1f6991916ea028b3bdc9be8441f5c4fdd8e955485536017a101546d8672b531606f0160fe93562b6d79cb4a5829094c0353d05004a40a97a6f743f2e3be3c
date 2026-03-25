# jest-leak-detector

Module for verifying whether an object has been garbage collected or not.

Internally creates a weak reference to the object, and forces garbage collection to happen. If the reference is gone, it meant no one else was pointing to the object.

## Example

```javascript
(async function () {
  let reference = {};
  let isLeaking;

  const detector = new LeakDetector(reference);

  // Reference is held in memory.
  isLeaking = await detector.isLeaking();
  console.log(isLeaking); // true

  // We destroy the only reference to the object.
  reference = null;

  // Reference is gone.
  isLeaking = await detector.isLeaking();
  console.log(isLeaking); // false
})();
```
