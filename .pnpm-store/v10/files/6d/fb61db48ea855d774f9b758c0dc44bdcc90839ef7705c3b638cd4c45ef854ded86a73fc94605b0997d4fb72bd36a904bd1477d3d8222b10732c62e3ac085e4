import next from "./next.js";

type MaybeParams<T> = (err: Error | any | null, result?: T) => void;
export default function maybe<T>(cb: MaybeParams<T> | undefined, promise: Promise<T>): Promise<T> | void {
  if (cb) {
    promise.then(
      function (result) {
        next(function () {
          cb(null, result);
        });
      },
      function (err) {
        next(function () {
          cb(err);
        });
      },
    );
    return undefined;
  } else {
    return promise;
  }
}
