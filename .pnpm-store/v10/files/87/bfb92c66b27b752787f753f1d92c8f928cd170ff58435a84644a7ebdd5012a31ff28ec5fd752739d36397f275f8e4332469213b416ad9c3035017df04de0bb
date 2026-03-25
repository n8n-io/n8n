function makeNext() {
  if (typeof process === "object" && typeof process.nextTick === "function") {
    return process.nextTick;
  } else if (typeof setImmediate === "function") {
    return setImmediate;
  } else {
    return function next(f: () => void) {
      setTimeout(f, 0);
    };
  }
}

export default makeNext();
