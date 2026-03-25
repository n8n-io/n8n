function c(n) {
  const t = a(n);
  return new ReadableStream(
    {
      async pull(e) {
        const { value: r, done: o } = await t.next();
        o ? e.close() : e.enqueue(r);
      },
      async cancel(e) {
        if (typeof t.return == "function" && typeof await t.return(e) != "object")
          throw new TypeError("return() fulfills with a non-object.");
        return e;
      }
    },
    new CountQueuingStrategy({
      highWaterMark: 0
    })
  );
}
function a(n) {
  let t = n[Symbol.asyncIterator]?.bind(n);
  if (t === void 0) {
    const r = n[Symbol.iterator](), o = {
      [Symbol.iterator]: () => r
    };
    t = async function* () {
      return yield* o;
    };
  }
  return t();
}
export {
  c as fromAnyIterable
};
