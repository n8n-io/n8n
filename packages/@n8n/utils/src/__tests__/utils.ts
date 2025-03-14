export const repeat = (fn: () => void, times = 10) => Array(times).fill(0).forEach(fn);
